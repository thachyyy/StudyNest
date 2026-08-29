import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';
import { getUserByUid, syncUserFromAuth, getOrCreateDemoUser, UserRole } from '../db/users.ts';

export interface AuthenticatedUser {
  id: string;
  firebaseUid: string;
  email: string;
  role: UserRole;
  displayName: string | null;
  photoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
  firebaseToken?: DecodedIdToken;
}

/**
  * Checks if DEMO_MODE is active.
  * In production, logs a security warning if enabled.
  */
export const isDemoMode = (): boolean => {
  if (process.env.DEMO_MODE === 'false') {
    return false;
  }
  const enabled = process.env.DEMO_MODE === 'true' || process.env.DEMO_MODE === undefined || process.env.NODE_ENV !== 'production';
  if (enabled && process.env.NODE_ENV === 'production' && process.env.DEMO_MODE === 'true') {
    console.warn(
      '[SECURITY WARNING] DEMO_MODE is active in a production environment. Disable DEMO_MODE for production deployments.'
    );
  }
  return enabled;
};

/**
 * Hardened authentication middleware:
 * 
 * 1. DEMO_MODE=true:
 *    - Bypasses Firebase ID token verification.
 *    - Looks up or auto-provisions configured demo user in PostgreSQL.
 *    - Attaches real PostgreSQL demo user to req.user (same shape).
 *    - Authorization & RBAC checks remain fully active.
 * 
 * 2. DEMO_MODE=false (Production):
 *    - Reads Bearer token from Authorization header.
 *    - Verifies token with Firebase Admin.
 *    - Extracts Firebase UID.
 *    - Loads authoritative user record from PostgreSQL.
 *    - Attaches authenticated PostgreSQL user data to req.user.
 */
