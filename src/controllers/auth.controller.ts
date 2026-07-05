import { NextFunction, Request, Response } from "express";
import { User } from "../models/user.model";
import { comparePassword, hashPassword } from "../utils/hash";
import { generateRefreshToken, generateToken } from "../utils/jwt";
import jwt from "jsonwebtoken";
import { sendEmail } from "../utils/mailer";
import { Otp, OtpType } from "../models/otp.models";
import { Session } from "../models/session.model";
import { v4 as uuidv4 } from "uuid";
import { getLocation, normalizeIp, parseDevice } from "../utils/device";
import { DeviceInfo } from "../models/deviceInfo.model";
import { TrustedDevice } from "../models/trustedDevice.model";
import { Op } from "sequelize";
import { DeviceApproval } from "../models/deviceApproval.model";

const SESSION_EXPIRY_DAYS = 7;
const APPROVAL_TIMEOUT_MINUTES = 10;
const INACTIVITY_WINDOW_MINUTES = 30;
const OTP_EXPIRY_MINUTES = 10;

const createAndSendOtp = async (email: string, type: OtpType): Promise<void> => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await Otp.destroy({ where: { email, type } });
  await Otp.create({ email, otp, type, expiresAt });

  const subject =
    type === "email_verification" ? "Verify your Karya account" : "Password Reset OTP";
  const text =
    type === "email_verification"
      ? `Your Karya verification code is: ${otp}. It is valid for ${OTP_EXPIRY_MINUTES} minutes.`
      : `Your OTP is: ${otp}. It is valid for ${OTP_EXPIRY_MINUTES} minutes.`;

  await sendEmail(email, subject, text);
};

// Registers the device this request came from as trusted and opens an active
// session for the user — used right after email verification and after
// Google OAuth, where the identity has already been proven out-of-band.
const establishTrustedSession = async (req: Request, res: Response, user: User) => {
  const ip = normalizeIp(req.ip);
  const userAgent = req.headers["user-agent"] ?? "";
  const parsed = parseDevice(userAgent);
  const location = getLocation(ip);

  const deviceInfo = await DeviceInfo.create({
    ip,
    device: parsed.device,
    browser: parsed.browser,
    browserVersion: parsed.browserVersion,
    os: parsed.os,
    osVersion: parsed.osVersion,
    country: location.country,
    city: location.city,
    fingerprint: parsed.fingerprint,
    userAgent,
  });

  await TrustedDevice.findOrCreate({
    where: { userId: user.id, fingerprint: parsed.fingerprint },
    defaults: {
      userId: user.id,
      deviceInfoId: deviceInfo.id,
      fingerprint: parsed.fingerprint,
      lastSeenAt: new Date(),
    },
  });

  const accessToken = generateToken(user.id, user.role);
  const refreshToken = generateRefreshToken(user.id, user.role);
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await Session.create({
    id: sessionId,
    userId: user.id,
    deviceInfoId: deviceInfo.id,
    refreshToken,
    status: "active",
    fingerprint: parsed.fingerprint,
    lastActiveAt: new Date(),
    expiresAt,
  });

  const cookieOptions = {
    httpOnly: true,
    secure: false,
    sameSite: "strict" as const,
    maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  };
  res.cookie("sessionId", sessionId, cookieOptions);
  res.cookie("refreshToken", refreshToken, cookieOptions);

  return accessToken;
};

