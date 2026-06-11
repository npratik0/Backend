import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";

export class Session extends Model {
  public id!: string;        // uuid
  public userId!: number;
  public refreshToken!: string;
  public ip!: string;
  public device!: string;
  public expiresAt!: Date;
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
  },
  {
    sequelize,
    tableName: "sessions",
    timestamps: true,
  }
);