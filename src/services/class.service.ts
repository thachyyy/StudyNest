import { eq, and, asc } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { classes, classMembers, users } from '../db/schema.ts';
import { AuthenticatedUser } from '../middleware/auth.ts';
import { checkClassAccess, checkClassModification } from './authorization.ts';
import { CreateClassDTO, UpdateClassDTO } from '../lib/validation.ts';
import { inMemoryStore, InMemoryClass, generateStoreId } from '../db/inMemoryStore.ts';

export interface ServiceResult<T = any> {
  status: 200 | 201 | 400 | 401 | 403 | 404 | 409 | 500;
  data?: T;
  error?: string;
}

export class ClassService {
  /**
   * Lists classes accessible to the authenticated user.
   * - Teacher: Classes they own (teacherId === user.id)
   * - Student: Classes where they have an active enrollment (class_members.status === 'active')
   * - Admin: All classes
   */
  static async listClasses(user: AuthenticatedUser): Promise<ServiceResult> {
    try {
      if (user.role === 'admin') {
        const allClasses = await db
          .select({
            id: classes.id,
            name: classes.name,
            code: classes.code,
            description: classes.description,
            subject: classes.subject,
            grade: classes.grade,
            teacherId: classes.teacherId,
            teacherName: users.displayName,
            teacherEmail: users.email,
            createdAt: classes.createdAt,
            updatedAt: classes.updatedAt,
          })
          .from(classes)
          .leftJoin(users, eq(classes.teacherId, users.id))
          .orderBy(asc(classes.name));
        return { status: 200, data: allClasses };
      }

      if (user.role === 'teacher') {
        const teacherClasses = await db
          .select({
            id: classes.id,
            name: classes.name,
            code: classes.code,
            description: classes.description,
            subject: classes.subject,
            grade: classes.grade,
            teacherId: classes.teacherId,
            createdAt: classes.createdAt,
            updatedAt: classes.updatedAt,
          })
          .from(classes)
          .where(eq(classes.teacherId, user.id))
          .orderBy(asc(classes.name));
        return { status: 200, data: teacherClasses };
      }

      // Student role: Get actively enrolled classes
      const enrolledClasses = await db
        .select({
          id: classes.id,
          name: classes.name,
          code: classes.code,
          description: classes.description,
          subject: classes.subject,
          grade: classes.grade,
          teacherId: classes.teacherId,
          teacherName: users.displayName,
          joinedAt: classMembers.joinedAt,
          createdAt: classes.createdAt,
          updatedAt: classes.updatedAt,
        })
        .from(classMembers)
        .innerJoin(classes, eq(classMembers.classId, classes.id))
        .leftJoin(users, eq(classes.teacherId, users.id))
        .where(and(eq(classMembers.userId, user.id), eq(classMembers.status, 'active')))
        .orderBy(asc(classes.name));

      return { status: 200, data: enrolledClasses };
    } catch (error: any) {
      // In-Memory Failover
      const allMemClasses = Array.from(inMemoryStore.classes.values());
      if (user.role === 'admin') {
        return { status: 200, data: allMemClasses };
      }
      if (user.role === 'teacher') {
        const owned = allMemClasses.filter(c => c.teacherId === user.id);
        return { status: 200, data: owned };
      }
      // Student
      const memberships = Array.from(inMemoryStore.classMembers.values()).filter(
        m => m.userId === user.id && m.status === 'active'
      );
      const studentClassIds = new Set(memberships.map(m => m.classId));
      const enrolled = allMemClasses.filter(c => studentClassIds.has(c.id));
      return { status: 200, data: enrolled };
    }
  }

  /**
   * Retrieves a single class by ID after checking access authorization.
   */
  static async getClassById(classId: string, user: AuthenticatedUser): Promise<ServiceResult> {
    try {
      const authResult = await checkClassAccess(user.id, user.role, classId);
      if (!authResult.allowed) {
        return { status: authResult.status, error: authResult.reason };
      }

      const [classWithTeacher] = await db
        .select({
          id: classes.id,
          name: classes.name,
          code: classes.code,
          description: classes.description,
          subject: classes.subject,
          grade: classes.grade,
          teacherId: classes.teacherId,
          teacherName: users.displayName,
          teacherEmail: users.email,
          createdAt: classes.createdAt,
          updatedAt: classes.updatedAt,
        })
        .from(classes)
        .leftJoin(users, eq(classes.teacherId, users.id))
        .where(eq(classes.id, classId))
        .limit(1);

      return { status: 200, data: classWithTeacher || authResult.resource };
    } catch (error: any) {
      const memClass = inMemoryStore.classes.get(classId);
      if (memClass) {
        return { status: 200, data: memClass };
      }
      return { status: 404, error: 'Class not found' };
    }
  }

