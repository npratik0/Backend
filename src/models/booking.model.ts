import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";

export type BookingStatus =
  | "requested"
  | "declined"
  | "confirmed"
  | "notified"
  | "en_route"
  | "arrived"
  | "in_progress"
  | "completed"
  | "cancelled";

export type PaymentPlan = "full" | "deposit" | "installments";
export type PaymentMethod = "esewa" | "khalti" | "fonepay" | "card";
export type PaymentStatus = "paid" | "partially_paid";

export class Booking extends Model {
  public id!: string;
  public bookingReference!: string;
  public userId!: number;
  public providerId!: number;
  public serviceId!: number;
  public status!: BookingStatus;
  public scheduledAt!: Date;
  public durationMinutes!: number;
  public address!: string;
  public addressNote!: string | null;
  public basePrice!: number;
  public suppliesFee!: number;
  public platformFee!: number;
  public loyaltyDiscount!: number;
  public totalAmount!: number;
  public paymentPlan!: PaymentPlan;
  public paymentMethod!: PaymentMethod;
  public paymentStatus!: PaymentStatus;
  public depositAmount!: number | null;
  public tipAmount!: number | null;
  public cancelledAt!: Date | null;
  public acceptedAt!: Date | null;
  public declinedAt!: Date | null;
  public declineReason!: string | null;
  public cancellationFee!: number;
  public refundAmount!: number;
  public disputeStatus!: "none" | "open" | "resolved" | "rejected";
}

Booking.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    bookingReference: { type: DataTypes.STRING, allowNull: false, unique: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    providerId: { type: DataTypes.INTEGER, allowNull: false },
    serviceId: { type: DataTypes.INTEGER, allowNull: false },
    status: {
      type: DataTypes.ENUM(
        "requested",
        "declined",
        "confirmed",
        "notified",
        "en_route",
        "arrived",
        "in_progress",
        "completed",
        "cancelled",
      ),
      allowNull: false,
      defaultValue: "requested",
    },
    scheduledAt: { type: DataTypes.DATE, allowNull: false },
    durationMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 180 },
    address: { type: DataTypes.STRING, allowNull: false },
    addressNote: { type: DataTypes.STRING, allowNull: true },
    basePrice: { type: DataTypes.INTEGER, allowNull: false },
    suppliesFee: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    platformFee: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    loyaltyDiscount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    totalAmount: { type: DataTypes.INTEGER, allowNull: false },
    paymentPlan: {
      type: DataTypes.ENUM("full", "deposit", "installments"),
      allowNull: false,
      defaultValue: "full",
    },
    paymentMethod: {
      type: DataTypes.ENUM("esewa", "khalti", "fonepay", "card"),
      allowNull: false,
      defaultValue: "esewa",
    },
    paymentStatus: {
      type: DataTypes.ENUM("paid", "partially_paid"),
      allowNull: false,
      defaultValue: "paid",
    },
    depositAmount: { type: DataTypes.INTEGER, allowNull: true },
    tipAmount: { type: DataTypes.INTEGER, allowNull: true },
    cancelledAt: { type: DataTypes.DATE, allowNull: true },
    acceptedAt: { type: DataTypes.DATE, allowNull: true },
    declinedAt: { type: DataTypes.DATE, allowNull: true },
    declineReason: { type: DataTypes.STRING, allowNull: true },
    cancellationFee: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    refundAmount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    disputeStatus: {
      type: DataTypes.ENUM("none", "open", "resolved", "rejected"),
      allowNull: false,
      defaultValue: "none",
    },
  },
  {
    sequelize,
    tableName: "bookings",
    timestamps: true,
  },
);
