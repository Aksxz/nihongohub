import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '/Users/akshsaini/.gemini/antigravity/scratch/japanese-vocab-app/.env' });

const BASE_URL = 'http://localhost:5001/api';

async function runSuite() {
  console.log('====================================================');
  console.log('🧪 NIHONGOHUB PATTERNS & READING VERIFICATION SUITE');
  console.log('====================================================');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✓ Connected to MongoDB Atlas');

  // 1. Find or create an admin user & regular user
  const adminUser = await mongoose.connection.collection('users').findOne({ role: 'admin' });
  const regularUser = await mongoose.connection.collection('users').findOne({ role: 'user' });

  if (!adminUser) {
    throw new Error('No admin user found in database to execute admin routes');
  }
  if (!regularUser) {
    throw new Error('No regular user found in database to execute student routes');
  }

  const secret = process.env.JWT_SECRET || 'nihongohub_jwt_secret_token_key_2026_production';
  const adminToken = jwt.sign(
    { id: adminUser._id.toString(), email: adminUser.email, role: 'admin', sessionId: adminUser.activeSessionId || 'admin_test_session' },
    secret,
    { expiresIn: '1h' }
  );
  const userToken = jwt.sign(
    { id: regularUser._id.toString(), email: regularUser.email, role: 'user', sessionId: regularUser.activeSessionId || 'user_test_session' },
    secret,
    { expiresIn: '1h' }
  );

  console.log(`✓ Admin user: ${adminUser.email}`);
  console.log(`✓ Regular user: ${regularUser.email}`);

  // ==========================================
  // TEST 1: PATTERNS MODULE (CHAPTER-WISE)
  // ==========================================
  console.log('\n--- 1. Testing Patterns Module (Chapter-wise) ---');

  // A. Create Chapter 14 Pattern
  const ch14PatternPayload = {
    title: '〜てください (Test Pattern)',
    formula: 'V [て-form] + ください',
    meaning: 'Please do (polite request)',
    usage: 'Used to politely ask someone to do something.',
    jlptLevel: 'N5',
    destinationType: 'chapter',
    chapter: 14,
    order: 1,
    examples: [
      {
        japanese: 'ちょっと まって ください。',
        reading: 'ちょっと まって ください。',
        english: 'Please wait a moment.'
      }
    ]
  };

  const createPatRes = await fetch(`${BASE_URL}/patterns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify(ch14PatternPayload)
  }).then(r => r.json());

  if (!createPatRes.success || !createPatRes.data?._id) {
    throw new Error(`Failed to create pattern: ${JSON.stringify(createPatRes)}`);
  }
  const createdPatternId = createPatRes.data._id;
  console.log(`✓ Admin successfully created Pattern for Chapter 14 (ID: ${createdPatternId})`);

  // B. Query Patterns for Chapter 14
  const getPatRes = await fetch(`${BASE_URL}/patterns?chapter=14`).then(r => r.json());
  if (!getPatRes.success || !getPatRes.data.some(p => p._id === createdPatternId)) {
    throw new Error('Created pattern not found in GET /api/patterns?chapter=14');
  }
  console.log(`✓ GET /api/patterns?chapter=14 returns created pattern (Total in ch14: ${getPatRes.count})`);

  // C. Query Chapter Aggregate List
  const chaptersRes = await fetch(`${BASE_URL}/patterns/chapters`).then(r => r.json());
  if (!chaptersRes.success) {
    throw new Error('GET /api/patterns/chapters failed');
  }
  const ch14Item = chaptersRes.data.find(c => c.type === 'standard' && c.chapter === 14);
  if (!ch14Item || ch14Item.count < 1) {
    throw new Error('Chapter 14 aggregate count missing in /api/patterns/chapters');
  }
  console.log(`✓ GET /api/patterns/chapters accurately aggregates standard chapters (Chapter 14 count: ${ch14Item.count})`);

  // D. Update Pattern
  const updatePatRes = await fetch(`${BASE_URL}/patterns/${createdPatternId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ meaning: 'Please do (polite request updated)' })
  }).then(r => r.json());

  if (!updatePatRes.success || updatePatRes.data.meaning !== 'Please do (polite request updated)') {
    throw new Error('Failed to update pattern');
  }
  console.log('✓ Admin successfully updated Pattern details');

  // ==========================================
  // TEST 2: READING MODULE (PARAGRAPH-WISE)
  // ==========================================
  console.log('\n--- 2. Testing Reading Module (Paragraph-wise & MCQs) ---');

  // A. Admin creates Reading passage with 5 MCQs
  const testReadingPayload = {
    paragraphNumber: 999, // Test paragraph
    title: 'わたしの あたらしい ともだち (My New Friend)',
    passage: 'きのう、がっこうで あたらしい ともだちが できました。なまえは たなかさんです。たなかさんは にほんごが とても じょうずです。わたしたちは いっしょに としょかんで べんきょうしました。とても たのしかったです。',
    jlptLevel: 'N5',
    order: 999,
    questions: [
      {
        question: 'たなかさんは だれですか。',
        options: [
          { label: 'A', text: 'せんせい' },
          { label: 'B', text: 'あたらしい ともだち' },
          { label: 'C', text: 'としょかんの ひと' },
          { label: 'D', text: 'かぞく' }
        ],
        correctAnswer: 'B',
        explanation: 'The passage explicitly says: "あたらしい ともだちが できました。なまえは たなかさんです。"'
      },
      {
        question: 'ふたりは どこで べんきょうしましたか。',
        options: [
          { label: 'A', text: 'きょうしつ' },
          { label: 'B', text: 'へや' },
          { label: 'C', text: 'としょかん' },
          { label: 'D', text: 'カフェ' }
        ],
        correctAnswer: 'C',
        explanation: 'The passage says: "わたしたちは いっしょに としょかんで べんきょうしました。"'
      },
      {
        question: 'たなかさんは なにが じょうずですか。',
        options: [
          { label: 'A', text: 'にほんご' },
          { label: 'B', text: 'スポーツ' },
          { label: 'C', text: 'りょうり' },
          { label: 'D', text: 'うた' }
        ],
        correctAnswer: 'A',
        explanation: 'The passage says: "たなかさんは にほんごが とても じょうずです。"'
      },
      {
        question: 'いつ ともだちが できましたか。',
        options: [
          { label: 'A', text: 'きょう' },
          { label: 'B', text: 'あした' },
          { label: 'C', text: 'きのう' },
          { label: 'D', text: 'せんしゅう' }
        ],
        correctAnswer: 'C',
        explanation: 'The passage begins with: "きのう、がっこうで あたらしい ともだちが できました。"'
      },
      {
        question: 'べんきょうは どうでしたか。',
        options: [
          { label: 'A', text: 'とても たのしかった' },
          { label: 'B', text: 'むずかしかった' },
          { label: 'C', text: 'つまらなかった' },
          { label: 'D', text: 'いそがしかった' }
        ],
        correctAnswer: 'A',
        explanation: 'The passage concludes with: "とても たのしかったです。"'
      }
    ]
  };

  const createReadRes = await fetch(`${BASE_URL}/readings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify(testReadingPayload)
  }).then(r => r.json());

  if (!createReadRes.success || !createReadRes.data?._id) {
    throw new Error(`Failed to create reading: ${JSON.stringify(createReadRes)}`);
  }
  const createdReadingId = createReadRes.data._id;
  console.log(`✓ Admin successfully created Reading Passage (Paragraph 999, ID: ${createdReadingId})`);

  // B. Security Verification: Student GET must NOT leak correctAnswer
  const studentGetRes = await fetch(`${BASE_URL}/readings/${createdReadingId}`, {
    headers: { 'Authorization': `Bearer ${userToken}` }
  }).then(r => r.json());

  if (!studentGetRes.success) {
    throw new Error('Student GET reading failed');
  }

  const leakedAnswers = studentGetRes.data.questions.filter(q => q.correctAnswer !== undefined);
  if (leakedAnswers.length > 0) {
    throw new Error(`SECURITY ALERT: Student GET leaked correctAnswer in ${leakedAnswers.length} question(s)!`);
  }
  console.log('✓ Security Check PASSED: Student GET reading strips correctAnswer from payload');

  // C. Admin GET must preserve correctAnswer
  const adminGetRes = await fetch(`${BASE_URL}/readings/admin/${createdReadingId}`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  }).then(r => r.json());

  if (!adminGetRes.success || !adminGetRes.data.questions[0].correctAnswer) {
    throw new Error('Admin GET reading failed to return correctAnswer for editing');
  }
  console.log('✓ Admin GET reading correctly includes correctAnswer for admin management');

  // D. Student Submits Answers:
  // Q0: 'B' (correct), Q1: 'C' (correct), Q2: 'A' (correct), Q3: 'C' (correct), Q4: 'B' (INCORRECT - expected 'A')
  // Expected score: 4/5 (80%)
  const submitRes = await fetch(`${BASE_URL}/readings/${createdReadingId}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({
      answers: {
        0: 'B', // Correct
        1: 'C', // Correct
        2: 'A', // Correct
        3: 'C', // Correct
        4: 'B'  // Incorrect (Correct is A)
      }
    })
  }).then(r => r.json());

  if (!submitRes.success) {
    throw new Error(`Submission failed: ${JSON.stringify(submitRes)}`);
  }

  console.log(`✓ Submission Evaluation Results: Score = ${submitRes.data.score}/${submitRes.data.totalQuestions} (${submitRes.data.percentage}%)`);
  if (submitRes.data.score !== 4 || submitRes.data.percentage !== 80) {
    throw new Error(`Expected score 4/5 (80%), received ${submitRes.data.score}/${submitRes.data.totalQuestions}`);
  }

  const q4Result = submitRes.data.results.find(r => r.questionIndex === 4);
  if (!q4Result || q4Result.isCorrect !== false || q4Result.correctAnswer !== 'A') {
    throw new Error(`Expected Question 4 to be marked incorrect with correctAnswer 'A', got: ${JSON.stringify(q4Result)}`);
  }
  console.log('✓ Per-question evaluation accurately identified wrong choice and returned correct answer & explanation');

  // E. Verify ReadingProgress document persisted in MongoDB
  const progressDoc = await mongoose.connection.collection('readingprogresses').findOne({
    userId: regularUser._id,
    readingId: new mongoose.Types.ObjectId(createdReadingId)
  });

  if (!progressDoc || progressDoc.score !== 4) {
    throw new Error('ReadingProgress document not saved properly in MongoDB Atlas');
  }
  console.log(`✓ Verified ReadingProgress record in MongoDB Atlas (Score: ${progressDoc.score}, Percentage: ${progressDoc.percentage}%)`);

  // F. Verify Student Catalog attaches user progress
  const listWithProgressRes = await fetch(`${BASE_URL}/readings`, {
    headers: { 'Authorization': `Bearer ${userToken}` }
  }).then(r => r.json());

  const testReadingInList = listWithProgressRes.data.find(r => r._id === createdReadingId);
  if (!testReadingInList || !testReadingInList.userProgress || testReadingInList.userProgress.score !== 4) {
    throw new Error('Student catalog failed to attach userProgress');
  }
  console.log(`✓ Student catalog dynamically attached userProgress: ${testReadingInList.userProgress.score}/${testReadingInList.userProgress.totalQuestions}`);

  // ==========================================
  // CLEANUP TEST DATA
  // ==========================================
  console.log('\n--- 3. Cleanup Test Records ---');
  await fetch(`${BASE_URL}/patterns/${createdPatternId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log('✓ Cleaned up test Pattern');

  await fetch(`${BASE_URL}/readings/${createdReadingId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log('✓ Cleaned up test Reading');

  await mongoose.connection.collection('readingprogresses').deleteOne({
    _id: progressDoc._id
  });
  console.log('✓ Cleaned up test ReadingProgress');

  await mongoose.disconnect();
  console.log('\n🎉 ALL PATTERNS & READING SUITE TESTS PASSED 100%!');
}

runSuite().catch(err => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
