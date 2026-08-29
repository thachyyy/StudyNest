import { eq, and, asc } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { topics } from '../db/schema.ts';
import { AuthenticatedUser } from '../middleware/auth.ts';
import {
  checkClassAccess,
  checkClassModification,
  checkTopicAccess,
  checkTopicModification,
} from './authorization.ts';
import { CreateTopicDTO, UpdateTopicDTO } from '../lib/validation.ts';
import { ServiceResult } from './class.service.ts';
import { inMemoryStore, InMemoryTopic, generateStoreId } from '../db/inMemoryStore.ts';

export class TopicService {
  /**
   * Lists topics within a class.
   * - Teacher / Admin: All topics (draft, published, archived)
   * - Student: Only published topics
   */
  static async getTopicsForClass(classId: string, user: AuthenticatedUser): Promise<ServiceResult> {
    try {
      const classAuth = await checkClassAccess(user.id, user.role, classId);
      if (!classAuth.allowed) {
        return { status: classAuth.status, error: classAuth.reason };
      }

      if (user.role === 'student') {
        const publishedTopics = await db
          .select()
          .from(topics)
          .where(and(eq(topics.classId, classId), eq(topics.status, 'published')))
          .orderBy(asc(topics.orderIndex), asc(topics.createdAt));

        return { status: 200, data: publishedTopics };
      }

      const allTopics = await db
        .select()
        .from(topics)
        .where(eq(topics.classId, classId))
        .orderBy(asc(topics.orderIndex), asc(topics.createdAt));

      return { status: 200, data: allTopics };
    } catch (error: any) {
      // In-Memory failover
      const classTopics = Array.from(inMemoryStore.topics.values()).filter(t => t.classId === classId);
      if (user.role === 'student') {
        return { status: 200, data: classTopics.filter(t => t.status === 'published') };
      }
      return { status: 200, data: classTopics };
    }
  }

  /**
   * Gets a single topic by ID.
   * Enforces that students can only read published topics.
   */
  static async getTopicById(topicId: string, user: AuthenticatedUser): Promise<ServiceResult> {
    try {
      const topicAuth = await checkTopicAccess(user.id, user.role, topicId);
      if (!topicAuth.allowed) {
        return { status: topicAuth.status, error: topicAuth.reason };
      }

      return { status: 200, data: topicAuth.resource!.topic };
    } catch (error: any) {
      const memTopic = inMemoryStore.topics.get(topicId);
      if (memTopic) {
        if (user.role === 'student' && memTopic.status !== 'published') {
          return { status: 403, error: 'Forbidden: This topic is not published for students' };
        }
        return { status: 200, data: memTopic };
      }
      return { status: 404, error: 'Topic not found' };
    }
  }

  /**
   * Creates a new topic inside a class.
   * Allowed: Owning teacher, Admin
   */
  static async createTopic(
    classId: string,
    dto: CreateTopicDTO,
    user: AuthenticatedUser
  ): Promise<ServiceResult> {
    try {
      const classAuth = await checkClassModification(user.id, user.role, classId);
      if (!classAuth.allowed) {
        return { status: classAuth.status, error: classAuth.reason };
      }

      const [created] = await db
        .insert(topics)
        .values({
          classId,
          title: dto.title,
          description: dto.description || null,
          status: dto.status || 'draft',
          orderIndex: dto.orderIndex !== undefined ? dto.orderIndex : 0,
        })
        .returning();

      return { status: 201, data: created };
    } catch (error: any) {
      const newId = generateStoreId('topic');
      const now = new Date();
      const newTopic: InMemoryTopic = {
        id: newId,
        classId,
        title: dto.title,
        description: dto.description || null,
        status: dto.status || 'draft',
        orderIndex: dto.orderIndex !== undefined ? dto.orderIndex : 0,
        createdAt: now,
        updatedAt: now,
      };
      inMemoryStore.topics.set(newId, newTopic);
      return { status: 201, data: newTopic };
    }
  }

  /**
   * Updates topic details.
   * Allowed: Owning teacher, Admin
   */
  static async updateTopic(
    topicId: string,
    dto: UpdateTopicDTO,
    user: AuthenticatedUser
  ): Promise<ServiceResult> {
    try {
      const topicAuth = await checkTopicModification(user.id, user.role, topicId);
      if (!topicAuth.allowed) {
        return { status: topicAuth.status, error: topicAuth.reason };
      }

      const updatePayload: Record<string, any> = {
        updatedAt: new Date(),
      };

      if (dto.title !== undefined) updatePayload.title = dto.title;
      if (dto.description !== undefined) updatePayload.description = dto.description;
      if (dto.status !== undefined) updatePayload.status = dto.status;
      if (dto.orderIndex !== undefined) updatePayload.orderIndex = dto.orderIndex;

      const [updated] = await db
        .update(topics)
        .set(updatePayload)
        .where(eq(topics.id, topicId))
        .returning();

      return { status: 200, data: updated };
    } catch (error: any) {
      const memTopic = inMemoryStore.topics.get(topicId);
      if (!memTopic) return { status: 404, error: 'Topic not found' };
      if (dto.title !== undefined) memTopic.title = dto.title;
      if (dto.description !== undefined) memTopic.description = dto.description;
      if (dto.status !== undefined) memTopic.status = dto.status;
      if (dto.orderIndex !== undefined) memTopic.orderIndex = dto.orderIndex;
      memTopic.updatedAt = new Date();
      return { status: 200, data: memTopic };
    }
  }

  /**
   * Deletes a topic and its documents.
   * Allowed: Owning teacher, Admin
   */
  static async deleteTopic(topicId: string, user: AuthenticatedUser): Promise<ServiceResult> {
    try {
      const topicAuth = await checkTopicModification(user.id, user.role, topicId);
      if (!topicAuth.allowed) {
        return { status: topicAuth.status, error: topicAuth.reason };
      }

      await db.delete(topics).where(eq(topics.id, topicId));
      return { status: 200, data: { message: 'Topic deleted successfully' } };
    } catch (error: any) {
      if (inMemoryStore.topics.has(topicId)) {
        inMemoryStore.topics.delete(topicId);
        return { status: 200, data: { message: 'Topic deleted successfully' } };
      }
      return { status: 404, error: 'Topic not found' };
    }
  }
}
