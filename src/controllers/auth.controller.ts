import {Request, response, Response} from 'express';
import {User} from '../models/user.model';
import {comparePassword, hashPassword} from '../utils/hash';
import {generateRefreshToken, generateToken} from '../utils/jwt';
import jwt from 'jsonwebtoken';
import { sendEmail } from '../utils/mailer';
import { Otp } from '../models/otp.models';
import { Session } from '../models/session.model';
import { v4 as uuidv4 } from 'uuid';

export const register = async (req:Request, res:Response) => {
    try{
        const {fullName, email, phoneNumber, password, confirmPassword} = req.body;

        if(!fullName || !email || !phoneNumber || !password || !confirmPassword){
            return res.status(400).json({
                message: "All fields required"
            })
        }
        if(password != confirmPassword){
            return res.status(400).json({
                message: "Passwords don't match",
            })
        }

        const existingUser = await User.findOne({
            where: {
                email,
            }
        })

        if(existingUser){
            return res.status(400).json({
                message: "Email already exists"
            })
        }

        const hashedPassword = await hashPassword(password);

        const user = await User.create({
            fullName,
            email,
            phoneNumber,
            password: hashedPassword,
            role: 'user'
        })

        return res.status(201).json({
            message: "User Created Sucessfully",
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                phoneNumber: user.phoneNumber,
                role: user.role
            }
        })

    }catch(error){
        return res.status(500).json({
            message: "Internal Server Error"
        })
    }
}

export const login = async (req:Request, res:Response) => {
    try{
        const {email, password} = req.body;

        if(!email || !password){
            return res.status(400).json({
                message: "All fields are required"
            })
        }

        const user = await User.findOne({
            where: { email }
        })

        if(!user){
            return res.status(400).json({
                message: "Invalid Credintials"
            })
        }

        const passwordCheck = await comparePassword(password, user.password);
        if(!passwordCheck){
            return res.status(400).json({
                message: "Invalid Credintials"
            })
        }

        const accesstoken = generateToken(user.id, user.role);
        const refreshToken = generateRefreshToken(user.id, user.role);

        const sessionId = uuidv4();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // store session in DB
        await Session.create({
          id: sessionId,
          userId: user.id,
          refreshToken,
          ip: req.ip,
          device: req.headers["user-agent"] || "unknown",
          expiresAt,
        });

        // set both sessionId and refreshToken in cookies
        res.cookie("sessionId", sessionId, {
          httpOnly: true,
          secure: false,       
          sameSite: "strict",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

    
        // await user.update({ refreshToken });

        res.cookie("refreshToken", refreshToken,{
          httpOnly: true,
          secure: false, 
          sameSite: "strict",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        })

        return res.status(200).json({
            message: "Login Sucessfull",
            accesstoken: accesstoken,
            // refreshtoken: refreshToken,
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                phoneNumber: user.phoneNumber,
                role: user.role
            }
            
        })

    }catch(error){
        res.status(500).json({
            message: "Internal Server Error",
        })
    }
}

export const getProfile = async (req: any, res: any) => {
    try {
        const id = req.user.userId;

        const user = await User.findByPk(id, {
        attributes: {
        exclude: ["password"],
        },
        });

        if (!user) {
        return res.status(404).json({
        message: "User not found",
        });
        }

        return res.json({
        user,
        });


    }catch(error){
        return res.status(500).json({
            message: "Internal Server Error"
        })
    }
}

// const otpStore = new Map<string, { otp: string; expires: number }>();


const OTP_EXPIRY_MINUTES = 10;

const createAndSendOtp = async (email: string): Promise<void> => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await Otp.destroy({ where: { email } });
  await Otp.create({ email, otp, expiresAt });

  await sendEmail(
    email,
    "Password Reset OTP",
    `Your OTP is: ${otp}. It is valid for ${OTP_EXPIRY_MINUTES} minutes.`
  );
};

// export const forgotPassword = async (req: any, res: any) => {
//   try {
//     const { email } = req.body;

//     if (!email) {
//       return res.status(400).json({ message: "Email is required" });
//     }

//     const user = await User.findOne({ where: { email } });

//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // Generate OTP
//     const otp = Math.floor(100000 + Math.random() * 900000).toString();

//     // Store OTP (valid for 10 minutes)
//     otpStore.set(email, {
//       otp,
//       expires: Date.now() + 10 * 60 * 1000,
//     });

//     // Send email
//     await sendEmail(
//       email,
//       "Password Reset OTP",
//       `Your OTP is: ${otp}. It is valid for 10 minutes.`
//     );

//     return res.json({
//       message: "OTP sent to email",
//     });
//   } catch (error) {
//     return res.status(500).json({ message: "Server error", error });
//   }
// };

