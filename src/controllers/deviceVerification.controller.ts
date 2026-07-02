import { Request, Response, NextFunction } from "express";
import { Op } from "sequelize";
import { Session } from "../models/session.model";
import { DeviceApproval } from "../models/deviceApproval.model";
import { DeviceInfo } from "../models/deviceInfo.model";
import { TrustedDevice } from "../models/trustedDevice.model";
import { User } from "../models/user.model";
import { Otp } from "../models/otp.models";
import { sendEmail } from "../utils/mailer";

export const getSessionStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { sessionId } = req.params as { sessionId: string };

    const session = await Session.findByPk(sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }
    return res.json({ status: session.status });
  } catch (error) {
    next(error);
  }
};

export const getPendingApprovals = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.auth) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const approvals = await DeviceApproval.findAll({
      where: {
        userId: req.auth.userId,
        status: "pending",
        expiresAt: { [Op.gt]: new Date() },
      },
      include: [{ model: Session, include: [{ model: DeviceInfo }] }],
      order: [["createdAt", "DESC"]],
    });

    return res.json({ approvals });
  } catch (error) {
    next(error);
  }
};

export const approveDevice = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.auth) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { sessionId } = req.body as { sessionId: string };

    const approval = await DeviceApproval.findOne({
      where: { sessionId, userId: req.auth.userId, status: "pending" },
    });
    if (!approval) {
      return res.status(404).json({ message: "Approval request not found" });
    }

    const session = await Session.findByPk(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    await session.update({ status: "active" });
    await approval.update({
      status: "approved",
      approvedBy: req.auth.userId,
      approvedAt: new Date(),
    });

    await TrustedDevice.create({
      userId: req.auth.userId,
      deviceInfoId: session.deviceInfoId,
      fingerprint: session.fingerprint,
      lastSeenAt: new Date(),
    });

    return res.json({ message: "Device Approved" });
  } catch (error) {
    next(error);
  }
};

export const rejectDevice = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.auth) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { sessionId } = req.body as { sessionId: string };

    const approval = await DeviceApproval.findOne({
      where: { sessionId, userId: req.auth.userId, status: "pending" },
    });
    if (!approval) {
      return res.status(404).json({ message: "Approval request not found" });
    }

    const session = await Session.findByPk(sessionId);
    if (session) await session.update({ status: "rejected" });

    await approval.update({ status: "rejected" });

    return res.json({ message: "Device rejected" });
  } catch (error) {
    next(error);
  }
};

export const emailRecovery = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { sessionId } = req.body as { sessionId: string };

    const session = await Session.findOne({
      where: { id: sessionId, status: "pending" },
    });
    if (!session) {
      return res
        .status(404)
        .json({ message: "Session not found or already resolved" });
    }

    const user = await User.findByPk(session.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await Otp.destroy({
      where: { email: user.email, type: "device_recovery" },
    });

    await Otp.create({
      userId: user.id,
      email: user.email,
      otp: token,
      type: "device_recovery",
      expiresAt,
    });

    await sendEmail(
      user.email,
      "Device Verification Code",
      `A new device is trying to sign in to your account. Your verification code is: ${token}. It is valid for 30 minutes. If this wasn't you, ignore this email.`,
    );

    return res.json({ message: "Verification code sent to your email" });
  } catch (error) {
    next(error);
  }
};

export const verifyRecovery = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { sessionId, token } = req.body as {
      sessionId: string;
      token: string;
    };

    const session = await Session.findOne({
      where: { id: sessionId, status: "pending" },
    });
    if (!session) {
      return res
        .status(404)
        .json({ message: "Session not found or already resolved" });
    }

    const user = await User.findByPk(session.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otpRecord = await Otp.findOne({
      where: { email: user.email, type: "device_recovery" },
    });
    if (!otpRecord) {
      return res
        .status(400)
        .json({ message: "Verification code not found or expired" });
    }
    if (new Date() > otpRecord.expiresAt) {
      await otpRecord.destroy();
      return res.status(400).json({ message: "Verification code expired" });
    }
    if (otpRecord.otp !== token) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    await session.update({ status: "active" });

    await DeviceApproval.update(
      { status: "approved", approvedAt: new Date() },
      { where: { sessionId, status: "pending" } },
    );

    await TrustedDevice.create({
      userId: user.id,
      deviceInfoId: session.deviceInfoId,
      fingerprint: session.fingerprint,
      lastSeenAt: new Date(),
    });

    await otpRecord.destroy();

    return res.json({ message: "Device verified successfully" });
  } catch (error) {
    next(error);
  }
};
