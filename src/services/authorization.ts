import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { classes, classMembers, topics, documents } from '../db/schema.ts';
import { UserRole } from '../db/users.ts';
import { isValidUuid } from '../lib/validation.ts';

export interface AuthorizationResult<T = any> {
  allowed: boolean;
  status: 200 | 400 | 401 | 403 | 404;
  reason?: string;
  resource?: T;
}

/**
 * Checks if a user has read access to a class and its curriculum.
 * - Admin: Always allowed
 * - Teacher: Allowed if owner of class (teacherId === userId) or active co-teacher/TA
 * - Student: Allowed only if active member in class_members
 */
export async function checkClassAccess(
  userId: string,
  userRole: UserRole,
  classId: string
): Promise<AuthorizationResult<typeof classes.$inferSelect>> {
  if (!classId || !isValidUuid(classId)) {
    return { allowed: false, status: 400, reason: 'Invalid or malformed class ID (must be a valid UUID)' };
  }

  const [classRecord] = await db
    .select()
    .from(classes)
    .where(eq(classes.id, classId))
    .limit(1);

  if (!classRecord) {
    return { allowed: false, status: 404, reason: 'Class not found' };
  }

  if (userRole === 'admin') {
    return { allowed: true, status: 200, resource: classRecord };
  }

  if (userRole === 'teacher') {
    if (classRecord.teacherId === userId) {
      return { allowed: true, status: 200, resource: classRecord };
    }

    // Check if teacher is an active co-teacher or TA in class_members
    const [membership] = await db
      .select()
      .from(classMembers)
      .where(
        and(
          eq(classMembers.classId, classId),
          eq(classMembers.userId, userId),
          eq(classMembers.status, 'active')
        )
      )
      .limit(1);

    if (membership && (membership.role === 'teacher' || membership.role === 'teaching_assistant')) {
      return { allowed: true, status: 200, resource: classRecord };
    }

    return {
      allowed: false,
      status: 403,
      reason: 'Forbidden: You do not own or teach this class',
    };
  }

  if (userRole === 'student') {
    const [membership] = await db
      .select()
      .from(classMembers)
      .where(
        and(
          eq(classMembers.classId, classId),
          eq(classMembers.userId, userId),
          eq(classMembers.status, 'active')
        )
      )
      .limit(1);

    if (membership) {
      return { allowed: true, status: 200, resource: classRecord };
    }

    return {
      allowed: false,
      status: 403,
      reason: 'Forbidden: Student is not enrolled in this class',
    };
  }

  return { allowed: false, status: 403, reason: 'Forbidden: Unknown user role' };
}

/**
 * Checks if a user has write/modify/delete permission for a class.
 * - Admin: Always allowed
 * - Teacher: Allowed only if owner (teacherId === userId)
 * - Student: Never allowed
 */
export async function checkClassModification(
  userId: string,
  userRole: UserRole,
  classId: string
): Promise<AuthorizationResult<typeof classes.$inferSelect>> {
  if (!classId || !isValidUuid(classId)) {
    return { allowed: false, status: 400, reason: 'Invalid or malformed class ID (must be a valid UUID)' };
  }

  const [classRecord] = await db
    .select()
    .from(classes)
    .where(eq(classes.id, classId))
    .limit(1);

  if (!classRecord) {
    return { allowed: false, status: 404, reason: 'Class not found' };
  }

  if (userRole === 'admin') {
    return { allowed: true, status: 200, resource: classRecord };
  }

  if (userRole === 'teacher') {
    if (classRecord.teacherId === userId) {
      return { allowed: true, status: 200, resource: classRecord };
    }
    return {
      allowed: false,
      status: 403,
      reason: 'Forbidden: Only the owning teacher can modify this class',
    };
  }

  return {
    allowed: false,
    status: 403,
    reason: 'Forbidden: Students cannot modify classes',
  };
}

/**
 * Checks if a user has read access to a topic.
 * Resolves topic -> class, then verifies class access.
 * If user is a student, also enforces that the topic status must be 'published'.
 */
