import { Request, Response, NextFunction } from "express";
import { Booking } from "../models/booking.model";
import { Provider } from "../models/provider.model";
import { Service } from "../models/service.model";
import { Review } from "../models/review.model";
import { User } from "../models/user.model";
import { computeLiveStatus, generateBookingReference } from "../utils/liveStatus";
import { notify } from "../utils/notify";
import { formatDateTime } from "../utils/datetime";
import { computeCancellation } from "../utils/cancellation";
import { getIO, roomForBooking } from "../realtime/socket";

const SUPPLIES_FEE = 150;
const PLATFORM_FEE = 50;
const DEFAULT_DURATION_MINUTES = 180;
const LOYALTY_EARN_RATE = 0.02;

const withLiveStatus = (booking: Booking) => ({
  ...booking.toJSON(),
  liveStatus: computeLiveStatus(booking),
});

/** Re-loads a booking with the associations the client renders (Provider,
 * Service, Review) so mutation responses are shaped like the detail fetch. */
const reloadFull = (id: string) =>
  Booking.findByPk(id, {
    include: [{ model: Provider, as: "Provider" }, { model: Service, as: "Service" }, { model: Review }],
  });

/** Pushes the updated booking to anyone with its conversation/detail page
 * open right now (the provider's dashboard, most importantly). Reloads with
 * associations first — the client renders booking.Provider/.Service directly. */
async function broadcastBookingUpdate(booking: Booking) {
  const full = (await reloadFull(booking.id)) ?? booking;
  getIO()?.to(roomForBooking(booking.id)).emit("booking:updated", withLiveStatus(full));
}

export const createBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.auth) return res.status(401).json({ message: "Not authenticated" });

    const {
      providerId,
      serviceId,
      scheduledAt,
      address,
      addressNote,
      paymentPlan,
      paymentMethod,
      applyLoyaltyCredits,
    } = req.body;

    const [provider, service, user] = await Promise.all([
      Provider.findByPk(providerId),
      Service.findByPk(serviceId),
      User.findByPk(req.auth.userId),
    ]);

    if (!provider) return res.status(404).json({ message: "Provider not found" });
    if (!service) return res.status(404).json({ message: "Service not found" });
    if (!user) return res.status(404).json({ message: "User not found" });

    const basePrice = provider.sessionPrice ?? Math.round((provider.hourlyRate ?? service.basePrice) * 3);
    const subtotal = basePrice + SUPPLIES_FEE + PLATFORM_FEE;

    let loyaltyDiscount = 0;
    if (applyLoyaltyCredits) {
      loyaltyDiscount = Math.min(user.loyaltyCredits, subtotal);
    }
    const totalAmount = subtotal - loyaltyDiscount;

    let depositAmount: number | null = null;
    let paymentStatus: "paid" | "partially_paid" = "paid";
    if (paymentPlan === "deposit") {
      depositAmount = Math.min(300, totalAmount);
      paymentStatus = "partially_paid";
    } else if (paymentPlan === "installments") {
      depositAmount = Math.round(totalAmount / 3);
      paymentStatus = "partially_paid";
    }

    // Providers flagged as "available now" (instant book) skip the request
    // queue; everyone else needs the provider to accept from their dashboard.
    const initialStatus = provider.availableNow ? "confirmed" : "requested";

    const booking = await Booking.create({
      bookingReference: generateBookingReference(),
      userId: user.id,
      providerId: provider.id,
      serviceId: service.id,
      status: initialStatus,
      acceptedAt: initialStatus === "confirmed" ? new Date() : null,
      scheduledAt: new Date(scheduledAt),
      durationMinutes: DEFAULT_DURATION_MINUTES,
      address,
      addressNote: addressNote ?? null,
      basePrice,
      suppliesFee: SUPPLIES_FEE,
      platformFee: PLATFORM_FEE,
      loyaltyDiscount,
      totalAmount,
      paymentPlan,
      paymentMethod,
      paymentStatus,
      depositAmount,
    });

    if (loyaltyDiscount > 0) {
      await user.update({ loyaltyCredits: user.loyaltyCredits - loyaltyDiscount });
    }

    // Notify the provider that a job has come in.
    if (provider.userId) {
      const when = formatDateTime(booking.scheduledAt);
      await notify(
        initialStatus === "confirmed"
          ? {
              userId: provider.userId,
              type: "booking_requested",
              title: "New booking confirmed",
              body: `${user.fullName} booked ${service.name} for ${when}.`,
              bookingId: booking.id,
            }
          : {
              userId: provider.userId,
              type: "booking_requested",
              title: "New booking request",
              body: `${user.fullName} requested ${service.name} for ${when}. Respond to confirm.`,
              bookingId: booking.id,
            },
      );
    }

    const full = await Booking.findByPk(booking.id, {
      include: [{ model: Provider, as: "Provider" }, { model: Service, as: "Service" }],
    });

    return res.status(201).json({ booking: withLiveStatus(full!) });
  } catch (error) {
    next(error);
  }
};

