// import { DataTypes, Model } from "sequelize";
// import { sequelize } from "../config/db";

// export class Session extends Model {
//   public id!: string;
//   public userId!: number;
//   public refreshToken!: string;
//   public ip!: string;
//   public device!: string;
//   public expiresAt!: Date;
//   public status!: string;
// }

// Session.init(
//   {
//     id: {
//       type: DataTypes.UUID,
//       defaultValue: DataTypes.UUIDV4,
//       primaryKey: true,
//     },
//     userId: {
//       type: DataTypes.INTEGER,
//       allowNull: false,
//     },
//     refreshToken: {
//       type: DataTypes.TEXT,
//       allowNull: false,
//     },
//     ip: {
//       type: DataTypes.STRING,
//       allowNull: true,
//     },
//     device: {
//       type: DataTypes.STRING,
//       allowNull: true,
//     },
//     expiresAt: {
//       type: DataTypes.DATE,
//       allowNull: false,
//     },
//     status: {
//       type: DataTypes.STRING,
//       // field: "is_active",
//       allowNull: true,
//     },
//   },
//   {
//     sequelize,
//     tableName: "sessions",
//     timestamps: true,
//   },
// );

import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";

export type SessionStatus = "pending" | "active" | "rejected" | "expired";

export class Session extends Model {
  public id!: string;
  public userId!: number;
  public deviceInfoId!: number;
  public refreshToken!: string;
  public status!: SessionStatus;
  public fingerprint!: string;
  public verifyToken!: string | null;
  public verifyExpiry!: Date | null;
  public lastActiveAt!: Date;
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
    deviceInfoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("pending", "active", "rejected", "expired"),
      allowNull: false,
      defaultValue: "active",
    },
    fingerprint: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    verifyToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    verifyExpiry: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastActiveAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
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
  },
);
