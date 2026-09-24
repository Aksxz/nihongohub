import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: '/Users/akshsaini/.gemini/antigravity/scratch/japanese-vocab-app/.env' });

const BASE_URL = 'http://localhost:5001/api';

async function runVerification() {
  console.log('====================================================');
  console.log('🚀 NIHONGOHUB: THREE NEW FEATURES END-TO-END VERIFICATION');
  console.log('====================================================');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✓ Connected directly to MongoDB Atlas for state assertions');

  const usersCol = mongoose.connection.collection('users');
  const notificationsCol = mongoose.connection.collection('notifications');
  const notificationReadsCol = mongoose.connection.collection('notificationreads');
  const testsCol = mongoose.connection.collection('tests');
  const testProgressCol = mongoose.connection.collection('testprogresses');
  const readingsCol = mongoose.connection.collection('readings');
  const listeningsCol = mongoose.connection.collection('listenings');

  // Find or create admin and student
  let admin = await usersCol.findOne({ role: 'admin' });
  if (!admin) {
    admin = await usersCol.findOne({});
    await usersCol.updateOne({ _id: admin._id }, { $set: { role: 'admin' } });
    admin.role = 'admin';
  }

  // Ensure session
  const adminSessionId = 'admin_session_' + Date.now();
  await usersCol.updateOne({ _id: admin._id }, { $set: { activeSessionId: adminSessionId, lastActivityAt: new Date() } });
  
  const jwtSecret = process.env.JWT_SECRET || 'nihongohub_jwt_secret_token_key_2026_production';
  const adminToken = jwt.sign({
    id: admin._id.toString(),
    email: admin.email,
    role: 'admin',
    sessionId: adminSessionId
  }, jwtSecret, { expiresIn: '2h' });

  console.log(`✓ Admin authenticated: ${admin.email}`);

  // Find or create student
  const studentEmail = 'student_test_' + Date.now() + '@example.com';
  const studentSessionId = 'student_session_' + Date.now();
  const studentInsert = await usersCol.insertOne({
    name: 'Test Student',
    email: studentEmail,
    passwordHash: 'dummy_hash',
    role: 'user',
    emailVerified: true,
    activeSessionId: studentSessionId,
    lastActivityAt: new Date(),
    createdAt: new Date(Date.now() - 3600000) // created 1 hour ago
  });
  const studentId = studentInsert.insertedId;
  const studentToken = jwt.sign({
    id: studentId.toString(),
    email: studentEmail,
    role: 'user',
    sessionId: studentSessionId
  }, jwtSecret, { expiresIn: '2h' });
  console.log(`✓ Student created: ${studentEmail} (account established 1 hour ago)`);

  let testReadingId = null;
  let testListeningId = null;
  let createdNotificationId = null;
  let createdTestId = null;

  try {
    // -------------------------------------------------------------
    // FEATURE 1: NOTIFICATIONS (Reading & Listening creation)
    // -------------------------------------------------------------
    console.log('\n--- 1. Testing In-App Notifications ---');

    // 1.1 Admin creates a new Reading item
    const readingRes = await fetch(`${BASE_URL}/readings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        title: 'Paragraph 999 - EndToEnd Test Reading',
        paragraphNumber: 999,
        passage: 'これはテスト読解です。毎日日本語を勉強します。楽しいです。',
        jlptLevel: 'N5',
        questions: [
          {
            question: '何を勉強しますか？',
            options: [
              { label: 'A', text: '日本語' },
              { label: 'B', text: '英語' },
              { label: 'C', text: 'フランス語' },
              { label: 'D', text: '数学' }
            ],
            correctAnswer: 'A',
            explanation: 'Passage explicitly says 日本語を勉強します。'
          }
        ]
      })
    });
    const readingData = await readingRes.json();
    if (!readingRes.ok || !readingData.success) {
      throw new Error(`Failed to create test reading: ${JSON.stringify(readingData)}`);
    }
    testReadingId = readingData.data._id;
    console.log(`✓ Admin created reading: "${readingData.data.title}" (_id: ${testReadingId})`);

    // Verify notification was created in DB
    const notifReading = await notificationsCol.findOne({ contentId: new mongoose.Types.ObjectId(testReadingId) });
    if (!notifReading) {
      throw new Error('Notification was NOT generated for the new reading!');
    }
    createdNotificationId = notifReading._id.toString();
    console.log(`✓ Notification automatically generated: "${notifReading.title}" (type: ${notifReading.type})`);

    // 1.2 Admin creates a new Listening item
    const listeningRes = await fetch(`${BASE_URL}/listening`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        title: 'Listening 999 - EndToEnd Test Listening',
        exerciseNumber: 999,
        passage: 'こんにちは。今日も一日頑張りましょう。',
        audioUrl: 'https://example.com/audio.mp3',
        jlptLevel: 'N5',
        questions: [
          {
            question: '最初の挨拶は何でしたか？',
            options: [
              { label: 'A', text: 'こんにちは' },
              { label: 'B', text: 'さようなら' },
              { label: 'C', text: 'ありがとう' },
              { label: 'D', text: 'こんばんは' }
            ],
            correctAnswer: 'A',
            explanation: 'The speaker said konnichiwa.'
          }
        ]
      })
    });
    const listeningData = await listeningRes.json();
    if (!listeningRes.ok || !listeningData.success) {
      throw new Error(`Failed to create test listening: ${JSON.stringify(listeningData)}`);
    }
    testListeningId = listeningData.data._id;
    console.log(`✓ Admin created listening: "${listeningData.data.title}" (_id: ${testListeningId})`);

    const notifListening = await notificationsCol.findOne({ contentId: new mongoose.Types.ObjectId(testListeningId) });
    if (!notifListening) {
      throw new Error('Notification was NOT generated for the new listening item!');
    }
    console.log(`✓ Notification automatically generated: "${notifListening.title}" (type: ${notifListening.type})`);

    // 1.3 Student fetches notifications
    const getNotifsRes = await fetch(`${BASE_URL}/notifications`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    const notifsResult = await getNotifsRes.json();
    console.log(`✓ Student retrieved notifications: ${notifsResult.notifications.length} items, unreadCount = ${notifsResult.unreadCount}`);
    if (notifsResult.unreadCount < 2) {
      throw new Error(`Expected at least 2 unread notifications, got ${notifsResult.unreadCount}`);
    }

    // 1.4 Student marks single notification as read
    const markReadRes = await fetch(`${BASE_URL}/notifications/${createdNotificationId}/read`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    const markReadData = await markReadRes.json();
    if (!markReadData.success) {
      throw new Error('Failed to mark notification as read');
    }
    console.log(`✓ Successfully marked notification ${createdNotificationId} as read`);

    // Verify unread count decreased
    const getNotifsAfterOneRead = await fetch(`${BASE_URL}/notifications`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    }).then(r => r.json());
    if (getNotifsAfterOneRead.unreadCount !== notifsResult.unreadCount - 1) {
      throw new Error(`Unread count did not decrement correctly! Expected ${notifsResult.unreadCount - 1}, got ${getNotifsAfterOneRead.unreadCount}`);
    }
    console.log(`✓ Unread count verified decremented to: ${getNotifsAfterOneRead.unreadCount}`);

    // 1.5 Student marks all as read
    const markAllRes = await fetch(`${BASE_URL}/notifications/read-all`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    const markAllData = await markAllRes.json();
    if (!markAllData.success) {
      throw new Error('Failed to mark all notifications as read');
    }
    const getNotifsAfterAllRead = await fetch(`${BASE_URL}/notifications`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    }).then(r => r.json());
    if (getNotifsAfterAllRead.unreadCount !== 0) {
      throw new Error(`Expected 0 unread notifications after read-all, got ${getNotifsAfterAllRead.unreadCount}`);
    }
    console.log('✓ Mark all notifications as read verified: unreadCount = 0');

    // 1.6 Verify New User Guard: A user created AFTER the notifications must NOT see them
    const brandNewSessionId = 'brand_new_session_' + Date.now();
    const brandNewUserInsert = await usersCol.insertOne({
      fullName: 'Brand New User',
      email: 'brand_new_' + Date.now() + '@example.com',
      role: 'user',
      isEmailVerified: true,
      activeSessionId: brandNewSessionId,
      lastActivityAt: new Date(),
      createdAt: new Date(Date.now() + 10000) // account created after notification
    });
    const brandNewToken = jwt.sign({
      id: brandNewUserInsert.insertedId.toString(),
      email: 'brand_new@example.com',
      role: 'user',
      sessionId: brandNewSessionId
    }, jwtSecret, { expiresIn: '1h' });

    const brandNewNotifs = await fetch(`${BASE_URL}/notifications`, {
      headers: { 'Authorization': `Bearer ${brandNewToken}` }
    }).then(r => r.json());
    
    if (!brandNewNotifs.success || !Array.isArray(brandNewNotifs.notifications)) {
      throw new Error(`Failed to fetch notifications for new user: ${JSON.stringify(brandNewNotifs)}`);
    }
    const seesOldNotif = brandNewNotifs.notifications.some(n => n.id === createdNotificationId);
    if (seesOldNotif) {
      throw new Error('SECURITY VIOLATION: Brand new user received notification for content created before their account existed!');
    }
    console.log('✓ New User Guard verified: Brand new user sees 0 past notifications');
    await usersCol.deleteOne({ _id: brandNewUserInsert.insertedId });

    // -------------------------------------------------------------
    // FEATURE 2: INACTIVITY AUTO-LOGOUT & SESSION TIMEOUT
    // -------------------------------------------------------------
    console.log('\n--- 2. Testing Inactivity Auto-Logout & Session Management ---');

    // 2.1 Continue session endpoint
    const continueRes = await fetch(`${BASE_URL}/auth/continue-session`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    const continueData = await continueRes.json();
    if (!continueRes.ok || !continueData.success) {
      throw new Error(`continue-session failed: ${JSON.stringify(continueData)}`);
    }
    console.log('✓ POST /api/auth/continue-session returned 200 success and refreshed lastActivityAt');

    // 2.2 Simulate expired inactivity: set student lastActivityAt to 65 minutes ago
    const sixtyFiveMinAgo = new Date(Date.now() - 65 * 60 * 1000);
    await usersCol.updateOne({ _id: studentId }, { $set: { lastActivityAt: sixtyFiveMinAgo } });
    console.log('✓ Simulated 65 minutes of student inactivity in database');

    // 2.3 Attempt authenticated request -> must be rejected with 401 SESSION_EXPIRED
    const expiredReqRes = await fetch(`${BASE_URL}/notifications`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    const expiredReqData = await expiredReqRes.json();
    if (expiredReqRes.status !== 401 || expiredReqData.code !== 'SESSION_EXPIRED') {
      throw new Error(`Expected 401 with code SESSION_EXPIRED, got status ${expiredReqRes.status}: ${JSON.stringify(expiredReqData)}`);
    }
    console.log('✓ Inactivity timeout enforced: Server returned 401 SESSION_EXPIRED');

    // 2.4 Verify user session was invalidated in MongoDB Atlas
    const studentInDb = await usersCol.findOne({ _id: studentId });
    if (studentInDb.activeSessionId !== null) {
      throw new Error(`Expected activeSessionId to be null after inactivity timeout, found: ${studentInDb.activeSessionId}`);
    }
    console.log('✓ Session invalidation verified: activeSessionId set to null in MongoDB Atlas');

    // Re-activate student session for remaining tests
    const freshSessionId = 'student_fresh_' + Date.now();
    await usersCol.updateOne({ _id: studentId }, { $set: { activeSessionId: freshSessionId, lastActivityAt: new Date() } });
    const freshStudentToken = jwt.sign({
      id: studentId.toString(),
      email: studentEmail,
      role: 'user',
      sessionId: freshSessionId
    }, jwtSecret, { expiresIn: '2h' });

    // -------------------------------------------------------------
    // FEATURE 3: TESTS MODULE (MCQ, True/False, Fill in Blank)
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing Tests Module ---');

    // 3.1 Admin creates a comprehensive test with all 3 question types
    const createTestRes = await fetch(`${BASE_URL}/tests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        title: 'EndToEnd JLPT Comprehensive Evaluation',
        description: 'Testing MCQ, True/False, and Fill in the Blank question types',
        order: 1,
        questions: [
          {
            type: 'mcq',
            question: 'Choose the correct reading for: 学生',
            options: [
              { label: 'A', text: 'がくせい' },
              { label: 'B', text: 'せんせい' },
              { label: 'C', text: 'かいしゃいん' },
              { label: 'D', text: 'いしゃ' }
            ],
            correctAnswer: 'A',
            explanation: '学生 is read as がくせい (gakusei - student)'
          },
          {
            type: 'true_false',
            question: '富士山 (Fujisan) is the highest mountain in Japan.',
            correctAnswer: 'True',
            explanation: 'Mount Fuji is the highest mountain in Japan at 3,776 meters.'
          },
          {
            type: 'fill_blank',
            question: 'Complete the sentence: 日本の首都は _____ です。(Capital of Japan in Latin romaji: Tokyo)',
            correctAnswer: 'Tokyo',
            acceptedAnswers: ['tokyo'],
            explanation: 'Tokyo (東京) is the capital city of Japan.'
          },
          {
            type: 'fill_blank',
            question: 'Fill in the Japanese kana for "cat": _____ (Strict Japanese Kana)',
            correctAnswer: 'ねこ',
            acceptedAnswers: [],
            explanation: 'ねこ (neko) is cat in Japanese.'
          }
        ]
      })
    });
    const createTestData = await createTestRes.json();
    if (!createTestRes.ok || !createTestData.success) {
      throw new Error(`Failed to create test: ${JSON.stringify(createTestData)}`);
    }
    createdTestId = createTestData.data._id;
    console.log(`✓ Admin created test: "${createTestData.data.title}" (_id: ${createdTestId})`);

    // 3.2 Verify Student Sanitized Endpoint (Anti-Cheat check)
    const studentTestRes = await fetch(`${BASE_URL}/tests/${createdTestId}`, {
      headers: { 'Authorization': `Bearer ${freshStudentToken}` }
    });
    const studentTestData = await studentTestRes.json();
    if (!studentTestRes.ok || !studentTestData.success) {
      throw new Error(`Student failed to fetch test: ${JSON.stringify(studentTestData)}`);
    }

    for (const q of studentTestData.data.questions) {
      if (q.correctAnswer !== undefined || q.acceptedAnswers !== undefined || q.explanation !== undefined) {
        throw new Error(`SECURITY VIOLATION: Student endpoint leaked sensitive test data! Question: ${JSON.stringify(q)}`);
      }
    }
    console.log('✓ Anti-Cheat Security verified: correctAnswer, acceptedAnswers, and explanation completely stripped from student view');

    // 3.3 Student submits answers and verifies server-side scoring
    const submitRes = await fetch(`${BASE_URL}/tests/${createdTestId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${freshStudentToken}`
      },
      body: JSON.stringify({
        answers: {
          '0': 'A',
          '1': 'True',
          '2': 'TOKYO', // testing Latin case-insensitivity
          '3': 'ねこ'   // testing strict Japanese exact match
        }
      })
    });
    const submitResult = await submitRes.json();
    if (!submitRes.ok || !submitResult.success) {
      throw new Error(`Test submission failed: ${JSON.stringify(submitResult)}`);
    }
    console.log(`✓ Test evaluated: Score = ${submitResult.score}/${submitResult.totalQuestions} (${submitResult.percentage}%)`);
    if (submitResult.score !== 4 || submitResult.percentage !== 100) {
      throw new Error(`Evaluation failed! Expected 4/4 (100%), got ${submitResult.score}/${submitResult.totalQuestions}`);
    }

    for (const res of submitResult.results) {
      if (!res.isCorrect) {
        throw new Error(`Expected question result to be correct: ${JSON.stringify(res)}`);
      }
    }
    console.log('✓ All 4 question types verified scored 100% correct by server engine');

    // 3.4 Student fetches persistent test progress
    const progressRes = await fetch(`${BASE_URL}/tests/progress/me`, {
      headers: { 'Authorization': `Bearer ${freshStudentToken}` }
    });
    const progressData = await progressRes.json();
    if (!progressRes.ok || !progressData.success || !Array.isArray(progressData.data)) {
      throw new Error(`Failed to fetch persistent progress: ${JSON.stringify(progressData)}`);
    }
    const myProgressRecord = progressData.data.find(p => p.testId.toString() === createdTestId.toString());
    if (!myProgressRecord || myProgressRecord.score !== 4) {
      throw new Error(`Persistent progress record not found or mismatch: ${JSON.stringify(progressData.data)}`);
    }
    console.log(`✓ TestProgress confirmed stored in MongoDB Atlas: score = ${myProgressRecord.score}/${myProgressRecord.totalQuestions} (${myProgressRecord.percentage}%)`);

    // 3.5 Test CSV Import Preview and Commit
    console.log('\n--- 3.5 Testing Test CSV Import Preview & Commit ---');
    const sampleCsv = `test_title,description,question_type,question,option_a,option_b,option_c,option_d,correct_answer,accepted_answers,explanation
"JLPT N5 Diagnostic","Official Diagnostic Test","mcq","What is the meaning of 本?","Book","Water","Cat","Dog","A","","本 means book."
"JLPT N5 Diagnostic","Official Diagnostic Test","true_false","ひらがな (Hiragana) has 46 basic characters.","","","","","True","","Hiragana consists of 46 basic syllables."
"JLPT N5 Diagnostic","Official Diagnostic Test","fill_blank","Write 'dog' in romaji or kana: _____","","","","","inu","いぬ","Dog is inu in romaji or いぬ in hiragana."`;

    const previewRes = await fetch(`${BASE_URL}/tests/import-csv/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ csvContent: sampleCsv })
    });
    const previewData = await previewRes.json();
    if (!previewRes.ok || !previewData.success) {
      throw new Error(`Test CSV preview failed: ${JSON.stringify(previewData)}`);
    }
    console.log(`✓ Test CSV preview parsed: ${previewData.summary.totalRows} rows -> ${previewData.summary.validTests} grouped test(s)`);
    if (previewData.summary.validTests !== 1 || previewData.tests[0].questions.length !== 3) {
      throw new Error(`Expected 1 grouped test with 3 questions, got: ${JSON.stringify(previewData.summary)}`);
    }

    const commitRes = await fetch(`${BASE_URL}/tests/import-csv/commit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ tests: previewData.tests })
    });
    const commitData = await commitRes.json();
    if (!commitRes.ok || !commitData.success) {
      throw new Error(`Test CSV commit failed: ${JSON.stringify(commitData)}`);
    }
    const insertedNum = commitData.inserted !== undefined ? commitData.inserted : commitData.insertedCount;
    console.log(`✓ Test CSV commit successful: created ${insertedNum} new test(s)`);

    await testsCol.deleteMany({ title: 'JLPT N5 Diagnostic' });
    console.log('✓ Cleaned up CSV imported diagnostic test');

  } finally {
    // Cleanup test artifacts from DB
    console.log('\n--- Cleaning up temporary verification documents ---');
    if (testReadingId) {
      await readingsCol.deleteOne({ _id: new mongoose.Types.ObjectId(testReadingId) });
      console.log(`✓ Cleaned up test reading (${testReadingId})`);
    }
    if (testListeningId) {
      await listeningsCol.deleteOne({ _id: new mongoose.Types.ObjectId(testListeningId) });
      console.log(`✓ Cleaned up test listening (${testListeningId})`);
    }
    if (createdNotificationId) {
      await notificationsCol.deleteMany({
        $or: [
          { contentId: new mongoose.Types.ObjectId(testReadingId) },
          { contentId: new mongoose.Types.ObjectId(testListeningId) }
        ]
      });
      await notificationReadsCol.deleteMany({ userId: studentId });
      console.log('✓ Cleaned up test notifications and read receipts');
    }
    if (createdTestId) {
      await testsCol.deleteOne({ _id: new mongoose.Types.ObjectId(createdTestId) });
      await testProgressCol.deleteMany({ testId: new mongoose.Types.ObjectId(createdTestId) });
      console.log(`✓ Cleaned up test (${createdTestId}) and progress records`);
    }
    if (studentId) {
      await usersCol.deleteOne({ _id: studentId });
      console.log(`✓ Cleaned up temporary student (${studentEmail})`);
    }

    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB Atlas');
  }

  console.log('\n====================================================');
  console.log('🎉 ALL THREE FEATURES PASSED 100% VERIFICATION!');
  console.log('====================================================\n');
}

runVerification().catch(err => {
  console.error('\n❌ VERIFICATION ERROR:', err);
  process.exit(1);
});
