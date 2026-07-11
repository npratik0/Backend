import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createSubscriptionSchema } from "../validators/booking.validator";
import {
  listSubscriptions,
  createSubscription,
  pauseSubscription,
  resumeSubscription,
  deleteSubscription,
} from "../controllers/subscription.controller";

const router = Router();

router.use(authenticate);

router.get("/", listSubscriptions);
router.post("/", validate(createSubscriptionSchema), createSubscription);
router.patch("/:id/pause", pauseSubscription);
router.patch("/:id/resume", resumeSubscription);
router.delete("/:id", deleteSubscription);

export default router;
