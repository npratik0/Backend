import express from "express";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import adminRoutes from "./routes/admin.routes";
import sessionRoutes from "./routes/session.routes";

import cookieParser from "cookie-parser";

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes)
app.use("/api/sessions",sessionRoutes);

app.get("/", (req, res) => {
  res.send("Server is running");
});

export default app;