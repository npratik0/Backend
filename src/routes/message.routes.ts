import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { listMessages, sendMessage } from "../controllers/message.controller";

const router = Router();

router.use(authenticate);

router.get("/:bookingId/messages", listMessages);
router.post("/:bookingId/messages", sendMessage);

export default router;
