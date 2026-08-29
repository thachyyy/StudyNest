import { apiClient } from './apiClient.ts';
import {
  ClassDTO,
  CreateClassInput,
  UpdateClassInput,
  ClassMemberDTO,
  AddClassMemberInput,
} from '../types/domain.ts';

export const classService = {
  /**
   * Retrieves all classes accessible to the authenticated user.
   * - Teachers: Owned classes
   * - Students: Actively enrolled classes
   * - Admins: All classes
   */
  async getClasses(): Promise<ClassDTO[]> {
    const response = await apiClient.get<{ success: boolean; classes: ClassDTO[] }>('/classes');
    return response.classes || [];
  },

  /**
   * Retrieves a single class by ID.
   */
  async getClass(classId: string): Promise<ClassDTO> {
    const response = await apiClient.get<{ success: boolean; class: ClassDTO }>(`/classes/${classId}`);
    return response.class;
  },

  /**
   * Creates a new class.
   * Server automatically assigns teacherId = authenticated user ID.
   */
  async createClass(input: CreateClassInput): Promise<ClassDTO> {
    const response = await apiClient.post<{ success: boolean; class: ClassDTO }>('/classes', input);
    return response.class;
  },

  /**
   * Updates class metadata.
   */
  async updateClass(classId: string, input: UpdateClassInput): Promise<ClassDTO> {
    const response = await apiClient.patch<{ success: boolean; class: ClassDTO }>(`/classes/${classId}`, input);
    return response.class;
  },

  /**
   * Deletes a class and cascades associated records.
   */
  async deleteClass(classId: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/classes/${classId}`);
    return { message: response.message || 'Class deleted successfully' };
  },

  /**
   * Lists all members enrolled in a class.
   */
  async getClassMembers(classId: string): Promise<ClassMemberDTO[]> {
    const response = await apiClient.get<{ success: boolean; members: ClassMemberDTO[] }>(
      `/classes/${classId}/members`
    );
    return response.members || [];
  },

  /**
   * Enrolls a student or user in a class.
   */
  async addClassMember(classId: string, input: AddClassMemberInput): Promise<ClassMemberDTO> {
    const response = await apiClient.post<{ success: boolean; member: ClassMemberDTO }>(
      `/classes/${classId}/members`,
      input
    );
    return response.member;
  },

  /**
   * Removes a member from a class.
   */
  async removeClassMember(classId: string, memberId: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `/classes/${classId}/members/${memberId}`
    );
    return { message: response.message || 'Member removed successfully' };
  },
};
