import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { user } from "./auth-schema";

export const Post = pgTable("post", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  title: t.varchar({ length: 256 }).notNull(),
  content: t.text().notNull(),
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .$onUpdateFn(() => sql`now()`),
}));

export const CreatePostSchema = createInsertSchema(Post, {
  title: z.string().max(256),
  content: z.string().max(256),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Events table
export const event = pgTable("event", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description"),
  location: text("location").notNull(),
  celebrityId: text("celebrity_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  slotDuration: integer("slot_duration").notNull(), // minutes per interaction
  maxCapacity: integer("max_capacity"), // optional max queue size
  eventCode: text("event_code").notNull().unique(), // unique code for scanning
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const CreateEventSchema = createInsertSchema(event, {
  title: z.string().min(1).max(256),
  description: z.string().optional(),
  location: z.string().min(1),
  celebrityId: z.string(),
  startTime: z.date(),
  endTime: z.date(),
  slotDuration: z.number().int().positive(),
  maxCapacity: z.number().int().positive().optional(),
}).omit({
  id: true,
  eventCode: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
});

export * from "./auth-schema";
