import { db } from './index.ts';
import { users, classes, topics, documents, classMembers } from './schema.ts';

async function inspectDatabase() {
  console.log('=== StudyNest PostgreSQL Database Status ===\n');

  // 1. Users
  const allUsers = await db.select().from(users);
  console.log(`[Users] Total: ${allUsers.length}`);
  console.table(
    allUsers.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      displayName: u.displayName,
      uid: u.uid,
    }))
  );

  // 2. Classes
  const allClasses = await db.select().from(classes);
  console.log(`\n[Classes] Total: ${allClasses.length}`);
  console.table(
    allClasses.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      subject: c.subject,
      teacherId: c.teacherId,
    }))
  );

  // 3. Class Memberships
  const allMembers = await db.select().from(classMembers);
  console.log(`\n[Class Memberships] Total: ${allMembers.length}`);
  console.table(
    allMembers.map((m) => ({
      id: m.id,
      classId: m.classId,
      userId: m.userId,
      role: m.role,
      status: m.status,
    }))
  );

  // 4. Topics
  const allTopics = await db.select().from(topics);
  console.log(`\n[Topics] Total: ${allTopics.length}`);
  console.table(
    allTopics.map((t) => ({
      id: t.id,
      classId: t.classId,
      title: t.title,
      orderIndex: t.orderIndex,
      status: t.status,
    }))
  );

  // 5. Documents
  const allDocs = await db.select().from(documents);
  console.log(`\n[Documents (Metadata Only)] Total: ${allDocs.length}`);
  console.table(
    allDocs.map((d) => ({
      id: d.id,
      topicId: d.topicId,
      title: d.title,
      contentType: d.contentType,
      status: d.status,
      fileSize: d.fileSize,
    }))
  );

  process.exit(0);
}

inspectDatabase().catch((err) => {
  console.error('Inspection failed:', err);
  process.exit(1);
});
