import express from "express";
import path from "path";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import adminRoutes from "./routes/admin.routes";
import sessionRoutes from "./routes/session.routes";
import observabilityRoutes from "./routes/observability.routes";
import { startCleanupJob } from "./jobs/cleanup.jobs";
import passport from "passport";
import cors from "cors";

import cookieParser from "cookie-parser";
import { requestLogMiddleware } from "./middlewares/requestLog.middleware";
import { errorHandlerMiddleware } from "./middlewares/errorHandler.middleware";
import deviceVerificationRoutes from "./routes/deviceVerification.routes";
import catalogRoutes from "./routes/catalog.routes";
import bookingRoutes from "./routes/booking.routes";
import subscriptionRoutes from "./routes/subscription.routes";
import uploadRoutes from "./routes/upload.routes";
import providerRoutes from "./routes/provider.routes";
import messageRoutes from "./routes/message.routes";
import notificationRoutes from "./routes/notification.routes";

const app = express();
startCleanupJob();

app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.use(requestLogMiddleware);

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/observability", observabilityRoutes);
app.use("/api/auth/device", deviceVerificationRoutes);
app.use("/api/catalog", catalogRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/provider", providerRoutes);
app.use("/api/conversations", messageRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.use(errorHandlerMiddleware);

export default app;
