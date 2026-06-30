import { NextFunction, Request, Response } from "express";
import { Op, fn, col, literal } from "sequelize";
import { RequestLog } from "../models/requestLog.model";
import { ErrorLog } from "../models/errorLog.model";
import { EndpointMetrics } from "../models/endpointMetrics.model";
import { SystemHealth } from "../models/systemHealth.model";
import { Session } from "../models/session.model";
const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export const getOverview = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const today = todayStart();

    const [
      totalRequestsToday,
      errorCountToday,
      avgResponseTime,
      activeSessions,
      latestHealth,
    ] = await Promise.all([
      RequestLog.count({ where: { createdAt: { [Op.gte]: today } } }),
      ErrorLog.count({ where: { createdAt: { [Op.gte]: today } } }),
      RequestLog.findOne({
        attributes: [[fn("AVG", col("responseTimeMs")), "avg"]],
        where: { createdAt: { [Op.gte]: today } },
        raw: true,
      }),
      Session.count({
        where: { status: "active", expiresAt: { [Op.gt]: new Date() } },
      }),
      SystemHealth.findOne({ order: [["createdAt", "DESC"]] }),
    ]);

    const avg = (avgResponseTime as unknown as { avg: string | null })?.avg;

    return res.json({
      totalRequestsToday,
      errorCountToday,
      errorRate:
        totalRequestsToday > 0
          ? ((errorCountToday / totalRequestsToday) * 100).toFixed(2)
          : "0.00",
      avgResponseTimeMs: avg ? Math.round(parseFloat(avg)) : 0,
      activeSessions,
      system: latestHealth ?? null,
    });
  } catch (err) {
    // return res.status(500).json({ message: "Internal Server Error" });
    next(err);
  }
};

export const getErrors = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const resolved = req.query.resolved;
    const type = req.query.type as string | undefined;
    const endpoint = req.query.endpoint as string | undefined;

    const where: Record<string, unknown> = {};
    if (resolved !== undefined) where.resolved = resolved === "true";
    if (type) where.errorType = type;
    if (endpoint) where.endpoint = { [Op.iLike]: `%${endpoint}%` };

    const { rows, count } = await ErrorLog.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit,
      offset: (page - 1) * limit,
    });

    return res.json({
      errors: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    });
  } catch {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getErrorById = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const error = await ErrorLog.findByPk(req.params.id, {
      include: [{ model: RequestLog, as: "requestLog" }],
    });
    if (!error) return res.status(404).json({ message: "Error not found" });
    return res.json({ error });
  } catch {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const resolveError = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const error = await ErrorLog.findByPk(req.params.id);
    if (!error) return res.status(404).json({ message: "Error not found" });

    await error.update({
      resolved: true,
      resolvedBy: req.auth!.userId,
      resolvedAt: new Date(),
    });

    return res.json({ message: "Error marked as resolved" });
  } catch {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getEndpointMetrics = async (req: Request, res: Response) => {
  try {
    const metrics = await EndpointMetrics.findAll({
      order: [["errorCount", "DESC"]],
    });
    return res.json({ metrics });
  } catch {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getSlowEndpoints = async (req: Request, res: Response) => {
  try {
    const threshold = parseInt(req.query.threshold as string) || 500;
    const endpoints = await EndpointMetrics.findAll({
      where: { p95ResponseMs: { [Op.gt]: threshold } },
      order: [["p95ResponseMs", "DESC"]],
    });
    return res.json({ endpoints });
  } catch {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getRequestLogs = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const endpoint = req.query.endpoint as string | undefined;
    const status = req.query.status as string | undefined;

    const where: Record<string, unknown> = {};
    if (endpoint) where.endpoint = { [Op.iLike]: `%${endpoint}%` };
    if (status) where.statusCode = parseInt(status);

    const { rows, count } = await RequestLog.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit,
      offset: (page - 1) * limit,
    });

    return res.json({
      logs: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    });
  } catch {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getSystemHealth = async (req: Request, res: Response) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const snapshots = await SystemHealth.findAll({
      where: { createdAt: { [Op.gte]: since } },
      order: [["createdAt", "ASC"]],
    });
    return res.json({ snapshots });
  } catch {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
