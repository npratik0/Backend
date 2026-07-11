import { Notification, NotificationType } from "../models/notification.model";
import { User } from "../models/user.model";
import { sendEmail } from "./mailer";

interface NotifyInput {
  userId: number;
  type: NotificationType;
  title: string;
  body: string;
  bookingId?: string | null;
  /** When true, also send an email (used for the highest-value events). */
  email?: boolean;
}

/**
 * Records an in-app notification for a user and, for high-value events,
 * best-effort sends an email. Never throws into the caller's request path —
 * a failed email or insert must not break the booking action that triggered it.
 */
export async function notify({ userId, type, title, body, bookingId = null, email = false }: NotifyInput) {
  try {
    await Notification.create({ userId, type, title, body, bookingId, read: false });
  } catch (err) {
    console.error("Failed to create notification:", err);
  }

  if (email) {
    try {
      const user = await User.findByPk(userId);
      if (user?.email) await sendEmail(user.email, title, body);
    } catch (err) {
      console.error("Failed to send notification email:", err);
    }
  }
}
