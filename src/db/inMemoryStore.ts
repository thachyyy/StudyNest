/**
 * In-Memory Domain Storage & Failover Layer
 * 
 * Provides robust resilience and graceful fallback for users, classes, topics,
 * and documents when PostgreSQL / Cloud SQL is unavailable or not yet provisioned.
 */

export interface InMemoryUser {
  id: string;
  uid: string;
  email: string;
  displayName: string | null;
  photoUrl: string | null;
  role: 'teacher' | 'student' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

export interface InMemoryClass {
  id: string;
  name: string;
  code: string;
  description: string | null;
  subject: string;
  grade: string | null;
  teacherId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InMemoryTopic {
  id: string;
  classId: string;
  title: string;
  description: string | null;
  status: 'draft' | 'published' | 'archived';
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface InMemoryDocument {
  id: string;
  topicId: string;
  title: string;
  contentType: string;
  content: string | null;
  sourceUrl: string | null;
  fileSize: number | null;
  status: 'draft' | 'processing' | 'ready' | 'failed' | 'archived';
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InMemoryClassMember {
  id: string;
  classId: string;
  userId: string;
  role: 'teacher' | 'student' | 'teaching_assistant';
  status: 'active' | 'archived' | 'pending';
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

import crypto from 'crypto';

export function generateStoreId(prefix?: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix || 'id'}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

class InMemoryStore {
  public users: Map<string, InMemoryUser> = new Map();
  public classes: Map<string, InMemoryClass> = new Map();
  public topics: Map<string, InMemoryTopic> = new Map();
  public documents: Map<string, InMemoryDocument> = new Map();
  public classMembers: Map<string, InMemoryClassMember> = new Map();

  constructor() {
    this.seedDefaults();
  }

  public seedDefaults() {
    const now = new Date();

    // 1. Seed Teacher & Student Users (Valid RFC 4122 v4 UUIDs)
    const teacherId = 'a1b2c3d4-e5f6-4890-8bcd-ef1234567890';
    const studentId = 'b2c3d4e5-f6a7-4901-8cde-f23456789012';

    const teacher: InMemoryUser = {
      id: teacherId,
      uid: 'demo-uid-demo_teacher_studynest_local',
      email: 'demo.teacher@studynest.local',
      displayName: 'Dr. Sarah Vance',
      photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=100&q=80',
      role: 'teacher',
      createdAt: now,
      updatedAt: now,
    };

    const student: InMemoryUser = {
      id: studentId,
      uid: 'demo-uid-demo_student_studynest_local',
      email: 'an.minh@studynest.local',
      displayName: 'An Minh (Student)',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
      role: 'student',
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(teacher.id, teacher);
    this.users.set(student.id, student);

    // 2. Seed Initial Classes (Valid RFC 4122 v4 UUIDs)
    const bioClassId = 'c3d4e5f6-a7b8-4012-8def-345678901234';
    const physClassId = 'd4e5f6a7-b8c9-4123-8efa-456789012345';

    const bioClass: InMemoryClass = {
      id: bioClassId,
      name: 'Biology 10A - Cellular Energetics',
      code: 'BIO-10A',
      description: 'Photosynthesis, Cellular Respiration, and Enzymatic Regulation for Grade 10 Honors.',
      subject: 'Biology',
      grade: 'Grade 10',
      teacherId: teacher.id,
      createdAt: now,
      updatedAt: now,
    };

    const physClass: InMemoryClass = {
      id: physClassId,
      name: 'Physics 11B - Mechanics & Dynamics',
      code: 'PHYS-11B',
      description: 'Newtonian mechanics, momentum conservation, kinetic energy, and vectors.',
      subject: 'Physics',
      grade: 'Grade 11',
      teacherId: teacher.id,
      createdAt: now,
      updatedAt: now,
    };

    this.classes.set(bioClass.id, bioClass);
    this.classes.set(physClass.id, physClass);

    // Enroll student in BIO-10A
    const memberId = 'e5f6a7b8-c9d0-4234-8fab-567890123456';
    this.classMembers.set(memberId, {
      id: memberId,
      classId: bioClassId,
      userId: studentId,
      role: 'student',
      status: 'active',
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // 3. Seed Topics for BIO-10A (Valid RFC 4122 v4 UUIDs)
    const topic1Id = 'f6a7b8c9-d0e1-4345-8abc-678901234567';
    const topic2Id = 'a7b8c9d0-e1f2-4456-8bcd-789012345678';
    const topic3Id = 'b8c9d0e1-f2a3-4567-8cde-890123456789';

    const topic1: InMemoryTopic = {
      id: topic1Id,
      classId: bioClassId,
      title: 'Light-Dependent Reactions',
      description: 'Thylakoid membrane proton gradients, Photosystem II & I, and photophosphorylation.',
      status: 'published',
      orderIndex: 0,
      createdAt: now,
      updatedAt: now,
    };

    const topic2: InMemoryTopic = {
      id: topic2Id,
      classId: bioClassId,
      title: 'Calvin Cycle & Carbon Fixation',
      description: 'Stroma enzymatic cycles, RuBisCO mechanism, and NADPH/ATP consumption.',
      status: 'published',
      orderIndex: 1,
      createdAt: now,
      updatedAt: now,
    };

    const topic3: InMemoryTopic = {
      id: topic3Id,
      classId: bioClassId,
      title: 'Cellular Respiration & Glycolysis',
      description: 'Mitochondrial matrix processes, Krebs cycle, and oxidative phosphorylation.',
      status: 'published',
      orderIndex: 2,
      createdAt: now,
      updatedAt: now,
    };

    this.topics.set(topic1.id, topic1);
    this.topics.set(topic2.id, topic2);
    this.topics.set(topic3.id, topic3);

    // 4. Seed Documents (Valid RFC 4122 v4 UUIDs)
    const doc1Id = 'c9d0e1f2-a3b4-4678-8def-901234567890';
    const doc2Id = 'd0e1f2a3-b4c5-4789-8efa-012345678901';

    this.documents.set(doc1Id, {
      id: doc1Id,
      topicId: topic1Id,
      title: 'Lecture 1: Thylakoid Membrane Architecture.pdf',
      contentType: 'lecture_notes',
      content: 'Detailed diagrams of Photosystems I & II and ATP Synthase proton pumping across thylakoid membranes.',
      sourceUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=400&q=80',
      fileSize: 2048576,
      status: 'ready',
      createdBy: teacher.id,
      createdAt: now,
      updatedAt: now,
    });

    this.documents.set(doc2Id, {
      id: doc2Id,
      topicId: topic2Id,
      title: 'Lecture 2: Carbon Fixation & RuBisCO Kinetics.pdf',
      contentType: 'lecture_notes',
      content: 'Stoichiometry of the Calvin Cycle, RuBP regeneration, and temperature sensitivity.',
      sourceUrl: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=400&q=80',
      fileSize: 1843200,
      status: 'ready',
      createdBy: teacher.id,
      createdAt: now,
      updatedAt: now,
    });
  }
}

export const inMemoryStore = new InMemoryStore();
