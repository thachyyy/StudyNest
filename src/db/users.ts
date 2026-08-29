import { db } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';
import { inMemoryStore, InMemoryUser } from './inMemoryStore.ts';

export type UserRole = 'teacher' | 'student' | 'admin';

export interface UserRecord {
  id: string;
  uid: string;
  email: string;
  displayName: string | null;
  photoUrl: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncUserInput {
  uid: string;
  email: string;
  displayName?: string | null;
  photoUrl?: string | null;
}

/**
 * Retrieves a user by their Firebase Authentication UID.
 */
export async function getUserByUid(uid: string): Promise<UserRecord | null> {
  try {
    const result = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    return (result[0] as UserRecord) || null;
  } catch (error) {
    // Failover to in-memory store
    for (const u of inMemoryStore.users.values()) {
      if (u.uid === uid) return u;
    }
    return null;
  }
}

/**
 * Retrieves a user by their internal UUID primary key.
 */
export async function getUserById(id: string): Promise<UserRecord | null> {
  try {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return (result[0] as UserRecord) || null;
  } catch (error) {
    // Failover to in-memory store
    const memUser = inMemoryStore.users.get(id);
    if (memUser) return memUser;
    return null;
  }
}

/**
 * Retrieves a user by their email address.
 */
export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  try {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return (result[0] as UserRecord) || null;
  } catch (error) {
    // Failover to in-memory store
    for (const u of inMemoryStore.users.values()) {
      if (u.email.toLowerCase() === email.toLowerCase()) return u;
    }
    return null;
  }
}

/**
 * Synchronizes user profile information from trusted auth credentials.
 * Preserves existing role and sets default 'student' role for new users.
 */
export async function syncUserFromAuth(input: SyncUserInput): Promise<UserRecord> {
  try {
    const existing = await getUserByUid(input.uid);
    if (existing) {
      const [updated] = await db
        .update(users)
        .set({
          email: input.email || existing.email,
          displayName: input.displayName !== undefined ? input.displayName : existing.displayName,
          photoUrl: input.photoUrl !== undefined ? input.photoUrl : existing.photoUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.uid, input.uid))
        .returning();
      return updated as UserRecord;
    }

    // Check if email already exists under a legacy/different record
    if (input.email) {
      const existingByEmail = await getUserByEmail(input.email);
      if (existingByEmail) {
        const [linked] = await db
          .update(users)
          .set({
            uid: input.uid,
            displayName: input.displayName !== undefined ? input.displayName : existingByEmail.displayName,
            photoUrl: input.photoUrl !== undefined ? input.photoUrl : existingByEmail.photoUrl,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingByEmail.id))
          .returning();
        return linked as UserRecord;
      }
    }

    // Insert new user defaulting to 'student' role
    const [created] = await db
      .insert(users)
      .values({
        uid: input.uid,
        email: input.email,
        displayName: input.displayName || null,
        photoUrl: input.photoUrl || null,
        role: 'student',
      })
      .returning();

    return created as UserRecord;
  } catch (error) {
    // In-memory fallback
    const existingMem = Array.from(inMemoryStore.users.values()).find(
      u => u.uid === input.uid || (input.email && u.email.toLowerCase() === input.email.toLowerCase())
    );

    if (existingMem) {
      existingMem.displayName = input.displayName || existingMem.displayName;
      existingMem.photoUrl = input.photoUrl || existingMem.photoUrl;
      existingMem.updatedAt = new Date();
      return existingMem;
    }

    const newId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newMemUser: InMemoryUser = {
      id: newId,
      uid: input.uid,
      email: input.email,
      displayName: input.displayName || null,
      photoUrl: input.photoUrl || null,
      role: 'student',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    inMemoryStore.users.set(newId, newMemUser);
    return newMemUser;
  }
}

/**
 * Updates a user's role in PostgreSQL or in-memory fallback.
 */
export async function updateUserRole(userId: string, newRole: UserRole): Promise<UserRecord | null> {
  try {
    const [updated] = await db
      .update(users)
      .set({
        role: newRole,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return (updated as UserRecord) || null;
  } catch (error) {
    const memUser = inMemoryStore.users.get(userId);
    if (memUser) {
      memUser.role = newRole;
      memUser.updatedAt = new Date();
      return memUser;
    }
    return null;
  }
}

/**
 * Finds or provisions a demo user in PostgreSQL for DEMO_MODE development.
 * Queries the database by email; if not present, inserts a new record with the specified role.
 */
export async function getOrCreateDemoUser(
  email: string,
  defaultRole: UserRole = 'teacher',
  defaultDisplayName: string = 'Demo User'
): Promise<UserRecord> {
  try {
    const existing = await getUserByEmail(email);
    if (existing) {
      return existing;
    }

    const demoUid = `demo-uid-${email.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const [created] = await db
      .insert(users)
      .values({
        uid: demoUid,
        email: email,
        displayName: defaultDisplayName,
        photoUrl: null,
        role: defaultRole,
      })
      .returning();

    return created as UserRecord;
  } catch (error) {
    // Graceful fallback to in-memory store
    for (const u of inMemoryStore.users.values()) {
      if (u.email.toLowerCase() === email.toLowerCase()) {
        return u;
      }
    }

    const demoUid = `demo-uid-${email.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const newDemoUser: InMemoryUser = {
      id: `demo-${Date.now()}`,
      uid: demoUid,
      email: email,
      displayName: defaultDisplayName,
      photoUrl: null,
      role: defaultRole,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    inMemoryStore.users.set(newDemoUser.id, newDemoUser);
    return newDemoUser;
  }
}

/**
 * Legacy helper maintained for backwards compatibility.
 * Always forwards to syncUserFromAuth to prevent client-side role elevation.
 */
export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string,
  _role?: UserRole
): Promise<UserRecord> {
  return syncUserFromAuth({ uid, email, displayName });
}

/**
 * Retrieves all users from PostgreSQL or in-memory failover.
 */
export async function getUsers(): Promise<UserRecord[]> {
  try {
    const result = await db.select().from(users);
    return result as UserRecord[];
  } catch (error) {
    return Array.from(inMemoryStore.users.values());
  }
}

