import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { getProfile, updateOnboarding } from "../controllers/auth.controller";
import {
  getTrustedDevices,
  removeTrustedDevice,
} from "../controllers/trustedDevice.controller";
import { validate } from "../middlewares/validate.middleware";
import { onboardingSchema } from "../validators/auth.validator";

const router = Router();

router.get("/profile", authenticate, getProfile);
router.post("/onboarding", authenticate, validate(onboardingSchema), updateOnboarding);
router.get("/trusted-devices", authenticate, getTrustedDevices);
router.delete("/trusted-devices/:id", authenticate, removeTrustedDevice);

export default router;
