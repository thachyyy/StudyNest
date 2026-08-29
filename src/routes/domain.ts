import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth.ts';
import { ClassService } from '../services/class.service.ts';
import { ClassMemberService } from '../services/classMember.service.ts';
import { TopicService } from '../services/topic.service.ts';
import { DocumentService } from '../services/document.service.ts';
import {
  isValidUuid,
  validateCreateClass,
  validateUpdateClass,
  validateCreateTopic,
  validateUpdateTopic,
  validateAddMember,
  validateCreateDocument,
  validateUpdateDocument,
} from '../lib/validation.ts';

export const domainRouter = Router();

// ====================================================
// 1. Classes API Routes
// ====================================================

/**
 * GET /api/classes
 * Lists classes accessible to the authenticated user.
 * - Teacher: Owned classes
 * - Student: Actively enrolled classes
 * - Admin: All classes
 */
domainRouter.get('/classes', requireAuth, async (req: AuthRequest, res: Response) => {
  const result = await ClassService.listClasses(req.user!);
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.status(result.status).json({ success: true, classes: result.data });
});

/**
 * POST /api/classes
 * Creates a new class.
 * Allowed: Teacher, Admin
 * Enforces teacherId = req.user.id
 */
domainRouter.post('/classes', requireAuth, requireRole('teacher', 'admin'), async (req: AuthRequest, res: Response) => {
  const validation = validateCreateClass(req.body);
  if (!validation.isValid) {
    return res.status(400).json({ error: validation.errors.join('; ') });
  }

  const result = await ClassService.createClass(validation.data!, req.user!);
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.status(result.status).json({ success: true, class: result.data });
});

/**
 * GET /api/classes/:classId
 * Gets details of a single class.
 * Allowed: Owning teacher, Enrolled student, Admin
 */
domainRouter.get('/classes/:classId', requireAuth, async (req: AuthRequest, res: Response) => {
  const { classId } = req.params;
  if (!isValidUuid(classId)) {
    return res.status(400).json({ error: 'Invalid or malformed class ID (must be a valid UUID)' });
  }

  const result = await ClassService.getClassById(classId, req.user!);
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.status(result.status).json({ success: true, class: result.data });
});

/**
 * PATCH /api/classes/:classId & PUT /api/classes/:classId
 * Updates class metadata.
 * Allowed: Owning teacher, Admin
 */
const updateClassHandler = async (req: AuthRequest, res: Response) => {
  const { classId } = req.params;
  if (!isValidUuid(classId)) {
    return res.status(400).json({ error: 'Invalid or malformed class ID (must be a valid UUID)' });
  }

  const validation = validateUpdateClass(req.body);
  if (!validation.isValid) {
    return res.status(400).json({ error: validation.errors.join('; ') });
  }

  const result = await ClassService.updateClass(classId, validation.data!, req.user!);
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.status(result.status).json({ success: true, class: result.data });
};

domainRouter.patch('/classes/:classId', requireAuth, updateClassHandler);
domainRouter.put('/classes/:classId', requireAuth, updateClassHandler);

/**
 * DELETE /api/classes/:classId
 * Deletes a class and cascades.
 * Allowed: Owning teacher, Admin
 */
domainRouter.delete('/classes/:classId', requireAuth, async (req: AuthRequest, res: Response) => {
  const { classId } = req.params;
  if (!isValidUuid(classId)) {
    return res.status(400).json({ error: 'Invalid or malformed class ID (must be a valid UUID)' });
  }

  const result = await ClassService.deleteClass(classId, req.user!);
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.status(result.status).json({ success: true, message: 'Class deleted successfully' });
});

// ====================================================
// 2. Class Members API Routes
// ====================================================

/**
 * GET /api/classes/:classId/members
 * Lists all enrolled members of a class.
 * Allowed: Owning teacher, Admin
 */
domainRouter.get('/classes/:classId/members', requireAuth, async (req: AuthRequest, res: Response) => {
  const { classId } = req.params;
  if (!isValidUuid(classId)) {
    return res.status(400).json({ error: 'Invalid or malformed class ID (must be a valid UUID)' });
  }

  const result = await ClassMemberService.getClassMembers(classId, req.user!);
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.status(result.status).json({ success: true, members: result.data });
});

