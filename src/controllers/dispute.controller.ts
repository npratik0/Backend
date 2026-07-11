import { Request, Response, NextFunction } from "express";
import { Booking } from "../models/booking.model";
import { Provider } from "../models/provider.model";
import { User } from "../models/user.model";
import { Service } from "../models/service.model";
import { Dispute } from "../models/dispute.model";
import { notify } from "../utils/notify";

async function resolveParticipant(userId: number, bookingId: string) {
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

// --- Participant: raise a dispute on a booking ---
export const raiseDispute = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.auth) return res.status(401).json({ message: "Not authenticated" });

    const access = await resolveParticipant(req.auth.userId, String(req.params.id));
    if (!access) return res.status(404).json({ message: "Booking not found" });

    if (["requested", "declined"].includes(access.booking.status)) {
      return res.status(400).json({ message: "This booking can't be disputed yet" });
    }
    if (access.booking.disputeStatus === "open") {
      return res.status(409).json({ message: "A dispute is already open for this booking" });
    }

    const reason = String(req.body.reason ?? "").trim();
    if (reason.length < 10) {
      return res.status(400).json({ message: "Please describe the issue in a bit more detail" });
    }

    const dispute = await Dispute.create({
      bookingId: access.booking.id,
      raisedByUserId: req.auth.userId,
      raisedByRole: access.role,
      reason,
      status: "open",
      refundAmount: 0,
    });

    await access.booking.update({ disputeStatus: "open" });

    if (access.counterpartUserId) {
      await notify({
        userId: access.counterpartUserId,
        type: "booking_status",
        title: "A dispute was opened",
        body: `An issue was reported on booking ${access.booking.bookingReference}. Our team will review it.`,
        bookingId: access.booking.id,
      });
    }

    return res.status(201).json({ dispute });
  } catch (error) {
    next(error);
  }
};

// --- Admin: list disputes ---
export const listDisputes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string | undefined;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const disputes = await Dispute.findAll({
      where,
      include: [
        {
          model: Booking,
          as: "Booking",
          include: [
            { model: User, attributes: ["fullName", "email"] },
            { model: Provider, as: "Provider", attributes: ["fullName"] },
            { model: Service, as: "Service", attributes: ["name"] },
          ],
        },
        { model: User, as: "RaisedBy", attributes: ["fullName", "email"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.json({ disputes });
  } catch (error) {
    next(error);
  }
};

// --- Admin: resolve (optionally with a simulated refund) or reject ---
export const resolveDispute = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.auth) return res.status(401).json({ message: "Not authenticated" });

    const dispute = await Dispute.findByPk(String(req.params.id));
    if (!dispute) return res.status(404).json({ message: "Dispute not found" });
    if (dispute.status !== "open") {
      return res.status(400).json({ message: "This dispute is already closed" });
    }

    const { action, resolution, refundAmount } = req.body as {
      action: "resolve" | "reject";
      resolution?: string;
      refundAmount?: number;
    };
    const nextStatus = action === "reject" ? "rejected" : "resolved";
    const refund = action === "resolve" && refundAmount ? Math.max(0, Math.round(refundAmount)) : 0;

    const booking = await Booking.findByPk(dispute.bookingId);

    if (refund > 0 && booking) {
      const customer = await User.findByPk(booking.userId);
      if (customer) {
        await customer.update({ loyaltyCredits: customer.loyaltyCredits + refund });
        await booking.update({ refundAmount: booking.refundAmount + refund });
      }
    }

    await dispute.update({
      status: nextStatus,
      resolution: resolution?.trim() || null,
      refundAmount: refund,
      resolvedByAdminId: req.auth.userId,
      resolvedAt: new Date(),
    });

    if (booking) {
      await booking.update({ disputeStatus: nextStatus });
      // Notify the party who raised it.
      await notify({
        userId: dispute.raisedByUserId,
        type: "booking_status",
        title: nextStatus === "resolved" ? "Dispute resolved" : "Dispute reviewed",
        body:
          nextStatus === "resolved"
            ? `Your reported issue on ${booking.bookingReference} was resolved.${refund > 0 ? ` ${refund} was credited to the customer's wallet.` : ""}`
            : `Your reported issue on ${booking.bookingReference} was reviewed and closed.`,
        bookingId: booking.id,
      });
    }

    return res.json({ dispute });
  } catch (error) {
    next(error);
  }
};
