import express, { Response } from 'express';
import dotenv from 'dotenv';
import { requireAuth, requireRole, AuthRequest, isDemoMode } from '../src/middleware/auth.ts';

dotenv.config();
process.env.NODE_ENV = 'test';

function assert(condition: boolean, message: string = 'Assertion failed') {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runDemoIdentityModeTests() {
  console.log('=== StudyNest Phase 3.1: Demo Identity Mode Tests ===\n');
  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
      failed++;
    }
  }

  // Setup express server with routes testing requireAuth and requireRole
  const app = express();
  app.use(express.json());

  // Public health
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Protected general endpoint
  app.get('/api/profile', requireAuth, (req: AuthRequest, res: Response) => {
    res.json({
      success: true,
      user: req.user,
      isDemo: isDemoMode(),
    });
  });

  // Teacher-only endpoint
  app.post('/api/classes', requireAuth, requireRole('teacher', 'admin'), (req: AuthRequest, res: Response) => {
    res.json({
      success: true,
      message: 'Class created by authorized teacher',
      teacherId: req.user?.id,
      role: req.user?.role,
    });
  });

  // Student-only endpoint
  app.get('/api/student-progress', requireAuth, requireRole('student', 'admin'), (req: AuthRequest, res: Response) => {
    res.json({
      success: true,
      message: 'Student progress loaded',
      studentId: req.user?.id,
      role: req.user?.role,
    });
  });

  const server = app.listen(0);
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}/api`;

  // ----------------------------------------------------------------
  // Part 1: DEMO_MODE = true (Teacher configuration)
  // ----------------------------------------------------------------
  await test('DEMO_MODE=true: Request succeeds without any Authorization header or Firebase token', async () => {
    process.env.DEMO_MODE = 'true';
    process.env.DEMO_USER_EMAIL = 'demo.teacher@studynest.local';
    process.env.DEMO_USER_ROLE = 'teacher';
    process.env.DEMO_USER_NAME = 'Sarah Jenkins';

    const res = await fetch(`${baseUrl}/profile`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'Response success must be true');
    assert(data.user !== undefined, 'req.user must be populated');
    assert(data.user.email === 'demo.teacher@studynest.local', `Expected email demo.teacher@studynest.local, got ${data.user.email}`);
    assert(data.user.role === 'teacher', `Expected role teacher, got ${data.user.role}`);
    assert(data.user.displayName === 'Sarah Jenkins', `Expected name Sarah Jenkins, got ${data.user.displayName}`);
    assert(data.user.id !== undefined, 'User must have valid id');
    assert(data.user.firebaseUid !== undefined, 'User must have valid firebaseUid');
  });

  await test('DEMO_MODE=true: Demo teacher passes teacher-only RBAC check (POST /api/classes)', async () => {
    process.env.DEMO_MODE = 'true';
    process.env.DEMO_USER_EMAIL = 'demo.teacher@studynest.local';
    process.env.DEMO_USER_ROLE = 'teacher';

    const res = await fetch(`${baseUrl}/classes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Intro to AI' }),
    });

    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'Teacher action must succeed');
    assert(data.role === 'teacher', 'User role must be teacher');
  });

  // ----------------------------------------------------------------
  // Part 2: DEMO_MODE = true (Student configuration) & RBAC Enforcement
  // ----------------------------------------------------------------
  await test('DEMO_MODE=true: Demo student is rejected from teacher-only endpoint with 403 Forbidden', async () => {
    process.env.DEMO_MODE = 'true';
    process.env.DEMO_USER_EMAIL = 'demo.student@studynest.local';
    process.env.DEMO_USER_ROLE = 'student';
    process.env.DEMO_USER_NAME = 'Alex Rivera';

    // 1. Student can access general endpoint
    const profileRes = await fetch(`${baseUrl}/profile`);
    assert(profileRes.status === 200, `Expected 200 for student profile, got ${profileRes.status}`);
    const profileData = await profileRes.json();
    assert(profileData.user.role === 'student', 'User role must be student');

    // 2. Student can access student endpoint
    const progressRes = await fetch(`${baseUrl}/student-progress`);
    assert(progressRes.status === 200, `Expected 200 for student progress, got ${progressRes.status}`);

    // 3. Student CANNOT access teacher endpoint (RBAC Authorization must NOT be bypassed!)
    const classRes = await fetch(`${baseUrl}/classes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hacked Class' }),
    });
    assert(classRes.status === 403, `Expected 403 Forbidden for student on teacher route, got ${classRes.status}`);
    const classData = await classRes.json();
    assert(classData.error.includes('Forbidden: Insufficient permissions'), `Expected 403 error message, got: ${classData.error}`);
  });

  // ----------------------------------------------------------------
  // Part 3: Client tampering resistance (Cannot forge userId or role)
  // ----------------------------------------------------------------
  await test('Security: Client sending forged role/userId in body or headers cannot override req.user', async () => {
    process.env.DEMO_MODE = 'true';
    process.env.DEMO_USER_EMAIL = 'demo.student@studynest.local';
    process.env.DEMO_USER_ROLE = 'student';

    const res = await fetch(`${baseUrl}/classes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Role': 'teacher',
        'X-User-Id': 'forged-teacher-id',
      },
      body: JSON.stringify({
        name: 'Hacked Class',
        role: 'teacher',
        teacherId: 'forged-teacher-id',
      }),
    });

    // Still blocked because server relies exclusively on server-resolved req.user
    assert(res.status === 403, `Expected 403 Forbidden despite forged payload, got ${res.status}`);
  });

  // ----------------------------------------------------------------
  // Part 4: DEMO_MODE = false (Standard Production Flow)
  // ----------------------------------------------------------------
  await test('DEMO_MODE=false: Unauthenticated request is rejected with 401 Unauthorized: Missing token', async () => {
    process.env.DEMO_MODE = 'false';

    const res = await fetch(`${baseUrl}/profile`);
    assert(res.status === 401, `Expected 401, got ${res.status}`);
    const data = await res.json();
    assert(data.error === 'Unauthorized: Missing token', `Expected missing token error, got: ${data.error}`);
  });

  await test('DEMO_MODE=false: Valid Bearer token continues to be verified and authenticated', async () => {
    process.env.DEMO_MODE = 'false';

    const res = await fetch(`${baseUrl}/profile`, {
      headers: {
        Authorization: 'Bearer mock-token:teacher-sarah',
      },
    });
    assert(res.status === 200, `Expected 200 with Bearer token, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'Response must succeed');
    assert(data.user.role === 'teacher', `Expected role teacher, got ${data.user.role}`);
  });

  // Clean up
  process.env.DEMO_MODE = 'false';
  server.close();

  console.log('\n----------------------------------------------------');
  console.log(`Total Tests Run: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runDemoIdentityModeTests();
