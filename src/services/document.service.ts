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
      console.error('DocumentService.getDocumentsForTopic error:', error);
      return { status: 500, error: 'Failed to retrieve documents' };
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
      console.error('DocumentService.getDocumentById error:', error);
      return { status: 500, error: 'Failed to retrieve document' };
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
      console.error('DocumentService.createDocument error:', error);
      return { status: 500, error: 'Failed to create document' };
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
      console.error('DocumentService.updateDocument error:', error);
      return { status: 500, error: 'Failed to update document' };
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
      console.error('DocumentService.deleteDocument error:', error);
      return { status: 500, error: 'Failed to delete document' };
    }
  }
}
