import { eq, and, asc } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { classMembers, users } from '../db/schema.ts';
import { AuthenticatedUser } from '../middleware/auth.ts';
import { checkClassModification } from './authorization.ts';
import { AddMemberDTO, isValidUuid } from '../lib/validation.ts';
import { ServiceResult } from './class.service.ts';
import { getUserByEmail, getUserById } from '../db/users.ts';

export class ClassMemberService {
  /**
   * Retrieves members for a class.
   * Allowed: Owning teacher, Admin
   */
  static async getClassMembers(classId: string, user: AuthenticatedUser): Promise<ServiceResult> {
    try {
      const authResult = await checkClassModification(user.id, user.role, classId);
      if (!authResult.allowed) {
        return { status: authResult.status, error: authResult.reason };
      }

      const members = await db
        .select({
          id: classMembers.id,
          classId: classMembers.classId,
          userId: classMembers.userId,
          role: classMembers.role,
          status: classMembers.status,
          joinedAt: classMembers.joinedAt,
          createdAt: classMembers.createdAt,
          user: {
            id: users.id,
            email: users.email,
            displayName: users.displayName,
            photoUrl: users.photoUrl,
            globalRole: users.role,
          },
        })
        .from(classMembers)
        .innerJoin(users, eq(classMembers.userId, users.id))
        .where(eq(classMembers.classId, classId))
        .orderBy(asc(users.displayName), asc(classMembers.joinedAt));

      return { status: 200, data: members };
    } catch (error: any) {
      console.error('ClassMemberService.getClassMembers error:', error);
      return { status: 500, error: 'Failed to retrieve class members' };
    }
  }

  /**
   * Adds a user to a class as a student/member.
   * Allowed: Owning teacher, Admin
   */
  static async addMember(
    classId: string,
    dto: AddMemberDTO,
    user: AuthenticatedUser
  ): Promise<ServiceResult> {
    try {
      const authResult = await checkClassModification(user.id, user.role, classId);
      if (!authResult.allowed) {
        return { status: authResult.status, error: authResult.reason };
      }

      // Resolve target user
      let targetUser = null;
      if (dto.userId) {
        targetUser = await getUserById(dto.userId);
      } else if (dto.userEmail) {
        targetUser = await getUserByEmail(dto.userEmail);
      }

      if (!targetUser) {
        return { status: 404, error: 'Target user not found in StudyNest user database' };
      }

      // Check duplicate membership
      const [existingMembership] = await db
        .select()
        .from(classMembers)
        .where(
          and(
            eq(classMembers.classId, classId),
            eq(classMembers.userId, targetUser.id)
          )
        )
        .limit(1);

      if (existingMembership) {
        return {
          status: 409,
          error: `User is already enrolled in this class with status '${existingMembership.status}'`,
        };
      }

      const [newMembership] = await db
        .insert(classMembers)
        .values({
          classId,
          userId: targetUser.id,
          role: dto.role || 'student',
          status: 'active',
        })
        .returning();

      return {
        status: 201,
        data: {
          ...newMembership,
          user: {
            id: targetUser.id,
            email: targetUser.email,
            displayName: targetUser.displayName,
            photoUrl: targetUser.photoUrl,
            globalRole: targetUser.role,
          },
        },
      };
    } catch (error: any) {
      console.error('ClassMemberService.addMember error:', error);
      if (error.code === '23505') {
        return { status: 409, error: 'User is already a member of this class' };
      }
      return { status: 500, error: 'Failed to add class member' };
    }
  }

  /**
   * Removes a member from a class.
   * Allowed: Owning teacher, Admin
   */
  static async removeMember(
    classId: string,
    memberIdOrUserId: string,
    user: AuthenticatedUser
  ): Promise<ServiceResult> {
    try {
      if (!isValidUuid(memberIdOrUserId)) {
        return { status: 400, error: 'Invalid member or user ID (must be a valid UUID)' };
      }

      const authResult = await checkClassModification(user.id, user.role, classId);
      if (!authResult.allowed) {
        return { status: authResult.status, error: authResult.reason };
      }

      // Check if ID matches classMembers.id or classMembers.userId
      const [membership] = await db
        .select()
        .from(classMembers)
        .where(
          and(
            eq(classMembers.classId, classId),
            eq(classMembers.id, memberIdOrUserId)
          )
        )
        .limit(1);

      let targetMemberId = membership?.id;
      if (!targetMemberId) {
        const [byUserId] = await db
          .select()
          .from(classMembers)
          .where(
            and(
              eq(classMembers.classId, classId),
              eq(classMembers.userId, memberIdOrUserId)
            )
          )
          .limit(1);
        targetMemberId = byUserId?.id;
      }

      if (!targetMemberId) {
        return { status: 404, error: 'Class membership record not found' };
      }

      await db.delete(classMembers).where(eq(classMembers.id, targetMemberId));

      return { status: 200, data: { message: 'Member removed from class successfully' } };
    } catch (error: any) {
      console.error('ClassMemberService.removeMember error:', error);
      return { status: 500, error: 'Failed to remove class member' };
    }
  }
}
