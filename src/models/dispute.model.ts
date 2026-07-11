import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";

export type DisputeStatus = "open" | "resolved" | "rejected";

/** A dispute raised by either party on a booking, resolved by an admin. */
export class Dispute extends Model {
  public id!: number;
  public bookingId!: string;
  public raisedByUserId!: number;
  public raisedByRole!: "customer" | "provider";
  public reason!: string;
  public status!: DisputeStatus;
  /** Admin's resolution note. */
  public resolution!: string | null;
  /** Simulated refund granted to the customer when resolving, if any. */
  public refundAmount!: number;
  public resolvedByAdminId!: number | null;
  public resolvedAt!: Date | null;
}

Dispute.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    bookingId: { type: DataTypes.UUID, allowNull: false },
    raisedByUserId: { type: DataTypes.INTEGER, allowNull: false },
    raisedByRole: { type: DataTypes.ENUM("customer", "provider"), allowNull: false },
    reason: { type: DataTypes.STRING(2000), allowNull: false },
    status: {
      type: DataTypes.ENUM("open", "resolved", "rejected"),
      allowNull: false,
      defaultValue: "open",
    },
    resolution: { type: DataTypes.STRING(2000), allowNull: true },
    refundAmount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    resolvedByAdminId: { type: DataTypes.INTEGER, allowNull: true },
    resolvedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    tableName: "disputes",
    timestamps: true,
  },
);
