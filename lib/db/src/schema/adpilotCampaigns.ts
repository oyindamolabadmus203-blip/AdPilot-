import {
  date,
  index,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const adpilotCampaignsTable = pgTable(
  "adpilot_campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    objective: text("objective").notNull(),
    platforms: text("platforms").array().notNull(),
    budget: real("budget"),
    currency: text("currency").notNull(),
    startDate: date("start_date", { mode: "string" }),
    endDate: date("end_date", { mode: "string" }),
    concepts: jsonb("concepts").notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("adpilot_campaigns_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
  ],
);
