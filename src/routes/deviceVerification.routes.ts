import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import {
  getSessionStatus,
  getPendingApprovals,
  approveDevice,
  rejectDevice,
  emailRecovery,
  verifyRecovery,
} from "../controllers/deviceVerification.controller";

const router = Router();

router.get("/status/:sessionId", getSessionStatus);
router.post("/email-recovery", emailRecovery);
router.post("/verify-recovery", verifyRecovery);

router.get("/pending", authenticate, getPendingApprovals);
router.post("/approve", authenticate, approveDevice);
router.post("/reject", authenticate, rejectDevice);

export default router;
