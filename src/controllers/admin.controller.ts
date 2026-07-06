import { NextFunction, Request, Response } from "express";
import { Op } from "sequelize";
import { User } from "../models/user.model";
import { Provider } from "../models/provider.model";
import { Service } from "../models/service.model";
import { Booking } from "../models/booking.model";

export const getAllUsers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const search = (req.query.search as string) ?? "";
    const role = req.query.role as string | undefined;

    const where: Record<string, unknown> = {};
    if (search) {
      where[Op.or as unknown as string] = [
        { fullName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (role) where.role = role;

    const { rows, count } = await User.findAndCountAll({
      where,
      attributes: { exclude: ["password", "refreshToken"] },
      order: [["createdAt", "DESC"]],
      limit,
      offset: (page - 1) * limit,
    });

    return res.status(200).json({ users: rows, total: count, page, limit });
  } catch (error) {
    next(error);
  }
};

export const updateUserRole = async (
  req: Request<{ id: string }, { role: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.auth) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const { id } = req.params;
    const { role } = req.body;

    if (!["user", "provider", "admin", "superadmin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "superadmin" && req.auth.role !== "superadmin") {
      return res.status(403).json({ message: "Cannot modify a superadmin" });
    }

    await user.update({ role });

    return res.status(200).json({
      message: `Role updated to ${role}`,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (error) {
    // return res.status(500).json({ message: 'Internal Server Error' });
    next(error);
  }
};

export const deleteUser = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "superadmin") {
      return res.status(403).json({ message: "Cannot delete a superadmin" });
    }

    await user.destroy();

    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    // return res.status(500).json({ message: 'Internal Server Error' });
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Provider approval queue
// ---------------------------------------------------------------------------

export const getProviders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const status = req.query.status as string | undefined;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const { rows, count } = await Provider.findAndCountAll({
      where,
      include: [{ model: User, as: "User", attributes: ["email", "phoneNumber", "createdAt"] }],
      order: [["createdAt", "DESC"]],
      limit,
      offset: (page - 1) * limit,
    });

    return res.json({ providers: rows, total: count, page, limit });
  } catch (error) {
    next(error);
  }
};

const setProviderStatus = (status: "approved" | "rejected" | "suspended") =>
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const provider = await Provider.findByPk(req.params.id);
      if (!provider) return res.status(404).json({ message: "Provider not found" });

      await provider.update({ status, statusReason: req.body?.reason ?? null });
      return res.json({ message: `Provider ${status}`, provider });
    } catch (error) {
      next(error);
    }
  };

export const approveProvider = setProviderStatus("approved");
export const rejectProvider = setProviderStatus("rejected");
export const suspendProvider = setProviderStatus("suspended");

// ---------------------------------------------------------------------------
// Service catalog CRUD
// ---------------------------------------------------------------------------

export const createService = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const service = await Service.create(req.body);
    return res.status(201).json({ service });
  } catch (error) {
    next(error);
  }
};

export const updateService = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const service = await Service.findByPk(req.params.id);
    if (!service) return res.status(404).json({ message: "Service not found" });

    await service.update(req.body);
    return res.json({ service });
  } catch (error) {
    next(error);
  }
};

export const deleteService = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const service = await Service.findByPk(req.params.id);
    if (!service) return res.status(404).json({ message: "Service not found" });

    await service.destroy();
    return res.json({ message: "Service deleted" });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Booking oversight
// ---------------------------------------------------------------------------

export const getAllBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const status = req.query.status as string | undefined;
    const query = req.query.query as string | undefined;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (query) where.bookingReference = { [Op.iLike]: `%${query}%` };

    const { rows, count } = await Booking.findAndCountAll({
      where,
      include: [
        { model: User, attributes: ["fullName", "email"] },
        { model: Provider, as: "Provider", attributes: ["fullName"] },
        { model: Service, as: "Service", attributes: ["name"] },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset: (page - 1) * limit,
    });

    return res.json({ bookings: rows, total: count, page, limit });
  } catch (error) {
    next(error);
  }
};

export const getBookingDetail = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const booking = await Booking.findByPk(req.params.id, {
      include: [
        { model: User, attributes: ["fullName", "email", "phoneNumber"] },
        { model: Provider, as: "Provider" },
        { model: Service, as: "Service" },
      ],
    });
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    return res.json({ booking });
  } catch (error) {
    next(error);
  }
};

export const forceCancelBooking = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    await booking.update({ status: "cancelled", cancelledAt: new Date() });
    return res.json({ message: "Booking cancelled", booking });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Platform overview
// ---------------------------------------------------------------------------

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

export const getPlatformOverview = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const today = startOfToday();
    const weekStart = startOfWeek();

    const [
      totalUsers,
      totalProviders,
      pendingProviders,
      bookingsToday,
      bookingsThisWeek,
      paidBookings,
    ] = await Promise.all([
      User.count(),
      Provider.count({ where: { status: "approved" } }),
      Provider.count({ where: { status: "pending" } }),
      Booking.count({ where: { createdAt: { [Op.gte]: today }, status: { [Op.ne]: "cancelled" } } }),
      Booking.count({ where: { createdAt: { [Op.gte]: weekStart }, status: { [Op.ne]: "cancelled" } } }),
      Booking.findAll({ where: { status: { [Op.notIn]: ["cancelled", "declined", "requested"] } } }),
    ]);

    const revenue = paidBookings.reduce((sum: number, b: Booking) => sum + b.totalAmount, 0);

    return res.json({
      totalUsers,
      totalProviders,
      pendingProviders,
      bookingsToday,
      bookingsThisWeek,
      revenue,
    });
  } catch (error) {
    next(error);
  }
};
