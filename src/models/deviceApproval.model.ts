import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export class DeviceApproval extends Model {
  public id!: number;
  public sessionId!: string;
  public userId!: number;
  public approvedBy!: number | null;
  public status!: ApprovalStatus;
  public approvedAt!: Date | null;
  public expiresAt!: Date;
}

DeviceApproval.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    sessionId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    approvedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected"),
      allowNull: false,
      defaultValue: "pending",
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "device_approvals",
    timestamps: true,
  },
);
