import { z } from "zod";

const dayHoursSchema = z.object({
  enabled: z.boolean(),
  start: z.string(),
  end: z.string(),
});

const weeklyHoursSchema = z.object({
  monday: dayHoursSchema,
  tuesday: dayHoursSchema,
  wednesday: dayHoursSchema,
  thursday: dayHoursSchema,
  friday: dayHoursSchema,
  saturday: dayHoursSchema,
  sunday: dayHoursSchema,
});

export const applyProviderSchema = z.object({
  headline: z.string().min(3).max(120),
  bio: z.string().min(20, "Tell customers a bit more about your experience").max(2000),
  categories: z.array(z.string()).min(1, "Pick at least one category"),
  hourlyRate: z.number().int().positive().optional(),
  sessionPrice: z.number().int().positive().optional(),
  experienceYears: z.number().int().min(0).max(60).optional(),
});

export const updateProviderSchema = z.object({
  headline: z.string().min(3).max(120).optional(),
  bio: z.string().min(20).max(2000).optional(),
  categories: z.array(z.string()).min(1).optional(),
  hourlyRate: z.number().int().positive().nullable().optional(),
  sessionPrice: z.number().int().positive().nullable().optional(),
  experienceYears: z.number().int().min(0).max(60).optional(),
  avatarUrl: z.string().optional(),
  portfolioUrls: z.array(z.string()).max(10).optional(),
  weeklyHours: weeklyHoursSchema.optional(),
  blockedDates: z.array(z.string()).optional(),
});

export const declineBookingSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const updateBookingStatusSchema = z.object({
  status: z.enum(["en_route", "arrived", "in_progress", "completed"]),
});
