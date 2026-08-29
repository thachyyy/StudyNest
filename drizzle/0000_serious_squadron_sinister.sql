CREATE TYPE "public"."class_member_role" AS ENUM('teacher', 'student', 'teaching_assistant');--> statement-breakpoint
CREATE TYPE "public"."class_member_status" AS ENUM('active', 'archived', 'pending');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('draft', 'processing', 'ready', 'archived', 'failed');--> statement-breakpoint
CREATE TYPE "public"."relation_type" AS ENUM('prerequisite', 'related', 'subtopic', 'leads_to', 'generalization');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('teacher', 'student', 'admin');--> statement-breakpoint
CREATE TABLE "class_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "class_member_role" DEFAULT 'student' NOT NULL,
	"status" "class_member_status" DEFAULT 'active' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"subject" text NOT NULL,
	"grade" text,
	"teacher_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "classes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "document_keywords" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"keyword_id" uuid NOT NULL,
	"relevance_score" integer DEFAULT 100 NOT NULL,
	"occurrences" integer DEFAULT 1 NOT NULL,
	"context_snippet" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid NOT NULL,
	"title" text NOT NULL,
	"content_type" text DEFAULT 'lecture_notes' NOT NULL,
	"content" text,
	"source_url" text,
	"file_size" integer,
	"status" "document_status" DEFAULT 'ready' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "keyword_relations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_keyword_id" uuid NOT NULL,
	"target_keyword_id" uuid NOT NULL,
	"relation_type" "relation_type" DEFAULT 'related' NOT NULL,
	"strength" integer DEFAULT 1 NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "keywords" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"term" text NOT NULL,
	"definition" text,
	"category" text,
	"importance" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "keywords_term_unique" UNIQUE("term")
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uid" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"photo_url" text,
	"role" "user_role" DEFAULT 'student' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_uid_unique" UNIQUE("uid"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "class_members" ADD CONSTRAINT "class_members_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_members" ADD CONSTRAINT "class_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_keywords" ADD CONSTRAINT "document_keywords_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_keywords" ADD CONSTRAINT "document_keywords_keyword_id_keywords_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "public"."keywords"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keyword_relations" ADD CONSTRAINT "keyword_relations_source_keyword_id_keywords_id_fk" FOREIGN KEY ("source_keyword_id") REFERENCES "public"."keywords"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keyword_relations" ADD CONSTRAINT "keyword_relations_target_keyword_id_keywords_id_fk" FOREIGN KEY ("target_keyword_id") REFERENCES "public"."keywords"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "class_members_class_user_idx" ON "class_members" USING btree ("class_id","user_id");--> statement-breakpoint
CREATE INDEX "class_members_class_id_idx" ON "class_members" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "class_members_user_id_idx" ON "class_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "class_members_status_idx" ON "class_members" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "classes_code_idx" ON "classes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "classes_teacher_id_idx" ON "classes" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "classes_subject_idx" ON "classes" USING btree ("subject");--> statement-breakpoint
CREATE UNIQUE INDEX "document_keywords_doc_kw_idx" ON "document_keywords" USING btree ("document_id","keyword_id");--> statement-breakpoint
CREATE INDEX "document_keywords_document_id_idx" ON "document_keywords" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_keywords_keyword_id_idx" ON "document_keywords" USING btree ("keyword_id");--> statement-breakpoint
CREATE INDEX "documents_topic_id_idx" ON "documents" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX "documents_created_by_idx" ON "documents" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "documents_status_idx" ON "documents" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "keyword_relations_src_tgt_type_idx" ON "keyword_relations" USING btree ("source_keyword_id","target_keyword_id","relation_type");--> statement-breakpoint
CREATE INDEX "keyword_relations_source_id_idx" ON "keyword_relations" USING btree ("source_keyword_id");--> statement-breakpoint
CREATE INDEX "keyword_relations_target_id_idx" ON "keyword_relations" USING btree ("target_keyword_id");--> statement-breakpoint
CREATE INDEX "keyword_relations_type_idx" ON "keyword_relations" USING btree ("relation_type");--> statement-breakpoint
CREATE UNIQUE INDEX "keywords_term_idx" ON "keywords" USING btree ("term");--> statement-breakpoint
CREATE INDEX "keywords_category_idx" ON "keywords" USING btree ("category");--> statement-breakpoint
CREATE INDEX "keywords_importance_idx" ON "keywords" USING btree ("importance");--> statement-breakpoint
CREATE INDEX "topics_class_id_idx" ON "topics" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "topics_class_order_idx" ON "topics" USING btree ("class_id","order_index");--> statement-breakpoint
CREATE UNIQUE INDEX "users_uid_idx" ON "users" USING btree ("uid");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");