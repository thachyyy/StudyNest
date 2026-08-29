import express, { Response } from 'express';
import dotenv from 'dotenv';
import {
  validateUploadedPdf,
  sanitizeFilename,
  generateStorageIdentifier,
  getMaxPdfSizeMb,
  getMaxPdfSizeBytes,
} from '../src/lib/fileValidation.ts';
import { DocumentService } from '../src/services/document.service.ts';
import { inMemoryStore } from '../src/db/inMemoryStore.ts';
import { AuthenticatedUser } from '../src/middleware/auth.ts';

dotenv.config();
process.env.NODE_ENV = 'test';

function assert(condition: boolean, message: string = 'Assertion failed') {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runPdfUploadFlowTests() {
  console.log('=== StudyNest Phase 4.1: PDF Upload API and Validation Tests ===\n');
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

  // --- 1. Unit Tests for File Validation & Sanitization ---
  console.log('--- 1. Validation & Sanitization Unit Tests ---');

  await test('sanitizeFilename strips directory traversal and dangerous characters', async () => {
    assert(sanitizeFilename('../../../secret/grades.pdf') === 'grades.pdf', 'Strips ../ via basename');
    assert(sanitizeFilename('..\\..\\malicious.pdf') === 'malicious.pdf', 'Strips ..\\');
    assert(sanitizeFilename('my cool doc (2026)!@#$.pdf') === 'my_cool_doc_2026_.pdf', 'Replaces unsafe chars and collapses underscores');
    assert(sanitizeFilename('') === 'document.pdf', 'Defaults empty name');
    assert(sanitizeFilename(null) === 'document.pdf', 'Defaults null name');
  });

  await test('generateStorageIdentifier creates unique, collision-resistant paths', async () => {
    const topicId = '11111111-1111-4111-8111-111111111111';
    const id1 = generateStorageIdentifier(topicId);
    const id2 = generateStorageIdentifier(topicId);
    assert(id1.startsWith(`uploads/${topicId}/`), 'Path includes uploads and topic directory');
    assert(id1.endsWith('.pdf'), 'Path ends with .pdf extension');
    assert(id1 !== id2, 'Successive identifiers are unique due to timestamp and crypto entropy');
  });

  await test('validateUploadedPdf validates valid PDF with %PDF- header', async () => {
    const validPdfBuffer = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'Genetics_Chapter_1.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: validPdfBuffer.length,
      buffer: validPdfBuffer,
      destination: '',
      filename: '',
      path: '',
      stream: null as any,
    };

    const res = validateUploadedPdf(mockFile);
    assert(res.isValid === true, 'Valid PDF passes validation');
    assert(res.sanitizedFilename === 'Genetics_Chapter_1.pdf', 'Filename is sanitized');
  });

  await test('validateUploadedPdf rejects missing or empty file', async () => {
    const resNull = validateUploadedPdf(null);
    assert(resNull.isValid === false && resNull.status === 400, 'Null file rejected with 400');

    const emptyFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'empty.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: 0,
      buffer: Buffer.alloc(0),
      destination: '',
      filename: '',
      path: '',
      stream: null as any,
    };
    const resEmpty = validateUploadedPdf(emptyFile);
    assert(resEmpty.isValid === false && resEmpty.status === 400, 'Empty file rejected with 400');
  });

  await test('validateUploadedPdf rejects non-PDF extension', async () => {
    const buffer = Buffer.from('%PDF-1.4 Fake PDF in exe');
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'virus.exe',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: buffer.length,
      buffer: buffer,
      destination: '',
      filename: '',
      path: '',
      stream: null as any,
    };
    const res = validateUploadedPdf(mockFile);
    assert(res.isValid === false && res.status === 400, 'Non-pdf extension rejected');
    assert(res.error?.includes('.pdf'), 'Error specifies .pdf extension');
  });

  await test('validateUploadedPdf rejects bad MIME type or spoofed extension', async () => {
    const textBuffer = Buffer.from('Just some plaintext not a PDF');
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'notes.pdf',
      encoding: '7bit',
      mimetype: 'text/plain',
      size: textBuffer.length,
      buffer: textBuffer,
      destination: '',
      filename: '',
      path: '',
      stream: null as any,
    };
    const res = validateUploadedPdf(mockFile);
    assert(res.isValid === false && res.status === 400, 'Text MIME type rejected');
  });

  await test('validateUploadedPdf rejects forged magic bytes', async () => {
    const badBuffer = Buffer.from('FAKE HEADER THIS IS NOT A PDF AT ALL');
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'spoofed.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: badBuffer.length,
      buffer: badBuffer,
      destination: '',
      filename: '',
      path: '',
      stream: null as any,
    };
    const res = validateUploadedPdf(mockFile);
    assert(res.isValid === false && res.status === 400, 'Invalid magic bytes rejected');
    assert(res.error?.includes('signature header (%PDF-)'), 'Error identifies corrupt PDF');
  });

  await test('validateUploadedPdf rejects oversized files (> MAX_PDF_SIZE_MB)', async () => {
    const oldEnv = process.env.MAX_PDF_SIZE_MB;
    try {
      // Set to 1MB limit for test
      process.env.MAX_PDF_SIZE_MB = '1';
      const oversizedBuffer = Buffer.alloc(1.5 * 1024 * 1024);
      oversizedBuffer.write('%PDF-1.4');
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'large.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: oversizedBuffer.length,
        buffer: oversizedBuffer,
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };
      const res = validateUploadedPdf(mockFile);
      assert(res.isValid === false, 'Oversized file fails validation');
      assert(res.status === 413, 'Returns 413 Payload Too Large');
    } finally {
      process.env.MAX_PDF_SIZE_MB = oldEnv;
    }
  });

  // --- 2. Authorization & Service Layer Tests ---
  console.log('\n--- 2. Service Layer & RBAC Upload Tests ---');

  // Setup test mock users and in-memory hierarchy
  const teacherUser: AuthenticatedUser = {
    id: 'teacher-uuid-001',
    firebaseUid: 'demo-teacher-uid',
    email: 'demo.teacher@studynest.local',
    role: 'teacher',
    displayName: 'Sarah Jenkins (Demo)',
    photoUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const otherTeacherUser: AuthenticatedUser = {
    id: 'teacher-uuid-999',
    firebaseUid: 'other-teacher-uid',
    email: 'other.teacher@studynest.local',
    role: 'teacher',
    displayName: 'Other Teacher',
    photoUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const studentUser: AuthenticatedUser = {
    id: 'student-uuid-001',
    firebaseUid: 'demo-student-uid',
    email: 'demo.student1@studynest.local',
    role: 'student',
    displayName: 'Alex Rivera (Demo)',
    photoUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const testClassId = '11111111-1111-4111-8111-111111111111';
  const testTopicId = '33333333-3333-4333-8333-333333333331';

  // Seed memory store with class and topic owned by teacherUser
  inMemoryStore.classes.set(testClassId, {
    id: testClassId,
    name: 'Biology 10A',
    code: 'BIO10A',
    description: 'Introductory Biology',
    subject: 'Biology',
    grade: '10th',
    teacherId: teacherUser.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  inMemoryStore.topics.set(testTopicId, {
    id: testTopicId,
    classId: testClassId,
    title: 'Cell Biology & Membrane Transport',
    description: 'Structure of cell membranes',
    orderIndex: 1,
    status: 'published',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const validPdfBuffer = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
  const validFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'Cell_Membrane_Lecture_Notes.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: validPdfBuffer.length,
    buffer: validPdfBuffer,
    destination: '',
    filename: '',
    path: '',
    stream: null as any,
  };

  await test('Teacher who owns class successfully uploads PDF document', async () => {
    const result = await DocumentService.uploadDocumentPdf(
      testTopicId,
      validFile,
      teacherUser,
      'Cell Membrane Lecture Notes',
      'lecture_notes'
    );

    assert(result.status === 201, `Status should be 201 Created, got ${result.status}`);
    assert(result.data, 'Returns created document record');
    assert(result.data.title === 'Cell Membrane Lecture Notes', 'Title matches');
    assert(result.data.status === 'draft', 'Initial status is draft');
    assert(result.data.fileSize === validPdfBuffer.length, 'File size matches buffer length');
    assert(result.data.sourceUrl?.startsWith(`uploads/${testTopicId}/`), 'sourceUrl contains storage identifier');
    assert(result.data.topicId === testTopicId, 'Attached to correct topic');
  });

  await test('Student is forbidden (403) from uploading PDF documents', async () => {
    const result = await DocumentService.uploadDocumentPdf(
      testTopicId,
      validFile,
      studentUser,
      'Student Cheat Sheet'
    );

    assert(result.status === 403, `Student upload should be 403 Forbidden, got ${result.status}`);
    assert(result.error?.includes('Forbidden') || result.error?.includes('permission') || result.error?.includes('Students'), 'Returns permission error');
  });

  await test('Teacher who does NOT own the class is forbidden (403)', async () => {
    const result = await DocumentService.uploadDocumentPdf(
      testTopicId,
      validFile,
      otherTeacherUser,
      'Unauthorized Upload'
    );

    assert(result.status === 403, `Unauthorized teacher upload should be 403 Forbidden, got ${result.status}`);
    assert(result.error?.includes('own'), 'Error indicates ownership restriction');
  });

  await test('Upload to non-existent topic returns 404', async () => {
    const fakeTopicId = '99999999-9999-4999-8999-999999999999';
    const result = await DocumentService.uploadDocumentPdf(
      fakeTopicId,
      validFile,
      teacherUser
    );

    assert(result.status === 404, `Non-existent topic upload should return 404, got ${result.status}`);
  });

  console.log(`\nPDF Upload Flow Tests: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runPdfUploadFlowTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
