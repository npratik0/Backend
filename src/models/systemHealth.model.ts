import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";

export class SystemHealth extends Model {
  public id!: number;
  public cpuUsagePct!: number;
  public memoryUsedMb!: number;
  public memoryTotalMb!: number;
  public activeConnections!: number;
  public dbResponseMs!: number;
  public uptimeSeconds!: number;
}

SystemHealth.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    cpuUsagePct: { type: DataTypes.FLOAT, allowNull: false },
    memoryUsedMb: { type: DataTypes.INTEGER, allowNull: false },
    memoryTotalMb: { type: DataTypes.INTEGER, allowNull: false },
    activeConnections: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    dbResponseMs: { type: DataTypes.INTEGER, allowNull: false },
    uptimeSeconds: { type: DataTypes.INTEGER, allowNull: false },
  },
  { sequelize, tableName: "system_health", timestamps: true, updatedAt: false },
);
