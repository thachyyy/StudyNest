import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { classes, classMembers, topics, documents } from '../db/schema.ts';
import { UserRole } from '../db/users.ts';
import { isValidUuid } from '../lib/validation.ts';
import { inMemoryStore } from '../db/inMemoryStore.ts';

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
): Promise<AuthorizationResult<any>> {
  if (!classId || !isValidUuid(classId)) {
    // Check in-memory store as well
    if (!inMemoryStore.classes.has(classId)) {
      return { allowed: false, status: 400, reason: 'Invalid or malformed class ID' };
    }
  }

  let classRecord: any = null;
  try {
    const [record] = await db
      .select()
      .from(classes)
      .where(eq(classes.id, classId))
      .limit(1);
    classRecord = record;
  } catch (err) {
    classRecord = inMemoryStore.classes.get(classId) || null;
  }

  if (!classRecord) {
    classRecord = inMemoryStore.classes.get(classId) || null;
  }

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

    try {
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
    } catch {
      // In-memory check
      const memMember = Array.from(inMemoryStore.classMembers.values()).find(
        m => m.classId === classId && m.userId === userId && m.status === 'active'
      );
      if (memMember && (memMember.role === 'teacher' || memMember.role === 'teaching_assistant')) {
        return { allowed: true, status: 200, resource: classRecord };
      }
    }

    return {
      allowed: false,
      status: 403,
      reason: 'Forbidden: You do not have access to this class',
    };
  }

  if (userRole === 'student') {
    try {
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
    } catch {
      const memMember = Array.from(inMemoryStore.classMembers.values()).find(
        m => m.classId === classId && m.userId === userId && m.status === 'active'
      );
      if (memMember) {
        return { allowed: true, status: 200, resource: classRecord };
      }
    }

    return {
      allowed: false,
      status: 403,
      reason: 'Forbidden: You are not enrolled in this class',
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
): Promise<AuthorizationResult<any>> {
  if (!classId || !isValidUuid(classId)) {
    if (!inMemoryStore.classes.has(classId)) {
      return { allowed: false, status: 400, reason: 'Invalid or malformed class ID' };
    }
  }

  let classRecord: any = null;
  try {
    const [record] = await db
      .select()
      .from(classes)
      .where(eq(classes.id, classId))
      .limit(1);
    classRecord = record;
  } catch {
    classRecord = inMemoryStore.classes.get(classId) || null;
  }

  if (!classRecord) {
    classRecord = inMemoryStore.classes.get(classId) || null;
  }

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
      reason: 'Forbidden: You do not own this class and cannot modify or delete it',
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
): Promise<AuthorizationResult<{ topic: any; classRecord: any }>> {
  if (!topicId || !isValidUuid(topicId)) {
    if (!inMemoryStore.topics.has(topicId)) {
      return { allowed: false, status: 400, reason: 'Invalid or malformed topic ID' };
    }
  }

  let topicRecord: any = null;
  try {
    const [record] = await db
      .select()
      .from(topics)
      .where(eq(topics.id, topicId))
      .limit(1);
    topicRecord = record;
  } catch {
    topicRecord = inMemoryStore.topics.get(topicId) || null;
  }

  if (!topicRecord) {
    topicRecord = inMemoryStore.topics.get(topicId) || null;
  }

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
): Promise<AuthorizationResult<{ topic: any; classRecord: any }>> {
  if (!topicId || !isValidUuid(topicId)) {
    if (!inMemoryStore.topics.has(topicId)) {
      return { allowed: false, status: 400, reason: 'Invalid or malformed topic ID' };
    }
  }

  let topicRecord: any = null;
  try {
    const [record] = await db
      .select()
      .from(topics)
      .where(eq(topics.id, topicId))
      .limit(1);
    topicRecord = record;
  } catch {
    topicRecord = inMemoryStore.topics.get(topicId) || null;
  }

  if (!topicRecord) {
    topicRecord = inMemoryStore.topics.get(topicId) || null;
  }

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
  document: any;
  topic: any;
  classRecord: any;
}>> {
  if (!documentId || !isValidUuid(documentId)) {
    if (!inMemoryStore.documents.has(documentId)) {
      return { allowed: false, status: 400, reason: 'Invalid or malformed document ID' };
    }
  }

  let documentRecord: any = null;
  try {
    const [record] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);
    documentRecord = record;
  } catch {
    documentRecord = inMemoryStore.documents.get(documentId) || null;
  }

  if (!documentRecord) {
    documentRecord = inMemoryStore.documents.get(documentId) || null;
  }

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
  document: any;
  topic: any;
  classRecord: any;
}>> {
  if (!documentId || !isValidUuid(documentId)) {
    if (!inMemoryStore.documents.has(documentId)) {
      return { allowed: false, status: 400, reason: 'Invalid or malformed document ID' };
    }
  }

  let documentRecord: any = null;
  try {
    const [record] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);
    documentRecord = record;
  } catch {
    documentRecord = inMemoryStore.documents.get(documentId) || null;
  }

  if (!documentRecord) {
    documentRecord = inMemoryStore.documents.get(documentId) || null;
  }

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
