// import { NextFunction, Request, Response } from "express";
// import { v4 as uuidv4 } from "uuid";
// import { Session } from "../models/session.model";
// import { generateToken, generateRefreshToken } from "../utils/jwt";
// import { User } from "../models/user.model";

// export const googleCallback = async (
//   req: Request,
//   res: Response,
//   next: NextFunction,
// ) => {
//   try {
//     const user = req.user as User;

//     if (!user) {
//       return res.redirect(
//         `${process.env.FRONTEND_URL}/login?error=OAuth failed`,
//       );
//     }

//     const accessToken = generateToken(user.id, user.role);
//     const refreshToken = generateRefreshToken(user.id, user.role);

//     const sessionId = uuidv4();
//     const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

//     await Session.create({
//       id: sessionId,
//       userId: user.id,
//       refreshToken,
//       ip: req.ip,
//       device: req.headers["user-agent"] || "unknown",
//       expiresAt,
//       status: "active",
//     });

//     res.cookie("sessionId", sessionId, {
//       httpOnly: true,
//       secure: false,
//       sameSite: "strict",
//       maxAge: 7 * 24 * 60 * 60 * 1000,
//     });

//     res.cookie("accessToken", accessToken, {
//       httpOnly: true,
//       secure: false,
//       sameSite: "strict",
//       maxAge: 15 * 60 * 1000,
//     });

//     res.cookie("refreshToken", refreshToken, {
//       httpOnly: true,
//       secure: false,
//       sameSite: "strict",
//       maxAge: 7 * 24 * 60 * 60 * 1000,
//     });

//     // redirect to frontend with accessToken
//     return res.redirect(
//       `${process.env.FRONTEND_URL}/auth/callback?token=${accessToken}`,
//     );

//     // return res.json({
//     // message: "OAuth login successful",
//     // accessToken,
//     // });
//   } catch (error) {
//     return res.redirect(`${process.env.FRONTEND_URL}/login?error=Server error`);
//   }
// };

import { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { Session } from "../models/session.model";
import { DeviceInfo } from "../models/deviceInfo.model";
import { TrustedDevice } from "../models/trustedDevice.model";
import { generateToken, generateRefreshToken } from "../utils/jwt";
import { getLocation, normalizeIp, parseDevice } from "../utils/device";
import { User } from "../models/user.model";

const SESSION_EXPIRY_DAYS = 7;

export const googleCallback = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = req.user as User;

    if (!user) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=OAuth+failed`,
      );
    }

    const ip = normalizeIp(req.ip);
    const userAgent = req.headers["user-agent"] ?? "";
    const parsed = parseDevice(userAgent);
    const location = getLocation(ip);

    // Find or create DeviceInfo — avoids duplicate rows for the same device
    let deviceInfo = await DeviceInfo.findOne({
      where: { ip, fingerprint: parsed.fingerprint },
    });

    if (!deviceInfo) {
      deviceInfo = await DeviceInfo.create({
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
    }

    // ── OAuth logins are inherently trusted — skip device verification ─────────
    // Google already authenticated the user. Auto-trust this device so they
    // don't get sent through the approval flow on subsequent password logins
    // from the same browser.
    const [trustedDevice] = await TrustedDevice.findOrCreate({
      where: { userId: user.id, fingerprint: parsed.fingerprint },
      defaults: {
        userId: user.id,
        deviceInfoId: deviceInfo.id,
        fingerprint: parsed.fingerprint,
        lastSeenAt: new Date(),
      },
    });

    // Update lastSeenAt if the trusted device already existed
    if (trustedDevice && !trustedDevice.isNewRecord) {
      await trustedDevice.update({
        lastSeenAt: new Date(),
        deviceInfoId: deviceInfo.id,
      });
    }

    // ── Create active session with all required fields ────────────────────────
    const accessToken = generateToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role);
    const sessionId = uuidv4();
    const expiresAt = new Date(
      Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );

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

    // ── Set httpOnly cookies ──────────────────────────────────────────────────
    const cookieOptions = {
      httpOnly: true,
      secure: false,
      sameSite: "strict" as const,
      maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    };

    res.cookie("sessionId", sessionId, cookieOptions);
    res.cookie("refreshToken", refreshToken, cookieOptions);

    // ── Redirect to frontend callback with accessToken ────────────────────────
    // The frontend /auth/callback page reads the token from the URL, stores it
    // in memory, fetches the profile, then navigates to /dashboard.
    return res.redirect(
      `${process.env.FRONTEND_URL}/auth/callback?token=${accessToken}`,
    );
  } catch (error) {
    next(error);
  }
};
