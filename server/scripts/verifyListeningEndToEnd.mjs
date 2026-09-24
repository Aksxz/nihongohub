import fetch from 'node-fetch';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const BASE_URL = 'http://localhost:5001/api';

async function runVerification() {
  console.log('========================================================');
  console.log('🎧 NIHONGOHUB: LISTENING MODULE END-TO-END VERIFICATION');
  console.log('========================================================\\n');

  // Connect to MongoDB Atlas
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✓ Connected to MongoDB Atlas');

  const adminUser = await mongoose.connection.collection('users').findOne({ role: 'admin' }) 
    || await mongoose.connection.collection('users').findOne({});
  
  if (!adminUser) {
    throw new Error('No user found in database');
  }

  const normalUser = await mongoose.connection.collection('users').findOne({ role: 'user' }) || adminUser;

  const jwtSecret = process.env.JWT_SECRET || 'nihongohub_jwt_secret_token_key_2026_production';
  const adminToken = jwt.sign(
    { id: adminUser._id.toString(), email: adminUser.email, role: 'admin', sessionId: adminUser.activeSessionId },
    jwtSecret,
    { expiresIn: '2h' }
  );

  const userToken = jwt.sign(
    { id: normalUser._id.toString(), email: normalUser.email, role: 'user', sessionId: normalUser.activeSessionId },
    jwtSecret,
    { expiresIn: '2h' }
  );

  const adminHeaders = {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  };

  const userHeaders = {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  };

  console.log(`✓ Admin: ${adminUser.email}`);
  console.log(`✓ Student: ${normalUser.email}\\n`);

  // ----------------------------------------------------
  // TEST 1: Admin Create Listening Exercise
  // ----------------------------------------------------
  console.log('--- TEST 1: Admin Create Listening Exercise ---');
  const testListeningPayload = {
    title: 'Listening 1 — 買い物 (Shopping)',
    listeningNumber: 1,
    passage: '昨日 デパートへ 行きました。新しい シャツと 靴を 買いました。シャツは 3000円でした。靴は 5000円でした。とても 楽しかったです。',
    jlptLevel: 'N5',
    order: 1,
    questions: [
      {
        question: 'どこへ 行きましたか。',
        options: [
          { label: 'A', text: '学校' },
          { label: 'B', text: 'デパート' },
          { label: 'C', text: '図書館' },
          { label: 'D', text: '病院' }
        ],
        correctAnswer: 'B',
        explanation: '「昨日 デパートへ 行きました」と言いました。'
      },
      {
        question: '何を 買いましたか。',
        options: [
          { label: 'A', text: '本とペン' },
          { label: 'B', text: 'シャツと靴' },
          { label: 'C', text: '車と時計' },
          { label: 'D', text: 'パンと牛乳' }
        ],
        correctAnswer: 'B',
        explanation: '「新しい シャツと 靴を 買いました」と言いました。'
      },
      {
        question: 'シャツは いくらでしたか。',
        options: [
          { label: 'A', text: '3000円' },
          { label: 'B', text: '4000円' },
          { label: 'C', text: '5000円' },
          { label: 'D', text: '8000円' }
        ],
        correctAnswer: 'A',
        explanation: '「シャツは 3000円でした」と言いました。'
      },
      {
        question: '靴は いくらでしたか。',
        options: [
          { label: 'A', text: '3000円' },
          { label: 'B', text: '5000円' },
          { label: 'C', text: '6000円' },
          { label: 'D', text: '10000円' }
        ],
        correctAnswer: 'B',
        explanation: '「靴は 5000円でした」と言いました。'
      },
      {
        question: 'どうでしたか。',
        options: [
          { label: 'A', text: 'つまらなかったです' },
          { label: 'B', text: '忙しかったです' },
          { label: 'C', text: 'とても 楽しかったです' },
          { label: 'D', text: '疲れました' }
        ],
        correctAnswer: 'C',
        explanation: '「とても 楽しかったです」と言いました。'
      }
    ]
  };

  const createRes = await fetch(`${BASE_URL}/listening`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify(testListeningPayload)
  }).then(r => r.json());

  console.log(`✓ Admin POST /api/listening status: success=${createRes.success}`);
  if (!createRes.success || !createRes.data?._id) {
    throw new Error(`Failed to create listening exercise: ${JSON.stringify(createRes)}`);
  }

  const createdId = createRes.data._id;
  console.log(`  Created Listening ID: ${createdId}`);

  // ----------------------------------------------------
  // TEST 2: Admin List & Single Verification
  // ----------------------------------------------------
  console.log('\\n--- TEST 2: Admin GET All & Single Inspection ---');
  const adminAllRes = await fetch(`${BASE_URL}/listening/admin/all`, { headers: adminHeaders }).then(r => r.json());
  console.log(`✓ GET /api/listening/admin/all count: ${adminAllRes.count}`);
  const foundAdmin = adminAllRes.data?.find(l => l._id === createdId || l.id === createdId);
  if (!foundAdmin) throw new Error('Created listening exercise not in admin list!');
  console.log(`  Paragraph visible to admin: "${foundAdmin.passage.slice(0, 30)}..."`);
  console.log(`  Q1 correct answer intact for admin: ${foundAdmin.questions?.[0]?.correctAnswer}`);

  // ----------------------------------------------------
  // TEST 3: Student Security Check (Passage & Answer Hidden)
  // ----------------------------------------------------
  console.log('\\n--- TEST 3: Student Security Rules (Hidden Passage & Hidden Correct Answers) ---');
  const studentListRes = await fetch(`${BASE_URL}/listening`, { headers: userHeaders }).then(r => r.json());
  const studentItem = studentListRes.data?.find(l => l._id === createdId || l.id === createdId);
  if (!studentItem) throw new Error('Created listening exercise not in student list!');

  console.log(`✓ Student GET /api/listening retrieved: "${studentItem.title}"`);
  const hasPassage = studentItem.passage !== undefined;
  console.log(`  Passage exposed to student: ${hasPassage ? '❌ FAIL (EXPOSED)' : '✓ SECURE (NO - PASSAGE IS HIDDEN)'}`);
  if (hasPassage) throw new Error('Security violation: Student list exposed passage text!');

  const hasStudentAnswer = studentItem.questions?.some(q => q.correctAnswer !== undefined);
  console.log(`  Correct answer exposed to student: ${hasStudentAnswer ? '❌ FAIL (EXPOSED)' : '✓ SECURE (NO - ANSWERS HIDDEN)'}`);
  if (hasStudentAnswer) throw new Error('Security violation: Student list exposed correct answers!');

  // Single student GET check
  const singleStudentRes = await fetch(`${BASE_URL}/listening/${createdId}`, { headers: userHeaders }).then(r => r.json());
  if (singleStudentRes.data?.passage) throw new Error('Security violation: Student GET /:id exposed passage!');
  if (singleStudentRes.data?.questions?.some(q => q.correctAnswer)) throw new Error('Security violation: Student GET /:id exposed correctAnswer!');
  console.log('✓ Single Student GET /api/listening/:id: Verified 100% secure.');

  // ----------------------------------------------------
  // TEST 4: Audio Text Endpoint for SpeechSynthesis
  // ----------------------------------------------------
  console.log('\\n--- TEST 4: Secure Audio Text Fetch for SpeechSynthesis ---');
  const audioTextRes = await fetch(`${BASE_URL}/listening/${createdId}/audio-text`, { headers: userHeaders }).then(r => r.json());
  console.log(`✓ GET /api/listening/:id/audio-text: success=${audioTextRes.success}`);
  console.log(`  Audio text returned for TTS: "${audioTextRes.audioText}"`);
  if (!audioTextRes.audioText || audioTextRes.audioText !== testListeningPayload.passage) {
    throw new Error('Audio text does not match stored Japanese paragraph!');
  }

  // ----------------------------------------------------
  // TEST 5: Student Answer Submission & Instant Evaluation
  // ----------------------------------------------------
  console.log('\\n--- TEST 5: Student Answer Submission & Instant Scoring ---');
  // Submit all 5 answers: Q1: B, Q2: B, Q3: A, Q4: B, Q5: C
  const submissionAnswers = {
    "0": "B",
    "1": "B",
    "2": "A",
    "3": "B",
    "4": "C"
  };

  const submitRes = await fetch(`${BASE_URL}/listening/${createdId}/submit`, {
    method: 'POST',
    headers: userHeaders,
    body: JSON.stringify({ answers: submissionAnswers })
  }).then(r => r.json());

  console.log(`✓ POST /api/listening/:id/submit:`);
  console.log(`  Score: ${submitRes.score} / ${submitRes.totalQuestions} (${submitRes.percentage}%)`);
  console.log(`  Evaluated Questions: ${submitRes.results?.length}`);
  console.log(`  All 5 answers evaluated as correct: ${submitRes.results?.every(r => r.isCorrect)}`);
  if (submitRes.score !== 5 || submitRes.percentage !== 100) {
    throw new Error(`Submission scoring incorrect: got ${submitRes.score}/5`);
  }

  // Verify MongoDB Atlas progress record
  const progressRecord = await mongoose.connection.collection('listeningprogresses').findOne({
    listeningId: new mongoose.Types.ObjectId(createdId),
    userId: new mongoose.Types.ObjectId(normalUser._id)
  });
  console.log(`✓ Verified MongoDB Atlas ListeningProgress document: score=${progressRecord?.score}, percentage=${progressRecord?.percentage}%`);
  if (!progressRecord) throw new Error('ListeningProgress record not persisted to MongoDB Atlas!');

  // ----------------------------------------------------
  // TEST 6: CSV Import (Dynamic 5 & 6 Questions)
  // ----------------------------------------------------
  console.log('\\n--- TEST 6: Listening CSV Import (Dynamic Detection) ---');
  const sampleCsv = `title,passage,question_1,option_1_a,option_1_b,option_1_c,option_1_d,correct_answer_1,question_2,option_2_a,option_2_b,option_2_c,option_2_d,correct_answer_2,question_3,option_3_a,option_3_b,option_3_c,option_3_d,correct_answer_3,question_4,option_4_a,option_4_b,option_4_c,option_4_d,correct_answer_4,question_5,option_5_a,option_5_b,option_5_c,option_5_d,correct_answer_5
Listening 99 — CSV Import Test,田中さんは 毎朝 7時に 起きます。朝ごはんを 食べて、会社へ 行きます。,何時に 起きますか。,6時,7時,8時,9時,B,何を食べますか。,昼ごはん,晩ごはん,朝ごはん,お菓子,C,どこへ 行きますか。,学校,会社,病院,銀行,B,だれが 起きますか。,田中さん,山田さん,佐藤さん,鈴木さん,A,これは 何ですか。,手紙,朝の予定,料理,運動,B`;

  const csvPreviewRes = await fetch(`${BASE_URL}/listening/csv/preview`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ csvText: sampleCsv, jlptLevel: 'N5' })
  }).then(r => r.json());

  console.log(`✓ Listening CSV Preview:`);
  console.log(`  Total rows: ${csvPreviewRes.totalRows}`);
  console.log(`  Dynamic questions detected: ${csvPreviewRes.previewListenings?.[0]?.questions?.length}`);
  if (csvPreviewRes.previewListenings?.[0]?.questions?.length !== 5) {
    throw new Error('CSV dynamic question detection failed!');
  }

  const csvCommitRes = await fetch(`${BASE_URL}/listening/csv/commit`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      listenings: csvPreviewRes.previewListenings,
      mode: 'update'
    })
  }).then(r => r.json());

  console.log(`✓ Listening CSV Commit: inserted=${csvCommitRes.inserted}, updated=${csvCommitRes.updated}, total=${csvCommitRes.total}`);

  // ----------------------------------------------------
  // TEST 7: Cleanup
  // ----------------------------------------------------
  console.log('\\n--- TEST 7: Cleanup Test Records ---');
  await mongoose.connection.collection('listenings').deleteMany({
    _id: { $in: [new mongoose.Types.ObjectId(createdId)] }
  });
  await mongoose.connection.collection('listenings').deleteMany({
    title: 'Listening 99 — CSV Import Test'
  });
  await mongoose.connection.collection('listeningprogresses').deleteMany({
    listeningId: new mongoose.Types.ObjectId(createdId)
  });
  console.log('✓ Cleaned up test exercises and progress records from MongoDB Atlas.');

  await mongoose.disconnect();
  console.log('\\n🎉 ALL LISTENING MODULE TESTS PASSED END-TO-END WITH 100% SUCCESS!\\n');
}

runVerification().catch(err => {
  console.error('\\n❌ LISTENING VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
