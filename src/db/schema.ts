import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  timestamp,
  index,
  uniqueIndex,
  check
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// ----------------------------------------------------
// 1. Enum Definitions
// ----------------------------------------------------
export const userRoleEnum = pgEnum('user_role', ['teacher', 'student', 'admin']);
export const classMemberRoleEnum = pgEnum('class_member_role', ['teacher', 'student', 'teaching_assistant']);
export const classMemberStatusEnum = pgEnum('class_member_status', ['active', 'archived', 'pending']);
export const topicStatusEnum = pgEnum('topic_status', ['draft', 'published', 'archived']);
export const documentStatusEnum = pgEnum('document_status', ['draft', 'processing', 'ready', 'failed', 'archived']);
export const relationTypeEnum = pgEnum('relation_type', [
  'prerequisite',
  'related',
  'subtopic',
  'leads_to',
  'generalization'
]);

// ----------------------------------------------------
// 2. Core Domain Tables
// ----------------------------------------------------

/**
 * Users Table
 * Identity anchored to Firebase Authentication UID.
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    uid: text('uid').notNull().unique(), // Firebase Auth UID
    email: text('email').notNull().unique(),
    displayName: text('display_name'),
    photoUrl: text('photo_url'),
    role: userRoleEnum('role').default('student').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('users_uid_idx').on(table.uid),
    uniqueIndex('users_email_idx').on(table.email),
    index('users_role_idx').on(table.role),
  ]
);

/**
 * Classes Table
 * Relationship: Teacher (User) 1:N Class
 */
export const classes = pgTable(
  'classes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    code: text('code').notNull().unique(),
    description: text('description'),
    subject: text('subject').notNull(),
    grade: text('grade'),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('classes_code_idx').on(table.code),
    index('classes_teacher_id_idx').on(table.teacherId),
    index('classes_subject_idx').on(table.subject),
  ]
);

/**
 * Class Members Table
 * Relationship: Class N:M Student (User) through ClassMember
 */
export const classMembers = pgTable(
  'class_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: classMemberRoleEnum('role').default('student').notNull(),
    status: classMemberStatusEnum('status').default('active').notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('class_members_class_user_idx').on(table.classId, table.userId),
    index('class_members_class_id_idx').on(table.classId),
    index('class_members_user_id_idx').on(table.userId),
    index('class_members_status_idx').on(table.status),
  ]
);

/**
 * Topics Table
 * Relationship: Class 1:N Topic
 */
export const topics = pgTable(
  'topics',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    status: topicStatusEnum('status').default('draft').notNull(),
    orderIndex: integer('order_index').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('topics_class_id_idx').on(table.classId),
    index('topics_class_order_idx').on(table.classId, table.orderIndex),
    index('topics_status_idx').on(table.status),
  ]
);

/**
 * Documents Table
 * Relationship: Topic 1:N Document
 */
export const documents = pgTable(
  'documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    topicId: uuid('topic_id')
      .notNull()
      .references(() => topics.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    contentType: text('content_type').default('lecture_notes').notNull(),
    content: text('content'),
    sourceUrl: text('source_url'),
    fileSize: integer('file_size'),
    status: documentStatusEnum('status').default('ready').notNull(),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('documents_topic_id_idx').on(table.topicId),
    index('documents_created_by_idx').on(table.createdBy),
    index('documents_status_idx').on(table.status),
  ]
);

/**
 * Keywords Table
 * Normalized knowledge entity.
 */
export const keywords = pgTable(
  'keywords',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    term: text('term').notNull().unique(),
    definition: text('definition'),
    category: text('category'),
    importance: integer('importance').default(1).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('keywords_term_idx').on(table.term),
    index('keywords_category_idx').on(table.category),
    index('keywords_importance_idx').on(table.importance),
  ]
);

/**
 * Document Keywords Table
 * Relationship: Document N:M Keyword through DocumentKeyword
 */
