import { z } from "zod";

export const providerActionSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const createServiceSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(120),
  category: z.string().min(2).max(60),
  icon: z.string().min(1).max(60),
  description: z.string().max(2000).optional(),
  basePrice: z.number().int().positive(),
  priceUnit: z.enum(["session", "hour", "sqft"]),
});

export const updateServiceSchema = createServiceSchema.partial();
