import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { getProfile } from "../controllers/auth.controller";
import {
  getTrustedDevices,
  removeTrustedDevice,
} from "../controllers/trustedDevice.controller";

const router = Router();

router.get("/profile", authenticate, getProfile);
router.get("/trusted-devices", authenticate, getTrustedDevices);
router.delete("/trusted-devices/:id", authenticate, removeTrustedDevice);

export default router;
