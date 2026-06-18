import express from "express";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import adminRoutes from "./routes/admin.routes";
import sessionRoutes from "./routes/session.routes";
import { startCleanupJob } from "./jobs/cleanup.jobs";
import passport from "passport";
import cors from "cors"

import cookieParser from "cookie-parser";

const app = express();
startCleanupJob();

app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());


// app.use(cors({
//   origin: "http://localhost:3000",
//   credentials: true,
//   methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//   allowedHeaders: ["Content-Type", "Authorization"],
// }));

// app.options("*", cors());

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE","PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes)
app.use("/api/sessions",sessionRoutes);

app.get("/", (req, res) => {
  res.send("Server is running");
});

export default app;