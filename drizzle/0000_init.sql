CREATE TABLE "er_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"venue" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"public_slug" text NOT NULL,
	"registration_open" boolean DEFAULT true NOT NULL,
	"created_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "er_events_public_slug_unique" UNIQUE("public_slug")
);
--> statement-breakpoint
CREATE TABLE "er_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"last_name" text NOT NULL,
	"first_name" text NOT NULL,
	"contact_number" text DEFAULT '' NOT NULL,
	"service_attended" text,
	"lifestage" text,
	"status" text DEFAULT 'Registered' NOT NULL,
	"registered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"checked_in_at" timestamp with time zone,
	"checked_in_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "er_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'volunteer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "er_users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "er_events" ADD CONSTRAINT "er_events_created_by_id_er_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."er_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "er_participants" ADD CONSTRAINT "er_participants_event_id_er_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."er_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "er_participants" ADD CONSTRAINT "er_participants_checked_in_by_id_er_users_id_fk" FOREIGN KEY ("checked_in_by_id") REFERENCES "public"."er_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "er_participants_event_person_uq" ON "er_participants" USING btree ("event_id",lower("last_name"),lower("first_name"),"contact_number");--> statement-breakpoint
CREATE INDEX "er_participants_event_idx" ON "er_participants" USING btree ("event_id");