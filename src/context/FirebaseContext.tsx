import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import {
  auth,
  db,
  testConnection,
  signInWithGoogle,
  logOut,
  seedInitialDataIfEmpty,
  saveMaterialToFirestore,
  saveStudentToFirestore,
  saveConversationToFirestore,
  saveQuizToFirestore,
  handleFirestoreError,
  OperationType
} from '../lib/firebase';
import { Material, Student, StudentConversation, Quiz, LearningAnalytics } from '../types';
import {
  INITIAL_MATERIALS,
  INITIAL_STUDENTS,
  INITIAL_CONVERSATIONS,
  INITIAL_QUIZ,
  INITIAL_ANALYTICS
} from '../mockData';

interface FirebaseContextType {
  currentUser: User | null;
  authLoading: boolean;
  isConnected: boolean;
  materials: Material[];
  students: Student[];
  conversations: StudentConversation[];
  quiz: Quiz;
  analytics: LearningAnalytics;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  addMaterial: (newMat: Material) => Promise<void>;
  updateStudent: (student: Student) => Promise<void>;
  saveConversation: (conv: StudentConversation) => Promise<void>;
  saveQuiz: (newQuiz: Quiz) => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | null>(null);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  const [materials, setMaterials] = useState<Material[]>(INITIAL_MATERIALS);
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [conversations, setConversations] = useState<StudentConversation[]>(INITIAL_CONVERSATIONS);
  const [quiz, setQuiz] = useState<Quiz>(INITIAL_QUIZ);
  const [analytics, setAnalytics] = useState<LearningAnalytics>(INITIAL_ANALYTICS);

  // Initialize Auth & Connection
  useEffect(() => {
    let isMounted = true;

    async function init() {
      const ok = await testConnection();
      if (isMounted) setIsConnected(ok);
      await seedInitialDataIfEmpty();
    }
    init();

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (isMounted) {
        setCurrentUser(user);
        setAuthLoading(false);
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
        handleFirestoreError(error, OperationType.GET, matPath);
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
        handleFirestoreError(error, OperationType.GET, stuPath);
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
        handleFirestoreError(error, OperationType.GET, convPath);
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
        handleFirestoreError(error, OperationType.GET, quizPath);
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

  const handleLoginWithGoogle = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    try {
      await logOut();
    } catch (err) {
      console.error(err);
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
        authLoading,
        isConnected,
        materials,
        students,
        conversations,
        quiz,
        analytics,
        loginWithGoogle: handleLoginWithGoogle,
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
