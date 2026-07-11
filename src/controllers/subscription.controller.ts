import { Request, Response, NextFunction } from "express";
import { Subscription } from "../models/subscription.model";
import { Provider } from "../models/provider.model";
import { Service } from "../models/service.model";

export const listSubscriptions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.auth) return res.status(401).json({ message: "Not authenticated" });

    const subscriptions = await Subscription.findAll({
      where: { userId: req.auth.userId },
      include: [{ model: Provider, as: "Provider" }, { model: Service, as: "Service" }],
      order: [["createdAt", "DESC"]],
    });

    return res.json({ subscriptions });
  } catch (error) {
    next(error);
  }
};

export const createSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.auth) return res.status(401).json({ message: "Not authenticated" });

    const { providerId, serviceId, frequency, preferredDay, startTime } = req.body;

    const [provider, service] = await Promise.all([
      Provider.findByPk(providerId),
      Service.findByPk(serviceId),
    ]);
    if (!provider) return res.status(404).json({ message: "Provider not found" });
    if (!service) return res.status(404).json({ message: "Service not found" });

    const subscription = await Subscription.create({
      userId: req.auth.userId,
      providerId,
      serviceId,
      frequency,
      preferredDay,
      startTime,
      status: "active",
      lastActiveAt: new Date(),
    });

    const full = await Subscription.findByPk(subscription.id, {
      include: [{ model: Provider, as: "Provider" }, { model: Service, as: "Service" }],
    });

    return res.status(201).json({ subscription: full });
  } catch (error) {
    next(error);
  }
};

export const pauseSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.auth) return res.status(401).json({ message: "Not authenticated" });

    const subscription = await Subscription.findOne({
      where: { id: req.params.id, userId: req.auth.userId },
    });
    if (!subscription) return res.status(404).json({ message: "Subscription not found" });

    await subscription.update({ status: "paused", lastActiveAt: new Date() });
    return res.json({ subscription });
  } catch (error) {
    next(error);
  }
};

export const resumeSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.auth) return res.status(401).json({ message: "Not authenticated" });

    const subscription = await Subscription.findOne({
      where: { id: req.params.id, userId: req.auth.userId },
    });
    if (!subscription) return res.status(404).json({ message: "Subscription not found" });

    await subscription.update({ status: "active", lastActiveAt: new Date() });
    return res.json({ subscription });
  } catch (error) {
    next(error);
  }
};

export const deleteSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.auth) return res.status(401).json({ message: "Not authenticated" });

    const subscription = await Subscription.findOne({
      where: { id: req.params.id, userId: req.auth.userId },
    });
    if (!subscription) return res.status(404).json({ message: "Subscription not found" });

    await subscription.destroy();
    return res.json({ message: "Subscription removed" });
  } catch (error) {
    next(error);
  }
};
