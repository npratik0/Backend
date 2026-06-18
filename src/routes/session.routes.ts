import {Router} from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { getSessions, revokeSession } from "../controllers/session.controller";

const router = Router();

router.get("/", authenticate, getSessions);
router.delete("/revoke/:sessionId", authenticate, revokeSession);

export default router;