/**
 * POST /api/classes/:classId/members
 * Enrolls a student or user in a class.
 * Allowed: Owning teacher, Admin
 */
domainRouter.post('/classes/:classId/members', requireAuth, async (req: AuthRequest, res: Response) => {
  const { classId } = req.params;
  if (!isValidUuid(classId)) {
    return res.status(400).json({ error: 'Invalid or malformed class ID (must be a valid UUID)' });
  }

  const validation = validateAddMember(req.body);
  if (!validation.isValid) {
    return res.status(400).json({ error: validation.errors.join('; ') });
  }

  const result = await ClassMemberService.addMember(classId, validation.data!, req.user!);
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.status(result.status).json({ success: true, member: result.data });
});

/**
 * DELETE /api/classes/:classId/members/:memberId
 * Removes an enrolled member from a class.
 * Allowed: Owning teacher, Admin
 */
domainRouter.delete('/classes/:classId/members/:memberId', requireAuth, async (req: AuthRequest, res: Response) => {
  const { classId, memberId } = req.params;
  if (!isValidUuid(classId)) {
    return res.status(400).json({ error: 'Invalid or malformed class ID (must be a valid UUID)' });
  }
  if (!isValidUuid(memberId)) {
    return res.status(400).json({ error: 'Invalid or malformed member ID (must be a valid UUID)' });
  }

  const result = await ClassMemberService.removeMember(classId, memberId, req.user!);
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.status(result.status).json({ success: true, message: 'Member removed successfully' });
});

// ====================================================
// 3. Topics API Routes
// ====================================================

/**
 * GET /api/classes/:classId/topics
 * Lists topics within a class.
 * Allowed: Enrolled students (published topics only), Owning teacher, Admin
 */
domainRouter.get('/classes/:classId/topics', requireAuth, async (req: AuthRequest, res: Response) => {
  const { classId } = req.params;
  if (!isValidUuid(classId)) {
    return res.status(400).json({ error: 'Invalid or malformed class ID (must be a valid UUID)' });
  }

  const result = await TopicService.getTopicsForClass(classId, req.user!);
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.status(result.status).json({ success: true, topics: result.data });
});

/**
 * POST /api/classes/:classId/topics
 * Creates a new topic in a class.
 * Allowed: Owning teacher, Admin
 */
domainRouter.post('/classes/:classId/topics', requireAuth, async (req: AuthRequest, res: Response) => {
  const { classId } = req.params;
  if (!isValidUuid(classId)) {
    return res.status(400).json({ error: 'Invalid or malformed class ID (must be a valid UUID)' });
  }

  const validation = validateCreateTopic(req.body);
  if (!validation.isValid) {
    return res.status(400).json({ error: validation.errors.join('; ') });
  }

  const result = await TopicService.createTopic(classId, validation.data!, req.user!);
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.status(result.status).json({ success: true, topic: result.data });
});

/**
 * GET /api/topics/:topicId
 * Gets single topic details.
 * Allowed: Enrolled students (published topics only), Owning teacher, Admin
 */
domainRouter.get('/topics/:topicId', requireAuth, async (req: AuthRequest, res: Response) => {
  const { topicId } = req.params;
  if (!isValidUuid(topicId)) {
    return res.status(400).json({ error: 'Invalid or malformed topic ID (must be a valid UUID)' });
  }

  const result = await TopicService.getTopicById(topicId, req.user!);
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.status(result.status).json({ success: true, topic: result.data });
});

/**
 * PATCH /api/topics/:topicId & PUT /api/topics/:topicId
 * Updates topic details.
 * Allowed: Owning teacher, Admin
 */
const updateTopicHandler = async (req: AuthRequest, res: Response) => {
  const { topicId } = req.params;
  if (!isValidUuid(topicId)) {
    return res.status(400).json({ error: 'Invalid or malformed topic ID (must be a valid UUID)' });
  }

  const validation = validateUpdateTopic(req.body);
  if (!validation.isValid) {
    return res.status(400).json({ error: validation.errors.join('; ') });
  }

  const result = await TopicService.updateTopic(topicId, validation.data!, req.user!);
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.status(result.status).json({ success: true, topic: result.data });
};