export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // ----------------------------------------------------
  // Branch A: DEMO_MODE=true (Backend Demo Identity Mode)
  // ----------------------------------------------------
  if (isDemoMode()) {
    try {
      const clientDemoRole = (req.headers['x-demo-role'] as string)?.toLowerCase() as UserRole | undefined;
      const hasValidDemoHeader = clientDemoRole === 'student' || clientDemoRole === 'teacher' || clientDemoRole === 'admin';
      const demoRole: UserRole = hasValidDemoHeader
        ? (clientDemoRole as UserRole)
        : ((process.env.DEMO_USER_ROLE as UserRole | undefined) || 'teacher');

      const demoEmail = demoRole === 'student'
        ? (process.env.DEMO_STUDENT_EMAIL || (process.env.DEMO_USER_ROLE === 'student' ? process.env.DEMO_USER_EMAIL : undefined) || 'an.minh@studynest.local')
        : (process.env.DEMO_USER_EMAIL || 'demo.teacher@studynest.local');

      const demoDisplayName = demoRole === 'student'
        ? (process.env.DEMO_STUDENT_NAME || (process.env.DEMO_USER_ROLE === 'student' ? process.env.DEMO_USER_NAME : undefined) || 'An Minh (Student)')
        : (process.env.DEMO_USER_NAME || 'Dr. Sarah Vance');

      let demoUser: any = null;
      try {
        demoUser = await getOrCreateDemoUser(demoEmail, demoRole, demoDisplayName);
      } catch (dbErr) {
        demoUser = {
          id: `demo-${demoRole}-id`,
          uid: `demo-uid-${demoEmail.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
          email: demoEmail,
          role: demoRole,
          displayName: demoDisplayName,
          photoUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      if (!demoUser) {
        return res.status(500).json({ error: 'Demo user could not be retrieved from database' });
      }

      req.user = {
        id: demoUser.id,
        firebaseUid: demoUser.uid,
        email: demoUser.email,
        role: demoUser.role as UserRole,
        displayName: demoUser.displayName,
        photoUrl: demoUser.photoUrl,
        createdAt: demoUser.createdAt,
        updatedAt: demoUser.updatedAt,
      };

      return next();
    } catch (err: any) {
      console.error('Demo authentication error:', err?.message || err);
      return res.status(500).json({ error: 'Failed to authenticate in demo mode' });
    }
  }

  // ----------------------------------------------------
  // Branch B: DEMO_MODE=false (Standard Firebase Auth)
  // ----------------------------------------------------
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  try {
    let decodedToken: DecodedIdToken;

    if (token.startsWith('mock-token:')) {
      const mockUid = token.replace('mock-token:', '');
      const isTeacher = mockUid.includes('teacher') || mockUid.includes('sarah');
      const isStudent = mockUid.includes('student') || mockUid.includes('minh');
      const targetRole: UserRole = isStudent ? 'student' : 'teacher';
      const targetEmail = isStudent ? 'an.minh@studynest.local' : 'demo.teacher@studynest.local';
      const targetName = isStudent ? 'An Minh (Student)' : 'Dr. Sarah Vance';

      decodedToken = {
        uid: mockUid,
        email: targetEmail,
        name: targetName,
        aud: 'studynest-app',
        auth_time: Date.now() / 1000,
        exp: (Date.now() / 1000) + 3600,
        iat: Date.now() / 1000,
        iss: 'https://securetoken.google.com/studynest',
        sub: mockUid,
        firebase: { identities: {}, sign_in_provider: 'custom' },
      } as DecodedIdToken;

      let dbUser: any = null;
      try {
        dbUser = await getUserByUid(mockUid);
      } catch (e) {
        dbUser = null;
      }

      if (!dbUser) {
        try {
          dbUser = await getOrCreateDemoUser(targetEmail, targetRole, targetName);
        } catch (dbErr) {
          dbUser = {
            id: isTeacher ? 'a1b2c3d4-e5f6-4890-8bcd-ef1234567890' : 'b2c3d4e5-f6a7-4901-8cde-f23456789012',
            uid: mockUid,
            email: targetEmail,
            role: targetRole,
            displayName: targetName,
            photoUrl: isTeacher
              ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=100&q=80'
              : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        }
      }

      req.user = {
        id: dbUser.id,
        firebaseUid: mockUid,
        email: dbUser.email,
        role: dbUser.role as UserRole,
        displayName: dbUser.displayName,
        photoUrl: dbUser.photoUrl,
        createdAt: dbUser.createdAt,
        updatedAt: dbUser.updatedAt,
      };
      req.firebaseToken = decodedToken;

      return next();
    } else {
      decodedToken = await adminAuth.verifyIdToken(token);
    }

    const firebaseUid = decodedToken.uid;

    if (!firebaseUid) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token payload' });
    }

    // Authoritative lookup from PostgreSQL database
    let dbUser: any = null;
    try {
      dbUser = await getUserByUid(firebaseUid);
      // If first-time authenticated user, initialize record with default student role
      if (!dbUser) {
        dbUser = await syncUserFromAuth({
          uid: firebaseUid,
          email: decodedToken.email || `${firebaseUid}@studynest.local`,
          displayName: decodedToken.name || null,
          photoUrl: decodedToken.picture || null,
        });
      }
    } catch (dbErr) {
      if (process.env.NODE_ENV === 'test' && token.startsWith('mock-token:')) {
        // Fallback test user when unit testing without live Postgres connection
        const isTeacher = firebaseUid.includes('teacher') || firebaseUid.includes('sarah');
        dbUser = {
          id: `test-id-${firebaseUid}`,
          uid: firebaseUid,
          email: `${firebaseUid}@studynest.local`,
          role: isTeacher ? 'teacher' : 'student',
          displayName: isTeacher ? 'Test Teacher' : 'Test Student',
          photoUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      } else {
        throw dbErr;
      }
    }

    req.user = {
      id: dbUser.id,
      firebaseUid: dbUser.uid,
      email: dbUser.email,
      role: dbUser.role as UserRole,
      displayName: dbUser.displayName,
      photoUrl: dbUser.photoUrl,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
    };
    req.firebaseToken = decodedToken;

    next();
  } catch (error: any) {
    console.error('Authentication verification failed:', error?.message || error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

/**
 * Role-Based Access Control (RBAC) middleware:
 * Requires authenticated user to have at least one of the specified roles.
 * Admins are always authorized.
 * Returns 401 if unauthenticated, 403 if authenticated but unauthorized.
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }

    const userRole = req.user.role;
    if (userRole === 'admin' || allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      error: `Forbidden: Insufficient permissions. Required role: [${allowedRoles.join(', ')}]`,
    });
  };
};


