import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";

export class RequestLog extends Model {
  public id!: number;
  public userId!: number | null;
  public deviceInfoId!: number | null;
  public method!: string;
  public endpoint!: string;
  public statusCode!: number;
  public responseTimeMs!: number;
  public requestBody!: object | null;
  public responseBody!: object | null;
}

RequestLog.init(
  {
    id:            { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId:        { type: DataTypes.INTEGER, allowNull: true },
    deviceInfoId:  { type: DataTypes.INTEGER, allowNull: true },
    method:        { type: DataTypes.STRING,  allowNull: false },
    endpoint:      { type: DataTypes.STRING,  allowNull: false },
    statusCode:    { type: DataTypes.INTEGER, allowNull: false },
    responseTimeMs:{ type: DataTypes.INTEGER, allowNull: false },
    requestBody:   { type: DataTypes.JSONB,   allowNull: true },
    responseBody:  { type: DataTypes.JSONB,   allowNull: true },
  },
  { sequelize, tableName: "request_logs", timestamps: true, updatedAt: false }
);