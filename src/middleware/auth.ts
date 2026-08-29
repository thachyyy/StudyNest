import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';
import { getUserByUid, syncUserFromAuth, UserRole } from '../db/users.ts';

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
 * Hardened authentication middleware:
 * 1. Reads Bearer token from Authorization header.
 * 2. Verifies token with Firebase Admin.
 * 3. Extracts Firebase UID.
 * 4. Loads the authoritative user record from PostgreSQL (auto-provisioning 'student' if first seen).
 * 5. Attaches authenticated PostgreSQL user data to req.user.
 */
export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
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

    if (process.env.NODE_ENV === 'test' && token.startsWith('mock-token:')) {
      const mockUid = token.replace('mock-token:', '');
      decodedToken = {
        uid: mockUid,
        email: `${mockUid}@studynest.local`,
        aud: 'test-aud',
        auth_time: Date.now() / 1000,
        exp: (Date.now() / 1000) + 3600,
        iat: Date.now() / 1000,
        iss: 'https://securetoken.google.com/test',
        sub: mockUid,
        firebase: { identities: {}, sign_in_provider: 'custom' },
      } as DecodedIdToken;
    } else {
      decodedToken = await adminAuth.verifyIdToken(token);
    }

    const firebaseUid = decodedToken.uid;

    if (!firebaseUid) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token payload' });
    }

    // Authoritative lookup from PostgreSQL database
    let dbUser = await getUserByUid(firebaseUid);

    // If first-time authenticated user, initialize record with default student role
    if (!dbUser) {
      dbUser = await syncUserFromAuth({
        uid: firebaseUid,
        email: decodedToken.email || `${firebaseUid}@studynest.local`,
        displayName: decodedToken.name || null,
        photoUrl: decodedToken.picture || null,
      });
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


