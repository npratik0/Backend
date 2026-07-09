import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  applyProviderSchema,
  updateProviderSchema,
  declineBookingSchema,
  updateBookingStatusSchema,
} from "../validators/provider.validator";
import {
  applyAsProvider,
  getMyProvider,
  updateMyProvider,
  listMyBookings,
  acceptBooking,
  declineBooking,
  updateBookingStatus,
  getMyReviews,
  getMyAnalytics,
} from "../controllers/provider.controller";

const router = Router();

router.use(authenticate);

router.post("/apply", validate(applyProviderSchema), applyAsProvider);

router.use(authorize("provider"));

router.get("/me", getMyProvider);
router.patch("/me", validate(updateProviderSchema), updateMyProvider);
router.get("/bookings", listMyBookings);
router.patch("/bookings/:id/accept", acceptBooking);
router.patch("/bookings/:id/decline", validate(declineBookingSchema), declineBooking);
router.patch("/bookings/:id/status", validate(updateBookingStatusSchema), updateBookingStatus);
router.get("/reviews", getMyReviews);
router.get("/analytics", getMyAnalytics);

export default router;
