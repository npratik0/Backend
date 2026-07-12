import { Op } from "sequelize";
import { Provider, WeeklyHours } from "../models/provider.model";
import { Booking } from "../models/booking.model";

export interface Slot {
  iso: string;
  label: string;
  /** Full, human label used in the booking recap, e.g. "Monday, Jul 21". */
  dayLabel: string;
  /** Compact label for the day selector chip, e.g. "Today" / "Mon 21". */
  dayShort: string;
  /** Local calendar date (YYYY-MM-DD) used to group slots by day. */
  dateKey: string;
  available: boolean;
}

/** Local YYYY-MM-DD (not UTC) so day grouping matches the slot's wall-clock day. */
function localDateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const DAY_KEYS: (keyof WeeklyHours)[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const SLOT_INTERVAL_MINUTES = 120;

/**
 * Generates real slots for the next `days` days from the provider's own
 * weekly hours / blocked dates, excluding times that already have a live
 * booking. Replaces the old pseudo-random generator — this is the fix for
 * the double-booking gap.
 */
export async function generateSlots(provider: Provider, days = 14): Promise<Slot[]> {
  const now = new Date();
  const rangeEnd = new Date(now);
  rangeEnd.setDate(rangeEnd.getDate() + days);

  const existingBookings = await Booking.findAll({
    where: {
      providerId: provider.id,
      status: { [Op.notIn]: ["cancelled", "declined"] },
      scheduledAt: { [Op.gte]: now, [Op.lte]: rangeEnd },
    },
  });
  const bookedTimes = new Set(existingBookings.map((b) => new Date(b.scheduledAt).getTime()));

  const slots: Slot[] = [];

  for (let d = 0; d < days; d++) {
    const day = new Date(now);
    day.setDate(day.getDate() + d);

    const dayKey = DAY_KEYS[day.getDay()];
    const hours = provider.weeklyHours?.[dayKey];
    if (!hours || !hours.enabled) continue;

    const dateStr = day.toISOString().slice(0, 10);
    if (provider.blockedDates?.includes(dateStr)) continue;

    const [startH, startM] = hours.start.split(":").map(Number);
    const [endH, endM] = hours.end.split(":").map(Number);

    const dayStart = new Date(day);
    dayStart.setHours(startH, startM, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(endH, endM, 0, 0);

    for (
      let t = new Date(dayStart);
      t < dayEnd;
      t = new Date(t.getTime() + SLOT_INTERVAL_MINUTES * 60 * 1000)
    ) {
      if (t.getTime() <= now.getTime()) continue;

      slots.push({
        iso: t.toISOString(),
        label: t.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        dayLabel:
          d === 0
            ? "Today"
            : d === 1
              ? "Tomorrow"
              : t.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }),
        dayShort:
          d === 0
            ? "Today"
            : d === 1
              ? "Tomorrow"
              : `${t.toLocaleDateString("en-US", { weekday: "short" })} ${t.getDate()}`,
        dateKey: localDateKey(t),
        available: !bookedTimes.has(t.getTime()),
      });
    }
  }

  return slots;
}
