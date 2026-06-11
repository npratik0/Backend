import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";

export class User extends Model {
  public id!: number;
  public fullName!: string;
  public email!: string;
  public phoneNumber!: string;
  public password!: string;
  // public refreshToken?: string;
  public role!: 'user'| 'admin' | 'superadmin';
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // refreshToken: {
    // type: DataTypes.TEXT,
    // allowNull: true,
    // },
    role: {
      type: DataTypes.ENUM('user', 'admin', 'superadmin'),
      allowNull: false,
      defaultValue: 'user'
    }
  },
  {
    sequelize,
    tableName: "users",
    timestamps: true,
    
  }
  
);