export async function checkTopicAccess(
  userId: string,
  userRole: UserRole,
  topicId: string
): Promise<AuthorizationResult<{ topic: typeof topics.$inferSelect; classRecord: typeof classes.$inferSelect }>> {
  if (!topicId || !isValidUuid(topicId)) {
    return { allowed: false, status: 400, reason: 'Invalid or malformed topic ID (must be a valid UUID)' };
  }

  const [topicRecord] = await db
    .select()
    .from(topics)
    .where(eq(topics.id, topicId))
    .limit(1);

  if (!topicRecord) {
    return { allowed: false, status: 404, reason: 'Topic not found' };
  }

  const classAuth = await checkClassAccess(userId, userRole, topicRecord.classId);
  if (!classAuth.allowed) {
    return {
      allowed: false,
      status: classAuth.status,
      reason: classAuth.reason || 'Forbidden: Access to topic curriculum denied',
    };
  }

  // Student topic visibility policy: students can only access published topics
  if (userRole === 'student' && topicRecord.status !== 'published') {
    return {
      allowed: false,
      status: 403,
      reason: 'Forbidden: This topic is not published for students',
    };
  }

  return {
    allowed: true,
    status: 200,
    resource: { topic: topicRecord, classRecord: classAuth.resource! },
  };
}

/**
 * Checks if a user has write/modify access to a topic.
 * Resolves topic -> class, then verifies class modification permission.
 */
export async function checkTopicModification(
  userId: string,
  userRole: UserRole,
  topicId: string
): Promise<AuthorizationResult<{ topic: typeof topics.$inferSelect; classRecord: typeof classes.$inferSelect }>> {
  if (!topicId || !isValidUuid(topicId)) {
    return { allowed: false, status: 400, reason: 'Invalid or malformed topic ID (must be a valid UUID)' };
  }

  const [topicRecord] = await db
    .select()
    .from(topics)
    .where(eq(topics.id, topicId))
    .limit(1);

  if (!topicRecord) {
    return { allowed: false, status: 404, reason: 'Topic not found' };
  }

  const classAuth = await checkClassModification(userId, userRole, topicRecord.classId);
  if (!classAuth.allowed) {
    return {
      allowed: false,
      status: classAuth.status,
      reason: classAuth.reason || 'Forbidden: Modification of topic curriculum denied',
    };
  }

  return {
    allowed: true,
    status: 200,
    resource: { topic: topicRecord, classRecord: classAuth.resource! },
  };
}

/**
 * Checks if a user has read access to a document.
 * Resolves document -> topic -> class, then verifies topic access.
 */
export async function checkDocumentAccess(
  userId: string,
  userRole: UserRole,
  documentId: string
): Promise<AuthorizationResult<{
  document: typeof documents.$inferSelect;
  topic: typeof topics.$inferSelect;
  classRecord: typeof classes.$inferSelect;
}>> {
  if (!documentId || !isValidUuid(documentId)) {
    return { allowed: false, status: 400, reason: 'Invalid or malformed document ID (must be a valid UUID)' };
  }

  const [documentRecord] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (!documentRecord) {
    return { allowed: false, status: 404, reason: 'Document not found' };
  }

  const topicAuth = await checkTopicAccess(userId, userRole, documentRecord.topicId);
  if (!topicAuth.allowed) {
    return {
      allowed: false,
      status: topicAuth.status,
      reason: topicAuth.reason || 'Forbidden: Access to document denied',
    };
  }

  return {
    allowed: true,
    status: 200,
    resource: {
      document: documentRecord,
      topic: topicAuth.resource!.topic,
      classRecord: topicAuth.resource!.classRecord,
    },
  };
}

/**
 * Checks if a user has write/modify access to a document.
 * Resolves document -> topic -> class, then verifies topic modification permission.
 */
export async function checkDocumentModification(
  userId: string,
  userRole: UserRole,
  documentId: string
): Promise<AuthorizationResult<{
  document: typeof documents.$inferSelect;
  topic: typeof topics.$inferSelect;
  classRecord: typeof classes.$inferSelect;
}>> {
  if (!documentId || !isValidUuid(documentId)) {
    return { allowed: false, status: 400, reason: 'Invalid or malformed document ID (must be a valid UUID)' };
  }

  const [documentRecord] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (!documentRecord) {
    return { allowed: false, status: 404, reason: 'Document not found' };
  }

  const topicAuth = await checkTopicModification(userId, userRole, documentRecord.topicId);
  if (!topicAuth.allowed) {
    return {
      allowed: false,
      status: topicAuth.status,
      reason: topicAuth.reason || 'Forbidden: Modification of document denied',
    };
  }

  return {
    allowed: true,
    status: 200,
    resource: {
      document: documentRecord,
      topic: topicAuth.resource!.topic,
      classRecord: topicAuth.resource!.classRecord,
    },
  };
}
