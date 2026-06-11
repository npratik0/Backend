import { Router } from "express";
import { forgotPassword, login, logout, refreshAccessToken, register, resendOtp, resetPassword, logoutAll } from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forget-password", forgotPassword);
router.post("/reset-password",resetPassword);
router.post("/resend-otp",resendOtp);
router.post("/refresh-token",refreshAccessToken);
router.post("/logout",authenticate,logout);
router.post("/logout-all",authenticate,logoutAll);

export default router;