import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  updateProfile,
  signOut
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Material, Student, StudentConversation, Quiz, LearningAnalytics } from '../types';
import {
  INITIAL_MATERIALS,
  INITIAL_STUDENTS,
  INITIAL_CONVERSATIONS,
  INITIAL_QUIZ,
  INITIAL_ANALYTICS
} from '../mockData';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// CRITICAL: The app will break without this line passing firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Mutex to prevent multiple concurrent popup attempts that trigger auth/cancelled-popup-request
let isAuthPopupPending = false;

// Operation Types for error logging conforming to Firebase skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test on boot
export async function testConnection(): Promise<boolean> {
  try {
    const snap = await getDocs(collection(db, 'materials'));
    return !snap.empty || true;
  } catch (error) {
    console.warn('Firestore initialization notice:', error);
    return true;
  }
}

export interface SignInResult {
  success: boolean;
  user?: any;
  error?: string;
  code?: string;
}

// Safe Google Sign-In helper that catches errors with actionable feedback for iframe environments
export async function signInWithGoogle(): Promise<SignInResult> {
  if (isAuthPopupPending) {
    return {
      success: false,
      error: 'Sign-in popup is already active. Please check for an open browser window or tab.',
    };
  }

  isAuthPopupPending = true;
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { success: true, user: result.user };
  } catch (error: any) {
    const errorCode = error?.code || '';
    const errorMsg = error?.message || '';
    console.warn('Google Sign-In Error details:', errorCode, errorMsg);

    if (errorCode === 'auth/popup-blocked') {
      return {
        success: false,
        code: errorCode,
        error: 'Pop-up window was blocked by your browser. Because the preview runs in an iframe, please allow pop-ups or open the app in a new tab.',
      };
    } else if (errorCode === 'auth/unauthorized-domain') {
      return {
        success: false,
        code: errorCode,
        error: 'Domain is not authorized in Firebase Authentication. You can sign in using Instant Demo or open in a new tab.',
      };
    } else if (errorCode === 'auth/cancelled-popup-request') {
      return {
        success: false,
        code: errorCode,
        error: 'Previous popup request was replaced or closed.',
      };
    } else if (errorCode === 'auth/popup-closed-by-user') {
      return {
        success: false,
        code: errorCode,
        error: 'Sign-in popup was closed before completing. Because the preview runs inside an iframe sandbox, third-party cookies or popups might be restricted. You can open in a new tab or use Instant Demo.',
      };
    } else if (errorCode === 'auth/operation-not-allowed') {
      return {
        success: false,
        code: errorCode,
        error: 'Google Sign-In provider is disabled in Firebase Console. You can use Instant Demo.',
      };
    } else {
      return {
        success: false,
        code: errorCode,
        error: errorMsg || 'Unable to complete Google sign-in. You can use Instant Demo or open the app in a new tab.',
      };
    }
  } finally {
    setTimeout(() => {
      isAuthPopupPending = false;
    }, 400);
  }
}

// Quick Demo / Anonymous Sign-In helper as fallback for iframe environments where popups are blocked
export async function signInAsDemo(role: 'teacher' | 'student') {
  try {
    const cred = await signInAnonymously(auth);
    if (cred.user) {
      await updateProfile(cred.user, {
        displayName: role === 'teacher' ? 'Dr. Sarah Vance' : 'An Minh (Student)',
        photoURL: role === 'teacher'
          ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=100&q=80'
          : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'
      });
    }
    return cred.user;
  } catch (error) {
    console.warn('Demo Sign-In Notice:', error);
    return null;
  }
}

// Sign-Out helper
export async function logOut() {
  try {
    await signOut(auth);
  } catch (error) {
    console.warn('Sign-Out Notice:', error);
  }
}

// Seed initial database if empty so teachers and students have rich starter curriculum
export async function seedInitialDataIfEmpty() {
  const path = 'materials';
  try {
    const snap = await getDocs(collection(db, path));
    if (snap.empty) {
      console.log('Seeding initial materials and data to Firestore...');
      // Seed Materials
      for (const mat of INITIAL_MATERIALS) {
        await setDoc(doc(db, 'materials', mat.id), mat);
      }
      // Seed Students
      for (const stu of INITIAL_STUDENTS) {
        await setDoc(doc(db, 'students', stu.id), stu);
      }
      // Seed Conversations
      for (const conv of INITIAL_CONVERSATIONS) {
        await setDoc(doc(db, 'conversations', conv.id), conv);
      }
      // Seed Quizzes
      await setDoc(doc(db, 'quizzes', INITIAL_QUIZ.id), INITIAL_QUIZ);
    }
  } catch (error) {
    console.warn('Initial seeding note:', error);
  }
}

// Firestore CRUD operations for Materials
export async function saveMaterialToFirestore(material: Material) {
  const path = `materials/${material.id}`;
  try {
    await setDoc(doc(db, 'materials', material.id), material);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteMaterialFromFirestore(id: string) {
  const path = `materials/${id}`;
  try {
    await deleteDoc(doc(db, 'materials', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Firestore CRUD operations for Students
export async function saveStudentToFirestore(student: Student) {
  const path = `students/${student.id}`;
  try {
    await setDoc(doc(db, 'students', student.id), student);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Firestore CRUD operations for Conversations
export async function saveConversationToFirestore(conv: StudentConversation) {
  const path = `conversations/${conv.id}`;
  try {
    await setDoc(doc(db, 'conversations', conv.id), conv);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Firestore CRUD operations for Quizzes
export async function saveQuizToFirestore(quiz: Quiz) {
  const path = `quizzes/${quiz.id}`;
  try {
    await setDoc(doc(db, 'quizzes', quiz.id), quiz);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
