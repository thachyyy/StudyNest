import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  auth,
  signInWithGoogle,
  logOut,
} from '../lib/firebase';
import { Material, Student, StudentConversation, Quiz, LearningAnalytics, ServerUser, UserRole } from '../types';
import { apiClient } from '../services/apiClient';
import {
  INITIAL_MATERIALS,
  INITIAL_STUDENTS,
  INITIAL_CONVERSATIONS,
  INITIAL_QUIZ,
  INITIAL_ANALYTICS
} from '../mockData';

interface FirebaseContextType {
  currentUser: User | null;
  serverUser: ServerUser | null;
  authoritativeRole: UserRole | null;
  authLoading: boolean;
  isLoggingIn: boolean;
  isConnected: boolean;
  authNotice: string | null;
  clearAuthNotice: () => void;
  refreshServerUser: () => Promise<void>;
  materials: Material[];
  students: Student[];
  conversations: StudentConversation[];
  quiz: Quiz;
  analytics: LearningAnalytics;
  loginWithGoogle: () => Promise<void>;
  loginAsDemo: (role: 'teacher' | 'student') => Promise<void>;
  logout: () => Promise<void>;
  addMaterial: (newMat: Material) => Promise<void>;
  updateStudent: (student: Student) => Promise<void>;
  saveConversation: (conv: StudentConversation) => Promise<void>;
  saveQuiz: (newQuiz: Quiz) => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | null>(null);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [serverUser, setServerUser] = useState<ServerUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);

  const [materials, setMaterials] = useState<Material[]>(INITIAL_MATERIALS);
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [conversations, setConversations] = useState<StudentConversation[]>(INITIAL_CONVERSATIONS);
  const [quiz, setQuiz] = useState<Quiz>(INITIAL_QUIZ);
  const [analytics, setAnalytics] = useState<LearningAnalytics>(INITIAL_ANALYTICS);

  // Fetch authoritative user profile from backend (PostgreSQL)
  const refreshServerUser = useCallback(async () => {
    try {
      const data = await apiClient.get<{ success: boolean; user: ServerUser }>('/users/me');
      if (data?.user) {
        setServerUser(data.user);
      } else {
        setServerUser(null);
      }
    } catch (err) {
      // If error occurs, set default demo user
      setServerUser(prev => prev);
    }
  }, []);

  // Initialize Auth & backend session
  useEffect(() => {
    let isMounted = true;

    async function init() {
      // In demo mode, start with teacher role by default
      apiClient.setDemoRole('teacher');
      await refreshServerUser();
      if (isMounted) {
        setAuthLoading(false);
        setIsConnected(true);
      }
    }
    init();

    // Firebase Auth state listener (used for production or when user signs in with Google)
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;
      setCurrentUser(user);
      setAuthLoading(false);
      setIsLoggingIn(false);

      if (!user) {
        // Fall back to backend demo user
        await refreshServerUser();
        return;
      }

      // Sync authenticated user to PostgreSQL database in backend
      try {
        const syncData = await apiClient.post<{ success: boolean; user: ServerUser }>('/users/sync', {
          displayName: user.displayName,
          photoUrl: user.photoURL,
        });
        if (syncData?.user && isMounted) {
          setServerUser(syncData.user);
        }
      } catch (e) {
        console.warn('Background PostgreSQL user sync notice:', e);
      }
    });

    return () => {
      isMounted = false;
      unsubscribeAuth();
    };
  }, [refreshServerUser]);

  // Update analytics dynamically when students/conversations change
  useEffect(() => {
    if (students.length === 0) return;
    const completedCount = students.filter(s => s.prepStatus === 'completed').length;
    const completionRate = Math.round((completedCount / students.length) * 100);
    const avgScore = Math.round(students.reduce((acc, s) => acc + s.quizScore, 0) / students.length);

    setAnalytics(prev => ({
      ...prev,
      prepCompletionRate: completionRate,
      avgQuizScore: avgScore,
      totalStudents: students.length
    }));
  }, [students]);

  const clearAuthNotice = useCallback(() => {
    setAuthNotice(null);
  }, []);

  const handleLoginWithGoogle = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setAuthNotice(null);
    try {
      const res = await signInWithGoogle();
      if (!res.success && res.error) {
        setAuthNotice(res.error);
      }
    } catch (err: any) {
      console.warn('Sign-in failed:', err);
      setAuthNotice('Google sign-in could not be completed. You can use Instant Demo or open the app in a new tab.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLoginAsDemo = async (role: 'teacher' | 'student') => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setAuthNotice(null);
    try {
      // Switch demo identity via backend Demo Identity flow (no Firebase anonymous auth needed)
      apiClient.setDemoRole(role);
      
      // Update optimistic serverUser profile
      setServerUser({
        id: `demo-${role}-id`,
        uid: `demo-uid-${role}`,
        email: role === 'teacher' ? 'demo.teacher@studynest.local' : 'an.minh@studynest.local',
        displayName: role === 'teacher' ? 'Dr. Sarah Vance' : 'An Minh (Student)',
        photoUrl: role === 'teacher'
          ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=100&q=80'
          : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
        role,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Synchronize with PostgreSQL /api/users/me
      await refreshServerUser();
    } catch (err) {
      console.warn('Demo identity switch notice:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logOut();
      setCurrentUser(null);
      setServerUser(null);
      apiClient.setDemoRole(null);
      setAuthNotice(null);
    } catch (err) {
      console.warn('Sign-out notice:', err);
    }
  };

  const handleAddMaterial = async (newMat: Material) => {
    setMaterials(prev => [newMat, ...prev]);
  };

  const handleUpdateStudent = async (student: Student) => {
    setStudents(prev => prev.map(s => s.id === student.id ? student : s));
  };

  const handleSaveConversation = async (conv: StudentConversation) => {
    setConversations(prev => {
      const idx = prev.findIndex(c => c.id === conv.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = conv;
        return copy;
      }
      return [conv, ...prev];
    });
  };

  const handleSaveQuiz = async (newQuiz: Quiz) => {
    setQuiz(newQuiz);
  };

  return (
    <FirebaseContext.Provider
      value={{
        currentUser,
        serverUser,
        authoritativeRole: serverUser?.role || null,
        authLoading,
        isLoggingIn,
        isConnected,
        authNotice,
        clearAuthNotice,
        refreshServerUser,
        materials,
        students,
        conversations,
        quiz,
        analytics,
        loginWithGoogle: handleLoginWithGoogle,
        loginAsDemo: handleLoginAsDemo,
        logout: handleLogout,
        addMaterial: handleAddMaterial,
        updateStudent: handleUpdateStudent,
        saveConversation: handleSaveConversation,
        saveQuiz: handleSaveQuiz
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
};

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}

