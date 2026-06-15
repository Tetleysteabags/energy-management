import {
  boolean,
  date,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  timezone: text("timezone").notNull().default("Europe/Nicosia"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const dailyLogs = pgTable(
  "daily_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    logDate: date("log_date").notNull(),

    sleepQuality: smallint("sleep_quality"),
    sleepHours: numeric("sleep_hours", { precision: 3, scale: 1 }),
    restedScore: smallint("rested_score"),
    morningFatigue: smallint("morning_fatigue"),
    morningBrainFog: smallint("morning_brain_fog"),
    morningPain: smallint("morning_pain"),
    morningDysautonomia: smallint("morning_dysautonomia"),
    morningSubmittedAt: timestamp("morning_submitted_at", { withTimezone: true }),

    physicalLoad: smallint("physical_load"),
    cognitiveLoad: smallint("cognitive_load"),
    socialLoad: smallint("social_load"),
    capacity: smallint("capacity"),
    eveningFatigue: smallint("evening_fatigue"),
    eveningBrainFog: smallint("evening_brain_fog"),
    eveningPain: smallint("evening_pain"),
    pem: smallint("pem"),
    alcohol: boolean("alcohol").notNull().default(false),
    alcoholUnits: smallint("alcohol_units"),
    lateCaffeine: boolean("late_caffeine").notNull().default(false),
    lateMeal: boolean("late_meal").notNull().default(false),
    notes: text("notes"),
    eveningSubmittedAt: timestamp("evening_submitted_at", { withTimezone: true }),

    isExcluded: boolean("is_excluded").notNull().default(false),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("daily_logs_user_date_idx").on(table.userId, table.logDate)],
);
