import { Router } from "express";
import { forgotPassword, login, logout, refreshAccessToken, register, resendOtp, resetPassword, logoutAll } from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { googleCallback } from "../controllers/oauth.controller";
import passport from "../config/passport";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forget-password", forgotPassword);
router.post("/reset-password",resetPassword);
router.post("/resend-otp",resendOtp);
router.post("/refresh-token",refreshAccessToken);
router.post("/logout",authenticate,logout);
router.post("/logout-all",authenticate,logoutAll);

// Google OAuth routes
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
    prompt: "select_account",
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/login" }),
  googleCallback
);

export default router;