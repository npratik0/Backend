import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";

export class Otp extends Model {
  public id!: number;
  public email!: string;
  public otp!: string;
  public expiresAt!: Date;
}

Otp.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    otp: {
      type: DataTypes.STRING(6),
      allowNull: false,
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
  }
);