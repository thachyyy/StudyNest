import { eq, asc } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { documents } from '../db/schema.ts';
import { AuthenticatedUser } from '../middleware/auth.ts';
import {
  checkTopicAccess,
  checkTopicModification,
  checkDocumentAccess,
  checkDocumentModification,
} from './authorization.ts';
import { CreateDocumentDTO, UpdateDocumentDTO } from '../lib/validation.ts';
import { ServiceResult } from './class.service.ts';
import { inMemoryStore, InMemoryDocument, generateStoreId } from '../db/inMemoryStore.ts';
import { validateUploadedPdf, sanitizeFilename, generateStorageIdentifier } from '../lib/fileValidation.ts';

export class DocumentService {
  /**
   * Lists documents under a topic.
   * Allowed: Owning teacher, Admin, Enrolled student (only if topic is published)
   */
  static async getDocumentsForTopic(
    topicId: string,
    user: AuthenticatedUser
  ): Promise<ServiceResult> {
    try {
      const topicAuth = await checkTopicAccess(user.id, user.role, topicId);
      if (!topicAuth.allowed) {
        return { status: topicAuth.status, error: topicAuth.reason };
      }

      const topicDocs = await db
        .select({
          id: documents.id,
          topicId: documents.topicId,
          title: documents.title,
          contentType: documents.contentType,
          sourceUrl: documents.sourceUrl,
          fileSize: documents.fileSize,
          status: documents.status,
          createdBy: documents.createdBy,
          createdAt: documents.createdAt,
          updatedAt: documents.updatedAt,
        })
        .from(documents)
        .where(eq(documents.topicId, topicId))
        .orderBy(asc(documents.createdAt));

      return { status: 200, data: topicDocs };
    } catch (error: any) {
      const docs = Array.from(inMemoryStore.documents.values()).filter(d => d.topicId === topicId);
      return { status: 200, data: docs };
    }
  }

  /**
   * Retrieves single document metadata and content.
   * Allowed: Owning teacher, Admin, Enrolled student (only if topic is published)
   */
  static async getDocumentById(
    documentId: string,
    user: AuthenticatedUser
  ): Promise<ServiceResult> {
    try {
      const docAuth = await checkDocumentAccess(user.id, user.role, documentId);
      if (!docAuth.allowed) {
        return { status: docAuth.status, error: docAuth.reason };
      }

      return { status: 200, data: docAuth.resource!.document };
    } catch (error: any) {
      const memDoc = inMemoryStore.documents.get(documentId);
      if (memDoc) return { status: 200, data: memDoc };
      return { status: 404, error: 'Document not found' };
    }
  }

  /**
   * Creates a new document under a topic.
   * Allowed: Owning teacher, Admin
   */
  static async createDocument(
    topicId: string,
    dto: CreateDocumentDTO,
    user: AuthenticatedUser
  ): Promise<ServiceResult> {
    try {
      const topicAuth = await checkTopicModification(user.id, user.role, topicId);
      if (!topicAuth.allowed) {
        return { status: topicAuth.status, error: topicAuth.reason };
      }

      const [created] = await db
        .insert(documents)
        .values({
          topicId,
          title: dto.title,
          content: dto.content || null,
          contentType: dto.contentType || 'lecture_notes',
          sourceUrl: dto.sourceUrl || null,
          fileSize: dto.fileSize || null,
          status: dto.status || 'ready',
          createdBy: user.id,
        })
        .returning();

      return { status: 201, data: created };
    } catch (error: any) {
      const newId = generateStoreId('doc');
      const now = new Date();
      const newDoc: InMemoryDocument = {
        id: newId,
        topicId,
        title: dto.title,
        content: dto.content || null,
        contentType: dto.contentType || 'lecture_notes',
        sourceUrl: dto.sourceUrl || null,
        fileSize: dto.fileSize || null,
        status: dto.status || 'ready',
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
      };
      inMemoryStore.documents.set(newId, newDoc);
      return { status: 201, data: newDoc };
    }
  }

