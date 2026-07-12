import { Booking } from "../models/booking.model";

/** Free cancellation window — cancel at least this many hours ahead for a full refund. */
export const CANCELLATION_CUTOFF_HOURS = 4;
/** Portion of the total retained as a fee for late cancellations. */
export const LATE_CANCELLATION_FEE_RATE = 0.3;

export interface CancellationOutcome {
  fee: number;
  refund: number;
  lateCancellation: boolean;
}

/**
 * Computes the fee/refund split for a customer-initiated cancellation.
 * Bookings still awaiting provider acceptance, or cancelled before the cutoff,
 * are always free. Late cancellations of accepted bookings retain a fee.
 */
export function computeCancellation(booking: Booking, now = new Date()): CancellationOutcome {
  const hoursUntil = (new Date(booking.scheduledAt).getTime() - now.getTime()) / (1000 * 60 * 60);
  const stillPending = booking.status === "requested";
  const lateCancellation = !stillPending && hoursUntil < CANCELLATION_CUTOFF_HOURS;

  if (!lateCancellation) {
    return { fee: 0, refund: booking.totalAmount, lateCancellation: false };
  }

  const fee = Math.round(booking.totalAmount * LATE_CANCELLATION_FEE_RATE);
  return { fee, refund: booking.totalAmount - fee, lateCancellation: true };
}
