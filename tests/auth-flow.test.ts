import express from 'express';
import dotenv from 'dotenv';
import { requireAuth, AuthRequest } from '../src/middleware/auth.ts';
import { apiClient, setCustomTokenProvider, ApiError, getFirebaseToken } from '../src/services/apiClient.ts';

dotenv.config();
process.env.NODE_ENV = 'test';
process.env.DEMO_MODE = 'false';

function assert(condition: boolean, message: string = 'Assertion failed') {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runAuthFlowTests() {
  console.log('=== StudyNest Core Flow Part 1: Firebase Auth & Token Tests ===\n');
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

  // Setup mock Express server with requireAuth
  const app = express();
  app.use(express.json());

  // Public endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', public: true });
  });

  // Protected endpoint
  app.get('/api/protected-resource', requireAuth, (req: AuthRequest, res) => {
    res.json({
      success: true,
      user: req.user,
      authHeaderReceived: req.headers.authorization,
    });
  });

  const server = app.listen(0);
  const address = server.address() as any;
  const testBaseUrl = `http://127.0.0.1:${address.port}/api`;

  // 1. Test: Signed out -> getFirebaseToken returns null when unauthenticated
  await test('Signed out: getFirebaseToken() returns null when no user is signed in', async () => {
    setCustomTokenProvider(async () => null);
    const token = await getFirebaseToken();
    assert(token === null, 'Token must be null when unauthenticated');
  });

  // 2. Test: Signed in -> getFirebaseToken returns token
  await test('Signed in: getFirebaseToken() returns valid token string', async () => {
    setCustomTokenProvider(async () => 'mock-token:teacher-sarah');
    const token = await getFirebaseToken();
    assert(token === 'mock-token:teacher-sarah', 'Token must return the mock token string');
  });

  // 3. Test: Unauthenticated protected request fails with 401 ApiError
  await test('Unauthenticated protected request: apiClient throws 401 Unauthorized: Missing token', async () => {
    setCustomTokenProvider(async () => null);
    // Custom test apiClient targeting test server
    const testClient = new (apiClient.constructor as any)(testBaseUrl);

    try {
      await testClient.get('/protected-resource');
      assert(false, 'Should have thrown ApiError for unauthenticated protected request');
    } catch (err: any) {
      assert(err instanceof ApiError, 'Error must be instance of ApiError');
      assert(err.status === 401, `Status must be 401, got ${err.status}`);
      assert(err.isUnauthorized === true, 'isUnauthorized flag must be true');
      assert(err.message.includes('Unauthorized: Missing token'), `Unexpected message: ${err.message}`);
    }
  });

  // 4. Test: Authenticated request attaches Authorization: Bearer <token>
  await test('Authenticated request: apiClient attaches Bearer token and server requireAuth accepts it', async () => {
    setCustomTokenProvider(async () => 'mock-token:teacher-sarah');
    const testClient = new (apiClient.constructor as any)(testBaseUrl);

    const response = await testClient.get('/protected-resource');
    assert(response.success === true, 'Response must indicate success');
    assert(
      response.authHeaderReceived === 'Bearer mock-token:teacher-sarah',
      `Expected 'Bearer mock-token:teacher-sarah', received: ${response.authHeaderReceived}`
    );
    assert(response.user !== undefined, 'req.user must be attached by requireAuth');
    assert(response.user.firebaseUid === 'teacher-sarah', 'User UID must match mock token');
  });

  // 5. Test: Missing / Malformed Authorization header returns 401 from server requireAuth
  await test('Server requireAuth: Rejects requests missing Bearer scheme with 401', async () => {
    const rawRes = await fetch(`${testBaseUrl}/protected-resource`, {
      headers: {
        Authorization: 'Basic invalid-credentials',
      },
    });
    assert(rawRes.status === 401, `Expected status 401, got ${rawRes.status}`);
    const data = await rawRes.json();
    assert(data.error === 'Unauthorized: Missing token', `Expected error message, got ${data.error}`);
  });

  // 6. Test: Public request with skipAuth: true does not send token
  await test('Public endpoint with skipAuth: true succeeds without token', async () => {
    setCustomTokenProvider(async () => null);
    const testClient = new (apiClient.constructor as any)(testBaseUrl);

    const res = await testClient.get('/health', { skipAuth: true });
    assert(res.status === 'ok', 'Public request must succeed');
    assert(res.public === true, 'Response public must be true');
  });

  // Clean up
  setCustomTokenProvider(null);
  server.close();

  console.log('\n----------------------------------------------------');
  console.log(`Total Tests Run: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAuthFlowTests();