domainRouter.patch('/topics/:topicId', requireAuth, updateTopicHandler);
domainRouter.put('/topics/:topicId', requireAuth, updateTopicHandler);

/**
 * DELETE /api/topics/:topicId
 * Deletes a topic and its documents.
 * Allowed: Owning teacher, Admin
 */
domainRouter.delete('/topics/:topicId', requireAuth, async (req: AuthRequest, res: Response) => {
  const { topicId } = req.params;
  if (!isValidUuid(topicId)) {
    return res.status(400).json({ error: 'Invalid or malformed topic ID (must be a valid UUID)' });
  }

  const result = await TopicService.deleteTopic(topicId, req.user!);
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.status(result.status).json({ success: true, message: 'Topic deleted successfully' });
});

// ====================================================
// 4. Documents API Routes (Metadata)
// ====================================================

/**
 * GET /api/topics/:topicId/documents
 * Lists documents under a topic.
 * Allowed: Enrolled students (if topic is published), Owning teacher, Admin
 */
domainRouter.get('/topics/:topicId/documents', requireAuth, async (req: AuthRequest, res: Response) => {
  const { topicId } = req.params;
  if (!isValidUuid(topicId)) {
    return res.status(400).json({ error: 'Invalid or malformed topic ID (must be a valid UUID)' });
  }

  const result = await DocumentService.getDocumentsForTopic(topicId, req.user!);
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.status(result.status).json({ success: true, documents: result.data });
});

/**
 * POST /api/topics/:topicId/documents
 * Creates a document under a topic.
 * Allowed: Owning teacher, Admin
 */
domainRouter.post('/topics/:topicId/documents', requireAuth, async (req: AuthRequest, res: Response) => {
  const { topicId } = req.params;
  if (!isValidUuid(topicId)) {
    return res.status(400).json({ error: 'Invalid or malformed topic ID (must be a valid UUID)' });
  }

  const validation = validateCreateDocument(req.body);
  if (!validation.isValid) {
    return res.status(400).json({ error: validation.errors.join('; ') });
  }

  const result = await DocumentService.createDocument(topicId, validation.data!, req.user!);
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.status(result.status).json({ success: true, document: result.data });
});

/**
 * GET /api/documents/:documentId
 * Gets single document details.
 * Allowed: Enrolled students (if topic is published), Owning teacher, Admin
 */
domainRouter.get('/documents/:documentId', requireAuth, async (req: AuthRequest, res: Response) => {
  const { documentId } = req.params;
  if (!isValidUuid(documentId)) {
    return res.status(400).json({ error: 'Invalid or malformed document ID (must be a valid UUID)' });
  }

  const result = await DocumentService.getDocumentById(documentId, req.user!);
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.status(result.status).json({ success: true, document: result.data });
});

/**
 * PATCH /api/documents/:documentId & PUT /api/documents/:documentId
 * Updates document details.
 * Allowed: Owning teacher, Admin
 */
const updateDocumentHandler = async (req: AuthRequest, res: Response) => {
  const { documentId } = req.params;
  if (!isValidUuid(documentId)) {
    return res.status(400).json({ error: 'Invalid or malformed document ID (must be a valid UUID)' });
  }

  const validation = validateUpdateDocument(req.body);
  if (!validation.isValid) {
    return res.status(400).json({ error: validation.errors.join('; ') });
  }

  const result = await DocumentService.updateDocument(documentId, validation.data!, req.user!);
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.status(result.status).json({ success: true, document: result.data });
};

domainRouter.patch('/documents/:documentId', requireAuth, updateDocumentHandler);
domainRouter.put('/documents/:documentId', requireAuth, updateDocumentHandler);

/**
 * DELETE /api/documents/:documentId
 * Deletes a document.
 * Allowed: Owning teacher, Admin
 */
domainRouter.delete('/documents/:documentId', requireAuth, async (req: AuthRequest, res: Response) => {
  const { documentId } = req.params;
  if (!isValidUuid(documentId)) {
    return res.status(400).json({ error: 'Invalid or malformed document ID (must be a valid UUID)' });
  }

  const result = await DocumentService.deleteDocument(documentId, req.user!);
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.status(result.status).json({ success: true, message: 'Document deleted successfully' });
});
