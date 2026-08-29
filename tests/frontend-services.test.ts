import express from 'express';
import dotenv from 'dotenv';
import { domainRouter } from '../src/routes/domain.ts';
import { classService } from '../src/services/classService.ts';
import { topicService } from '../src/services/topicService.ts';
import { documentService } from '../src/services/documentService.ts';
import { ApiError } from '../src/services/apiClient.ts';
import { getUserByUid } from '../src/db/users.ts';

dotenv.config();
process.env.NODE_ENV = 'test';

const app = express();
app.use(express.json());
app.use('/api', domainRouter);

function assert(condition: boolean, message: string = 'Assertion failed') {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runFrontendServiceTests() {
  console.log('--- Starting Phase 3.3 Frontend Service & ApiClient Tests ---');
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

  // 1. ApiError classification verification
  await test('ApiError class correctly identifies HTTP status flags', async () => {
    const err401 = new ApiError('Unauthorized', 401);
    assert(err401.isUnauthorized === true, 'isUnauthorized must be true for 401');
    assert(err401.isForbidden === false, 'isForbidden must be false for 401');

    const err403 = new ApiError('Forbidden', 403);
    assert(err403.isForbidden === true, 'isForbidden must be true for 403');

    const err404 = new ApiError('Not found', 404);
    assert(err404.isNotFound === true, 'isNotFound must be true for 404');

    const err409 = new ApiError('Conflict', 409);
    assert(err409.isConflict === true, 'isConflict must be true for 409');

    const err500 = new ApiError('Server error', 500);
    assert(err500.isServerError === true, 'isServerError must be true for 500');

    const errNet = new ApiError('Failed to fetch', 0);
    assert(errNet.isNetworkError === true, 'isNetworkError must be true for 0');
  });

  // 2. Domain service methods shape verification
  await test('classService has all required domain methods', async () => {
    assert(typeof classService.getClasses === 'function', 'getClasses must exist');
    assert(typeof classService.getClass === 'function', 'getClass must exist');
    assert(typeof classService.createClass === 'function', 'createClass must exist');
    assert(typeof classService.updateClass === 'function', 'updateClass must exist');
    assert(typeof classService.deleteClass === 'function', 'deleteClass must exist');
    assert(typeof classService.getClassMembers === 'function', 'getClassMembers must exist');
    assert(typeof classService.addClassMember === 'function', 'addClassMember must exist');
    assert(typeof classService.removeClassMember === 'function', 'removeClassMember must exist');
  });

  await test('topicService has all required domain methods', async () => {
    assert(typeof topicService.getTopics === 'function', 'getTopics must exist');
    assert(typeof topicService.getTopic === 'function', 'getTopic must exist');
    assert(typeof topicService.createTopic === 'function', 'createTopic must exist');
    assert(typeof topicService.updateTopic === 'function', 'updateTopic must exist');
    assert(typeof topicService.deleteTopic === 'function', 'deleteTopic must exist');
  });

  await test('documentService has all required domain methods', async () => {
    assert(typeof documentService.getDocuments === 'function', 'getDocuments must exist');
    assert(typeof documentService.getDocument === 'function', 'getDocument must exist');
    assert(typeof documentService.createDocument === 'function', 'createDocument must exist');
    assert(typeof documentService.updateDocument === 'function', 'updateDocument must exist');
    assert(typeof documentService.deleteDocument === 'function', 'deleteDocument must exist');
  });

  console.log('----------------------------------------------------');
  console.log(`Total Tests Run: ${passedCount + failedCount} | Passed: ${passedCount} | Failed: ${failedCount}`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runFrontendServiceTests();