export const listBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.auth) return res.status(401).json({ message: "Not authenticated" });

    const tab = (req.query.tab as string) ?? "upcoming";

    const bookings = await Booking.findAll({
      where: { userId: req.auth.userId },
      include: [{ model: Provider, as: "Provider" }, { model: Service, as: "Service" }, { model: Review }],
      order: [["scheduledAt", "DESC"]],
    });

    const withStatus = bookings.map(withLiveStatus);

    const isDeadEnd = (status: string) => status === "cancelled" || status === "declined";

    const filtered = withStatus.filter((b) => {
      if (tab === "cancelled") return isDeadEnd(b.status);
      if (tab === "past") return !isDeadEnd(b.status) && b.liveStatus === "completed";
      return !isDeadEnd(b.status) && b.liveStatus !== "completed";
    });

    return res.json({ bookings: filtered });
  } catch (error) {
    next(error);
  }
};

export const getBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.auth) return res.status(401).json({ message: "Not authenticated" });

    const booking = await Booking.findOne({
      where: { id: req.params.id, userId: req.auth.userId },
      include: [
        { model: Provider, as: "Provider" },
        { model: Service, as: "Service" },
        { model: Review },
      ],
    });

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    return res.json({ booking: withLiveStatus(booking) });
  } catch (error) {
    next(error);
  }
};

export const cancelBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.auth) return res.status(401).json({ message: "Not authenticated" });

    const booking = await Booking.findOne({
      where: { id: req.params.id, userId: req.auth.userId },
    });
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const liveStatus = computeLiveStatus(booking);
    if (liveStatus === "completed" || liveStatus === "cancelled") {
      return res.status(400).json({ message: "This booking can no longer be cancelled" });
    }

    // Apply the cancellation policy: free before the cutoff, fee retained after.
    // The refund is a simulated ledger adjustment credited to the customer's wallet.
    const { fee, refund, lateCancellation } = computeCancellation(booking);

    await booking.update({
      status: "cancelled",
      cancelledAt: new Date(),
      cancellationFee: fee,
      refundAmount: refund,
    });
    await broadcastBookingUpdate(booking);

    const [provider, customer] = await Promise.all([
      Provider.findByPk(booking.providerId),
      User.findByPk(booking.userId),
    ]);

    if (customer && refund > 0) {
      await customer.update({ loyaltyCredits: customer.loyaltyCredits + refund });
    }

    if (provider?.userId) {
      await notify({
        userId: provider.userId,
        type: "booking_cancelled",
        title: "Booking cancelled",
        body: `${customer?.fullName ?? "A customer"} cancelled their booking for ${formatDateTime(booking.scheduledAt)}.`,
        bookingId: booking.id,
      });
    }

    return res.json({
      message: lateCancellation
        ? `Booking cancelled. A ${fee} fee was applied; ${refund} refunded to your wallet.`
        : `Booking cancelled. ${refund} refunded to your wallet.`,
      booking: withLiveStatus((await reloadFull(booking.id)) ?? booking),
    });
  } catch (error) {
    next(error);
  }
};

