import { Router } from "express";
import {
  deleteUser,
  getAllUsers,
  updateUserRole,
  getProviders,
  approveProvider,
  rejectProvider,
  suspendProvider,
  createService,
  updateService,
  deleteService,
  getAllBookings,
  getBookingDetail,
  forceCancelBooking,
  getPlatformOverview,
} from "../controllers/admin.controller";
import { listDisputes, resolveDispute } from "../controllers/dispute.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { validate } from "../middlewares/validate.middleware";
import { providerActionSchema, createServiceSchema, updateServiceSchema } from "../validators/admin.validator";

const router = Router();

router.use(authenticate, authorize("admin", "superadmin"));

router.get("/overview", getPlatformOverview);

router.get("/users", getAllUsers);
router.patch("/users/:id/role", updateUserRole);
router.delete("/users/:id", deleteUser);

router.get("/providers", getProviders);
router.patch("/providers/:id/approve", validate(providerActionSchema), approveProvider);
router.patch("/providers/:id/reject", validate(providerActionSchema), rejectProvider);
router.patch("/providers/:id/suspend", validate(providerActionSchema), suspendProvider);

router.post("/services", validate(createServiceSchema), createService);
router.patch("/services/:id", validate(updateServiceSchema), updateService);
router.delete("/services/:id", deleteService);

router.get("/bookings", getAllBookings);
router.get("/bookings/:id", getBookingDetail);
router.patch("/bookings/:id/cancel", forceCancelBooking);

router.get("/disputes", listDisputes);
router.patch("/disputes/:id/resolve", resolveDispute);

export default router;
