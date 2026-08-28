import { pgTable, serial, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table mapping to Firebase Auth UID
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  role: text('role').default('student').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Curriculum Materials Table
export const materials = pgTable('materials', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  subject: text('subject').notNull(),
  grade: text('grade').notNull(),
  pastLesson: text('past_lesson').notNull(),
  nextLesson: text('next_lesson').notNull(),
  learningGoals: jsonb('learning_goals').notNull(),
  keywords: jsonb('keywords').notNull(),
  treeNodes: jsonb('tree_nodes').notNull(),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Student Conversations & AI Tutor interaction logs
export const studentConversations = pgTable('student_conversations', {
  id: text('id').primaryKey(),
  studentId: text('student_id').notNull(),
  studentName: text('student_name').notNull(),
  materialId: text('material_id').notNull(),
  keyword: text('keyword').notNull(),
  promptScore: integer('prompt_score').notNull(),
  messages: jsonb('messages').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Quizzes Table
export const quizzes = pgTable('quizzes', {
  id: text('id').primaryKey(),
  materialId: text('material_id').notNull(),
  title: text('title').notNull(),
  questions: jsonb('questions').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Quiz Submissions Table
export const quizSubmissions = pgTable('quiz_submissions', {
  id: text('id').primaryKey(),
  quizId: text('quiz_id').notNull(),
  studentId: text('student_id').notNull(),
  studentName: text('student_name').notNull(),
  score: integer('score').notNull(),
  totalQuestions: integer('total_questions').notNull(),
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
});

// Relations definitions
export const usersRelations = relations(users, ({ many }) => ({
  materials: many(materials),
  conversations: many(studentConversations),
  submissions: many(quizSubmissions),
}));
