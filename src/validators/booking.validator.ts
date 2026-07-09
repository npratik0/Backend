import { z } from "zod";

export const createBookingSchema = z.object({
  providerId: z.number().int(),
  serviceId: z.number().int(),
  scheduledAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
  address: z.string().min(3, "Address is required"),
  addressNote: z.string().optional(),
  paymentPlan: z.enum(["full", "deposit", "installments"]).default("full"),
  paymentMethod: z.enum(["esewa", "khalti", "fonepay", "card"]).default("esewa"),
  applyLoyaltyCredits: z.boolean().optional().default(false),
});

export const rescheduleBookingSchema = z.object({
  scheduledAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
});

export const submitReviewSchema = z.object({
  punctuality: z.number().int().min(1).max(5),
  professionalism: z.number().int().min(1).max(5),
  communication: z.number().int().min(1).max(5),
  qualityOfWork: z.number().int().min(1).max(5),
  recommend: z.boolean(),
  comment: z.string().max(2000).optional(),
  tipAmount: z.number().int().min(0).optional(),
});

export const createSubscriptionSchema = z.object({
  providerId: z.number().int(),
  serviceId: z.number().int(),
  frequency: z.enum(["weekly", "biweekly", "monthly"]),
  preferredDay: z.string().min(1),
  startTime: z.string().min(1),
});
