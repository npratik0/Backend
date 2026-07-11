import { Request, Response, NextFunction } from "express";
import { Notification } from "../models/notification.model";

export const listNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.auth) return res.status(401).json({ message: "Not authenticated" });

    const notifications = await Notification.findAll({
      where: { userId: req.auth.userId },
      order: [["createdAt", "DESC"]],
      limit: 30,
    });

    const unreadCount = await Notification.count({
      where: { userId: req.auth.userId, read: false },
    });

    return res.json({ notifications, unreadCount });
  } catch (error) {
    next(error);
  }
};

export const markRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.auth) return res.status(401).json({ message: "Not authenticated" });

    await Notification.update(
      { read: true },
      { where: { id: req.params.id, userId: req.auth.userId } },
    );

    return res.json({ message: "Marked read" });
  } catch (error) {
    next(error);
  }
};

export const markAllRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.auth) return res.status(401).json({ message: "Not authenticated" });

    await Notification.update(
      { read: true },
      { where: { userId: req.auth.userId, read: false } },
    );

    return res.json({ message: "All marked read" });
  } catch (error) {
    next(error);
  }
};
