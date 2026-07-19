import { Request, Response, NextFunction } from "express";
import { Provider } from "../models/provider.model";
import { User } from "../models/user.model";
import { Booking } from "../models/booking.model";
import { Service } from "../models/service.model";
import { Review } from "../models/review.model";
import { computeLiveStatus } from "../utils/liveStatus";
import { notify } from "../utils/notify";
import { formatDateTime } from "../utils/datetime";
import { getIO, roomForBooking } from "../realtime/socket";

const withLiveStatus = (booking: Booking) => ({
  ...booking.toJSON(),
  liveStatus: computeLiveStatus(booking),
});

/** Re-loads a booking with the associations the client renders (Provider,
 * Service, Review) so the socket payload is shaped like the REST responses —
 * the customer's detail page reads booking.Provider/.Service directly. */
const reloadFull = (id: string) =>
  Booking.findByPk(id, {
    include: [{ model: Provider, as: "Provider" }, { model: Service, as: "Service" }, { model: Review }],
  });

/** Pushes the updated booking to anyone with its conversation/detail page
 * open right now, so the live status tracker updates instantly instead of
 * waiting for the next poll. */
async function broadcastBookingUpdate(booking: Booking) {
  const full = (await reloadFull(booking.id)) ?? booking;
  getIO()?.to(roomForBooking(booking.id)).emit("booking:updated", withLiveStatus(full));
}

async function getOwnProvider(userId: number) {
  return Provider.findOne({ where: { userId } });
}

export const applyAsProvider = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.auth) return res.status(401).json({ message: "Not authenticated" });

    const existing = await getOwnProvider(req.auth.userId);
    if (existing) {
      return res.status(409).json({ message: "You already have a provider profile" });
    }

    const user = await User.findByPk(req.auth.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { headline, bio, categories, hourlyRate, sessionPrice, experienceYears } = req.body;

    const provider = await Provider.create({
      userId: user.id,
      status: "pending",
      fullName: user.fullName,
      headline,
      bio,
      categories,
      avatarSeed: user.email,
      hourlyRate: hourlyRate ?? null,
      sessionPrice: sessionPrice ?? null,
      experienceYears: experienceYears ?? 0,
      availableNow: false,
      area: "Kathmandu",
    });

    await user.update({ role: "provider" });

    return res.status(201).json({ provider });
  } catch (error) {
    next(error);
  }
};

export const getMyProvider = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.auth) return res.status(401).json({ message: "Not authenticated" });

    const provider = await getOwnProvider(req.auth.userId);
    if (!provider) return res.status(404).json({ message: "No provider profile found" });

    return res.json({ provider });
  } catch (error) {
    next(error);
  }
};

export const updateMyProvider = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.auth) return res.status(401).json({ message: "Not authenticated" });

    const provider = await getOwnProvider(req.auth.userId);
    if (!provider) return res.status(404).json({ message: "No provider profile found" });

    await provider.update(req.body);
    return res.json({ provider });
  } catch (error) {
    next(error);
  }
};

export const listMyBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.auth) return res.status(401).json({ message: "Not authenticated" });

    const provider = await getOwnProvider(req.auth.userId);
    if (!provider) return res.status(404).json({ message: "No provider profile found" });

    const tab = (req.query.tab as string) ?? "requests";

    const bookings = await Booking.findAll({
      where: { providerId: provider.id },
      include: [{ model: Service, as: "Service" }],
      order: [["scheduledAt", "ASC"]],
    });

    const withStatus = bookings.map(withLiveStatus);

    const filtered = withStatus.filter((b) => {
      if (tab === "requests") return b.status === "requested";
      if (tab === "past") return ["completed", "cancelled", "declined"].includes(b.liveStatus);
      // "active" — accepted and not yet finished
      return !["requested", "declined", "cancelled"].includes(b.status) && b.liveStatus !== "completed";
    });

    return res.json({ bookings: filtered });
  } catch (error) {
    next(error);
  }
};

export const acceptBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.auth) return res.status(401).json({ message: "Not authenticated" });

    const provider = await getOwnProvider(req.auth.userId);
    if (!provider) return res.status(404).json({ message: "No provider profile found" });

    const booking = await Booking.findOne({ where: { id: req.params.id, providerId: provider.id } });
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (booking.status !== "requested") {
      return res.status(400).json({ message: "This booking is no longer awaiting a response" });
    }

    await booking.update({ status: "confirmed", acceptedAt: new Date() });
    await broadcastBookingUpdate(booking);

    await notify({
      userId: booking.userId,
      type: "booking_accepted",
      title: "Booking confirmed",
      body: `${provider.fullName} accepted your booking for ${formatDateTime(booking.scheduledAt)}.`,
      bookingId: booking.id,
      email: true,
    });

    return res.json({ booking: withLiveStatus(booking) });
  } catch (error) {
    next(error);
  }
};

