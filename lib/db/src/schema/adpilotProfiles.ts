import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const adpilotProfilesTable = pgTable("adpilot_profiles", {
  userId: text("user_id").primaryKey(),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
