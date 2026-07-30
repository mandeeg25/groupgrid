CREATE TABLE "comped_users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comped_users" ENABLE ROW LEVEL SECURITY;