export const declineBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.auth) return res.status(401).json({ message: "Not authenticated" });

    const provider = await getOwnProvider(req.auth.userId);
    if (!provider) return res.status(404).json({ message: "No provider profile found" });

    const booking = await Booking.findOne({ where: { id: req.params.id, providerId: provider.id } });
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (booking.status !== "requested") {
      return res.status(400).json({ message: "This booking is no longer awaiting a response" });
    }

    await booking.update({
      status: "declined",
      declinedAt: new Date(),
      declineReason: req.body.reason ?? null,
    });
    await broadcastBookingUpdate(booking);

    await notify({
      userId: booking.userId,
      type: "booking_declined",
      title: "Booking declined",
      body: `${provider.fullName} couldn't take your booking for ${formatDateTime(booking.scheduledAt)}.${
        req.body.reason ? ` Reason: ${req.body.reason}` : ""
      } You can book another pro.`,
      bookingId: booking.id,
      email: true,
    });

    return res.json({ booking: withLiveStatus(booking) });
  } catch (error) {
    next(error);
  }
};

const STATUS_ORDER = ["confirmed", "en_route", "arrived", "in_progress", "completed"];

export const updateBookingStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.auth) return res.status(401).json({ message: "Not authenticated" });

    const provider = await getOwnProvider(req.auth.userId);
    if (!provider) return res.status(404).json({ message: "No provider profile found" });

    const booking = await Booking.findOne({ where: { id: req.params.id, providerId: provider.id } });
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const { status } = req.body as { status: string };
    const currentIndex = STATUS_ORDER.indexOf(booking.status);
    const targetIndex = STATUS_ORDER.indexOf(status);

    if (currentIndex === -1 || targetIndex <= currentIndex) {
      return res.status(400).json({ message: "Invalid status transition" });
    }

    await booking.update({ status: status as Booking["status"] });
    await broadcastBookingUpdate(booking);

    const STATUS_COPY: Record<string, { title: string; body: string }> = {
      en_route: {
        title: "Your pro is on the way",
        body: `${provider.fullName} is heading to your location now.`,
      },
      arrived: {
        title: "Your pro has arrived",
        body: `${provider.fullName} has arrived and is ready to start.`,
      },
      in_progress: {
        title: "Service in progress",
        body: `${provider.fullName} has started your service.`,
      },
      completed: {
        title: "Service completed",
        body: `${provider.fullName} marked your booking complete. Leave a review to earn loyalty credits.`,
      },
    };

    const copy = STATUS_COPY[status];
    if (copy) {
      await notify({
        userId: booking.userId,
        type: status === "completed" ? "booking_completed" : "booking_status",
        title: copy.title,
        body: copy.body,
        bookingId: booking.id,
        email: status === "completed",
      });
    }

    return res.json({ booking: withLiveStatus(booking) });
  } catch (error) {
    next(error);
  }
};

export const getMyReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.auth) return res.status(401).json({ message: "Not authenticated" });

    const provider = await getOwnProvider(req.auth.userId);
    if (!provider) return res.status(404).json({ message: "No provider profile found" });

    const reviews = await Review.findAll({
      where: { providerId: provider.id },
      order: [["createdAt", "DESC"]],
    });

    return res.json({ reviews });
  } catch (error) {
    next(error);
  }
};

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfWeek = () => {
  const d = startOfToday();
  d.setDate(d.getDate() - d.getDay());
  return d;
};

export const getMyAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.auth) return res.status(401).json({ message: "Not authenticated" });

    const provider = await getOwnProvider(req.auth.userId);
    if (!provider) return res.status(404).json({ message: "No provider profile found" });

    const bookings = await Booking.findAll({ where: { providerId: provider.id } });
    const withStatus = bookings.map(withLiveStatus);

    const today = startOfToday();
    const weekStart = startOfWeek();

    const completed = withStatus.filter((b) => b.liveStatus === "completed");
    const totalEarnings = completed.reduce((sum, b) => sum + b.totalAmount, 0);
    const weekEarnings = completed
      .filter((b) => new Date(b.scheduledAt) >= weekStart)
      .reduce((sum, b) => sum + b.totalAmount, 0);

    const todayJobs = withStatus.filter((b) => {
      const scheduled = new Date(b.scheduledAt);
      return (
        scheduled >= today &&
        scheduled < new Date(today.getTime() + 24 * 60 * 60 * 1000) &&
        !["requested", "declined", "cancelled"].includes(b.status)
      );
    });

    const pendingRequests = withStatus.filter((b) => b.status === "requested");

    return res.json({
      totalEarnings,
      weekEarnings,
      completedJobs: completed.length,
      todayJobsCount: todayJobs.length,
      pendingRequestsCount: pendingRequests.length,
      rating: provider.rating,
      reviewCount: provider.reviewCount,
    });
  } catch (error) {
    next(error);
  }
};
