import { Request, Response, NextFunction } from "express";
import { Op } from "sequelize";
import { Booking } from "../models/booking.model";
import { Provider } from "../models/provider.model";
import { User } from "../models/user.model";
import { Message } from "../models/message.model";
import { notify } from "../utils/notify";
import { getIO, roomForBooking } from "../realtime/socket";

/**
 * Resolves a booking and the requester's relationship to it. Returns the
 * booking, the requester's role in the conversation, and the counterpart's
 * user id (for notifications) — or null if the requester isn't a participant.
 */
async function resolveAccess(userId: number, bookingId: string) {
  const booking = await Booking.findByPk(bookingId);
  if (!booking) return null;

  if (booking.userId === userId) {
    const provider = await Provider.findByPk(booking.providerId);
    return { booking, role: "customer" as const, counterpartUserId: provider?.userId ?? null };
  }

  const provider = await Provider.findByPk(booking.providerId);
  if (provider && provider.userId === userId) {
    return { booking, role: "provider" as const, counterpartUserId: booking.userId };
  }

  return null;
}

export const listMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.auth) return res.status(401).json({ message: "Not authenticated" });

    const access = await resolveAccess(req.auth.userId, String(req.params.bookingId));
    if (!access) return res.status(404).json({ message: "Conversation not found" });

    const messages = await Message.findAll({
      where: { bookingId: access.booking.id },
      order: [["createdAt", "ASC"]],
    });

    // Mark the counterpart's messages as read now that this participant sees them.
    await Message.update(
      { read: true },
      {
        where: {
          bookingId: access.booking.id,
          senderRole: { [Op.ne]: access.role },
          read: false,
        },
      },
    );

    return res.json({ messages, role: access.role });
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.auth) return res.status(401).json({ message: "Not authenticated" });

    const access = await resolveAccess(req.auth.userId, String(req.params.bookingId));
    if (!access) return res.status(404).json({ message: "Conversation not found" });

    const body = String(req.body.body ?? "").trim();
    if (!body) return res.status(400).json({ message: "Message can't be empty" });

    const message = await Message.create({
      bookingId: access.booking.id,
      senderId: req.auth.userId,
      senderRole: access.role,
      body,
      read: false,
    });

    // Push to anyone with this booking's conversation open right now — the
    // sender's own socket is in the room too, so both sides update instantly.
    getIO()?.to(roomForBooking(access.booking.id)).emit("message:new", message);

    if (access.counterpartUserId) {
      const sender = await User.findByPk(req.auth.userId);
      await notify({
        userId: access.counterpartUserId,
        type: "message",
        title: `New message from ${sender?.fullName ?? "your booking"}`,
        body: body.length > 80 ? `${body.slice(0, 80)}…` : body,
        bookingId: access.booking.id,
      });
    }

    return res.status(201).json({ message });
  } catch (error) {
    next(error);
  }
};