export const rescheduleBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.auth) return res.status(401).json({ message: "Not authenticated" });

    const booking = await Booking.findOne({
      where: { id: req.params.id, userId: req.auth.userId },
    });
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const liveStatus = computeLiveStatus(booking);
    if (["completed", "cancelled", "declined"].includes(liveStatus)) {
      return res.status(400).json({ message: "This booking can no longer be rescheduled" });
    }

    // Preserve "requested" — the provider still needs to accept the new
    // time. Any accepted/in-progress state resets to "confirmed" since the
    // old en-route/arrived progress no longer applies to the new slot.
    const nextStatus = booking.status === "requested" ? "requested" : "confirmed";
    await booking.update({ scheduledAt: new Date(req.body.scheduledAt), status: nextStatus });
    return res.json({
      message: "Booking rescheduled",
      booking: withLiveStatus((await reloadFull(booking.id)) ?? booking),
    });
  } catch (error) {
    next(error);
  }
};

export const getReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.auth) return res.status(401).json({ message: "Not authenticated" });

    const booking = await Booking.findOne({
      where: { id: req.params.id, userId: req.auth.userId },
    });
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const review = await Review.findOne({ where: { bookingId: booking.id } });
    return res.json({ review });
  } catch (error) {
    next(error);
  }
};

export const submitReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.auth) return res.status(401).json({ message: "Not authenticated" });

    const booking = await Booking.findOne({
      where: { id: req.params.id, userId: req.auth.userId },
    });
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (computeLiveStatus(booking) !== "completed") {
      return res.status(400).json({ message: "This booking hasn't been completed yet" });
    }

    const existing = await Review.findOne({ where: { bookingId: booking.id } });
    if (existing) return res.status(409).json({ message: "This booking has already been reviewed" });

    const { punctuality, professionalism, communication, qualityOfWork, recommend, comment, tipAmount } =
      req.body;

    const rating = Number(
      ((punctuality + professionalism + communication + qualityOfWork) / 4).toFixed(1),
    );

    const review = await Review.create({
      bookingId: booking.id,
      userId: req.auth.userId,
      providerId: booking.providerId,
      rating,
      punctuality,
      professionalism,
      communication,
      qualityOfWork,
      recommend,
      comment: comment ?? null,
    });

    const provider = await Provider.findByPk(booking.providerId);
    if (provider) {
      const newReviewCount = provider.reviewCount + 1;
      const newRating = Number(
        ((provider.rating * provider.reviewCount + rating) / newReviewCount).toFixed(2),
      );
      await provider.update({ rating: newRating, reviewCount: newReviewCount });
    }

    const user = await User.findByPk(req.auth.userId);
    const earnedCredits = Math.round(booking.totalAmount * LOYALTY_EARN_RATE);
    if (user) {
      await user.update({ loyaltyCredits: user.loyaltyCredits + earnedCredits });
    }

    if (typeof tipAmount === "number" && tipAmount > 0) {
      await booking.update({ tipAmount });
    }

    return res.status(201).json({ review, earnedCredits });
  } catch (error) {
    next(error);
  }
};

export const getAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.auth) return res.status(401).json({ message: "Not authenticated" });

    const bookings = await Booking.findAll({ where: { userId: req.auth.userId } });
    const activeBookings = bookings.filter((b) => b.status !== "cancelled");

    const totalBookings = activeBookings.length;
    const totalSpend = activeBookings.reduce((sum, b) => sum + b.totalAmount, 0);

    const reviews = await Review.findAll({ where: { userId: req.auth.userId } });
    const averageRating = reviews.length
      ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
      : null;

    const user = await User.findByPk(req.auth.userId);

    return res.json({
      totalBookings,
      totalSpend,
      averageRating,
      loyaltyCredits: user?.loyaltyCredits ?? 0,
    });
  } catch (error) {
    next(error);
  }
};
