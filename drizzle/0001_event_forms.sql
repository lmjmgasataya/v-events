ALTER TABLE "er_events" ADD COLUMN "form" jsonb;--> statement-breakpoint
ALTER TABLE "er_participants" ADD COLUMN "answers" jsonb DEFAULT '{}'::jsonb NOT NULL;