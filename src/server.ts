import dotenv from "dotenv";
import app from "./app";
import { connectDB, sequelize } from "./config/db";
import "./models/deviceInfo.model";
import "./models/requestLog.model";
import "./models/errorLog.model";
import "./models/endpointMetrics.model";
import "./models/systemHealth.model";
import "./models/trustedDevice.model";
import "./models/deviceApproval.model";
// import { Session } from "./models/session.model";
// import { DeviceInfo } from "./models/deviceInfo.model";
// import { DeviceApproval } from "./models/deviceApproval.model";
// import { TrustedDevice } from "./models/trustedDevice.model";

// Session.belongsTo(DeviceInfo, { foreignKey: "deviceInfoId" });
// DeviceApproval.belongsTo(Session, { foreignKey: "sessionId", targetKey: "id" });
// TrustedDevice.belongsTo(DeviceInfo, { foreignKey: "deviceInfoId" });

import { Session } from "./models/session.model";
import { DeviceInfo } from "./models/deviceInfo.model";
import { DeviceApproval } from "./models/deviceApproval.model";
import { TrustedDevice } from "./models/trustedDevice.model";

Session.belongsTo(DeviceInfo, { foreignKey: "deviceInfoId" });
DeviceApproval.belongsTo(Session, { foreignKey: "sessionId", targetKey: "id" });
TrustedDevice.belongsTo(DeviceInfo, { foreignKey: "deviceInfoId" });

dotenv.config();

const PORT = process.env.PORT || 5050;

const startServer = async () => {
  try {
    await connectDB();
    await sequelize.sync({ alter: true });
    // await sequelize.sync({ force: true });

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
