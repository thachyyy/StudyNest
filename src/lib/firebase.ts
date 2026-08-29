import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App for Authentication only
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Mutex to prevent multiple concurrent popup attempts that trigger auth/cancelled-popup-request
let isAuthPopupPending = false;

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

// Sign-Out helper
export async function logOut() {
  try {
    await signOut(auth);
  } catch (error) {
    console.warn('Sign-Out Notice:', error);
  }
}

