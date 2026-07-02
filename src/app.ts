import express from "express";
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

app.use(requestLogMiddleware);

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/observability", observabilityRoutes);
app.use("/api/auth/device", deviceVerificationRoutes);

app.get("/", (req, res) => {
  res.send("Server is running");
});

// test
app.get("/test-error", (req, res, next) => {
  next(new Error("Test error from route"));
});

app.use(errorHandlerMiddleware);

export default app;
