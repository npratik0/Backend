import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";

export type NotificationType =
  | "booking_requested"
  | "booking_accepted"
  | "booking_declined"
  | "booking_status"
  | "booking_cancelled"
  | "booking_completed"
  | "message";

export class Notification extends Model {
  public id!: number;
  /** Recipient — the user who should see this in their bell. */
  public userId!: number;
  public type!: NotificationType;
  public title!: string;
  public body!: string;
  /** Booking this notification relates to, for deep-linking. */
  public bookingId!: string | null;
  public read!: boolean;
}

Notification.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    type: {
      type: DataTypes.ENUM(
        "booking_requested",
        "booking_accepted",
        "booking_declined",
        "booking_status",
        "booking_cancelled",
        "booking_completed",
        "message",
      ),
      allowNull: false,
    },
    title: { type: DataTypes.STRING, allowNull: false },
    body: { type: DataTypes.STRING, allowNull: false },
    bookingId: { type: DataTypes.UUID, allowNull: true },
    read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  {
    sequelize,
    tableName: "notifications",
    timestamps: true,
  },
);
