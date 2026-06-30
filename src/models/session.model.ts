import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";

export class Session extends Model {
  public id!: string;
  public userId!: number;
  public refreshToken!: string;
  public ip!: string;
  public device!: string;
  public expiresAt!: Date;
  public status!: string;
}

Session.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    ip: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    device: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      // field: "is_active",
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "sessions",
    timestamps: true,
  },
);
