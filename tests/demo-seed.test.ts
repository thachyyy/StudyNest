import dotenv from 'dotenv';
import { seedDatabase } from '../src/db/seed.ts';

dotenv.config();
process.env.NODE_ENV = 'test';

function assert(condition: boolean, message: string = 'Assertion failed') {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runSeedValidationTests() {
  console.log('=== StudyNest Phase 3.2: Demo Seed Idempotency & Relationship Tests ===\n');
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

  // In-memory mock store simulating PostgreSQL tables
  const store = {
    users: new Map<string, any>(),
    classes: new Map<string, any>(),
    classMembers: new Map<string, any>(),
    topics: new Map<string, any>(),
    documents: new Map<string, any>(),
  };

  function toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, g) => g.toUpperCase());
  }

  function extractConditions(cond: any): Array<{ col: string; val: any }> {
    const pairs: Array<{ col: string; val: any }> = [];
    if (!cond) return pairs;

    function walkChunks(chunks: any[]) {
      for (let i = 0; i < chunks.length; i++) {
        const current = chunks[i];
        if (current && typeof current === 'object') {
          if (current.queryChunks) {
            walkChunks(current.queryChunks);
          } else if (current.name && typeof current.name === 'string') {
            for (let j = i + 1; j < chunks.length; j++) {
              const nextChunk = chunks[j];
              if (nextChunk && nextChunk.value !== undefined && !(Array.isArray(nextChunk.value) && typeof nextChunk.value[0] === 'string')) {
                pairs.push({ col: current.name, val: nextChunk.value });
                break;
              }
            }
          }
        }
      }
    }

    if (cond.queryChunks) {
      walkChunks(cond.queryChunks);
    }
    return pairs;
  }

  function matchesDrizzleCondition(item: any, condition: any): boolean {
    if (!condition) return true;
    const pairs = extractConditions(condition);
    if (pairs.length === 0) return true;
    return pairs.every((p) => {
      const camel = toCamelCase(p.col);
      const actual = item[camel] !== undefined ? item[camel] : item[p.col];
      return actual === p.val;
    });
  }

  // Mock Drizzle client
  const createMockDb = () => {
    return {
      select: () => ({
        from: (table: any) => {
          const tableName = table[Symbol.for('drizzle:Name')] || (table as any)._?.name;
          const tableMap = (store as any)[tableName === 'class_members' ? 'classMembers' : tableName];

          return {
            where: (condition: any) => ({
              limit: async (_n: number) => {
                const all = Array.from(tableMap.values());
                if (!condition) return all;
                return all.filter((item: any) => matchesDrizzleCondition(item, condition));
              },
            }),
          };
        },
      }),

      insert: (table: any) => ({
        values: (val: any) => {
          const tableName = table[Symbol.for('drizzle:Name')] || (table as any)._?.name;
          const tableMap = (store as any)[tableName === 'class_members' ? 'classMembers' : tableName];
          const id = val.id || `id-${tableName}-${Math.random().toString(36).substring(2, 9)}`;
          const rec = {
            ...val,
            id,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          tableMap.set(id, rec);

          // Return thenable object that also has .returning() method
          const promise = Promise.resolve([rec]);
          return Object.assign(promise, {
            returning: async () => [rec],
          });
        },
      }),

      update: (table: any) => ({
        set: (vals: any) => ({
          where: async (condition: any) => {
            const tableName = table[Symbol.for('drizzle:Name')] || (table as any)._?.name;
            const tableMap = (store as any)[tableName === 'class_members' ? 'classMembers' : tableName];
            for (const [id, item] of tableMap.entries()) {
              if (matchesDrizzleCondition(item, condition)) {
                const updated = { ...item, ...vals, updatedAt: new Date() };
                tableMap.set(id, updated);
              }
            }
          },
        }),
      }),
    };
  };

  const mockDb = createMockDb();

  // Test 1: Seed Run 1
  let run1Result: any = null;
  await test('Seed Run 1: Successfully populates teacher, students, classes, topics, documents, and memberships', async () => {
    run1Result = await seedDatabase(mockDb as any);
    assert(run1Result.teacher.email === 'demo.teacher@studynest.local', 'Teacher email must match config');
    assert(run1Result.students.length === 4, `Expected 4 students, got ${run1Result.students.length}`);
    assert(run1Result.classes.length === 2, `Expected 2 classes, got ${run1Result.classes.length}`);
    assert(run1Result.topics.length === 5, `Expected 5 topics, got ${run1Result.topics.length}`);
    assert(run1Result.documents.length === 5, `Expected 5 documents, got ${run1Result.documents.length}`);
  });

  // Test 2: Seed Run 2 (Idempotency)
  let run2Result: any = null;
  await test('Seed Run 2 (Idempotency): Repeated execution produces identical record counts without duplication', async () => {
    run2Result = await seedDatabase(mockDb as any);

    const totalUsers = store.users.size;
    const totalClasses = store.classes.size;
    const totalTopics = store.topics.size;
    const totalDocs = store.documents.size;
    const totalMemberships = store.classMembers.size;

    assert(totalUsers === 5, `Expected exactly 5 users (1 teacher + 4 students), got ${totalUsers}`);
    assert(totalClasses === 2, `Expected exactly 2 classes, got ${totalClasses}`);
    assert(totalTopics === 5, `Expected exactly 5 topics, got ${totalTopics}`);
    assert(totalDocs === 5, `Expected exactly 5 documents, got ${totalDocs}`);
    // 2 classes * (1 teacher + 4 students) = 10 memberships
    assert(totalMemberships === 10, `Expected exactly 10 class memberships, got ${totalMemberships}`);
  });

  // Test 3: Relational Integrity & Ownership
  await test('Relational Integrity: Demo Teacher owns both demo classes', async () => {
    const teacher = Array.from(store.users.values()).find((u: any) => u.role === 'teacher');
    assert(teacher !== undefined, 'Teacher record must exist');
    assert(teacher.email === 'demo.teacher@studynest.local', 'Teacher email must match config');

    for (const c of store.classes.values()) {
      assert(c.teacherId === teacher.id, `Class ${c.code} must be owned by teacher ${teacher.id}`);
    }
  });

  await test('Relational Integrity: Topics correctly belong to classes', async () => {
    const classIds = new Set(Array.from(store.classes.values()).map((c: any) => c.id));
    const bio10ATopics = Array.from(store.topics.values()).filter((t: any) => {
      const parentClass = store.classes.get(t.classId);
      return parentClass?.code === 'BIO-10A';
    });
    const bio11ATopics = Array.from(store.topics.values()).filter((t: any) => {
      const parentClass = store.classes.get(t.classId);
      return parentClass?.code === 'BIO-11A';
    });

    assert(bio10ATopics.length === 3, `Expected 3 topics in BIO-10A, got ${bio10ATopics.length}`);
    assert(bio11ATopics.length === 2, `Expected 2 topics in BIO-11A, got ${bio11ATopics.length}`);

    for (const t of store.topics.values()) {
      assert(classIds.has(t.classId), `Topic ${t.title} classId foreign key must exist`);
    }
  });

  await test('Relational Integrity: Documents are metadata-only and belong to topics', async () => {
    const topicIds = new Set(Array.from(store.topics.values()).map((t: any) => t.id));
    for (const d of store.documents.values()) {
      assert(topicIds.has(d.topicId), `Document ${d.title} must have valid topicId`);
      assert(d.status === 'ready', `Document ${d.title} must have ready status`);
      assert(d.fileSize > 0, `Document ${d.title} has metadata fileSize`);
      assert(d.contentType === 'application/pdf', `Document ${d.title} has application/pdf contentType`);
    }
  });

  await test('Relational Integrity: Students are enrolled in classes via classMembers', async () => {
    const studentUsers = Array.from(store.users.values()).filter((u: any) => u.role === 'student');
    assert(studentUsers.length === 4, `Expected 4 students, got ${studentUsers.length}`);

    for (const c of store.classes.values()) {
      for (const s of studentUsers) {
        const member = Array.from(store.classMembers.values()).find(
          (m: any) => m.classId === c.id && m.userId === s.id && m.role === 'student' && m.status === 'active'
        );
        assert(member !== undefined, `Student ${s.email} must be an active member of ${c.code}`);
      }
    }
  });

  console.log('\n----------------------------------------------------');
  console.log(`Total Tests Run: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runSeedValidationTests();
