import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";

export type SubscriptionFrequency = "weekly" | "biweekly" | "monthly";
export type SubscriptionStatus = "active" | "paused";

export class Subscription extends Model {
  public id!: number;
  public userId!: number;
  public providerId!: number;
  public serviceId!: number;
  public frequency!: SubscriptionFrequency;
  public preferredDay!: string;
  public startTime!: string;
  public status!: SubscriptionStatus;
  public lastActiveAt!: Date | null;
}

Subscription.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    providerId: { type: DataTypes.INTEGER, allowNull: false },
    serviceId: { type: DataTypes.INTEGER, allowNull: false },
    frequency: {
      type: DataTypes.ENUM("weekly", "biweekly", "monthly"),
      allowNull: false,
      defaultValue: "weekly",
    },
    preferredDay: { type: DataTypes.STRING, allowNull: false },
    startTime: { type: DataTypes.STRING, allowNull: false },
    status: {
      type: DataTypes.ENUM("active", "paused"),
      allowNull: false,
      defaultValue: "active",
    },
    lastActiveAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    tableName: "subscriptions",
    timestamps: true,
  },
);
