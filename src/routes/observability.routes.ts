import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import {
  getOverview,
  getErrors,
  getErrorById,
  resolveError,
  getEndpointMetrics,
  getSlowEndpoints,
  getRequestLogs,
  getSystemHealth,
} from "../controllers/observability.controller";

const router = Router();

// All observability routes require admin or superadmin
router.use(authenticate, authorize("admin", "superadmin"));

router.get("/overview", getOverview);
router.get("/errors", getErrors);
router.get("/errors/:id", getErrorById);
router.patch("/errors/:id/resolve", resolveError);
router.get("/endpoints", getEndpointMetrics);
router.get("/slow-endpoints", getSlowEndpoints);
router.get("/request-logs", getRequestLogs);
router.get("/system", getSystemHealth);

export default router;
