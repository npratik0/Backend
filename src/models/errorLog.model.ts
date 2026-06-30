import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";

export type ErrorType = "validation" | "auth" | "notfound" | "database" | "server";

export class ErrorLog extends Model {
  public id!: number;
  public requestLogId!: number | null;
  public userId!: number | null;
  public resolvedBy!: number | null;
  public endpoint!: string;
  public method!: string;
  public errorType!: ErrorType;
  public errorMessage!: string;
  public stackTrace!: string | null;
  public statusCode!: number;
  public requestBody!: object | null;
  public resolved!: boolean;
  public resolvedAt!: Date | null;
}

ErrorLog.init(
  {
    id:           { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    requestLogId: { type: DataTypes.INTEGER, allowNull: true },
    userId:       { type: DataTypes.INTEGER, allowNull: true },
    resolvedBy:   { type: DataTypes.INTEGER, allowNull: true },
    endpoint:     { type: DataTypes.STRING,  allowNull: false },
    method:       { type: DataTypes.STRING,  allowNull: false },
    errorType: {
      type: DataTypes.ENUM("validation", "auth", "notfound", "database", "server"),
      allowNull: false,
      defaultValue: "server",
    },
    errorMessage: { type: DataTypes.STRING, allowNull: false },
    stackTrace:   { type: DataTypes.TEXT,   allowNull: true },
    statusCode:   { type: DataTypes.INTEGER, allowNull: false },
    requestBody:  { type: DataTypes.JSONB,  allowNull: true },
    resolved:     { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    resolvedAt:   { type: DataTypes.DATE,   allowNull: true },
  },
  { sequelize, tableName: "error_logs", timestamps: true, updatedAt: false }
);