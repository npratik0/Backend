import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { Session } from "../models/session.model";
import { generateToken, generateRefreshToken } from "../utils/jwt";

export const googleCallback = async (req: any, res: any) => {
  try {
    const user = req.user;

    if (!user) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=OAuth failed`
      );
    }

    // generate tokens
    const accessToken = generateToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role);

    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await Session.create({
      id: sessionId,
      userId: user.id,
      refreshToken,
      ip: req.ip,
      device: req.headers["user-agent"] || "unknown",
      expiresAt,
    });

    res.cookie("sessionId", sessionId, {
      httpOnly: true,
      secure: false,        
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: false,       
        sameSite: "strict",
        maxAge: 15 * 60 * 1000, 
      });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,        
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // redirect to frontend with accessToken
    // return res.redirect(
    //   `${process.env.FRONTEND_URL}/auth/callback?token=${accessToken}`
    // );

    return res.json({
  message: "OAuth login successful",
  accessToken,
});
  } catch (error) {
    return res.redirect(
      `${process.env.FRONTEND_URL}/login?error=Server error`
    );
  }
};