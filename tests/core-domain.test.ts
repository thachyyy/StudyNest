import express from 'express';
import dotenv from 'dotenv';
import { domainRouter } from '../src/routes/domain.ts';
import { getUserByUid } from '../src/db/users.ts';
import { inMemoryStore } from '../src/db/inMemoryStore.ts';

dotenv.config();
process.env.NODE_ENV = 'test';
process.env.DEMO_MODE = 'false';

// Build a standalone test express app mounting domainRouter
const app = express();
app.use(express.json());
app.use('/api', domainRouter);

let server: any;
let port: number;
let baseUrl: string;

function assert(condition: boolean, message: string = 'Assertion failed') {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function request(
  method: string,
  path: string,
  token?: string,
  body?: any
): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer mock-token:${token}`;
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let resBody = null;
  try {
    resBody = await res.json();
  } catch (e) {
    resBody = null;
  }

  return { status: res.status, body: resBody };
}

async function runTests() {
  console.log('--- Starting Phase 3.2 Core Domain Tests ---');
  let passedCount = 0;
  let failedCount = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passedCount++;
    } catch (err: any) {
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
      failedCount++;
    }
  }

  // Ensure test users are available in DB / memory
  inMemoryStore.users.set('11111111-1111-4111-8111-111111111111', {
    id: '11111111-1111-4111-8111-111111111111',
    uid: 'firebase-uid-teacher-a',
    email: 'teacher-a@test.local',
    displayName: 'Teacher A',
    photoUrl: null,
    role: 'teacher',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  inMemoryStore.users.set('22222222-2222-4222-8222-222222222222', {
    id: '22222222-2222-4222-8222-222222222222',
    uid: 'firebase-uid-teacher-b',
    email: 'teacher-b@test.local',
    displayName: 'Teacher B',
    photoUrl: null,
    role: 'teacher',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  inMemoryStore.users.set('33333333-3333-4333-8333-333333333333', {
    id: '33333333-3333-4333-8333-333333333333',
    uid: 'firebase-uid-student-enrolled',
    email: 'student-enrolled@test.local',
    displayName: 'Student Enrolled',
    photoUrl: null,
    role: 'student',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  inMemoryStore.users.set('44444444-4444-4444-8444-444444444444', {
    id: '44444444-4444-4444-8444-444444444444',
    uid: 'firebase-uid-student-unenrolled',
    email: 'student-unenrolled@test.local',
    displayName: 'Student Unenrolled',
    photoUrl: null,
    role: 'student',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const teacherA = await getUserByUid('firebase-uid-teacher-a');
  const teacherB = await getUserByUid('firebase-uid-teacher-b');
  const studentEnrolled = await getUserByUid('firebase-uid-student-enrolled');
  const studentUnenrolled = await getUserByUid('firebase-uid-student-unenrolled');

  assert(!!teacherA, 'Teacher A must exist in DB');
  assert(!!teacherB, 'Teacher B must exist in DB');
  assert(!!studentEnrolled, 'Student Enrolled must exist in DB');
  assert(!!studentUnenrolled, 'Student Unenrolled must exist in DB');

  let testClassId: string = '';
  let draftTopicId: string = '';
  let publishedTopicId: string = '';
  let testDocumentId: string = '';

  // 1. Authentication & Bad Request checks
  await test('Unauthenticated request returns 401 Unauthorized', async () => {
    const res = await request('GET', '/api/classes');
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });

  await test('Malformed UUID returns 400 Bad Request', async () => {
    const res = await request('GET', '/api/classes/not-a-valid-uuid', 'firebase-uid-teacher-a');
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  });

  // 2. Class creation & ownership
  await test('Teacher A creates a new class', async () => {
    const uniqueCode = `TEST-${Date.now()}`;
    const res = await request('POST', '/api/classes', 'firebase-uid-teacher-a', {
      name: 'Advanced Chemistry',
      code: uniqueCode,
      subject: 'Chemistry',
      grade: 'Grade 11',
      description: 'Test Chemistry course',
    });
    assert(res.status === 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert(res.body.success === true, 'Expected success === true');
    assert(res.body.class.teacherId === teacherA!.id, 'Teacher ID must match authenticated user');
    testClassId = res.body.class.id;
  });

  await test('Student cannot create a class (403 Forbidden)', async () => {
    const res = await request('POST', '/api/classes', 'firebase-uid-student-enrolled', {
      name: 'Student Class',
      code: `STU-${Date.now()}`,
      subject: 'Math',
    });
    assert(res.status === 403, `Expected 403, got ${res.status}`);
  });

  await test('Teacher A can list own classes', async () => {
    const res = await request('GET', '/api/classes', 'firebase-uid-teacher-a');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const classIds = res.body.classes.map((c: any) => c.id);
    assert(classIds.includes(testClassId), 'Created class must be in Teacher A list');
  });

  await test('Teacher B cannot view or access Teacher A private class (403 Forbidden)', async () => {
    const res = await request('GET', `/api/classes/${testClassId}`, 'firebase-uid-teacher-b');
    assert(res.status === 403, `Expected 403, got ${res.status}`);
  });

  await test('Teacher B cannot update Teacher A class (403 Forbidden)', async () => {
    const res = await request('PATCH', `/api/classes/${testClassId}`, 'firebase-uid-teacher-b', {
      name: 'Hacked Class Name',
    });
    assert(res.status === 403, `Expected 403, got ${res.status}`);
  });

  // 3. Class Member Management
  await test('Teacher A adds Student Enrolled to the class', async () => {
    const res = await request('POST', `/api/classes/${testClassId}/members`, 'firebase-uid-teacher-a', {
      userId: studentEnrolled!.id,
      role: 'student',
    });
    assert(res.status === 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert(res.body.member.userId === studentEnrolled!.id, 'Enrolled user must match');
  });

  await test('Duplicate membership returns 409 Conflict', async () => {
    const res = await request('POST', `/api/classes/${testClassId}/members`, 'firebase-uid-teacher-a', {
      userId: studentEnrolled!.id,
    });
    assert(res.status === 409, `Expected 409, got ${res.status}`);
  });

  await test('Student cannot add members to class (403 Forbidden)', async () => {
    const res = await request('POST', `/api/classes/${testClassId}/members`, 'firebase-uid-student-enrolled', {
      userId: studentUnenrolled!.id,
    });
    assert(res.status === 403, `Expected 403, got ${res.status}`);
  });

  await test('Teacher A can list class members', async () => {
    const res = await request('GET', `/api/classes/${testClassId}/members`, 'firebase-uid-teacher-a');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.members) && res.body.members.length >= 1, 'Must have at least 1 member');
  });

  // 4. Student Class Access
  await test('Enrolled student can view the class', async () => {
    const res = await request('GET', `/api/classes/${testClassId}`, 'firebase-uid-student-enrolled');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await test('Unenrolled student cannot view the class (403 Forbidden)', async () => {
    const res = await request('GET', `/api/classes/${testClassId}`, 'firebase-uid-student-unenrolled');
    assert(res.status === 403, `Expected 403, got ${res.status}`);
  });

  // 5. Topic Management & Authorization
  await test('Teacher A creates a draft topic in own class', async () => {
    const res = await request('POST', `/api/classes/${testClassId}/topics`, 'firebase-uid-teacher-a', {
      title: 'Thermodynamics & Enthalpy (Draft)',
      description: 'Internal draft notes',
      status: 'draft',
      orderIndex: 1,
    });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    draftTopicId = res.body.topic.id;
  });

  await test('Teacher A creates a published topic in own class', async () => {
    const res = await request('POST', `/api/classes/${testClassId}/topics`, 'firebase-uid-teacher-a', {
      title: 'Chemical Equilibrium (Published)',
      description: 'Public topic notes',
      status: 'published',
      orderIndex: 2,
    });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    publishedTopicId = res.body.topic.id;
  });

  await test('Teacher B cannot create a topic in Teacher A class (403 Forbidden)', async () => {
    const res = await request('POST', `/api/classes/${testClassId}/topics`, 'firebase-uid-teacher-b', {
      title: 'Unauthorized Topic',
    });
    assert(res.status === 403, `Expected 403, got ${res.status}`);
  });

  await test('Teacher A can view all topics including drafts', async () => {
    const res = await request('GET', `/api/classes/${testClassId}/topics`, 'firebase-uid-teacher-a');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const titles = res.body.topics.map((t: any) => t.title);
    assert(titles.includes('Thermodynamics & Enthalpy (Draft)'), 'Teacher should see draft topic');
    assert(titles.includes('Chemical Equilibrium (Published)'), 'Teacher should see published topic');
  });

  await test('Enrolled student only sees published topics (draft hidden)', async () => {
    const res = await request('GET', `/api/classes/${testClassId}/topics`, 'firebase-uid-student-enrolled');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const titles = res.body.topics.map((t: any) => t.title);
    assert(!titles.includes('Thermodynamics & Enthalpy (Draft)'), 'Student MUST NOT see draft topic');
    assert(titles.includes('Chemical Equilibrium (Published)'), 'Student should see published topic');
  });

  await test('Enrolled student cannot read draft topic by ID (403 Forbidden)', async () => {
    const res = await request('GET', `/api/topics/${draftTopicId}`, 'firebase-uid-student-enrolled');
    assert(res.status === 403, `Expected 403, got ${res.status}`);
  });

  await test('Enrolled student can read published topic by ID', async () => {
    const res = await request('GET', `/api/topics/${publishedTopicId}`, 'firebase-uid-student-enrolled');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await test('Teacher A updates own topic', async () => {
    const res = await request('PATCH', `/api/topics/${publishedTopicId}`, 'firebase-uid-teacher-a', {
      title: 'Chemical Equilibrium & Le Chatelier Principle',
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.topic.title === 'Chemical Equilibrium & Le Chatelier Principle');
  });

  await test('Teacher B cannot update Teacher A topic (403 Forbidden)', async () => {
    const res = await request('PATCH', `/api/topics/${publishedTopicId}`, 'firebase-uid-teacher-b', {
      title: 'Hacked Topic',
    });
    assert(res.status === 403, `Expected 403, got ${res.status}`);
  });

  await test('Student cannot update or delete topic (403 Forbidden)', async () => {
    const patchRes = await request('PATCH', `/api/topics/${publishedTopicId}`, 'firebase-uid-student-enrolled', {
      title: 'Student edit',
    });
    assert(patchRes.status === 403, `Expected 403, got ${patchRes.status}`);

    const delRes = await request('DELETE', `/api/topics/${publishedTopicId}`, 'firebase-uid-student-enrolled');
    assert(delRes.status === 403, `Expected 403, got ${delRes.status}`);
  });

  // 6. Document Metadata Management
  await test('Teacher A creates a document under published topic', async () => {
    const res = await request('POST', `/api/topics/${publishedTopicId}/documents`, 'firebase-uid-teacher-a', {
      title: 'Le Chatelier Principle Summary.pdf',
      contentType: 'lecture_notes',
      status: 'ready',
    });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    testDocumentId = res.body.document.id;
  });

  await test('Enrolled student can read document metadata under published topic', async () => {
    const res = await request('GET', `/api/documents/${testDocumentId}`, 'firebase-uid-student-enrolled');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.document.title === 'Le Chatelier Principle Summary.pdf');
  });

  await test('Unenrolled student cannot read document metadata (403 Forbidden)', async () => {
    const res = await request('GET', `/api/documents/${testDocumentId}`, 'firebase-uid-student-unenrolled');
    assert(res.status === 403, `Expected 403, got ${res.status}`);
  });

  await test('Teacher B cannot read or modify Teacher A document (403 Forbidden)', async () => {
    const readRes = await request('GET', `/api/documents/${testDocumentId}`, 'firebase-uid-teacher-b');
    assert(readRes.status === 403, `Expected 403, got ${readRes.status}`);

    const updateRes = await request('PATCH', `/api/documents/${testDocumentId}`, 'firebase-uid-teacher-b', {
      title: 'Hacked Document Title',
    });
    assert(updateRes.status === 403, `Expected 403, got ${updateRes.status}`);
  });

  // 7. Cleanup & Cascade
  await test('Teacher A deletes class and verifies cascade', async () => {
    const delRes = await request('DELETE', `/api/classes/${testClassId}`, 'firebase-uid-teacher-a');
    assert(delRes.status === 200, `Expected 200, got ${delRes.status}`);

    // Verify topic and document are no longer found
    const topicRes = await request('GET', `/api/topics/${publishedTopicId}`, 'firebase-uid-teacher-a');
    assert(topicRes.status === 404, `Expected 404, got ${topicRes.status}`);

    const docRes = await request('GET', `/api/documents/${testDocumentId}`, 'firebase-uid-teacher-a');
    assert(docRes.status === 404, `Expected 404, got ${docRes.status}`);
  });

  console.log('----------------------------------------------------');
  console.log(`Total Tests Run: ${passedCount + failedCount} | Passed: ${passedCount} | Failed: ${failedCount}`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

async function main() {
  const srv = app.listen(0, '127.0.0.1', async () => {
    const addr = srv.address() as any;
    port = addr.port;
    baseUrl = `http://127.0.0.1:${port}`;
    try {
      await runTests();
      srv.close();
      process.exit(0);
    } catch (e: any) {
      console.error('Test execution error:', e);
      srv.close();
      process.exit(1);
    }
  });
}

main();
