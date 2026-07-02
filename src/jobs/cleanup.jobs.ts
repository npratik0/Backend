import cron from "node-cron";
import { Op } from "sequelize";
import { Session } from "../models/session.model";
import { Otp } from "../models/otp.models";
import { RequestLog } from "../models/requestLog.model";
import { EndpointMetrics } from "../models/endpointMetrics.model";
import { SystemHealth } from "../models/systemHealth.model";
import os from "os";
import { sequelize } from "../config/db";
import { DeviceApproval } from "../models/deviceApproval.model";

export const startCleanupJob = () => {
  cron.schedule("*/10 * * * *", async () => {
    try {
      const deleted = await Otp.destroy({
        where: { expiresAt: { [Op.lt]: new Date() } },
      });
      console.log(`[Cleanup] Deleted ${deleted} expired OTP(s)`);
    } catch (error) {
      console.error("[Cleanup] OTP cleanup failed:", error);
    }
  });

  cron.schedule("0 * * * *", async () => {
    try {
      const deleted = await Session.destroy({
        where: { expiresAt: { [Op.lt]: new Date() } },
      });
      console.log(`[Cleanup] Deleted ${deleted} expired session(s)`);
    } catch (error) {
      console.error("[Cleanup] Session cleanup failed:", error);
    }
  });

  cron.schedule("5 * * * *", async () => {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const today = new Date().toISOString().split("T")[0];

      const logs = await RequestLog.findAll({
        where: { createdAt: { [Op.gte]: oneHourAgo } },
        raw: true,
      });

      if (logs.length === 0) return;

      // Group by endpoint + method
      const groups: Record<string, typeof logs> = {};
      for (const log of logs) {
        const key = `${log.method}:${log.endpoint}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(log);
      }

      for (const [key, entries] of Object.entries(groups)) {
        const [method, endpoint] = key.split(":");
        const times = entries
          .map((e) => e.responseTimeMs)
          .sort((a, b) => a - b);
        const total = entries.length;
        const errors = entries.filter((e) => e.statusCode >= 400).length;
        const avg = Math.round(times.reduce((a, b) => a + b, 0) / total);
        const min = times[0];
        const max = times[times.length - 1];
        const p95 = times[Math.floor(total * 0.95)] ?? max;

        await EndpointMetrics.upsert({
          endpoint,
          method,
          bucketDate: today,
          totalRequests: total,
          successCount: total - errors,
          errorCount: errors,
          avgResponseMs: avg,
          minResponseMs: min,
          maxResponseMs: max,
          p95ResponseMs: p95,
        });
      }

      console.log(
        `[Metrics] Aggregated ${logs.length} request(s) into endpoint metrics`,
      );
    } catch (err) {
      console.error("[Metrics] Aggregation failed:", err);
    }
  });

  // delete log older than 30 days
  cron.schedule("0 2 * * *", async () => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const deleted = await RequestLog.destroy({
        where: { createdAt: { [Op.lt]: thirtyDaysAgo } },
      });
      if (deleted > 0)
        console.log(`[Cleanup] Deleted ${deleted} old request log(s)`);
    } catch (err) {
      console.error("[Cleanup] Request log cleanup failed:", err);
    }
  });

  // snapshot health every 5 min
  cron.schedule("*/5 * * * *", async () => {
    try {
      // CPU usage — average across all cores
      const cpus = os.cpus();
      const cpuPct =
        cpus.reduce((acc, cpu) => {
          const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
          return acc + ((total - cpu.times.idle) / total) * 100;
        }, 0) / cpus.length;

      // Memory
      const memTotal = Math.round(os.totalmem() / 1024 / 1024);
      const memUsed = Math.round((os.totalmem() - os.freemem()) / 1024 / 1024);

      // DB ping
      const dbStart = Date.now();
      await sequelize.query("SELECT 1");
      const dbResponseMs = Date.now() - dbStart;

      // Active sessions count as active connections
      const activeConnections = await Session.count({
        where: { status: "active", expiresAt: { [Op.gt]: new Date() } },
      });

      await SystemHealth.create({
        cpuUsagePct: Math.round(cpuPct * 100) / 100,
        memoryUsedMb: memUsed,
        memoryTotalMb: memTotal,
        activeConnections,
        dbResponseMs,
        uptimeSeconds: Math.round(process.uptime()),
      });
    } catch (err) {
      console.error("[Health] Snapshot failed:", err);
    }
  });

  cron.schedule("*/5 * * * *", async () => {
    try {
      const expired = await DeviceApproval.findAll({
        where: { status: "pending", expiresAt: { [Op.lt]: new Date() } },
      });

      for (const approval of expired) {
        await Session.update(
          { status: "expired" },
          { where: { id: approval.sessionId } },
        );
        await approval.update({ status: "rejected" });
      }

      if (expired.length > 0) {
        console.log(`[Cleanup] Expired ${expired.length} device approval(s)`);
      }
    } catch (err) {
      console.error("[Cleanup] Device approval expiry failed:", err);
    }
  });

  console.log("[Cleanup] Cron job started");
};