const serializeUser = (user: User) => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  phoneNumber: user.phoneNumber,
  role: user.role,
  isVerified: user.isVerified,
  preferredServices: user.preferredServices,
  budgetRange: user.budgetRange,
  preferredTiming: user.preferredTiming,
  onboardingCompletedAt: user.onboardingCompletedAt,
});

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { fullName, email, phoneNumber, password } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const existingPhone = await User.findOne({ where: { phoneNumber } });
    if (existingPhone) {
      return res.status(409).json({ message: "Phone Number already exists" });
    }

    const hashedPassword = await hashPassword(password);

    const user = await User.create({
      fullName,
      email,
      phoneNumber,
      password: hashedPassword,
      role: "user",
      isVerified: false,
    });

    await createAndSendOtp(email, "email_verification");

    return res.status(201).json({
      message: "Account created. Verification code sent to your email.",
      requiresVerification: true,
      email: user.email,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Account is already verified" });
    }

    const record = await Otp.findOne({
      where: { email, type: "email_verification" },
    });
    if (!record) {
      return res.status(400).json({ message: "Code not found or already used" });
    }
    if (new Date() > record.expiresAt) {
      await record.destroy();
      return res.status(400).json({ message: "Code expired" });
    }
    if (record.otp !== otp) {
      return res.status(400).json({ message: "Invalid code" });
    }

    await user.update({ isVerified: true });
    await record.destroy();

    const accessToken = await establishTrustedSession(req, res, user);

    return res.status(200).json({
      message: "Email verified successfully",
      accessToken,
      user: serializeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: "Invalid Credentials" });
    }

    const passwordCheck = await comparePassword(password, user.password);
    if (!passwordCheck) {
      return res.status(400).json({ message: "Invalid Credentials" });
    }

    if (!user.isVerified) {
      await createAndSendOtp(email, "email_verification");
      return res.status(403).json({
        message: "Please verify your email to continue",
        code: "EMAIL_NOT_VERIFIED",
        email: user.email,
      });
    }

    const ip = normalizeIp(req.ip);
    const userAgent = req.headers["user-agent"] ?? "";
    const parsed = parseDevice(userAgent);
    const location = getLocation(ip);

    const deviceInfo = await DeviceInfo.create({
      ip,
      device: parsed.device,
      browser: parsed.browser,
      browserVersion: parsed.browserVersion,
      os: parsed.os,
      osVersion: parsed.osVersion,
      country: location.country,
      city: location.city,
      fingerprint: parsed.fingerprint,
      userAgent,
    });

    const trustedDevice = await TrustedDevice.findOne({
      where: { userId: user.id, fingerprint: parsed.fingerprint },
    });

    const refreshToken = generateRefreshToken(user.id, user.role);
    const sessionId = uuidv4();
    const expiresAt = new Date(
      Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );

    if (trustedDevice) {
      await trustedDevice.update({
        lastSeenAt: new Date(),
        deviceInfoId: deviceInfo.id,
      });

      await Session.create({
        id: sessionId,
        userId: user.id,
        deviceInfoId: deviceInfo.id,
        refreshToken,
        status: "active",
        fingerprint: parsed.fingerprint,
        lastActiveAt: new Date(),
        expiresAt,
      });

      const accessToken = generateToken(user.id, user.role);

      res.cookie("sessionId", sessionId, {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
        maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
      });
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
        maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        message: "Login Successful",
        accessToken,
        user: serializeUser(user),
      });
    }

    const activeSessionCount = await Session.count({
      where: {
        userId: user.id,
        status: "active",
        expiresAt: { [Op.gt]: new Date() },
        lastActiveAt: {
          [Op.gt]: new Date(Date.now() - INACTIVITY_WINDOW_MINUTES * 60 * 1000),
        },
      },
    });

    const recoveryRequired = activeSessionCount === 0;

    await Session.create({
      id: sessionId,
      userId: user.id,
      deviceInfoId: deviceInfo.id,
      refreshToken,
      status: "pending",
      fingerprint: parsed.fingerprint,
      lastActiveAt: new Date(),
      expiresAt,
    });

    await DeviceApproval.create({
      sessionId,
      userId: user.id,
      status: "pending",
      expiresAt: new Date(Date.now() + APPROVAL_TIMEOUT_MINUTES * 60 * 1000),
    });

    res.cookie("sessionId", sessionId, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    });

    return res.status(202).json({
      message: recoveryRequired
        ? "New device detected. No trusted device available — verify via email."
        : "New device detected. Approval required from a trusted device.",
      requiresVerification: true,
      recoveryRequired,
      sessionId,
      deviceInfo: {
        browser: parsed.browser,
        os: parsed.os,
        ip,
        city: location.city,
        country: location.country,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.auth) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const id = req.auth.userId;

    const user = await User.findByPk(id, {
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ user });
  } catch (error) {
    next(error);
  }
};

