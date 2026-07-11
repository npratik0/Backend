import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import {
  listNotifications,
  markRead,
  markAllRead,
} from "../controllers/notification.controller";

const router = Router();

router.use(authenticate);

router.get("/", listNotifications);
router.patch("/read-all", markAllRead);
router.patch("/:id/read", markRead);

export default router;