export const documentKeywords = pgTable(
  'document_keywords',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    keywordId: uuid('keyword_id')
      .notNull()
      .references(() => keywords.id, { onDelete: 'cascade' }),
    relevanceScore: integer('relevance_score').default(100).notNull(),
    occurrences: integer('occurrences').default(1).notNull(),
    contextSnippet: text('context_snippet'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('document_keywords_doc_kw_idx').on(table.documentId, table.keywordId),
    index('document_keywords_document_id_idx').on(table.documentId),
    index('document_keywords_keyword_id_idx').on(table.keywordId),
  ]
);

/**
 * Keyword Relations Table
 * Relationship: Keyword N:M Keyword through KeywordRelation
 * Implements Knowledge Graph / Knowledge Tree ontology relations.
 */
export const keywordRelations = pgTable(
  'keyword_relations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sourceKeywordId: uuid('source_keyword_id')
      .notNull()
      .references(() => keywords.id, { onDelete: 'cascade' }),
    targetKeywordId: uuid('target_keyword_id')
      .notNull()
      .references(() => keywords.id, { onDelete: 'cascade' }),
    relationType: relationTypeEnum('relation_type').default('related').notNull(),
    strength: integer('strength').default(1).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      'keyword_relations_no_self_link',
      sql`${table.sourceKeywordId} != ${table.targetKeywordId}`
    ),
    uniqueIndex('keyword_relations_src_tgt_type_idx').on(
      table.sourceKeywordId,
      table.targetKeywordId,
      table.relationType
    ),
    index('keyword_relations_source_id_idx').on(table.sourceKeywordId),
    index('keyword_relations_target_id_idx').on(table.targetKeywordId),
    index('keyword_relations_type_idx').on(table.relationType),
  ]
);

// ----------------------------------------------------
// 3. Drizzle Relations
// ----------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  taughtClasses: many(classes, { relationName: 'teacherClasses' }),
  classMemberships: many(classMembers),
  createdDocuments: many(documents),
}));

export const classesRelations = relations(classes, ({ one, many }) => ({
  teacher: one(users, {
    fields: [classes.teacherId],
    references: [users.id],
    relationName: 'teacherClasses',
  }),
  members: many(classMembers),
  topics: many(topics),
}));

export const classMembersRelations = relations(classMembers, ({ one }) => ({
  class: one(classes, {
    fields: [classMembers.classId],
    references: [classes.id],
  }),
  user: one(users, {
    fields: [classMembers.userId],
    references: [users.id],
  }),
}));

export const topicsRelations = relations(topics, ({ one, many }) => ({
  class: one(classes, {
    fields: [topics.classId],
    references: [classes.id],
  }),
  documents: many(documents),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  topic: one(topics, {
    fields: [documents.topicId],
    references: [topics.id],
  }),
  author: one(users, {
    fields: [documents.createdBy],
    references: [users.id],
  }),
  documentKeywords: many(documentKeywords),
}));

export const keywordsRelations = relations(keywords, ({ many }) => ({
  documentKeywords: many(documentKeywords),
  outgoingRelations: many(keywordRelations, { relationName: 'sourceRelations' }),
  incomingRelations: many(keywordRelations, { relationName: 'targetRelations' }),
}));

export const documentKeywordsRelations = relations(documentKeywords, ({ one }) => ({
  document: one(documents, {
    fields: [documentKeywords.documentId],
    references: [documents.id],
  }),
  keyword: one(keywords, {
    fields: [documentKeywords.keywordId],
    references: [keywords.id],
  }),
}));

export const keywordRelationsRelations = relations(keywordRelations, ({ one }) => ({
  sourceKeyword: one(keywords, {
    fields: [keywordRelations.sourceKeywordId],
    references: [keywords.id],
    relationName: 'sourceRelations',
  }),
  targetKeyword: one(keywords, {
    fields: [keywordRelations.targetKeywordId],
    references: [keywords.id],
    relationName: 'targetRelations',
  }),
}));
