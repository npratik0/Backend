import dotenv from "dotenv";
import http from "http";
import app from "./app";
import { initSocket } from "./realtime/socket";
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
import { User } from "./models/user.model";
import { Service } from "./models/service.model";
import { Provider } from "./models/provider.model";
import { Booking } from "./models/booking.model";
import { Review } from "./models/review.model";
import { Subscription } from "./models/subscription.model";
import { Notification } from "./models/notification.model";
import { Message } from "./models/message.model";
import { Dispute } from "./models/dispute.model";
import { seedCatalog } from "./seed/seed";

Session.belongsTo(DeviceInfo, { foreignKey: "deviceInfoId", as: "DeviceInfo" });
DeviceApproval.belongsTo(Session, { foreignKey: "sessionId", targetKey: "id" });
TrustedDevice.belongsTo(DeviceInfo, { foreignKey: "deviceInfoId" });

User.hasOne(Provider, { foreignKey: "userId", as: "ProviderProfile" });
Provider.belongsTo(User, { foreignKey: "userId", as: "User" });

Booking.belongsTo(User, { foreignKey: "userId" });
Booking.belongsTo(Provider, { foreignKey: "providerId", as: "Provider" });
Booking.belongsTo(Service, { foreignKey: "serviceId", as: "Service" });
Booking.hasOne(Review, { foreignKey: "bookingId" });
Review.belongsTo(Booking, { foreignKey: "bookingId" });
Review.belongsTo(Provider, { foreignKey: "providerId" });
Subscription.belongsTo(Provider, { foreignKey: "providerId", as: "Provider" });
Subscription.belongsTo(Service, { foreignKey: "serviceId", as: "Service" });

Notification.belongsTo(User, { foreignKey: "userId" });
Message.belongsTo(Booking, { foreignKey: "bookingId" });
Booking.hasMany(Message, { foreignKey: "bookingId" });

Dispute.belongsTo(Booking, { foreignKey: "bookingId", as: "Booking" });
Dispute.belongsTo(User, { foreignKey: "raisedByUserId", as: "RaisedBy" });
Booking.hasMany(Dispute, { foreignKey: "bookingId" });

dotenv.config();

const PORT = process.env.PORT || 5050;

const startServer = async () => {
  try {
    await connectDB();
    await sequelize.sync({ alter: true });
    // await sequelize.sync({ force: true });

    console.log("Database synced successfully");

    await seedCatalog();

    const httpServer = http.createServer(app);
    initSocket(httpServer);

    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT} (HTTP + WebSocket)`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
