import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";

export type OtpType = "password_reset" | "device_recovery" | "email_verification";

export class Otp extends Model {
  public id!: number;
  public userId!: number | null;
  public email!: string;
  public otp!: string;
  public type!: OtpType;
  public expiresAt!: Date;
}

Otp.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    otp: {
      type: DataTypes.STRING(6),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM("password_reset", "device_recovery", "email_verification"),
      allowNull: false,
      defaultValue: "password_reset",
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "otps",
    timestamps: true,
  },
);
