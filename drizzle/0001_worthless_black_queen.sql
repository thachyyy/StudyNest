CREATE TYPE "public"."topic_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "status" SET DEFAULT 'ready'::text;--> statement-breakpoint
DROP TYPE "public"."document_status";--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('draft', 'processing', 'ready', 'failed', 'archived');--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "status" SET DEFAULT 'ready'::"public"."document_status";--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "status" SET DATA TYPE "public"."document_status" USING "status"::"public"."document_status";--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "status" "topic_status" DEFAULT 'draft' NOT NULL;--> statement-breakpoint
CREATE INDEX "topics_status_idx" ON "topics" USING btree ("status");--> statement-breakpoint
ALTER TABLE "keyword_relations" ADD CONSTRAINT "keyword_relations_no_self_link" CHECK ("keyword_relations"."source_keyword_id" != "keyword_relations"."target_keyword_id");