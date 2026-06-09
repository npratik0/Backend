import {Request, response, Response} from 'express';
import {User} from '../models/user.model';
import {comparePassword, hashPassword} from '../utils/hash';
import {generateRefreshToken, generateToken} from '../utils/jwt';
import { access } from 'node:fs';
import jwt from 'jsonwebtoken';
import { sendEmail } from '../utils/mailer';

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
            password: hashedPassword
        })

        return res.status(201).json({
            message: "User Created Sucessfully",
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                phoneNumber: user.phoneNumber,
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

        const accesstoken = generateToken(user.id);
        const refreshToken = generateRefreshToken(user.id);

    
        await user.update({ refreshToken });

        return res.status(200).json({
            message: "Login Sucessfull",
            accesstoken: accesstoken,
            refreshtoken: refreshToken,
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                phoneNumber: user.phoneNumber
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

const otpStore = new Map<string, { otp: string; expires: number }>();

export const forgotPassword = async (req: any, res: any) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP (valid for 10 minutes)
    otpStore.set(email, {
      otp,
      expires: Date.now() + 10 * 60 * 1000,
    });

    // Send email
    await sendEmail(
      email,
      "Password Reset OTP",
      `Your OTP is: ${otp}. It is valid for 10 minutes.`
    );

    return res.json({
      message: "OTP sent to email",
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};



export const resetPassword = async (req: any, res: any) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const record = otpStore.get(email);

    if (!record) {
      return res.status(400).json({
        message: "OTP not found or expired",
      });
    }

    if (record.expires < Date.now()) {
      otpStore.delete(email);
      return res.status(400).json({
        message: "OTP expired",
      });
    }

    if (record.otp !== otp) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Hash new password
    const hashed = await hashPassword(newPassword);

    await user.update({
      password: hashed,
    });

    // remove OTP after success
    otpStore.delete(email);

    return res.json({
      message: "Password reset successful",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
    });
  }
};



export const refreshAccessToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token required" });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!);
    } catch (err) {
      return res.status(403).json({ message: "Invalid or expired refresh token" });
    }

    const user = await User.findOne({
      where: { id: decoded.userId, refreshToken },
    });

    if (!user) {
      return res.status(403).json({ message: "Refresh token not recognized" });
    }

    const newAccessToken = generateToken(user.id);

    return res.status(200).json({ accesstoken: newAccessToken });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout = async (req: any, res: any) => {
  try{
    const userId = req.user.userId;

    await User.update({refreshAccessToken:null}, {where: {id: userId}});

  }catch(error){
    return res.status(500).json({
      message: "Internal Server Error"
    })
  }
}













