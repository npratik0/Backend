import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";

export class TrustedDevice extends Model {
  public id!: number;
  public userId!: number;
  public deviceInfoId!: string;
  public lastSeenAt!: Date;
}

TrustedDevice.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    deviceInfoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    fingerprint: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lastSeenAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "trusted_devices",
    timestamps: true,
  },
);
