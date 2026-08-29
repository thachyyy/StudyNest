import { apiClient } from './apiClient.ts';
import {
  DocumentDTO,
  CreateDocumentInput,
  UpdateDocumentInput,
} from '../types/domain.ts';

export const documentService = {
  /**
   * Lists document metadata under a topic.
   */
  async getDocuments(topicId: string): Promise<DocumentDTO[]> {
    const response = await apiClient.get<{ success: boolean; documents: DocumentDTO[] }>(
      `/topics/${topicId}/documents`
    );
    return response.documents || [];
  },

  /**
   * Retrieves single document metadata.
   */
  async getDocument(documentId: string): Promise<DocumentDTO> {
    const response = await apiClient.get<{ success: boolean; document: DocumentDTO }>(
      `/documents/${documentId}`
    );
    return response.document;
  },

  /**
   * Creates document metadata under a topic.
   */
  async createDocument(topicId: string, input: CreateDocumentInput): Promise<DocumentDTO> {
    const response = await apiClient.post<{ success: boolean; document: DocumentDTO }>(
      `/topics/${topicId}/documents`,
      input
    );
    return response.document;
  },

  /**
   * Uploads a PDF document under a topic with multipart/form-data.
   */
  async uploadDocument(
    topicId: string,
    file: File | Blob,
    metadata?: { title?: string; contentType?: string }
  ): Promise<DocumentDTO> {
    const formData = new FormData();
    formData.append('file', file, (file as File).name || 'document.pdf');
    if (metadata?.title) {
      formData.append('title', metadata.title);
    }
    if (metadata?.contentType) {
      formData.append('contentType', metadata.contentType);
    }

    const response = await apiClient.post<{ success: boolean; document: DocumentDTO }>(
      `/topics/${topicId}/documents`,
      formData
    );
    return response.document;
  },

  /**
   * Updates document metadata.
   */
  async updateDocument(documentId: string, input: UpdateDocumentInput): Promise<DocumentDTO> {
    const response = await apiClient.patch<{ success: boolean; document: DocumentDTO }>(
      `/documents/${documentId}`,
      input
    );
    return response.document;
  },

  /**
   * Deletes a document.
   */
  async deleteDocument(documentId: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `/documents/${documentId}`
    );
    return { message: response.message || 'Document deleted successfully' };
  },
};
