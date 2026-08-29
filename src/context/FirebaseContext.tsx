import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import {
  auth,
  db,
  testConnection,
  signInWithGoogle,
  signInAsDemo,
  logOut,
  seedInitialDataIfEmpty,
  saveMaterialToFirestore,
  saveStudentToFirestore,
  saveConversationToFirestore,
  saveQuizToFirestore,
  handleFirestoreError,
  OperationType
} from '../lib/firebase';
import { Material, Student, StudentConversation, Quiz, LearningAnalytics, ServerUser, UserRole } from '../types';
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
  const [isConnected, setIsConnected] = useState(false);

  const [materials, setMaterials] = useState<Material[]>(INITIAL_MATERIALS);
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [conversations, setConversations] = useState<StudentConversation[]>(INITIAL_CONVERSATIONS);
  const [quiz, setQuiz] = useState<Quiz>(INITIAL_QUIZ);
  const [analytics, setAnalytics] = useState<LearningAnalytics>(INITIAL_ANALYTICS);

  // Fetch authoritative user profile from backend
  const refreshServerUser = useCallback(async () => {
    if (!auth.currentUser) {
      setServerUser(null);
      return;
    }
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/api/users/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setServerUser(data.user);
        }
      }
    } catch (err) {
      console.warn('Could not refresh server user:', err);
    }
  }, []);

  // Initialize Auth & Connection
  useEffect(() => {
    let isMounted = true;

    async function init() {
      const ok = await testConnection();
      if (isMounted) setIsConnected(ok);
      await seedInitialDataIfEmpty();
    }
    init();

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (isMounted) {
        setCurrentUser(user);
        setAuthLoading(false);
        setIsLoggingIn(false);

        if (!user) {
          setServerUser(null);
          return;
        }

        // Sync authenticated user to PostgreSQL database in backend
        try {
          const token = await user.getIdToken();
          const syncRes = await fetch('/api/users/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              displayName: user.displayName,
              photoUrl: user.photoURL,
            }),
          });
          if (syncRes.ok && isMounted) {
            const syncData = await syncRes.json();
            if (syncData.user) {
              setServerUser(syncData.user);
            }
          }
        } catch (e) {
          console.warn('Background PostgreSQL user sync notice:', e);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribeAuth();
    };
  }, []);

  // Real-time Firestore Listeners with error handling callbacks
  useEffect(() => {
    // 1. Materials Collection Listener
    const matPath = 'materials';
    const unsubMaterials = onSnapshot(
      collection(db, matPath),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: Material[] = [];
          snapshot.forEach((docSnap) => {
            list.push(docSnap.data() as Material);
          });
          setMaterials(list);
        }
      },
      (error) => {
        console.warn('Materials snapshot notice:', error);
      }
    );

    // 2. Students Collection Listener
    const stuPath = 'students';
    const unsubStudents = onSnapshot(
      collection(db, stuPath),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: Student[] = [];
          snapshot.forEach((docSnap) => {
            list.push(docSnap.data() as Student);
          });
          setStudents(list);
        }
      },
      (error) => {
        console.warn('Students snapshot notice:', error);
      }
    );

    // 3. Conversations Collection Listener
    const convPath = 'conversations';
    const unsubConversations = onSnapshot(
      collection(db, convPath),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: StudentConversation[] = [];
          snapshot.forEach((docSnap) => {
            list.push(docSnap.data() as StudentConversation);
          });
          setConversations(list);
        }
      },
      (error) => {
        console.warn('Conversations snapshot notice:', error);
      }
    );

    // 4. Quiz Listener
    const quizPath = 'quizzes';
    const unsubQuizzes = onSnapshot(
      collection(db, quizPath),
      (snapshot) => {
        if (!snapshot.empty) {
          const docSnap = snapshot.docs[0];
          if (docSnap) {
            setQuiz(docSnap.data() as Quiz);
          }
        }
      },
      (error) => {
        console.warn('Quizzes snapshot notice:', error);
      }
    );

    return () => {
      unsubMaterials();
      unsubStudents();
      unsubConversations();
      unsubQuizzes();
    };
  }, []);

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
      const user = await signInWithGoogle();
      if (!user) {
        // Did not finish or closed popup
        setAuthNotice('Sign-in cancelled or popup closed. You can also sign in with Instant Demo.');
      }
    } catch (err: any) {
      console.info('Sign-in completed or cancelled.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLoginAsDemo = async (role: 'teacher' | 'student') => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setAuthNotice(null);
    try {
      await signInAsDemo(role);
    } catch (err) {
      console.warn('Demo sign in notice:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logOut();
      setAuthNotice(null);
    } catch (err) {
      console.warn('Sign-out notice:', err);
    }
  };

  const handleAddMaterial = async (newMat: Material) => {
    // Optimistic local update
    setMaterials(prev => [newMat, ...prev]);
    await saveMaterialToFirestore(newMat);
  };

  const handleUpdateStudent = async (student: Student) => {
    setStudents(prev => prev.map(s => s.id === student.id ? student : s));
    await saveStudentToFirestore(student);
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
    await saveConversationToFirestore(conv);
  };

  const handleSaveQuiz = async (newQuiz: Quiz) => {
    setQuiz(newQuiz);
    await saveQuizToFirestore(newQuiz);
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
