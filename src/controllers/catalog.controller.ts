import { Request, Response, NextFunction } from "express";
import { Op, fn, col, where as whereClause } from "sequelize";
import { Service } from "../models/service.model";
import { Provider } from "../models/provider.model";
import { Review } from "../models/review.model";
import { generateSlots } from "../utils/slots";

export const listServices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const services = await Service.findAll({ order: [["name", "ASC"]] });
    return res.json({ services });
  } catch (error) {
    next(error);
  }
};

const PORTFOLIO_TONES = ["brand-950", "brand-700", "brand-500", "brand-400", "brand-200"];

/**
 * Real uploaded portfolio photos take precedence; any remaining tiles fall
 * back to the brand gradient placeholders so the grid always looks complete.
 */
function buildPortfolio(provider: Provider) {
  const urls = provider.portfolioUrls ?? [];
  return Array.from({ length: Math.max(5, urls.length) }, (_, i) => ({
    id: i,
    tone: PORTFOLIO_TONES[(provider.id + i) % PORTFOLIO_TONES.length],
    url: urls[i] ?? null,
  }));
}

export const listProviders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, query, minRating, availableNow, sort } = req.query as Record<
      string,
      string | undefined
    >;

    const where: Record<string, unknown> = { status: "approved" };
    if (category) where.categories = { [Op.contains]: [category] };
    // Match the provider's name, headline, OR any of their service categories,
    // so a service term (e.g. "cleaning", "repairs", "plumbing") finds the right
    // pros — not just providers literally named that.
    if (query) {
      const term = `%${query.trim()}%`;
      where[Op.or as unknown as string] = [
        { fullName: { [Op.iLike]: term } },
        { headline: { [Op.iLike]: term } },
        whereClause(fn("array_to_string", col("categories"), " "), { [Op.iLike]: term }),
      ];
    }
    if (minRating) where.rating = { [Op.gte]: Number(minRating) };
    if (availableNow === "true") where.availableNow = true;

    const order: [string, string][] =
      sort === "price_low"
        ? [["sessionPrice", "ASC"]]
        : sort === "price_high"
          ? [["sessionPrice", "DESC"]]
          : sort === "distance"
            ? [["distanceKm", "ASC"]]
            : [
                ["topRated", "DESC"],
                ["rating", "DESC"],
              ];

    const providers = await Provider.findAll({ where, order });
    return res.json({ providers, count: providers.length });
  } catch (error) {
    next(error);
  }
};

export const getProvider = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const provider = await Provider.findOne({ where: { id: Number(req.params.id), status: "approved" } });
    if (!provider) return res.status(404).json({ message: "Provider not found" });

    const reviews = await Review.findAll({
      where: { providerId: provider.id },
      order: [["createdAt", "DESC"]],
      limit: 10,
    });

    const nearby = await Provider.findAll({
      where: {
        id: { [Op.ne]: provider.id },
        status: "approved",
        categories: { [Op.overlap]: provider.categories },
      },
      order: [["rating", "DESC"]],
      limit: 3,
    });

    return res.json({
      provider,
      reviews,
      nearby,
      portfolio: buildPortfolio(provider),
      slots: await generateSlots(provider),
    });
  } catch (error) {
    next(error);
  }
};
