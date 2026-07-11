import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";

/** A booking-scoped chat message between the customer and the provider. */
export class Message extends Model {
  public id!: number;
  public bookingId!: string;
  /** Author's user id. */
  public senderId!: number;
  /** "customer" | "provider" — which side of the booking sent this. */
  public senderRole!: "customer" | "provider";
  public body!: string;
  public read!: boolean;
}

Message.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    bookingId: { type: DataTypes.UUID, allowNull: false },
    senderId: { type: DataTypes.INTEGER, allowNull: false },
    senderRole: { type: DataTypes.ENUM("customer", "provider"), allowNull: false },
    body: { type: DataTypes.STRING(2000), allowNull: false },
    read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  {
    sequelize,
    tableName: "messages",
    timestamps: true,
  },
);
