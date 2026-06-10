import dotenv from "dotenv";
import app from "./app";
import { connectDB, sequelize } from "./config/db";

dotenv.config();

const PORT = process.env.PORT || 5050;

const startServer = async () => {
  try {
    await connectDB();
    await sequelize.sync({ alter: true });

    console.log("Database synced successfully");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();