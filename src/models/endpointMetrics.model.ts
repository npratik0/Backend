import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";

export class EndpointMetrics extends Model {
  public id!: number;
  public endpoint!: string;
  public method!: string;
  public bucketDate!: string;
  public totalRequests!: number;
  public successCount!: number;
  public errorCount!: number;
  public avgResponseMs!: number;
  public minResponseMs!: number;
  public maxResponseMs!: number;
  public p95ResponseMs!: number;
}

EndpointMetrics.init(
  {
    id:             { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    endpoint:       { type: DataTypes.STRING,  allowNull: false },
    method:         { type: DataTypes.STRING,  allowNull: false },
    bucketDate:     { type: DataTypes.DATEONLY, allowNull: false },
    totalRequests:  { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    successCount:   { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    errorCount:     { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    avgResponseMs:  { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    minResponseMs:  { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    maxResponseMs:  { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    p95ResponseMs:  { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  { sequelize, tableName: "endpoint_metrics", timestamps: true }
);