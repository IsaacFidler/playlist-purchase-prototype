CREATE TYPE "public"."import_event_type" AS ENUM('IMPORT_STARTED', 'SPOTIFY_SYNCED', 'ENRICHMENT_COMPLETE', 'REVIEW_READY', 'EXPORT_TRIGGERED', 'PURCHASE_INITIATED', 'ERROR');--> statement-breakpoint
CREATE TYPE "public"."import_status" AS ENUM('QUEUED', 'PROCESSING', 'READY', 'FAILED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."offer_availability" AS ENUM('AVAILABLE', 'UNAVAILABLE', 'UNKNOWN', 'OUT_OF_STOCK');--> statement-breakpoint
CREATE TYPE "public"."playlist_source" AS ENUM('SPOTIFY', 'APPLE_MUSIC', 'YOUTUBE', 'MANUAL_UPLOAD');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'MEMBER');--> statement-breakpoint
CREATE TABLE "import_activities" (
	"id" text PRIMARY KEY NOT NULL,
	"import_id" text NOT NULL,
	"event_type" "import_event_type" NOT NULL,
	"message" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playlist_imports" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"source" "playlist_source" DEFAULT 'SPOTIFY' NOT NULL,
	"source_playlist_id" varchar(128),
	"source_url" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "import_status" DEFAULT 'QUEUED' NOT NULL,
	"notes" text,
	"total_tracks" integer DEFAULT 0 NOT NULL,
	"matched_tracks" integer DEFAULT 0 NOT NULL,
	"available_offers" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"failure_reason" text,
	"last_vendor_sync_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playlist_tracks" (
	"id" text PRIMARY KEY NOT NULL,
	"import_id" text NOT NULL,
	"order_index" integer NOT NULL,
	"name" text NOT NULL,
	"artists" text NOT NULL,
	"album" text,
	"spotify_track_id" varchar(128),
	"spotify_track_url" text,
	"isrc" varchar(15),
	"disc_number" integer DEFAULT 1,
	"track_number" integer,
	"duration_ms" integer,
	"explicit" boolean DEFAULT false NOT NULL,
	"preview_url" text,
	"artwork_url" text,
	"popularity" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"display_name" text,
	"avatar_url" text,
	"role" "user_role" DEFAULT 'MEMBER' NOT NULL,
	"marketing_opt_in" boolean DEFAULT false NOT NULL,
	"onboarding_step" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spotify_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"scope" text,
	"expires_at" timestamp with time zone,
	"token_type" varchar(32),
	"last_synced_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_offers" (
	"id" text PRIMARY KEY NOT NULL,
	"track_id" text NOT NULL,
	"vendor_id" varchar(32) NOT NULL,
	"title" text,
	"subtitle" text,
	"external_id" varchar(128),
	"external_url" text NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"price_value" numeric(12, 2),
	"availability" "offer_availability" DEFAULT 'UNKNOWN' NOT NULL,
	"is_preview" boolean DEFAULT false NOT NULL,
	"country_code" varchar(2),
	"release_date" timestamp with time zone,
	"last_checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"raw_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"website_url" text,
	"primary_color" varchar(16),
	"secondary_color" varchar(16),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "import_activities" ADD CONSTRAINT "import_activities_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "public"."playlist_imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlist_imports" ADD CONSTRAINT "playlist_imports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlist_tracks" ADD CONSTRAINT "playlist_tracks_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "public"."playlist_imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spotify_accounts" ADD CONSTRAINT "spotify_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_offers" ADD CONSTRAINT "vendor_offers_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "public"."playlist_tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_offers" ADD CONSTRAINT "vendor_offers_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "import_activities_event_idx" ON "import_activities" USING btree ("import_id","event_type");--> statement-breakpoint
CREATE INDEX "playlist_imports_user_status_idx" ON "playlist_imports" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "playlist_imports_source_idx" ON "playlist_imports" USING btree ("source","source_playlist_id");--> statement-breakpoint
CREATE INDEX "playlist_tracks_import_order_idx" ON "playlist_tracks" USING btree ("import_id","order_index");--> statement-breakpoint
CREATE INDEX "playlist_tracks_spotify_idx" ON "playlist_tracks" USING btree ("spotify_track_id");--> statement-breakpoint
CREATE INDEX "playlist_tracks_isrc_idx" ON "playlist_tracks" USING btree ("isrc");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_email_unique" ON "profiles" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "spotify_accounts_user_unique" ON "spotify_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "vendor_offers_track_availability_idx" ON "vendor_offers" USING btree ("track_id","availability");--> statement-breakpoint
CREATE INDEX "vendor_offers_vendor_availability_idx" ON "vendor_offers" USING btree ("vendor_id","availability");--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_offers_track_vendor_unique" ON "vendor_offers" USING btree ("track_id","vendor_id");--> statement-breakpoint
CREATE INDEX "vendor_offers_external_id_idx" ON "vendor_offers" USING btree ("external_id");