import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";

export class Review extends Model {
  public id!: number;
  public bookingId!: string;
  public userId!: number;
  public providerId!: number;
  public rating!: number;
  public punctuality!: number;
  public professionalism!: number;
  public communication!: number;
  public qualityOfWork!: number;
  public recommend!: boolean;
  public comment!: string | null;
}

Review.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    bookingId: { type: DataTypes.UUID, allowNull: false, unique: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    providerId: { type: DataTypes.INTEGER, allowNull: false },
    rating: { type: DataTypes.FLOAT, allowNull: false },
    punctuality: { type: DataTypes.INTEGER, allowNull: false },
    professionalism: { type: DataTypes.INTEGER, allowNull: false },
    communication: { type: DataTypes.INTEGER, allowNull: false },
    qualityOfWork: { type: DataTypes.INTEGER, allowNull: false },
    recommend: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    comment: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    sequelize,
    tableName: "reviews",
    timestamps: true,
  },
);
