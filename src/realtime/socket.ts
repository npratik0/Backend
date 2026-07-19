import type { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { Booking } from "../models/booking.model";
import { Provider } from "../models/provider.model";

interface SocketAuth {
  userId: number;
  role: string;
}

let io: SocketIOServer | null = null;

export function roomForBooking(bookingId: string) {
  return `booking:${bookingId}`;
}

async function canAccessBooking(userId: number, bookingId: string): Promise<boolean> {
  const booking = await Booking.findByPk(bookingId);
  if (!booking) return false;
  if (booking.userId === userId) return true;
  const provider = await Provider.findByPk(booking.providerId);
  return !!provider && provider.userId === userId;
}

/**
 * Boots Socket.IO on top of the shared HTTP server. Auth mirrors the REST
 * `authenticate` middleware — the same access token is verified here, just
 * once at handshake time instead of per-request.
 */
export function initSocket(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: "http://localhost:3000",
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error("Unauthorized"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number; role: string };
      (socket.data as SocketAuth).userId = decoded.userId;
      (socket.data as SocketAuth).role = decoded.role;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const { userId } = socket.data as SocketAuth;

    // A participant joins the room for a specific booking's conversation —
    // verified server-side so a stolen bookingId can't be used to eavesdrop.
    socket.on("join-booking", async (bookingId: string, ack?: (ok: boolean) => void) => {
      if (typeof bookingId !== "string") return ack?.(false);
      const allowed = await canAccessBooking(userId, bookingId);
      if (allowed) socket.join(roomForBooking(bookingId));
      ack?.(allowed);
    });

    socket.on("leave-booking", (bookingId: string) => {
      if (typeof bookingId === "string") socket.leave(roomForBooking(bookingId));
    });
  });

  return io;
}

/** Returns the live Socket.IO server, or null if it hasn't booted yet (never
 * throws — callers should no-op the broadcast rather than fail the request). */
export function getIO(): SocketIOServer | null {
  return io;
}