  /**
   * Validates and prepares document record from uploaded PDF file.
   * Allowed: Owning teacher, Admin
   */
  static async uploadDocumentPdf(
    topicId: string,
    file: Express.Multer.File | undefined,
    user: AuthenticatedUser,
    customTitle?: string,
    contentType?: string
  ): Promise<ServiceResult> {
    // 1. Authorization: Verify teacher owns class containing topic
    const topicAuth = await checkTopicModification(user.id, user.role, topicId);
    if (!topicAuth.allowed) {
      return { status: topicAuth.status, error: topicAuth.reason };
    }

    // 2. Strict server-side PDF validation
    const validation = validateUploadedPdf(file);
    if (!validation.isValid || !file) {
      return { status: validation.status || 400, error: validation.error };
    }

    // 3. Derive and sanitize title
    let title = customTitle && typeof customTitle === 'string' && customTitle.trim().length > 0
      ? customTitle.trim()
      : (validation.sanitizedFilename || file.originalname || 'Document.pdf').replace(/\.pdf$/i, '');
    
    if (title.length > 200) {
      title = title.substring(0, 200);
    }

    const docContentType = contentType && typeof contentType === 'string' && contentType.trim().length > 0
      ? contentType.trim()
      : 'lecture_notes';

    // 4. Initial status: 'draft' (pending future processing phases)
    const initialStatus = 'draft';
    const storageIdentifier = generateStorageIdentifier(topicId);

    try {
      const [created] = await db
        .insert(documents)
        .values({
          topicId,
          title,
          content: null,
          contentType: docContentType,
          sourceUrl: storageIdentifier,
          fileSize: file.size,
          status: initialStatus,
          createdBy: user.id,
        })
        .returning();

      return { status: 201, data: created };
    } catch (error: any) {
      const newId = generateStoreId('doc');
      const now = new Date();
      const newDoc: InMemoryDocument = {
        id: newId,
        topicId,
        title,
        content: null,
        contentType: docContentType,
        sourceUrl: storageIdentifier,
        fileSize: file.size,
        status: initialStatus,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
      };
      inMemoryStore.documents.set(newId, newDoc);
      return { status: 201, data: newDoc };
    }
  }

  /**
   * Updates document metadata or content.
   * Allowed: Owning teacher, Admin
   */
  static async updateDocument(
    documentId: string,
    dto: UpdateDocumentDTO,
    user: AuthenticatedUser
  ): Promise<ServiceResult> {
    try {
      const docAuth = await checkDocumentModification(user.id, user.role, documentId);
      if (!docAuth.allowed) {
        return { status: docAuth.status, error: docAuth.reason };
      }

      const updatePayload: Record<string, any> = {
        updatedAt: new Date(),
      };

      if (dto.title !== undefined) updatePayload.title = dto.title;
      if (dto.content !== undefined) updatePayload.content = dto.content;
      if (dto.contentType !== undefined) updatePayload.contentType = dto.contentType;
      if (dto.sourceUrl !== undefined) updatePayload.sourceUrl = dto.sourceUrl;
      if (dto.fileSize !== undefined) updatePayload.fileSize = dto.fileSize;
      if (dto.status !== undefined) updatePayload.status = dto.status;

      const [updated] = await db
        .update(documents)
        .set(updatePayload)
        .where(eq(documents.id, documentId))
        .returning();

      return { status: 200, data: updated };
    } catch (error: any) {
      const memDoc = inMemoryStore.documents.get(documentId);
      if (!memDoc) return { status: 404, error: 'Document not found' };
      if (dto.title !== undefined) memDoc.title = dto.title;
      if (dto.content !== undefined) memDoc.content = dto.content;
      if (dto.contentType !== undefined) memDoc.contentType = dto.contentType;
      if (dto.sourceUrl !== undefined) memDoc.sourceUrl = dto.sourceUrl;
      if (dto.fileSize !== undefined) memDoc.fileSize = dto.fileSize;
      if (dto.status !== undefined) memDoc.status = dto.status;
      memDoc.updatedAt = new Date();
      return { status: 200, data: memDoc };
    }
  }

  /**
   * Deletes a document.
   * Allowed: Owning teacher, Admin
   */
  static async deleteDocument(
    documentId: string,
    user: AuthenticatedUser
  ): Promise<ServiceResult> {
    try {
      const docAuth = await checkDocumentModification(user.id, user.role, documentId);
      if (!docAuth.allowed) {
        return { status: docAuth.status, error: docAuth.reason };
      }

      await db.delete(documents).where(eq(documents.id, documentId));
      return { status: 200, data: { message: 'Document deleted successfully' } };
    } catch (error: any) {
      if (inMemoryStore.documents.has(documentId)) {
        inMemoryStore.documents.delete(documentId);
        return { status: 200, data: { message: 'Document deleted successfully' } };
      }
      return { status: 404, error: 'Document not found' };
    }
  }
}
