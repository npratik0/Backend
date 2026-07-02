import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Session } from "../models/session.model";

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Access token required" });
    }

    const token = authHeader.split(" ")[1];
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    const sessionId = req.cookies?.sessionId;
    if (sessionId) {
      const session = await Session.findByPk(sessionId);

      if (session) {
        if (session.status === "pending") {
          return res
            .status(403)
            .json({
              message: "Device verification pending",
              code: "DEVICE_PENDING",
            });
        }
        if (session.status === "rejected") {
          return res
            .status(403)
            .json({
              message: "This device was rejected",
              code: "DEVICE_REJECTED",
            });
        }
        if (session.status === "expired") {
          return res
            .status(403)
            .json({
              message: "Session expired — please sign in again",
              code: "SESSION_EXPIRED",
            });
        }

        // Update last active timestamp on every authenticated request
        await session.update({ lastActiveAt: new Date() });
      }
    }

    req.auth = {
      userId: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
