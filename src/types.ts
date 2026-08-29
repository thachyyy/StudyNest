export * from './types/domain.ts';

export type Role = 'teacher' | 'student';
export type UserRole = 'teacher' | 'student' | 'admin';

export interface ServerUser {
  id: string;
  firebaseUid: string;
  email: string | null;
  displayName: string | null;
  photoUrl?: string | null;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

export interface Keyword {
  id: string;
  word: string;
  definition: string;
  category: string;
  suggestedPrompts: string[];
  weakCount?: number;
}

export interface TreeNode {
  id: string;
  label: string;
  category: 'core' | 'concept' | 'detail' | 'application';
  description: string;
  keywordRef?: string;
  parentId?: string;
  childrenIds?: string[];
  docExcerpt?: string;
}

export interface Material {
  id: string;
  title: string;
  subject: string;
  classGroup: string;
  pastLessonContent: string;
  nextLessonContent: string;
  learningGoals: string[];
  keywords: Keyword[];
  treeNodes: TreeNode[];
  createdAt: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  classGroup: string;
  prepProgressPercent: number;
  prepStatus: 'not_started' | 'in_progress' | 'completed';
  reviewStatus: 'needs_review' | 'ready';
  quizScore: number;
  weakKeywords: string[];
  lastActive: string;
}

export interface PromptEvaluation {
  score: number; // 0 - 100
  clarity: number; // 1 - 5
  depth: number; // 1 - 5
  critique: string;
  improvementTip: string;
}

export interface ChatMessage {
  id: string;
  sender: 'student' | 'ai';
  text: string;
  timestamp: string;
  keywordFocus?: string;
  promptEvaluation?: PromptEvaluation;
}

export interface StudentConversation {
  id: string;
  studentId: string;
  studentName: string;
  materialId: string;
  messages: ChatMessage[];
  overallPromptQualityScore: number;
  thinkingAnalysis: string;
  prepAssessment: string;
  lastUpdated: string;
}

export interface QuizQuestion {
  id: string;
  type: 'mcq' | 'essay' | 'practical';
  question: string;
  options?: string[];
  correctAnswer: string | number;
  explanation: string;
  relatedKeyword?: string;
}

export interface Quiz {
  id: string;
  materialId: string;
  title: string;
  questions: QuizQuestion[];
}

export interface LearningAnalytics {
  prepCompletionRate: number;
  avgQuizScore: number;
  totalStudents: number;
  commonMistakes: { title: string; count: number; category: string }[];
  weakKeywordsStats: { word: string; category: string; weakStudentsCount: number; percentage: number }[];
  recentActivity: { id: string; studentName: string; action: string; timestamp: string }[];
}
