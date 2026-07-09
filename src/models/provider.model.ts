import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";

export type ProviderStatus = "pending" | "approved" | "rejected" | "suspended";

export interface DayHours {
  enabled: boolean;
  start: string;
  end: string;
}

export type WeeklyHours = Record<
  "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday",
  DayHours
>;

const DEFAULT_DAY: DayHours = { enabled: true, start: "09:00", end: "19:00" };
export const DEFAULT_WEEKLY_HOURS: WeeklyHours = {
  monday: { ...DEFAULT_DAY },
  tuesday: { ...DEFAULT_DAY },
  wednesday: { ...DEFAULT_DAY },
  thursday: { ...DEFAULT_DAY },
  friday: { ...DEFAULT_DAY },
  saturday: { ...DEFAULT_DAY },
  sunday: { ...DEFAULT_DAY },
};

export class Provider extends Model {
  public id!: number;
  public userId!: number | null;
  public status!: ProviderStatus;
  public statusReason!: string | null;
  public fullName!: string;
  public headline!: string;
  public bio!: string;
  public categories!: string[];
  public avatarSeed!: string;
  public avatarUrl!: string | null;
  public portfolioUrls!: string[];
  public rating!: number;
  public reviewCount!: number;
  public hourlyRate!: number | null;
  public sessionPrice!: number | null;
  public area!: string;
  public distanceKm!: number;
  public idVerified!: boolean;
  public bgChecked!: boolean;
  public licensed!: boolean;
  public insured!: boolean;
  public availableNow!: boolean;
  public topRated!: boolean;
  public experienceYears!: number;
  public highlights!: string;
  public weeklyHours!: WeeklyHours;
  public blockedDates!: string[];
}

Provider.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      unique: true,
    },
    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected", "suspended"),
      allowNull: false,
      defaultValue: "pending",
    },
    statusReason: { type: DataTypes.STRING, allowNull: true },
    fullName: { type: DataTypes.STRING, allowNull: false },
    headline: { type: DataTypes.STRING, allowNull: false },
    bio: { type: DataTypes.TEXT, allowNull: false },
    categories: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: false },
    avatarSeed: { type: DataTypes.STRING, allowNull: false },
    avatarUrl: { type: DataTypes.STRING, allowNull: true },
    portfolioUrls: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: false, defaultValue: [] },
    // New providers start with no rating (shown as "New" in the UI) rather than
    // an inflated default, and aren't marked verified until it's actually true.
    rating: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    reviewCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    hourlyRate: { type: DataTypes.INTEGER, allowNull: true },
    sessionPrice: { type: DataTypes.INTEGER, allowNull: true },
    area: { type: DataTypes.STRING, allowNull: false, defaultValue: "Kathmandu" },
    distanceKm: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 1.5 },
    idVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    bgChecked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    licensed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    insured: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    availableNow: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    topRated: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    experienceYears: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2 },
    highlights: { type: DataTypes.TEXT, allowNull: false, defaultValue: "" },
    weeklyHours: { type: DataTypes.JSONB, allowNull: false, defaultValue: DEFAULT_WEEKLY_HOURS },
    blockedDates: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: false, defaultValue: [] },
  },
  {
    sequelize,
    tableName: "providers",
    timestamps: true,
  },
);
