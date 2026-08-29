import dotenv from 'dotenv';
import { eq, and } from 'drizzle-orm';
import { db as defaultDb } from './index.ts';
import {
  users,
  classes,
  classMembers,
  topics,
  documents,
} from './schema.ts';

dotenv.config();

export interface SeedResult {
  teacher: { id: string; email: string; displayName: string | null };
  students: Array<{ id: string; email: string; displayName: string | null }>;
  classes: Array<{ id: string; code: string; name: string }>;
  topics: Array<{ id: string; classId: string; title: string }>;
  documents: Array<{ id: string; topicId: string; title: string }>;
  membershipsCount: number;
}

/**
 * Idempotent seed function that populates PostgreSQL with core demo curriculum data.
 * Safe to execute repeatedly without generating duplicates or violating constraints.
 */
export async function seedDatabase(dbInstance = defaultDb): Promise<SeedResult> {
  console.log('--- Starting StudyNest PostgreSQL Demo Seed ---');

  // ----------------------------------------------------
  // 1. Seed Demo Teacher
  // ----------------------------------------------------
  const teacherEmail = process.env.DEMO_USER_EMAIL || 'demo.teacher@studynest.local';
  const teacherName = process.env.DEMO_USER_NAME || 'Dr. Sarah Jenkins';
  const teacherUid = `demo-uid-${teacherEmail.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

  let teacherRecord: any;
  const existingTeacher = await dbInstance
    .select()
    .from(users)
    .where(eq(users.email, teacherEmail))
    .limit(1);

  if (existingTeacher.length > 0) {
    teacherRecord = existingTeacher[0];
    // Keep attributes consistent
    await dbInstance
      .update(users)
      .set({
        role: 'teacher',
        displayName: teacherName,
        updatedAt: new Date(),
      })
      .where(eq(users.id, teacherRecord.id));
    console.log(`✓ Existing Demo Teacher: ${teacherEmail} (ID: ${teacherRecord.id})`);
  } else {
    const [inserted] = await dbInstance
      .insert(users)
      .values({
        uid: teacherUid,
        email: teacherEmail,
        displayName: teacherName,
        photoUrl: null,
        role: 'teacher',
      })
      .returning();
    teacherRecord = inserted;
    console.log(`+ Created Demo Teacher: ${teacherEmail} (ID: ${teacherRecord.id})`);
  }

  // ----------------------------------------------------
  // 2. Seed Demo Students (4 Students)
  // ----------------------------------------------------
  const demoStudentsData = [
    { email: 'demo.student1@studynest.local', name: 'Alex Rivera' },
    { email: 'demo.student2@studynest.local', name: 'Maya Lin' },
    { email: 'demo.student3@studynest.local', name: 'Jordan Hayes' },
    { email: 'demo.student4@studynest.local', name: 'Samira Khan' },
  ];

  const studentRecords: Array<{ id: string; email: string; displayName: string | null }> = [];

  for (const s of demoStudentsData) {
    const sUid = `demo-uid-${s.email.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const existing = await dbInstance
      .select()
      .from(users)
      .where(eq(users.email, s.email))
      .limit(1);

    if (existing.length > 0) {
      const studentRec = existing[0];
      await dbInstance
        .update(users)
        .set({
          role: 'student',
          displayName: s.name,
          updatedAt: new Date(),
        })
        .where(eq(users.id, studentRec.id));
      studentRecords.push({ id: studentRec.id, email: studentRec.email, displayName: s.name });
      console.log(`✓ Existing Demo Student: ${s.email}`);
    } else {
      const [inserted] = await dbInstance
        .insert(users)
        .values({
          uid: sUid,
          email: s.email,
          displayName: s.name,
          photoUrl: null,
          role: 'student',
        })
        .returning();
      studentRecords.push({ id: inserted.id, email: inserted.email, displayName: inserted.displayName });
      console.log(`+ Created Demo Student: ${s.email}`);
    }
  }

  // ----------------------------------------------------
  // 3. Seed Demo Classes (2 Classes owned by Demo Teacher)
  // ----------------------------------------------------
  const demoClassesData = [
    {
      name: 'Biology 10A',
      code: 'BIO-10A',
      subject: 'Biology',
      grade: '10th Grade',
      description: 'Foundational principles of cell biology, cellular energy, and organelle mechanisms.',
    },
    {
      name: 'Biology 11A',
      code: 'BIO-11A',
      subject: 'Biology',
      grade: '11th Grade',
      description: 'Advanced curriculum in genetics, heredity, evolution, and molecular biology.',
    },
  ];

  const classRecords: Array<{ id: string; code: string; name: string }> = [];

  for (const c of demoClassesData) {
    const existing = await dbInstance
      .select()
      .from(classes)
      .where(eq(classes.code, c.code))
      .limit(1);

    if (existing.length > 0) {
      const classRec = existing[0];
      await dbInstance
        .update(classes)
        .set({
          name: c.name,
          subject: c.subject,
          grade: c.grade,
          description: c.description,
          teacherId: teacherRecord.id,
          updatedAt: new Date(),
        })
        .where(eq(classes.id, classRec.id));
      classRecords.push({ id: classRec.id, code: classRec.code, name: classRec.name });
      console.log(`✓ Existing Demo Class: ${c.code} (${c.name})`);
    } else {
      const [inserted] = await dbInstance
        .insert(classes)
        .values({
          name: c.name,
          code: c.code,
          subject: c.subject,
          grade: c.grade,
          description: c.description,
          teacherId: teacherRecord.id,
        })
        .returning();
      classRecords.push({ id: inserted.id, code: inserted.code, name: inserted.name });
      console.log(`+ Created Demo Class: ${c.code} (${c.name})`);
    }
  }

  // ----------------------------------------------------
  // 4. Seed Class Memberships (Teacher & Students)
  // ----------------------------------------------------
  let membershipsCount = 0;

  for (const c of classRecords) {
    // 4.1 Ensure teacher is registered as teacher member
    const existingTeacherMember = await dbInstance
      .select()
      .from(classMembers)
      .where(and(eq(classMembers.classId, c.id), eq(classMembers.userId, teacherRecord.id)))
      .limit(1);

    if (existingTeacherMember.length === 0) {
      await dbInstance.insert(classMembers).values({
        classId: c.id,
        userId: teacherRecord.id,
        role: 'teacher',
        status: 'active',
      });
      membershipsCount++;
    }

    // 4.2 Enroll all demo students as active class members
    for (const student of studentRecords) {
      const existingStudentMember = await dbInstance
        .select()
        .from(classMembers)
        .where(and(eq(classMembers.classId, c.id), eq(classMembers.userId, student.id)))
        .limit(1);

      if (existingStudentMember.length === 0) {
        await dbInstance.insert(classMembers).values({
          classId: c.id,
          userId: student.id,
          role: 'student',
          status: 'active',
        });
        membershipsCount++;
      }
    }
  }
  console.log(`✓ Ensured class memberships for teacher and ${studentRecords.length} students across classes`);

  // ----------------------------------------------------
  // 5. Seed Topics per Class
  // ----------------------------------------------------
  const topicsData: Record<
    string,
    Array<{ title: string; description: string; orderIndex: number; status: 'published' | 'draft' }>
  > = {
    'BIO-10A': [
      {
        title: 'Cell Biology',
        description: 'Structure and function of prokaryotic and eukaryotic cells, organelles, and membrane transport.',
        orderIndex: 0,
        status: 'published',
      },
      {
        title: 'Photosynthesis',
        description: 'Light-dependent and light-independent (Calvin cycle) reactions in plant chloroplasts.',
        orderIndex: 1,
        status: 'published',
      },
      {
        title: 'Cellular Respiration',
        description: 'Glycolysis, the citric acid cycle, and oxidative phosphorylation for ATP synthesis.',
        orderIndex: 2,
        status: 'published',
      },
    ],
    'BIO-11A': [
      {
        title: 'Genetics & Heredity',
        description: 'Mendelian inheritance, chromosome dynamics, gene expression, and DNA replication.',
        orderIndex: 0,
        status: 'published',
      },
      {
        title: 'Evolution & Natural Selection',
        description: 'Mechanisms of evolutionary change, natural selection, speciation, and phylogenetics.',
        orderIndex: 1,
        status: 'published',
      },
    ],
  };

  const topicRecords: Array<{ id: string; classId: string; title: string }> = [];

  for (const c of classRecords) {
    const classTopics = topicsData[c.code] || [];
    for (const t of classTopics) {
      const existing = await dbInstance
        .select()
        .from(topics)
        .where(and(eq(topics.classId, c.id), eq(topics.title, t.title)))
        .limit(1);

      if (existing.length > 0) {
        const topicRec = existing[0];
        await dbInstance
          .update(topics)
          .set({
            description: t.description,
            orderIndex: t.orderIndex,
            status: t.status,
            updatedAt: new Date(),
          })
          .where(eq(topics.id, topicRec.id));
        topicRecords.push({ id: topicRec.id, classId: c.id, title: topicRec.title });
        console.log(`✓ Existing Topic: [${c.code}] ${t.title}`);
      } else {
        const [inserted] = await dbInstance
          .insert(topics)
          .values({
            classId: c.id,
            title: t.title,
            description: t.description,
            orderIndex: t.orderIndex,
            status: t.status,
          })
          .returning();
        topicRecords.push({ id: inserted.id, classId: c.id, title: inserted.title });
        console.log(`+ Created Topic: [${c.code}] ${t.title}`);
      }
    }
  }

  // ----------------------------------------------------
  // 6. Seed Metadata-Only Documents per Topic
  // ----------------------------------------------------
  const documentsData: Record<
    string,
    Array<{
      title: string;
      contentType: string;
      content: string;
      fileSize: number;
      status: 'ready' | 'draft';
    }>
  > = {
    'Cell Biology': [
      {
        title: 'cell-introduction.pdf',
        contentType: 'application/pdf',
        content: 'Overview of cell theory, cell discovery history, and comparative prokaryotic vs eukaryotic features.',
        fileSize: 1048576, // 1 MB
        status: 'ready',
      },
      {
        title: 'cell-structure.pdf',
        contentType: 'application/pdf',
        content: 'Detailed diagrams and descriptions of mitochondria, endoplasmic reticulum, Golgi apparatus, and cell membrane transport.',
        fileSize: 2097152, // 2 MB
        status: 'ready',
      },
    ],
    'Photosynthesis': [
      {
        title: 'photosynthesis-basics.pdf',
        contentType: 'application/pdf',
        content: 'Analysis of chloroplast ultrastructure, photosystems I & II, ATP synthase, and RuBisCO catalytic cycle.',
        fileSize: 1572864, // 1.5 MB
        status: 'ready',
      },
    ],
    'Cellular Respiration': [
      {
        title: 'cellular-respiration-guide.pdf',
        contentType: 'application/pdf',
        content: 'Step-by-step breakdown of glycolysis in cytoplasm, Krebs cycle in mitochondrial matrix, and electron transport chain.',
        fileSize: 1835008, // 1.75 MB
        status: 'ready',
      },
    ],
    'Genetics & Heredity': [
      {
        title: 'mendelian-genetics-notes.pdf',
        contentType: 'application/pdf',
        content: 'Comprehensive notes covering monohybrid and dihybrid Punnett squares, sex-linked traits, and pedigree charting.',
        fileSize: 1258291, // 1.2 MB
        status: 'ready',
      },
    ],
  };

  const documentRecords: Array<{ id: string; topicId: string; title: string }> = [];

  for (const top of topicRecords) {
    const docs = documentsData[top.title] || [];
    for (const d of docs) {
      const existing = await dbInstance
        .select()
        .from(documents)
        .where(and(eq(documents.topicId, top.id), eq(documents.title, d.title)))
        .limit(1);

      if (existing.length > 0) {
        const docRec = existing[0];
        await dbInstance
          .update(documents)
          .set({
            contentType: d.contentType,
            content: d.content,
            fileSize: d.fileSize,
            status: d.status,
            createdBy: teacherRecord.id,
            updatedAt: new Date(),
          })
          .where(eq(documents.id, docRec.id));
        documentRecords.push({ id: docRec.id, topicId: top.id, title: docRec.title });
        console.log(`✓ Existing Document: [${top.title}] ${d.title}`);
      } else {
        const [inserted] = await dbInstance
          .insert(documents)
          .values({
            topicId: top.id,
            title: d.title,
            contentType: d.contentType,
            content: d.content,
            fileSize: d.fileSize,
            status: d.status,
            createdBy: teacherRecord.id,
          })
          .returning();
        documentRecords.push({ id: inserted.id, topicId: top.id, title: inserted.title });
        console.log(`+ Created Document: [${top.title}] ${d.title}`);
      }
    }
  }

  console.log('\n--- Seed Completed Successfully! ---');
  console.log(`Teacher: 1 (${teacherRecord.email})`);
  console.log(`Students: ${studentRecords.length}`);
  console.log(`Classes: ${classRecords.length}`);
  console.log(`Topics: ${topicRecords.length}`);
  console.log(`Documents (Metadata-Only): ${documentRecords.length}`);

  return {
    teacher: { id: teacherRecord.id, email: teacherRecord.email, displayName: teacherRecord.displayName },
    students: studentRecords,
    classes: classRecords,
    topics: topicRecords,
    documents: documentRecords,
    membershipsCount,
  };
}

// Standalone CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => {
      console.log('Database seed execution finished.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Database seed error:', err);
      process.exit(1);
    });
}