export const forgotPassword = async (req: any, res: any) => {
  try {
    const { email } = req.body;

    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });

    await createAndSendOtp(email);

    return res.json({ message: "OTP sent to email" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

export const resendOtp = async (req: any, res: any) => {
  try {
    const { email } = req.body;

    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });

    await createAndSendOtp(email);

    return res.json({ message: "OTP resent to email" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

// export const resetPassword = async (req: any, res: any) => {
//   try {
//     const { email, otp, newPassword } = req.body;

//     if (!email || !otp || !newPassword) {
//       return res.status(400).json({
//         message: "All fields are required",
//       });
//     }

//     const record = otpStore.get(email);

//     if (!record) {
//       return res.status(400).json({
//         message: "OTP not found or expired",
//       });
//     }

//     if (record.expires < Date.now()) {
//       otpStore.delete(email);
//       return res.status(400).json({
//         message: "OTP expired",
//       });
//     }

//     if (record.otp !== otp) {
//       return res.status(400).json({
//         message: "Invalid OTP",
//       });
//     }

//     const user = await User.findOne({ where: { email } });

//     if (!user) {
//       return res.status(404).json({
//         message: "User not found",
//       });
//     }

//     // Hash new password
//     const hashed = await hashPassword(newPassword);

//     await user.update({
//       password: hashed,
//     });

//     // remove OTP after success
//     otpStore.delete(email);

//     return res.json({
//       message: "Password reset successful",
//     });
//   } catch (error) {
//     return res.status(500).json({
//       message: "Server error",
//     });
//   }
// };

export const resetPassword = async (req: any, res: any) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const record = await Otp.findOne({ where: { email } });

    if (!record) {
      return res.status(400).json({ message: "OTP not found or already used" });
    }

    if (new Date() > record.expiresAt) {
      await record.destroy();
      return res.status(400).json({ message: "OTP expired" });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const hashed = await hashPassword(newPassword);
    await user.update({ password: hashed });

    await record.destroy();

    return res.json({ message: "Password reset successful" });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};



// export const refreshAccessToken = async (req: Request, res: Response) => {
//   try {
//     const { refreshToken } = req.cookies.refreshToken;

//     if (!refreshToken) {
//       return res.status(401).json({ message: "Refresh token required" });
//     }

//     let decoded: any;
//     try {
//       decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!);
//     } catch (err) {
//       return res.status(403).json({ message: "Invalid or expired refresh token" });
//     }

//     const user = await User.findOne({
//       where: { id: decoded.userId, refreshToken },
//     });

//     if (!user) {
//       return res.status(403).json({ message: "Refresh token not recognized" });
//     }

//     const newAccessToken = generateToken(user.id, user.role);

//     return res.status(200).json({ accesstoken: newAccessToken });
//   } catch (error) {
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// };

// Refressh Token with Token Rotation and Session Management
export const refreshAccessToken = async (req: Request, res: Response) => {
  try {
    const sessionId = req.cookies.sessionId;
    const refreshToken = req.cookies.refreshToken;

    if (!sessionId || !refreshToken) {
      return res.status(401).json({ message: "No session found" });
    }

    // find session in DB
    const session = await Session.findOne({
      where: { id: sessionId, refreshToken },
    });

    if (!session) {
      res.clearCookie("sessionId");
      res.clearCookie("refreshToken");
      return res.status(403).json({ message: "Invalid session. Please login again" });
    }

    // session expired
    if (new Date() > session.expiresAt) {
      await session.destroy();
      res.clearCookie("sessionId");
      res.clearCookie("refreshToken");
      return res.status(403).json({ message: "Session expired. Please login again" });
    }

    // verify refresh token
    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!);
    } catch (err) {
      await session.destroy();
      res.clearCookie("sessionId");
      res.clearCookie("refreshToken");
      return res.status(403).json({ message: "Invalid token. Please login again" });
    }

    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // delete old session
    await session.destroy();

    // generate new tokens
    const newAccessToken = generateToken(user.id, user.role);
    const newRefreshToken = generateRefreshToken(user.id, user.role);
    const newSessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // create new session
    await Session.create({
      id: newSessionId,
      userId: user.id,
      refreshToken: newRefreshToken,
      ip: req.ip,
      device: req.headers["user-agent"] || "unknown",
      expiresAt,
    });

    // set new cookies
    res.cookie("sessionId", newSessionId, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({ accessToken: newAccessToken });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


export const logout = async (req: any, res: any) => {
  try{
    const sessionId = req.cookies.sessionId;

    if(sessionId){
      await Session.destroy({where: {id:sessionId}});
    }

    res.clearCookie("sessionId");
    res.clearCookie("refreshToken");

    return res.json({
      message: "Logged out successfully"
    })

  }catch(error){
    return res.status(500).json({
      message: "Internal Server Error"
    })
  }
}

export const logoutAll = async (req: any, res: any) => {
  try{
    const userId = req.user.userId;

    await Session.destroy({where: {userId}});

    res.clearCookie("sessionId");
    res.clearCookie("refreshToken");

    return res.json({
      message: "Logged out from all devices successfully"
    })

  }catch(error){
    return res.status(500).json({
      message: "Internal Server Error"
    })
  }
}













