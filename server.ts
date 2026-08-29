import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { requireAuth, requireRole, AuthRequest } from './src/middleware/auth.ts';
import { syncUserFromAuth, getUsers } from './src/db/users.ts';
import { domainRouter } from './src/routes/domain.ts';
import { aiRouter } from './src/routes/ai.ts';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// ----------------------------------------------------
// Public Health Check Endpoint
// ----------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ----------------------------------------------------
// PostgreSQL & Auth API Routes
// ----------------------------------------------------
app.post('/api/users/sync', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: User authentication required' });
    }

    // Security: Ignore any client-sent role, id, or firebaseUid
    const { displayName, photoUrl } = req.body || {};
    const trustedUid = req.user.firebaseUid;
    const trustedEmail = req.firebaseToken?.email || req.user.email;
    const resolvedDisplayName = req.firebaseToken?.name || displayName || req.user.displayName;
    const resolvedPhotoUrl = req.firebaseToken?.picture || photoUrl || req.user.photoUrl;

    const user = await syncUserFromAuth({
      uid: trustedUid,
      email: trustedEmail,
      displayName: resolvedDisplayName,
      photoUrl: resolvedPhotoUrl,
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        firebaseUid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoUrl: user.photoUrl,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Failed to sync user to PostgreSQL:', error);
    res.status(500).json({ error: error.message || 'Failed to sync user' });
  }
});

app.get('/api/users/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: User authentication required' });
    }

    res.json({
      success: true,
      user: {
        id: req.user.id,
        firebaseUid: req.user.firebaseUid,
        email: req.user.email,
        displayName: req.user.displayName,
        photoUrl: req.user.photoUrl,
        role: req.user.role,
        createdAt: req.user.createdAt,
        updatedAt: req.user.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Failed to fetch current user profile:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch user profile' });
  }
});

// Teacher & Admin only: List users
app.get('/api/users', requireAuth, requireRole('teacher', 'admin'), async (req: AuthRequest, res) => {
  try {
    const allUsers = await getUsers();
    const safeUsers = allUsers.map((u) => ({
      id: u.id,
      firebaseUid: u.uid,
      email: u.email,
      displayName: u.displayName,
      photoUrl: u.photoUrl,
      role: u.role,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));
    res.json({ success: true, users: safeUsers });
  } catch (error: any) {
    console.error('Failed to fetch users from PostgreSQL:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch users' });
  }
});

// ----------------------------------------------------
// Mount Domain APIs (/api/classes, /api/topics, /api/documents)
// Protected by requireAuth, requireRole & Resource RBAC
// ----------------------------------------------------
app.use('/api', domainRouter);

// ----------------------------------------------------
// Mount Protected AI Routes (/api/ai/text-to-tree, /api/ai/chat, etc.)
// Protected by requireAuth & requireRole('teacher', 'admin')
// ----------------------------------------------------
app.use('/api/ai', aiRouter);


// Start Express server with Vite middleware in development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Google Edu AI Learning Assistant server running on port ${PORT}`);
  });
}

startServer();