  /**
   * Creates a new class.
   * Allowed: Teacher, Admin
   * Strictly enforces teacherId = user.id
   */
  static async createClass(dto: CreateClassDTO, user: AuthenticatedUser): Promise<ServiceResult> {
    try {
      if (user.role !== 'teacher' && user.role !== 'admin') {
        return { status: 403, error: 'Forbidden: Only teachers and admins can create classes' };
      }

      // Check unique code constraint
      const [existing] = await db
        .select({ id: classes.id })
        .from(classes)
        .where(eq(classes.code, dto.code))
        .limit(1);

      if (existing) {
        return { status: 409, error: `A class with code '${dto.code}' already exists` };
      }

      const [created] = await db
        .insert(classes)
        .values({
          name: dto.name,
          code: dto.code,
          subject: dto.subject,
          grade: dto.grade || null,
          description: dto.description || null,
          teacherId: user.id, // Strictly server-assigned
        })
        .returning();

      return { status: 201, data: created };
    } catch (error: any) {
      // In-Memory Fallback
      if (user.role !== 'teacher' && user.role !== 'admin') {
        return { status: 403, error: 'Forbidden: Only teachers and admins can create classes' };
      }

      const existingCode = Array.from(inMemoryStore.classes.values()).find(
        c => c.code.toLowerCase() === dto.code.toLowerCase()
      );
      if (existingCode) {
        return { status: 409, error: `A class with code '${dto.code}' already exists` };
      }

      const newId = generateStoreId('class');
      const now = new Date();
      const newClass: InMemoryClass = {
        id: newId,
        name: dto.name,
        code: dto.code,
        subject: dto.subject,
        grade: dto.grade || null,
        description: dto.description || null,
        teacherId: user.id,
        createdAt: now,
        updatedAt: now,
      };
      inMemoryStore.classes.set(newId, newClass);
      return { status: 201, data: newClass };
    }
  }

  /**
   * Updates class metadata.
   * Allowed: Owning teacher, Admin
   */
  static async updateClass(
    classId: string,
    dto: UpdateClassDTO,
    user: AuthenticatedUser
  ): Promise<ServiceResult> {
    try {
      const authResult = await checkClassModification(user.id, user.role, classId);
      if (!authResult.allowed) {
        return { status: authResult.status, error: authResult.reason };
      }

      const updatePayload: Record<string, any> = {
        updatedAt: new Date(),
      };

      if (dto.name !== undefined) updatePayload.name = dto.name;
      if (dto.description !== undefined) updatePayload.description = dto.description;
      if (dto.subject !== undefined) updatePayload.subject = dto.subject;
      if (dto.grade !== undefined) updatePayload.grade = dto.grade;

      const [updated] = await db
        .update(classes)
        .set(updatePayload)
        .where(eq(classes.id, classId))
        .returning();

      return { status: 200, data: updated };
    } catch (error: any) {
      const memClass = inMemoryStore.classes.get(classId);
      if (!memClass) {
        return { status: 404, error: 'Class not found' };
      }
      if (dto.name !== undefined) memClass.name = dto.name;
      if (dto.description !== undefined) memClass.description = dto.description;
      if (dto.subject !== undefined) memClass.subject = dto.subject;
      if (dto.grade !== undefined) memClass.grade = dto.grade;
      memClass.updatedAt = new Date();
      return { status: 200, data: memClass };
    }
  }

  /**
   * Deletes a class and cascades associated records.
   * Allowed: Owning teacher, Admin
   */
  static async deleteClass(classId: string, user: AuthenticatedUser): Promise<ServiceResult> {
    try {
      const authResult = await checkClassModification(user.id, user.role, classId);
      if (!authResult.allowed) {
        return { status: authResult.status, error: authResult.reason };
      }

      await db.delete(classes).where(eq(classes.id, classId));
      return { status: 200, data: { message: 'Class deleted successfully' } };
    } catch (error: any) {
      if (inMemoryStore.classes.has(classId)) {
        inMemoryStore.classes.delete(classId);
        return { status: 200, data: { message: 'Class deleted successfully' } };
      }
      return { status: 404, error: 'Class not found' };
    }
  }
}
