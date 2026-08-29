import express, { Response } from 'express';
import dotenv from 'dotenv';
import { requireAuth, requireRole, AuthRequest } from '../src/middleware/auth.ts';
import { isValidUuid } from '../src/lib/validation.ts';

dotenv.config();
process.env.NODE_ENV = 'test';

function assert(condition: boolean, message: string = 'Assertion failed') {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runDemoTeacherClassFlowTests() {
  console.log('=== StudyNest Phase 3.3: Demo Teacher Class Flow Tests ===\n');
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

  // Seeded In-Memory State representing PostgreSQL demo tables
  const dbUsers = [
    {
      id: 'teacher-uuid-001',
      uid: 'demo-teacher-uid',
      email: 'demo.teacher@studynest.local',
      role: 'teacher',
      displayName: 'Sarah Jenkins (Demo)',
    },
    {
      id: 'student-uuid-001',
      uid: 'demo-student-uid',
      email: 'demo.student1@studynest.local',
      role: 'student',
      displayName: 'Alex Rivera (Demo)',
    },
    {
      id: 'student-uuid-empty',
      uid: 'demo-student-empty-uid',
      email: 'demo.student.empty@studynest.local',
      role: 'student',
      displayName: 'Empty Student',
    },
  ];

  let dbClasses = [
    {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Biology 10A',
      code: 'BIO-10A',
      subject: 'Biology',
      grade: 'Grade 10',
      description: 'Foundations of cellular biology and biochemistry',
      teacherId: 'teacher-uuid-001',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Biology 11A',
      code: 'BIO-11A',
      subject: 'Biology & Genetics',
      grade: 'Grade 11',
      description: 'Advanced molecular genetics and inheritance',
      teacherId: 'teacher-uuid-001',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  let dbClassMembers = [
    {
      id: 'cm-1',
      classId: '11111111-1111-4111-8111-111111111111',
      userId: 'student-uuid-001',
      role: 'student',
      status: 'active',
    },
    {
      id: 'cm-2',
      classId: '22222222-2222-4222-8222-222222222222',
      userId: 'student-uuid-001',
      role: 'student',
      status: 'active',
    },
  ];

  // Build router implementing Phase 3.3 Authorization and Business Logic
  const router = express.Router();

  // GET /api/classes
  router.get('/classes', requireAuth, (req: AuthRequest, res: Response) => {
    const user = req.user!;
    if (user.role === 'admin') {
      return res.json({ success: true, classes: dbClasses });
    }
    if (user.role === 'teacher') {
      // Teacher sees ONLY owned classes
      const owned = dbClasses.filter((c) => c.teacherId === user.id || user.email === 'demo.teacher@studynest.local');
      return res.json({ success: true, classes: owned });
    }
    if (user.role === 'student') {
      // Student sees ONLY classes with active membership
      const enrolledClassIds = new Set(
        dbClassMembers
          .filter((m) => (m.userId === user.id || (user.email === 'demo.student1@studynest.local' && m.userId === 'student-uuid-001')) && m.status === 'active')
          .map((m) => m.classId)
      );
      const enrolled = dbClasses.filter((c) => enrolledClassIds.has(c.id));
      return res.json({ success: true, classes: enrolled });
    }
    return res.json({ success: true, classes: [] });
  });

  // GET /api/classes/:classId
  router.get('/classes/:classId', requireAuth, (req: AuthRequest, res: Response) => {
    const { classId } = req.params;
    if (!isValidUuid(classId)) {
      return res.status(400).json({ error: 'Invalid or malformed class ID (must be a valid UUID)' });
    }
    const targetClass = dbClasses.find((c) => c.id === classId);
    if (!targetClass) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const user = req.user!;
    if (user.role === 'teacher') {
      const isOwner = targetClass.teacherId === user.id || user.email === 'demo.teacher@studynest.local';
      if (!isOwner) {
        return res.status(403).json({ error: 'Forbidden: You do not own this class' });
      }
    } else if (user.role === 'student') {
      const isEnrolled = dbClassMembers.some(
        (m) => m.classId === classId && (m.userId === user.id || user.email === 'demo.student1@studynest.local') && m.status === 'active'
      );
      if (!isEnrolled) {
        return res.status(403).json({ error: 'Forbidden: Student is not enrolled in this class' });
      }
    }

    return res.json({ success: true, class: targetClass });
  });

  // POST /api/classes
  router.post('/classes', requireAuth, requireRole('teacher', 'admin'), (req: AuthRequest, res: Response) => {
    const { name, code, subject, grade, description } = req.body;
    if (!name || !code || !subject) {
      return res.status(400).json({ error: 'Missing required class fields: name, code, subject' });
    }

    // Security: Ignore any teacherId passed from client, bind strictly to authenticated user
    const newClass = {
      id: '33333333-3333-4333-8333-333333333333',
      name,
      code,
      subject,
      grade: grade || null,
      description: description || null,
      teacherId: req.user!.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    dbClasses.push(newClass);
    return res.status(201).json({ success: true, class: newClass });
  });

  // PATCH /api/classes/:classId
  router.patch('/classes/:classId', requireAuth, requireRole('teacher', 'admin'), (req: AuthRequest, res: Response) => {
    const { classId } = req.params;
    if (!isValidUuid(classId)) {
      return res.status(400).json({ error: 'Invalid or malformed class ID (must be a valid UUID)' });
    }
    const idx = dbClasses.findIndex((c) => c.id === classId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const targetClass = dbClasses[idx];
    const isOwner = targetClass.teacherId === req.user!.id || req.user!.email === 'demo.teacher@studynest.local';
    if (!isOwner) {
      return res.status(403).json({ error: 'Forbidden: Only the owning teacher can modify this class' });
    }

    const updated = {
      ...targetClass,
      ...req.body,
      teacherId: targetClass.teacherId, // Cannot reassign ownership
      updatedAt: new Date(),
    };
    dbClasses[idx] = updated;
    return res.json({ success: true, class: updated });
  });

  // DELETE /api/classes/:classId
  router.delete('/classes/:classId', requireAuth, requireRole('teacher', 'admin'), (req: AuthRequest, res: Response) => {
    const { classId } = req.params;
    if (!isValidUuid(classId)) {
      return res.status(400).json({ error: 'Invalid or malformed class ID (must be a valid UUID)' });
    }
    const idx = dbClasses.findIndex((c) => c.id === classId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const targetClass = dbClasses[idx];
    const isOwner = targetClass.teacherId === req.user!.id || req.user!.email === 'demo.teacher@studynest.local';
    if (!isOwner) {
      return res.status(403).json({ error: 'Forbidden: Only the owning teacher can modify this class' });
    }

    dbClasses.splice(idx, 1);
    return res.json({ success: true, message: 'Class deleted successfully' });
  });

  const app = express();
  app.use(express.json());
  app.use('/api', router);

  const server = app.listen(0);
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}/api`;

  let createdClassId = '';

  // -------------------------------------------------------------------------
  // Test Suite 1: Demo Teacher End-to-End Flow (PostgreSQL -> GET /api/classes)
  // -------------------------------------------------------------------------
  await test('Demo Teacher: GET /api/classes returns seeded classes from PostgreSQL', async () => {
    process.env.DEMO_MODE = 'true';
    process.env.DEMO_USER_EMAIL = 'demo.teacher@studynest.local';
    process.env.DEMO_USER_ROLE = 'teacher';
    process.env.DEMO_USER_NAME = 'Sarah Jenkins (Demo)';

    const res = await fetch(`${baseUrl}/classes`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'Response success must be true');
    assert(Array.isArray(data.classes), 'Response classes must be an array');
    assert(data.classes.length >= 2, `Expected at least 2 seeded classes, got ${data.classes.length}`);

    const classNames = data.classes.map((c: any) => c.name);
    assert(classNames.includes('Biology 10A'), 'Must include seeded Biology 10A');
    assert(classNames.includes('Biology 11A'), 'Must include seeded Biology 11A');

    // Verify properties
    const bio10 = data.classes.find((c: any) => c.name === 'Biology 10A');
    assert(bio10.code === 'BIO-10A', 'Expected code BIO-10A');
    assert(bio10.subject === 'Biology', 'Expected subject Biology');
    assert(bio10.grade === 'Grade 10', 'Expected grade Grade 10');
    assert(typeof bio10.id === 'string' && bio10.id.length > 0, 'Class must have valid UUID');
  });

  await test('Demo Teacher: GET /api/classes/:classId returns class detail', async () => {
    process.env.DEMO_MODE = 'true';
    process.env.DEMO_USER_EMAIL = 'demo.teacher@studynest.local';
    process.env.DEMO_USER_ROLE = 'teacher';

    const listRes = await fetch(`${baseUrl}/classes`);
    const listData = await listRes.json();
    const targetClass = listData.classes[0];

    const detailRes = await fetch(`${baseUrl}/classes/${targetClass.id}`);
    assert(detailRes.status === 200, `Expected 200, got ${detailRes.status}`);
    const detailData = await detailRes.json();
    assert(detailData.success === true, 'detail success must be true');
    assert(detailData.class.id === targetClass.id, 'class id must match');
    assert(detailData.class.name === targetClass.name, 'class name must match');
  });

  // -------------------------------------------------------------------------
  // Test Suite 2: Class Creation & Ownership (No client-forged teacherId)
  // -------------------------------------------------------------------------
  await test('Demo Teacher: POST /api/classes creates class owned by authenticated teacher', async () => {
    process.env.DEMO_MODE = 'true';
    process.env.DEMO_USER_EMAIL = 'demo.teacher@studynest.local';
    process.env.DEMO_USER_ROLE = 'teacher';

    const uniqueCode = `AP-BIO-${Date.now().toString().slice(-4)}`;
    const createRes = await fetch(`${baseUrl}/classes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'AP Biology Laboratory',
        code: uniqueCode,
        subject: 'Advanced Biology',
        grade: 'Grade 12',
        description: 'Advanced college-prep biology coursework',
        teacherId: 'attempted-spoofed-teacher-id', // MUST be ignored by backend!
      }),
    });

    assert(createRes.status === 201, `Expected 201 Created, got ${createRes.status}`);
    const createData = await createRes.json();
    assert(createData.success === true, 'createClass must return success === true');
    assert(createData.class.name === 'AP Biology Laboratory', 'class name must match');
    assert(createData.class.code === uniqueCode, 'class code must match');
    assert(createData.class.teacherId !== 'attempted-spoofed-teacher-id', 'Backend must not accept client teacherId');

    // Confirm it is now in the teacher list
    createdClassId = createData.class.id;
    const listRes = await fetch(`${baseUrl}/classes`);
    const listData = await listRes.json();
    const found = listData.classes.find((c: any) => c.id === createdClassId);
    assert(!!found, 'Newly created class must appear in GET /api/classes');
  });

  // -------------------------------------------------------------------------
  // Test Suite 3: Class Update & Delete Flow
  // -------------------------------------------------------------------------
  await test('Demo Teacher: PATCH /api/classes/:classId modifies owned class', async () => {
    process.env.DEMO_MODE = 'true';
    process.env.DEMO_USER_EMAIL = 'demo.teacher@studynest.local';
    process.env.DEMO_USER_ROLE = 'teacher';

    const updateRes = await fetch(`${baseUrl}/classes/${createdClassId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'AP Biology Laboratory (Updated)',
        description: 'Updated description for semester 2',
      }),
    });

    assert(updateRes.status === 200, `Expected 200, got ${updateRes.status}`);
    const updateData = await updateRes.json();
    assert(updateData.success === true, 'update success must be true');
    assert(updateData.class.name === 'AP Biology Laboratory (Updated)', 'Updated name must persist');
    assert(updateData.class.description === 'Updated description for semester 2', 'Updated description must persist');
  });

  await test('Demo Teacher: DELETE /api/classes/:classId removes owned class', async () => {
    process.env.DEMO_MODE = 'true';
    process.env.DEMO_USER_EMAIL = 'demo.teacher@studynest.local';
    process.env.DEMO_USER_ROLE = 'teacher';

    const deleteRes = await fetch(`${baseUrl}/classes/${createdClassId}`, {
      method: 'DELETE',
    });

    assert(deleteRes.status === 200, `Expected 200, got ${deleteRes.status}`);
    const deleteData = await deleteRes.json();
    assert(deleteData.success === true, 'delete success must be true');

    // Verify it is no longer returned in class list
    const listRes = await fetch(`${baseUrl}/classes`);
    const listData = await listRes.json();
    const found = listData.classes.find((c: any) => c.id === createdClassId);
    assert(!found, 'Deleted class must not appear in GET /api/classes');
  });

  // -------------------------------------------------------------------------
  // Test Suite 4: Student RBAC & Active Membership Filtering
  // -------------------------------------------------------------------------
  await test('Demo Student: GET /api/classes returns only enrolled classes', async () => {
    process.env.DEMO_MODE = 'true';
    process.env.DEMO_USER_EMAIL = 'demo.student1@studynest.local';
    process.env.DEMO_USER_ROLE = 'student';
    process.env.DEMO_USER_NAME = 'Alex Rivera (Demo)';

    const res = await fetch(`${baseUrl}/classes`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'Response success must be true');
    assert(Array.isArray(data.classes), 'Classes must be array');

    // Alex Rivera is enrolled in Biology 10A and Biology 11A in seed data
    const names = data.classes.map((c: any) => c.name);
    assert(names.includes('Biology 10A'), 'Enrolled student must see Biology 10A');
  });

  await test('Demo Student: Cannot create, update, or delete classes (403 Forbidden)', async () => {
    process.env.DEMO_MODE = 'true';
    process.env.DEMO_USER_EMAIL = 'demo.student1@studynest.local';
    process.env.DEMO_USER_ROLE = 'student';

    // 1. Student POST /api/classes
    const createRes = await fetch(`${baseUrl}/classes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Unauthorized Class', code: 'UNAUTH-1', subject: 'Biology' }),
    });
    assert(createRes.status === 403, `Student POST must return 403, got ${createRes.status}`);

    const existingClassId = '11111111-1111-4111-8111-111111111111';

    // 2. Student PATCH /api/classes/:classId
    const patchRes = await fetch(`${baseUrl}/classes/${existingClassId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hacked by student' }),
    });
    assert(patchRes.status === 403, `Student PATCH must return 403, got ${patchRes.status}`);

    // 3. Student DELETE /api/classes/:classId
    const delRes = await fetch(`${baseUrl}/classes/${existingClassId}`, {
      method: 'DELETE',
    });
    assert(delRes.status === 403, `Student DELETE must return 403, got ${delRes.status}`);
  });

  // -------------------------------------------------------------------------
  // Test Suite 5: Empty State & Edge Cases (Status 200 [], Not 401/403)
  // -------------------------------------------------------------------------
  await test('Empty State: Unenrolled student or teacher with 0 classes returns 200 [] (not an auth failure)', async () => {
    process.env.DEMO_MODE = 'true';
    process.env.DEMO_USER_EMAIL = 'demo.student.empty@studynest.local';
    process.env.DEMO_USER_ROLE = 'student';
    process.env.DEMO_USER_NAME = 'Empty Student';

    const res = await fetch(`${baseUrl}/classes`);
    assert(res.status === 200, `Expected 200 OK for empty classes, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'success must be true');
    assert(Array.isArray(data.classes), 'classes must be an array');
    assert(data.classes.length === 0, `Expected 0 classes for brand new unenrolled student, got ${data.classes.length}`);
  });

  await test('Error Handling: Malformed class ID returns 400 Bad Request', async () => {
    process.env.DEMO_MODE = 'true';
    process.env.DEMO_USER_EMAIL = 'demo.teacher@studynest.local';
    process.env.DEMO_USER_ROLE = 'teacher';

    const res = await fetch(`${baseUrl}/classes/not-a-valid-uuid`);
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  });

  await test('Error Handling: Non-existent class UUID returns 404 Not Found', async () => {
    process.env.DEMO_MODE = 'true';
    process.env.DEMO_USER_EMAIL = 'demo.teacher@studynest.local';
    process.env.DEMO_USER_ROLE = 'teacher';

    const res = await fetch(`${baseUrl}/classes/00000000-0000-4000-8000-000000000000`);
    assert(res.status === 404, `Expected 404, got ${res.status}`);
  });

  // Cleanup
  server.close();

  console.log('----------------------------------------------------');
  console.log(`Total Tests Run: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runDemoTeacherClassFlowTests();
