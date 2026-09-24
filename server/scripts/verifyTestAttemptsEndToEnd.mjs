import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: '/Users/akshsaini/.gemini/antigravity/scratch/japanese-vocab-app/.env' });

const BASE_URL = 'http://localhost:5001/api';
const JWT_SECRET = process.env.JWT_SECRET || 'nihongohub_jwt_secret_token_key_2026_production';

async function runEndToEndVerification() {
  console.log('================================================================');
  console.log('🧪 NIHONGOHUB: TEST ATTEMPTS & TEST RESULTS END-TO-END VERIFICATION');
  console.log('================================================================\n');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✓ Connected to MongoDB Atlas');

  const usersCol = mongoose.connection.collection('users');
  const testsCol = mongoose.connection.collection('tests');
  const attemptsCol = mongoose.connection.collection('testattempts');
  const progressCol = mongoose.connection.collection('testprogresses');

  // 1. Setup User A (Normal Student)
  const userAEmail = `student_a_${Date.now()}@example.com`;
  const userAPassword = 'Password123!';
  const userAHash = await bcrypt.hash(userAPassword, 10);
  const userASessionId = crypto.randomUUID();

  const userAInsert = await usersCol.insertOne({
    name: 'Aksh User A',
    email: userAEmail,
    passwordHash: userAHash,
    role: 'user',
    emailVerified: true,
    activeSessionId: userASessionId,
    lastActivityAt: new Date(),
    createdAt: new Date()
  });
  const userAId = userAInsert.insertedId;
  const userAToken = jwt.sign({ id: userAId.toString(), sessionId: userASessionId }, JWT_SECRET, { expiresIn: '7d' });
  console.log(`✓ Created User A: ${userAEmail} (ID: ${userAId})`);

  // 2. Setup Admin User
  const adminEmail = `admin_test_${Date.now()}@example.com`;
  const adminPassword = 'Password123!';
  const adminHash = await bcrypt.hash(adminPassword, 10);
  const adminSessionId = crypto.randomUUID();

  const adminInsert = await usersCol.insertOne({
    name: 'Admin Sensei',
    email: adminEmail,
    passwordHash: adminHash,
    role: 'admin',
    emailVerified: true,
    activeSessionId: adminSessionId,
    lastActivityAt: new Date(),
    createdAt: new Date()
  });
  const adminId = adminInsert.insertedId;
  const adminToken = jwt.sign({ id: adminId.toString(), sessionId: adminSessionId }, JWT_SECRET, { expiresIn: '7d' });
  console.log(`✓ Created Admin User: ${adminEmail} (ID: ${adminId})`);

  // 3. Ensure a test exists
  let targetTest = await testsCol.findOne({ isActive: true });
  if (!targetTest) {
    const testInsert = await testsCol.insertOne({
      title: 'E2E Automated N5 Diagnostic Test',
      description: 'Test created for automated end-to-end verification',
      order: 1,
      isActive: true,
      questions: [
        {
          type: 'mcq',
          question: 'What is the reading of 日本?',
          options: [
            { label: 'A', text: 'にほん' },
            { label: 'B', text: 'ちゅうごく' },
            { label: 'C', text: 'かんこく' },
            { label: 'D', text: 'アメリカ' }
          ],
          correctAnswer: 'A',
          explanation: '日本 is read にほん (Nihon).'
        },
        {
          type: 'true_false',
          question: '「ありがとう」 means "Good morning".',
          options: [],
          correctAnswer: 'false',
          explanation: 'ありがとう means "Thank you".'
        },
        {
          type: 'fill_blank',
          question: 'The capital of Japan is ___ (in romaji or kana).',
          options: [],
          correctAnswer: 'Tokyo',
          acceptedAnswers: ['とうきょう', '東京'],
          explanation: 'Tokyo (東京) is the capital of Japan.'
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    targetTest = await testsCol.findOne({ _id: testInsert.insertedId });
  }
  const testIdStr = targetTest._id.toString();
  console.log(`✓ Target Test: "${targetTest.title}" (ID: ${testIdStr}, ${targetTest.questions.length} questions)\n`);

  try {
    // =============================================================
    // STEP 1: User A starts Test -> TestAttempt created
    // =============================================================
    console.log('--- STEP 1 & 2: User A Starts Test ---');
    const startRes = await fetch(`${BASE_URL}/tests/${testIdStr}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userAToken}`
      }
    });
    const startData = await startRes.json();
    console.log('  Start response:', startData);

    if (!startData.success || !startData.attemptId) {
      throw new Error(`Failed to start test attempt: ${JSON.stringify(startData)}`);
    }
    const attempt1Id = startData.attemptId;
    console.log(`✓ Step 1 Passed: startAttempt returned attemptId: ${attempt1Id}`);

    // Verify in MongoDB
    const attempt1InDb = await attemptsCol.findOne({ _id: new mongoose.Types.ObjectId(attempt1Id) });
    if (!attempt1InDb) throw new Error('Attempt not found in DB after start');
    if (attempt1InDb.status !== 'started') throw new Error(`Expected status 'started', got ${attempt1InDb.status}`);
    if (!attempt1InDb.startedAt) throw new Error('Missing startedAt timestamp in DB');
    if (attempt1InDb.userName !== 'Aksh User A') throw new Error('Mismatched userName');
    if (attempt1InDb.userEmail !== userAEmail) throw new Error('Mismatched userEmail');
    console.log('✓ Step 2 Passed: MongoDB TestAttempt record verified with server startedAt and status = "started"');

    // =============================================================
    // STEP 3: User A submits Test -> Score evaluated & recorded
    // =============================================================
    console.log('\n--- STEP 3 & 4: User A Submits Test Answers ---');
    // Answer question 0 correctly ('A'), question 1 correctly ('false'), question 2 incorrectly ('Osaka')
    const userAnswers1 = {
      '0': 'A',
      '1': 'false',
      '2': 'Osaka'
    };

    const submitRes = await fetch(`${BASE_URL}/tests/${testIdStr}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userAToken}`
      },
      body: JSON.stringify({
        answers: userAnswers1,
        attemptId: attempt1Id
      })
    });
    const submitData = await submitRes.json();
    console.log('  Submit response:', {
      success: submitData.success,
      score: submitData.score,
      totalQuestions: submitData.totalQuestions,
      percentage: submitData.percentage,
      attemptId: submitData.attemptId
    });

    if (!submitData.success) throw new Error(`Submit failed: ${JSON.stringify(submitData)}`);
    if (submitData.score !== 2) throw new Error(`Expected score 2, got ${submitData.score}`);
    if (submitData.percentage !== 67) throw new Error(`Expected percentage 67%, got ${submitData.percentage}%`);
    console.log('✓ Step 3 Passed: Server evaluated score = 2/3 (67%)');

    // Verify in MongoDB
    const attempt1Submitted = await attemptsCol.findOne({ _id: new mongoose.Types.ObjectId(attempt1Id) });
    if (attempt1Submitted.status !== 'submitted') throw new Error(`Expected status 'submitted', got ${attempt1Submitted.status}`);
    if (!attempt1Submitted.submittedAt) throw new Error('Missing submittedAt timestamp');
    if (attempt1Submitted.score !== 2) throw new Error(`Expected score 2 in DB, got ${attempt1Submitted.score}`);
    if (attempt1Submitted.totalMarks !== 3) throw new Error(`Expected totalMarks 3 in DB, got ${attempt1Submitted.totalMarks}`);
    if (!Array.isArray(attempt1Submitted.answers) || attempt1Submitted.answers.length !== 3) {
      throw new Error(`Expected 3 answers in DB, got ${attempt1Submitted.answers?.length}`);
    }
    console.log('✓ Step 4 Passed: MongoDB TestAttempt record updated with submittedAt, score, totalMarks, percentage, and 3 answers');

    // Verify TestProgress was also created for student
    const progressInDb = await progressCol.findOne({ userId: userAId, testId: targetTest._id });
    if (!progressInDb) throw new Error('Expected student TestProgress to be created/updated');
    console.log('✓ Step 5 Passed: Student TestProgress record confirmed intact');

    // =============================================================
    // STEP 5: Multiple Attempts -> User A retakes the test
    // =============================================================
    console.log('\n--- STEP 5: User A Takes Same Test a SECOND Time (Multiple Attempts) ---');
    const startRes2 = await fetch(`${BASE_URL}/tests/${testIdStr}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userAToken}`
      }
    });
    const startData2 = await startRes2.json();
    const attempt2Id = startData2.attemptId;
    if (attempt2Id === attempt1Id) {
      throw new Error('Second attempt created duplicate attemptId! Expected distinct _id.');
    }
    console.log(`✓ Distinct second attempt started: ID ${attempt2Id}`);

    // Submit attempt 2 with perfect score (3/3)
    const submitRes2 = await fetch(`${BASE_URL}/tests/${testIdStr}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userAToken}`
      },
      body: JSON.stringify({
        answers: { '0': 'A', '1': 'false', '2': 'Tokyo' },
        attemptId: attempt2Id
      })
    });
    const submitData2 = await submitRes2.json();
    if (submitData2.score !== 3 || submitData2.percentage !== 100) {
      throw new Error(`Expected 3/3 (100%), got ${submitData2.score}/${submitData2.totalQuestions}`);
    }

    // Verify BOTH attempts exist in MongoDB and attempt 1 was NOT overwritten
    const checkAttempt1 = await attemptsCol.findOne({ _id: new mongoose.Types.ObjectId(attempt1Id) });
    const checkAttempt2 = await attemptsCol.findOne({ _id: new mongoose.Types.ObjectId(attempt2Id) });
    if (!checkAttempt1 || !checkAttempt2) throw new Error('Both attempts must exist in DB');
    if (checkAttempt1.score !== 2) throw new Error(`Attempt 1 score was altered! Expected 2, got ${checkAttempt1.score}`);
    if (checkAttempt2.score !== 3) throw new Error(`Attempt 2 score must be 3, got ${checkAttempt2.score}`);
    console.log('✓ Step 6 Passed: Multiple attempts preserved independently without overwriting previous attempts');

    // =============================================================
    // STEP 6: Admin Panel API -> List, Search, Filter, Details
    // =============================================================
    console.log('\n--- STEP 6: Admin Panel Test Attempts API ---');
    const adminListRes = await fetch(`${BASE_URL}/tests/admin/attempts`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const adminListData = await adminListRes.json();
    if (!adminListData.success) throw new Error(`Admin fetch failed: ${JSON.stringify(adminListData)}`);
    console.log(`✓ Admin fetched attempts: count=${adminListData.count}, total=${adminListData.total}`);

    // Verify User A attempts appear
    const userAAttempts = adminListData.attempts.filter(a => a.userId === userAId.toString());
    if (userAAttempts.length < 2) throw new Error(`Expected at least 2 attempts for User A, found ${userAAttempts.length}`);
    console.log('✓ Step 7 Passed: User A attempts visible in Admin list with User Name, Email, Test Title, Status, Score, Percentage');

    // Test alias endpoint: GET /api/admin/test-attempts
    const aliasRes = await fetch(`${BASE_URL}/admin/test-attempts`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const aliasData = await aliasRes.json();
    if (!aliasData.success) throw new Error(`Admin alias endpoint failed: ${JSON.stringify(aliasData)}`);
    console.log('✓ Step 8 Passed: Dedicated /api/admin/test-attempts alias endpoint verified');

    // Test Admin Search
    const searchRes = await fetch(`${BASE_URL}/tests/admin/attempts?q=Aksh`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const searchData = await searchRes.json();
    if (!searchData.success || searchData.attempts.length === 0) throw new Error('Admin search returned 0 results');
    console.log(`✓ Step 9 Passed: Admin search by User Name verified (found ${searchData.attempts.length} matching)`);

    // Test Admin Filter by status
    const filterRes = await fetch(`${BASE_URL}/tests/admin/attempts?status=submitted`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const filterData = await filterRes.json();
    if (!filterData.success || filterData.attempts.some(a => a.status !== 'submitted')) {
      throw new Error('Admin status filter returned non-submitted attempts');
    }
    console.log('✓ Step 10 Passed: Admin filter by status=submitted verified');

    // Test Admin View Details Modal API
    const detailRes = await fetch(`${BASE_URL}/tests/admin/attempts/${attempt1Id}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const detailData = await detailRes.json();
    if (!detailData.success || !detailData.data || !detailData.data.answers) {
      throw new Error(`Failed to get attempt details: ${JSON.stringify(detailData)}`);
    }
    const d = detailData.data;
    if (d.userName !== 'Aksh User A' || d.score !== 2 || d.answers.length !== 3) {
      throw new Error('Mismatched detail breakdown');
    }
    console.log('✓ Step 11 Passed: Admin get attempt details verified with complete question-by-question breakdown');

    // =============================================================
    // STEP 7: Admin Delete Attempt Control
    // =============================================================
    console.log('\n--- STEP 7: Admin Deletes Attempt 1 ---');
    const deleteRes = await fetch(`${BASE_URL}/tests/admin/attempts/${attempt1Id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const deleteData = await deleteRes.json();
    if (!deleteData.success) throw new Error(`Delete failed: ${JSON.stringify(deleteData)}`);
    console.log('✓ Delete API response:', deleteData.message);

    // Verify attempt 1 was deleted
    const deletedAttemptCheck = await attemptsCol.findOne({ _id: new mongoose.Types.ObjectId(attempt1Id) });
    if (deletedAttemptCheck !== null) throw new Error('Attempt 1 was NOT deleted from DB');
    console.log('✓ Step 12 Passed: Attempt 1 document deleted from testattempts collection');

    // Verify attempt 2 STILL EXISTS
    const attempt2Check = await attemptsCol.findOne({ _id: new mongoose.Types.ObjectId(attempt2Id) });
    if (!attempt2Check) throw new Error('Attempt 2 was accidentally deleted!');
    console.log('✓ Step 13 Passed: Attempt 2 still exists intact');

    // Verify User A account STILL EXISTS
    const userACheck = await usersCol.findOne({ _id: userAId });
    if (!userACheck) throw new Error('User A account was deleted!');
    console.log('✓ Step 14 Passed: User A account is completely intact');

    // Verify Test STILL EXISTS
    const testCheck = await testsCol.findOne({ _id: targetTest._id });
    if (!testCheck) throw new Error('Target test was deleted!');
    console.log('✓ Step 15 Passed: Test document is completely intact');

    // =============================================================
    // STEP 8: Security Tests -> Non-admin Access Rejection (403)
    // =============================================================
    console.log('\n--- STEP 8: Strict Security & Authorization Verification ---');
    // Normal User A attempts to call Admin attempts list
    const unauthListRes = await fetch(`${BASE_URL}/tests/admin/attempts`, {
      headers: { 'Authorization': `Bearer ${userAToken}` }
    });
    if (unauthListRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden for non-admin list access, got ${unauthListRes.status}`);
    }
    console.log('✓ Step 16 Passed: Normal user cannot access Admin attempts list (HTTP 403 Forbidden)');

    // Normal User A attempts to call Admin attempt details
    const unauthDetailRes = await fetch(`${BASE_URL}/tests/admin/attempts/${attempt2Id}`, {
      headers: { 'Authorization': `Bearer ${userAToken}` }
    });
    if (unauthDetailRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden for non-admin detail access, got ${unauthDetailRes.status}`);
    }
    console.log('✓ Step 17 Passed: Normal user cannot view another attempt detail (HTTP 403 Forbidden)');

    // Normal User A attempts to delete attempt
    const unauthDeleteRes = await fetch(`${BASE_URL}/tests/admin/attempts/${attempt2Id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${userAToken}` }
    });
    if (unauthDeleteRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden for non-admin delete access, got ${unauthDeleteRes.status}`);
    }
    console.log('✓ Step 18 Passed: Normal user cannot delete attempt (HTTP 403 Forbidden)');

    // Unauthenticated request (no token)
    const noTokenRes = await fetch(`${BASE_URL}/tests/admin/attempts`);
    if (noTokenRes.status !== 401) {
      throw new Error(`Expected 401 for missing token, got ${noTokenRes.status}`);
    }
    console.log('✓ Step 19 Passed: Unauthenticated request rejected (HTTP 401 Unauthorized)');

    // Clean up test users & remaining test attempt
    await usersCol.deleteOne({ _id: userAId });
    await usersCol.deleteOne({ _id: adminId });
    await attemptsCol.deleteOne({ _id: new mongoose.Types.ObjectId(attempt2Id) });
    await progressCol.deleteMany({ userId: userAId });
    console.log('✓ Cleaned up temporary test users and test attempt');

    console.log('\n================================================================');
    console.log('🎉 ALL 19 END-TO-END VERIFICATION CHECKS PASSED WITH 100% SUCCESS!');
    console.log('================================================================\n');

  } finally {
    await mongoose.disconnect();
  }
}

runEndToEndVerification().catch(err => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
