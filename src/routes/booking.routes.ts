import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  createBookingSchema,
  rescheduleBookingSchema,
  submitReviewSchema,
} from "../validators/booking.validator";
import {
  createBooking,
  listBookings,
  getBooking,
  cancelBooking,
  rescheduleBooking,
  getReview,
  submitReview,
  getAnalytics,
} from "../controllers/booking.controller";
import { raiseDispute } from "../controllers/dispute.controller";

const router = Router();

router.use(authenticate);

router.get("/analytics", getAnalytics);
router.post("/", validate(createBookingSchema), createBooking);
router.get("/", listBookings);
router.get("/:id", getBooking);
router.patch("/:id/cancel", cancelBooking);
router.patch("/:id/reschedule", validate(rescheduleBookingSchema), rescheduleBooking);
router.get("/:id/review", getReview);
router.post("/:id/review", validate(submitReviewSchema), submitReview);
router.post("/:id/dispute", raiseDispute);

export default router;
