import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";

export class User extends Model {
  public id!: number;
  public fullName!: string;
  public email!: string;
  public phoneNumber!: string;
  public password!: string;
  // public refreshToken?: string;
  public role!: 'user'| 'provider' | 'admin' | 'superadmin';
  public googleId!: string | null;
  public isVerified!: boolean;
  public preferredServices!: string[] | null;
  public budgetRange!: string | null;
  public preferredTiming!: string[] | null;
  public onboardingCompletedAt!: Date | null;
  public loyaltyCredits!: number;
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
      allowNull: true,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // refreshToken: {
    // type: DataTypes.TEXT,
    // allowNull: true,
    // },
    role: {
      type: DataTypes.ENUM('user', 'provider', 'admin', 'superadmin'),
      allowNull: false,
      defaultValue: 'user'
    },
    googleId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    preferredServices: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
    },
    budgetRange: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    preferredTiming: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
    },
    onboardingCompletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    loyaltyCredits: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 150,
    },
  },
  {
    sequelize,
    tableName: "users",
    timestamps: true,
    
  }
  
);

