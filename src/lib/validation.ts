/**
 * Input validation and sanitization helpers for core domain APIs.
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(id?: string | null): boolean {
  if (!id || typeof id !== 'string') return false;
  return UUID_REGEX.test(id.trim());
}

export interface ValidationResult<T> {
  isValid: boolean;
  errors: string[];
  data?: T;
}

export interface CreateClassDTO {
  name: string;
  code: string;
  subject: string;
  grade?: string | null;
  description?: string | null;
}

export interface UpdateClassDTO {
  name?: string;
  description?: string | null;
  subject?: string;
  grade?: string | null;
}

export interface CreateTopicDTO {
  title: string;
  description?: string | null;
  status?: 'draft' | 'published' | 'archived';
  orderIndex?: number;
}

export interface UpdateTopicDTO {
  title?: string;
  description?: string | null;
  status?: 'draft' | 'published' | 'archived';
  orderIndex?: number;
}

export interface AddMemberDTO {
  userId?: string;
  userEmail?: string;
  role?: 'student' | 'teacher' | 'teaching_assistant';
}

export interface CreateDocumentDTO {
  title: string;
  contentType?: string;
  content?: string | null;
  sourceUrl?: string | null;
  fileSize?: number | null;
  status?: 'draft' | 'processing' | 'ready' | 'failed' | 'archived';
}

export interface UpdateDocumentDTO {
  title?: string;
  contentType?: string;
  content?: string | null;
  sourceUrl?: string | null;
  fileSize?: number | null;
  status?: 'draft' | 'processing' | 'ready' | 'failed' | 'archived';
}

export function validateCreateClass(body: any): ValidationResult<CreateClassDTO> {
  const errors: string[] = [];
  const { name, code, subject, grade, description } = body || {};

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('name is required and must be a non-empty string');
  } else if (name.trim().length > 200) {
    errors.push('name cannot exceed 200 characters');
  }

  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    errors.push('code is required and must be a non-empty string');
  } else if (code.trim().length > 50) {
    errors.push('code cannot exceed 50 characters');
  }

  if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
    errors.push('subject is required and must be a non-empty string');
  } else if (subject.trim().length > 100) {
    errors.push('subject cannot exceed 100 characters');
  }

  if (grade !== undefined && grade !== null && typeof grade !== 'string') {
    errors.push('grade must be a string if provided');
  } else if (typeof grade === 'string' && grade.trim().length > 50) {
    errors.push('grade cannot exceed 50 characters');
  }

  if (description !== undefined && description !== null && typeof description !== 'string') {
    errors.push('description must be a string if provided');
  } else if (typeof description === 'string' && description.trim().length > 2000) {
    errors.push('description cannot exceed 2000 characters');
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    data: {
      name: String(name).trim(),
      code: String(code).trim().toUpperCase(),
      subject: String(subject).trim(),
      grade: grade ? String(grade).trim() : null,
      description: description ? String(description).trim() : null,
    },
  };
}

export function validateUpdateClass(body: any): ValidationResult<UpdateClassDTO> {
  const errors: string[] = [];
  const { name, description, subject, grade } = body || {};

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      errors.push('name must be a non-empty string');
    } else if (name.trim().length > 200) {
      errors.push('name cannot exceed 200 characters');
    }
  }

  if (subject !== undefined) {
    if (typeof subject !== 'string' || subject.trim().length === 0) {
      errors.push('subject must be a non-empty string');
    } else if (subject.trim().length > 100) {
      errors.push('subject cannot exceed 100 characters');
    }
  }

  if (grade !== undefined && grade !== null) {
    if (typeof grade !== 'string') {
      errors.push('grade must be a string');
    } else if (grade.trim().length > 50) {
      errors.push('grade cannot exceed 50 characters');
    }
  }

  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      errors.push('description must be a string');
    } else if (description.trim().length > 2000) {
      errors.push('description cannot exceed 2000 characters');
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    data: {
      ...(name !== undefined ? { name: String(name).trim() } : {}),
      ...(subject !== undefined ? { subject: String(subject).trim() } : {}),
      ...(grade !== undefined ? { grade: grade === null ? null : String(grade).trim() } : {}),
      ...(description !== undefined ? { description: description === null ? null : String(description).trim() } : {}),
    },
  };
}

export function validateCreateTopic(body: any): ValidationResult<CreateTopicDTO> {
  const errors: string[] = [];
  const { title, description, status, orderIndex } = body || {};

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    errors.push('title is required and must be a non-empty string');
  } else if (title.trim().length > 200) {
    errors.push('title cannot exceed 200 characters');
  }

  const allowedStatuses = ['draft', 'published', 'archived'];
  if (status !== undefined && !allowedStatuses.includes(status)) {
    errors.push(`status must be one of: ${allowedStatuses.join(', ')}`);
  }

  if (orderIndex !== undefined && (typeof orderIndex !== 'number' || !Number.isInteger(orderIndex) || orderIndex < 0)) {
    errors.push('orderIndex must be a non-negative integer');
  }

  if (description !== undefined && description !== null && typeof description !== 'string') {
    errors.push('description must be a string if provided');
  } else if (typeof description === 'string' && description.trim().length > 2000) {
    errors.push('description cannot exceed 2000 characters');
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    data: {
      title: String(title).trim(),
      description: description ? String(description).trim() : null,
      status: status || 'draft',
      orderIndex: typeof orderIndex === 'number' ? orderIndex : 0,
    },
  };
}

export function validateUpdateTopic(body: any): ValidationResult<UpdateTopicDTO> {
  const errors: string[] = [];
  const { title, description, status, orderIndex } = body || {};

  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      errors.push('title must be a non-empty string');
    } else if (title.trim().length > 200) {
      errors.push('title cannot exceed 200 characters');
    }
  }

  const allowedStatuses = ['draft', 'published', 'archived'];
  if (status !== undefined && !allowedStatuses.includes(status)) {
    errors.push(`status must be one of: ${allowedStatuses.join(', ')}`);
  }

  if (orderIndex !== undefined && (typeof orderIndex !== 'number' || !Number.isInteger(orderIndex) || orderIndex < 0)) {
    errors.push('orderIndex must be a non-negative integer');
  }

  if (description !== undefined && description !== null && typeof description !== 'string') {
    errors.push('description must be a string if provided');
  } else if (typeof description === 'string' && description.trim().length > 2000) {
    errors.push('description cannot exceed 2000 characters');
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    data: {
      ...(title !== undefined ? { title: String(title).trim() } : {}),
      ...(description !== undefined ? { description: description === null ? null : String(description).trim() } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(orderIndex !== undefined ? { orderIndex } : {}),
    },
  };
}

export function validateAddMember(body: any): ValidationResult<AddMemberDTO> {
  const errors: string[] = [];
  const { userId, userEmail, role } = body || {};

  if (!userId && !userEmail) {
    errors.push('Either userId (UUID) or userEmail must be provided');
  }

  if (userId && !isValidUuid(userId)) {
    errors.push('userId must be a valid UUID');
  }

  if (userEmail && (typeof userEmail !== 'string' || !userEmail.includes('@'))) {
    errors.push('userEmail must be a valid email address');
  }

  const allowedRoles = ['student', 'teacher', 'teaching_assistant'];
  if (role !== undefined && !allowedRoles.includes(role)) {
    errors.push(`role must be one of: ${allowedRoles.join(', ')}`);
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    data: {
      ...(userId ? { userId: String(userId).trim() } : {}),
      ...(userEmail ? { userEmail: String(userEmail).trim().toLowerCase() } : {}),
      role: role || 'student',
    },
  };
}

export function validateCreateDocument(body: any): ValidationResult<CreateDocumentDTO> {
  const errors: string[] = [];
  const { title, contentType, content, sourceUrl, fileSize, status } = body || {};

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    errors.push('title is required and must be a non-empty string');
  } else if (title.trim().length > 200) {
    errors.push('title cannot exceed 200 characters');
  }

  const allowedStatuses = ['draft', 'processing', 'ready', 'failed', 'archived'];
  if (status !== undefined && !allowedStatuses.includes(status)) {
    errors.push(`status must be one of: ${allowedStatuses.join(', ')}`);
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    data: {
      title: String(title).trim(),
      contentType: contentType ? String(contentType).trim() : 'lecture_notes',
      content: content !== undefined && content !== null ? String(content) : null,
      sourceUrl: sourceUrl ? String(sourceUrl).trim() : null,
      fileSize: typeof fileSize === 'number' ? fileSize : null,
      status: status || 'ready',
    },
  };
}

export function validateUpdateDocument(body: any): ValidationResult<UpdateDocumentDTO> {
  const errors: string[] = [];
  const { title, contentType, content, sourceUrl, fileSize, status } = body || {};

  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      errors.push('title must be a non-empty string');
    } else if (title.trim().length > 200) {
      errors.push('title cannot exceed 200 characters');
    }
  }

  const allowedStatuses = ['draft', 'processing', 'ready', 'failed', 'archived'];
  if (status !== undefined && !allowedStatuses.includes(status)) {
    errors.push(`status must be one of: ${allowedStatuses.join(', ')}`);
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    data: {
      ...(title !== undefined ? { title: String(title).trim() } : {}),
      ...(contentType !== undefined ? { contentType: String(contentType).trim() } : {}),
      ...(content !== undefined ? { content: content === null ? null : String(content) } : {}),
      ...(sourceUrl !== undefined ? { sourceUrl: sourceUrl === null ? null : String(sourceUrl).trim() } : {}),
      ...(fileSize !== undefined ? { fileSize } : {}),
      ...(status !== undefined ? { status } : {}),
    },
  };
}
