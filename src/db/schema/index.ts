import { pgTable, serial, text, boolean, timestamp, integer, uniqueIndex, index, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { Answers } from "../../lib/form-config";

// Every table is prefixed `er_` because this app shares its database with v-1.
// Enum-like columns are plain `text` on purpose: Postgres enums are database-wide
// (not table-scoped) and v-1 already owns names like `lifestage`.

export const users = pgTable("er_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("volunteer"), // "admin" | "volunteer"
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const events = pgTable("er_events", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  venue: text("venue"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  // Unguessable token used in the public link (/e/<slug>)
  publicSlug: text("public_slug").notNull().unique(),
  registrationOpen: boolean("registration_open").notNull().default(true),
  // Registration form config (EventFormConfig); null = default form. Read it through
  // normalizeFormConfig rather than trusting the stored shape.
  form: jsonb("form"),
  createdById: integer("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const participants = pgTable(
  "er_participants",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    lastName: text("last_name").notNull(),
    firstName: text("first_name").notNull(),
    contactNumber: text("contact_number").notNull().default(""),
    serviceAttended: text("service_attended"),
    lifestage: text("lifestage"),
    status: text("status").notNull().default("Registered"),
    // Answers to the event's custom form questions, keyed by question id
    answers: jsonb("answers").$type<Answers>().notNull().default({}),
    registeredAt: timestamp("registered_at", { withTimezone: true }).notNull().defaultNow(),
    source: text("source").notNull().default("manual"), // "manual" | "csv" | "public" | "walk_in"
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
    checkedInById: integer("checked_in_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Same person can't be added to the same event twice (also lets CSV re-imports skip existing rows)
    uniqueIndex("er_participants_event_person_uq").on(
      t.eventId,
      sql`lower(${t.lastName})`,
      sql`lower(${t.firstName})`,
      t.contactNumber
    ),
    index("er_participants_event_idx").on(t.eventId),
  ]
);

export type Event = typeof events.$inferSelect;
export type Participant = typeof participants.$inferSelect;
