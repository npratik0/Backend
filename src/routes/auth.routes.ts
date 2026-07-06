import { Router } from "express";
import {
  forgotPassword,
  login,
  logout,
  refreshAccessToken,
  register,
  resendOtp,
  resetPassword,
  logoutAll,
  verifyEmail,
} from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { googleCallback } from "../controllers/oauth.controller";
import passport from "../config/passport";
import {
  forgotPasswordSchema,
  LoginSchema,
  registerSchema,
  resendOtpSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "../validators/auth.validator";
import { validate } from "../middlewares/validate.middleware";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/verify-email", validate(verifyEmailSchema), verifyEmail);
router.post("/login", validate(LoginSchema), login);
router.post("/forget-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);
router.post("/resend-otp", validate(resendOtpSchema), resendOtp);
router.post("/refresh-token", refreshAccessToken);
router.post("/logout", authenticate, logout);
router.post("/logout-all", authenticate, logoutAll);

// Google OAuth routes
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
    prompt: "select_account",
  }),
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login",
  }),
  googleCallback,
);

export default router;
