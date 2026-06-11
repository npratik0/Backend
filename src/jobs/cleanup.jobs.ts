import cron from "node-cron";
import { Op } from "sequelize";
import { Session } from "../models/session.model";
import { Otp } from "../models/otp.models";

export const startCleanupJob = () => {

  // clean expired OTPs every 10 minutes
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

  // clean expired sessions every hour
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

  console.log("[Cleanup] Cron job started");
};