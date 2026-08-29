import { apiClient } from './apiClient.ts';
import {
  TopicDTO,
  CreateTopicInput,
  UpdateTopicInput,
} from '../types/domain.ts';

export const topicService = {
  /**
   * Lists topics within a class.
   * - Teachers / Admins: All topics
   * - Students: Published topics only
   */
  async getTopics(classId: string): Promise<TopicDTO[]> {
    const response = await apiClient.get<{ success: boolean; topics: TopicDTO[] }>(
      `/classes/${classId}/topics`
    );
    return response.topics || [];
  },

  /**
   * Retrieves single topic details.
   */
  async getTopic(topicId: string): Promise<TopicDTO> {
    const response = await apiClient.get<{ success: boolean; topic: TopicDTO }>(
      `/topics/${topicId}`
    );
    return response.topic;
  },

  /**
   * Creates a topic inside a class.
   */
  async createTopic(classId: string, input: CreateTopicInput): Promise<TopicDTO> {
    const response = await apiClient.post<{ success: boolean; topic: TopicDTO }>(
      `/classes/${classId}/topics`,
      input
    );
    return response.topic;
  },

  /**
   * Updates topic details (title, description, status, orderIndex).
   */
  async updateTopic(topicId: string, input: UpdateTopicInput): Promise<TopicDTO> {
    const response = await apiClient.patch<{ success: boolean; topic: TopicDTO }>(
      `/topics/${topicId}`,
      input
    );
    return response.topic;
  },

  /**
   * Deletes a topic and cascading documents.
   */
  async deleteTopic(topicId: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `/topics/${topicId}`
    );
    return { message: response.message || 'Topic deleted successfully' };
  },
};
