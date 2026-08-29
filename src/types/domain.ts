/**
 * Frontend Domain Data Transfer Objects and Request Types for StudyNest.
 * Decoupled from backend database schemas and Drizzle models.
 */

export interface ClassDTO {
  id: string;
  name: string;
  code: string;
  subject: string;
  grade: string | null;
  description: string | null;
  teacherId: string;
  teacherName?: string | null;
  teacherEmail?: string | null;
  joinedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClassInput {
  name: string;
  code: string;
  subject: string;
  grade?: string | null;
  description?: string | null;
}

export interface UpdateClassInput {
  name?: string;
  subject?: string;
  grade?: string | null;
  description?: string | null;
}

export interface ClassMemberDTO {
  id: string;
  classId: string;
  userId: string;
  role: 'student' | 'teacher' | 'teaching_assistant';
  status: 'active' | 'inactive' | 'archived';
  joinedAt: string;
  createdAt: string;
  user: {
    id: string;
    email: string | null;
    displayName: string | null;
    photoUrl?: string | null;
    globalRole: 'teacher' | 'student' | 'admin';
  };
}

export interface AddClassMemberInput {
  userId?: string;
  userEmail?: string;
  role?: 'student' | 'teacher' | 'teaching_assistant';
}

export interface TopicDTO {
  id: string;
  classId: string;
  title: string;
  description: string | null;
  status: 'draft' | 'published' | 'archived';
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTopicInput {
  title: string;
  description?: string | null;
  status?: 'draft' | 'published' | 'archived';
  orderIndex?: number;
}

export interface UpdateTopicInput {
  title?: string;
  description?: string | null;
  status?: 'draft' | 'published' | 'archived';
  orderIndex?: number;
}

export interface DocumentDTO {
  id: string;
  topicId: string;
  title: string;
  contentType: string;
  content?: string | null;
  sourceUrl?: string | null;
  fileSize?: number | null;
  status: 'draft' | 'processing' | 'ready' | 'failed' | 'archived';
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentInput {
  title: string;
  contentType?: string;
  content?: string | null;
  sourceUrl?: string | null;
  fileSize?: number | null;
  status?: 'draft' | 'processing' | 'ready' | 'failed' | 'archived';
}

export interface UpdateDocumentInput {
  title?: string;
  contentType?: string;
  content?: string | null;
  sourceUrl?: string | null;
  fileSize?: number | null;
  status?: 'draft' | 'processing' | 'ready' | 'failed' | 'archived';
}

/**
 * Standard Async Data State Container for UI components.
 */
export interface DataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  status?: number | null;
}
