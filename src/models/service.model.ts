import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";

export type PriceUnit = "session" | "hour" | "sqft";

export class Service extends Model {
  public id!: number;
  public name!: string;
  public slug!: string;
  public category!: string;
  public icon!: string;
  public description!: string | null;
  public basePrice!: number;
  public priceUnit!: PriceUnit;
}

Service.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING, allowNull: false },
    slug: { type: DataTypes.STRING, allowNull: false, unique: true },
    category: { type: DataTypes.STRING, allowNull: false },
    icon: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    basePrice: { type: DataTypes.INTEGER, allowNull: false },
    priceUnit: {
      type: DataTypes.ENUM("session", "hour", "sqft"),
      allowNull: false,
      defaultValue: "session",
    },
  },
  {
    sequelize,
    tableName: "services",
    timestamps: true,
  },
);
