import { eq, and, asc } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { classes, classMembers, users } from '../db/schema.ts';
import { AuthenticatedUser } from '../middleware/auth.ts';
import { checkClassAccess, checkClassModification } from './authorization.ts';
import { CreateClassDTO, UpdateClassDTO } from '../lib/validation.ts';

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
      console.error('ClassService.listClasses error:', error);
      return { status: 500, error: 'Failed to retrieve classes' };
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
      console.error('ClassService.getClassById error:', error);
      return { status: 500, error: 'Failed to retrieve class' };
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
      console.error('ClassService.createClass error:', error);
      if (error.code === '23505') {
        return { status: 409, error: `A class with code '${dto.code}' already exists` };
      }
      return { status: 500, error: 'Failed to create class' };
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
      console.error('ClassService.updateClass error:', error);
      return { status: 500, error: 'Failed to update class' };
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
      console.error('ClassService.deleteClass error:', error);
      return { status: 500, error: 'Failed to delete class' };
    }
  }
}
