import { Booking, BookingStatus } from "../models/booking.model";

/**
 * Booking status is now driven by real actor actions (customer requests,
 * provider accepts/declines and updates en_route/arrived/in_progress/
 * completed via the provider dashboard) rather than wall-clock guessing.
 * The only time-derived behavior left is a safety net: if a confirmed
 * booking's whole scheduled window has elapsed and nobody ever marked it
 * complete, treat it as completed rather than leaving it stuck forever.
 */
export function computeLiveStatus(booking: Booking): BookingStatus {
  const passthroughStatuses: BookingStatus[] = [
    "requested",
    "declined",
    "notified",
    "en_route",
    "arrived",
    "in_progress",
    "completed",
    "cancelled",
  ];
  if (passthroughStatuses.includes(booking.status)) return booking.status;

  // status === "confirmed"
  const end = new Date(booking.scheduledAt).getTime() + booking.durationMinutes * 60 * 1000;
  if (Date.now() > end) return "completed";
  return "confirmed";
}

export function generateBookingReference(): string {
  const year = new Date().getFullYear();
  const suffix = Math.floor(100000 + Math.random() * 900000);
  return `KRY-${year}-${suffix}`;
}