export const updateOnboarding = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.auth) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { services, budget, timing } = req.body;

    const user = await User.findByPk(req.auth.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await user.update({
      preferredServices: services,
      budgetRange: budget,
      preferredTiming: timing,
      onboardingCompletedAt: new Date(),
    });

    return res.json({
      message: "Onboarding complete",
      user: serializeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email } = req.body;

    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });

    await createAndSendOtp(email, "password_reset");

    return res.json({ message: "OTP sent to email" });
  } catch (error) {
    next(error);
  }
};

export const resendOtp = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email } = req.body;
    const type: OtpType =
      req.body.type === "email_verification" ? "email_verification" : "password_reset";

    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (type === "email_verification" && user.isVerified) {
      return res.status(400).json({ message: "Account is already verified" });
    }

    await createAndSendOtp(email, type);

    return res.json({ message: "Code resent to email" });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const record = await Otp.findOne({ where: { email, type: "password_reset" } });

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
    next(error);
  }
};

export const refreshAccessToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const sessionId = req.cookies.sessionId;
    const refreshToken = req.cookies.refreshToken;

    if (!sessionId || !refreshToken) {
      return res.status(401).json({ message: "No session found" });
    }

    const session = await Session.findOne({
      where: { id: sessionId, refreshToken },
    });

    if (!session) {
      res.clearCookie("sessionId");
      res.clearCookie("refreshToken");
      return res
        .status(403)
        .json({ message: "Invalid session. Please login again" });
    }

    if (new Date() > session.expiresAt) {
      await DeviceApproval.destroy({ where: { sessionId: session.id } });
      await session.destroy();
      res.clearCookie("sessionId");
      res.clearCookie("refreshToken");
      return res
        .status(403)
        .json({ message: "Session expired. Please login again" });
    }

    if (session.status !== "active") {
      return res.status(403).json({
        message: "Session not yet verified",
        code: "SESSION_PENDING",
      });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!);
    } catch (err) {
      await DeviceApproval.destroy({ where: { sessionId: session.id } });
      await session.destroy();
      res.clearCookie("sessionId");
      res.clearCookie("refreshToken");
      return res
        .status(403)
        .json({ message: "Invalid token. Please login again" });
    }

    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const oldDeviceInfoId = session.deviceInfoId;
    const oldFingerprint = session.fingerprint;

    // Delete approval record first — it holds a FK to sessions(id)
    await DeviceApproval.destroy({ where: { sessionId: session.id } });
    await session.destroy();

    const newAccessToken = generateToken(user.id, user.role);
    const newRefreshToken = generateRefreshToken(user.id, user.role);
    const newSessionId = uuidv4();
    const expiresAt = new Date(
      Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );

    await Session.create({
      id: newSessionId,
      userId: user.id,
      deviceInfoId: oldDeviceInfoId ?? null,
      refreshToken: newRefreshToken,
      status: "active",
      fingerprint: oldFingerprint ?? null,
      lastActiveAt: new Date(),
      expiresAt,
    });

    res.cookie("sessionId", newSessionId, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    });
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({ accessToken: newAccessToken });
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const sessionId = req.cookies.sessionId;

    if (sessionId) {
      await Session.destroy({ where: { id: sessionId } });
    }

    res.clearCookie("sessionId");
    res.clearCookie("refreshToken");

    return res.json({ message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

export const logoutAll = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.auth) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.auth.userId;

    await Session.destroy({ where: { userId } });

    res.clearCookie("sessionId");
    res.clearCookie("refreshToken");

    return res.json({ message: "Logged out from all devices successfully" });
  } catch (error) {
    next(error);
  }
};
