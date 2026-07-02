import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";

export class DeviceInfo extends Model {
  public id!: number;
  public ip!: string;
  public device!: string;
  public browser!: string;
  public browserVersion!: string | null;
  public os!: string;
  public osVersion!: string | null;
  public country!: string | null;
  public city!: string | null;
  public fingerprint!: string;
  public userAgent!: string | null;
}

DeviceInfo.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    ip: { type: DataTypes.STRING, allowNull: false },
    device: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Unknown",
    },
    browser: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Unknown",
    },
    browserVersion: { type: DataTypes.STRING, allowNull: true },
    os: { type: DataTypes.STRING, allowNull: false, defaultValue: "Unknown" },
    osVersion: { type: DataTypes.STRING, allowNull: true },
    country: { type: DataTypes.STRING, allowNull: true },
    city: { type: DataTypes.STRING, allowNull: true },
    fingerprint: { type: DataTypes.STRING, allowNull: false },
    userAgent: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, tableName: "device_info", timestamps: true },
);
