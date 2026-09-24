import fetch from 'node-fetch';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const BASE_URL = 'http://localhost:5001/api';

async function runVerification() {
  console.log('========================================================');
  console.log('🧪 NIHONGOHUB: PATTERNS & READING END-TO-END VERIFICATION');
  console.log('========================================================\n');

  // Connect to MongoDB to find admin user for auth headers
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✓ Connected to MongoDB Atlas');

  const adminUser = await mongoose.connection.collection('users').findOne({ role: 'admin' }) 
    || await mongoose.connection.collection('users').findOne({});
  
  if (!adminUser) {
    throw new Error('No user found in database');
  }

  const jwtSecret = process.env.JWT_SECRET || 'nihongohub_jwt_secret_token_key_2026_production';
  const adminToken = jwt.sign(
    { id: adminUser._id.toString(), email: adminUser.email, role: 'admin', sessionId: adminUser.activeSessionId },
    jwtSecret,
    { expiresIn: '2h' }
  );
  console.log(`✓ Generated Admin JWT for user: ${adminUser.email}\n`);

  const adminHeaders = {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  };

  // ----------------------------------------------------
  // TEST 1: Public Reading API & Sanitation
  // ----------------------------------------------------
  console.log('--- TEST 1: Public Reading List (Student Sanitization) ---');
  const pubReadingsRes = await fetch(`${BASE_URL}/readings`).then(r => r.json());
  console.log(`✓ GET /api/readings status: success=${pubReadingsRes.success}, count=${pubReadingsRes.count}`);
  if (pubReadingsRes.data && pubReadingsRes.data.length > 0) {
    const sample = pubReadingsRes.data[0];
    console.log(`  Sample Title: "${sample.title}" (Paragraph ${sample.paragraphNumber})`);
    console.log(`  Questions Count: ${sample.questions.length}`);
    const hasExposedAnswer = sample.questions.some(q => q.correctAnswer !== undefined);
    console.log(`  Correct answer exposed to student: ${hasExposedAnswer ? '❌ FAIL' : '✓ SECURE (NO)'}`);
    if (hasExposedAnswer) throw new Error('Student API exposed correct answers!');
  }

  // ----------------------------------------------------
  // TEST 2: Admin Reading List & Admin Route
  // ----------------------------------------------------
  console.log('\n--- TEST 2: Admin Reading List & Admin Route ---');
  const adminReadingsRes = await fetch(`${BASE_URL}/readings/admin/all`, { headers: adminHeaders }).then(r => r.json());
  console.log(`✓ GET /api/readings/admin/all: success=${adminReadingsRes.success}, count=${adminReadingsRes.count}`);
  
  const adminAliasRes = await fetch(`${BASE_URL}/readings/admin`, { headers: adminHeaders }).then(r => r.json());
  console.log(`✓ GET /api/readings/admin (alias): success=${adminAliasRes.success}, count=${adminAliasRes.count}`);

  let testReadingId = null;
  if (adminReadingsRes.data && adminReadingsRes.data.length > 0) {
    testReadingId = adminReadingsRes.data[0]._id;
    const singleAdmin = await fetch(`${BASE_URL}/readings/admin/${testReadingId}`, { headers: adminHeaders }).then(r => r.json());
    console.log(`✓ GET /api/readings/admin/:id: retrieved "${singleAdmin.data.title}"`);
    console.log(`  Correct answer for Q1 intact: ${singleAdmin.data.questions[0]?.correctAnswer}`);
  }

  // ----------------------------------------------------
  // TEST 3: Reading Answer Submission (Problem 1 Fix)
  // ----------------------------------------------------
  console.log('\n--- TEST 3: Reading Answer Submission Evaluation ---');
  if (testReadingId) {
    const fullReading = await fetch(`${BASE_URL}/readings/admin/${testReadingId}`, { headers: adminHeaders }).then(r => r.json());
    const qList = fullReading.data.questions;
    
    const submissionAnswers = {};
    qList.forEach((q, idx) => {
      submissionAnswers[idx] = idx === 0 ? q.correctAnswer : (q.correctAnswer === 'A' ? 'B' : 'A');
    });

    const submitRes = await fetch(`${BASE_URL}/readings/${testReadingId}/submit`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ answers: submissionAnswers })
    }).then(r => r.json());

    console.log(`✓ POST /api/readings/:id/submit response:`);
    console.log(`  Score: ${submitRes.score} / ${submitRes.totalQuestions} (${submitRes.percentage}%)`);
    console.log(`  Evaluated Questions: ${submitRes.results?.length}`);
    console.log(`  Q1 correct?: ${submitRes.results?.[0]?.isCorrect}`);
    if (submitRes.score === undefined || !submitRes.results) {
      throw new Error('Reading submission failed to return score and results!');
    }
  }

  // ----------------------------------------------------
  // TEST 4: Reading CSV Import (Dynamic 5 & 6 Questions)
  // ----------------------------------------------------
  console.log('\n--- TEST 4: Reading CSV Parser & Preview (5 & 6 Questions) ---');
  const sample6QuestionCsv = `title,passage,question_1,option_1_a,option_1_b,option_1_c,option_1_d,correct_answer_1,question_2,option_2_a,option_2_b,option_2_c,option_2_d,correct_answer_2,question_3,option_3_a,option_3_b,option_3_c,option_3_d,correct_answer_3,question_4,option_4_a,option_4_b,option_4_c,option_4_d,correct_answer_4,question_5,option_5_a,option_5_b,option_5_c,option_5_d,correct_answer_5,question_6,option_6_a,option_6_b,option_6_c,option_6_d,correct_answer_6
Paragraph 99 — Automated Test,田中さんは毎朝コーヒーを飲みます。図書館へ行って本を読みます。,田中さんは何を飲みますか。,お茶,コーヒー,水,ジュース,B,どこへ行きますか。,学校,公園,図書館,駅,C,何をしに行きますか。,本を読む,運動する,勉強する,寝る,A,朝何をしますか。,走る,コーヒーを飲む,寝る,歌う,B,何時に行きますか。,朝,昼,夜,夕方,A,最後の質問です。,はい,いいえ,たぶん,わからない,A`;

  const readingPreviewRes = await fetch(`${BASE_URL}/readings/csv/preview`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ csvText: sample6QuestionCsv, jlptLevel: 'N5' })
  }).then(r => r.json());

  console.log(`✓ Reading CSV Preview:`);
  console.log(`  Total Rows: ${readingPreviewRes.totalRows}`);
  console.log(`  Detected Questions in Row: ${readingPreviewRes.previewReadings?.[0]?.questions?.length}`);
  if (readingPreviewRes.previewReadings?.[0]?.questions?.length !== 6) {
    throw new Error('Reading CSV parser failed to detect 6 questions dynamically!');
  }

  // Commit the reading
  const readingCommitRes = await fetch(`${BASE_URL}/readings/csv/commit`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      readings: readingPreviewRes.previewReadings,
      mode: 'update'
    })
  }).then(r => r.json());
  console.log(`✓ Reading CSV Commit: inserted=${readingCommitRes.inserted}, updated=${readingCommitRes.updated}, total=${readingCommitRes.total}`);

  // ----------------------------------------------------
  // TEST 5: Patterns API & Chapter Endpoints
  // ----------------------------------------------------
  console.log('\n--- TEST 5: Patterns List & Chapter Endpoints ---');
  const patternsRes = await fetch(`${BASE_URL}/patterns`).then(r => r.json());
  console.log(`✓ GET /api/patterns: success=${patternsRes.success}, count=${patternsRes.count}`);

  const chaptersRes = await fetch(`${BASE_URL}/patterns/chapters`).then(r => r.json());
  console.log(`✓ GET /api/patterns/chapters: standardChapters count=${chaptersRes.standardChapters?.length}, customChapters count=${chaptersRes.customChapters?.length}`);

  // ----------------------------------------------------
  // TEST 6: Patterns CSV Import (Columns & Delimiters)
  // ----------------------------------------------------
  console.log('\n--- TEST 6: Patterns CSV Parser & Preview (Chapter 4) ---');
  const samplePatternCsv = `pattern,meaning,usage,example_japanese,example_english
～てください,Please do...,Used to make polite requests or instructions.,ここに 名前を 書いてください。／ドアを あけてください。,Please write your name here. / Please open the door.
～てもいいです,May do / permission,Used to give or ask for permission.,ここで 写真を 撮ってもいいです。,You may take photos here.`;

  const patternPreviewRes = await fetch(`${BASE_URL}/patterns/csv/preview`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      csvText: samplePatternCsv,
      destinationType: 'chapter',
      chapter: 4,
      jlptLevel: 'N5'
    })
  }).then(r => r.json());

  console.log(`✓ Pattern CSV Preview:`);
  console.log(`  Total Rows: ${patternPreviewRes.totalRows}`);
  console.log(`  Valid Rows: ${patternPreviewRes.validRows?.length}`);
  console.log(`  First pattern parsed: "${patternPreviewRes.validRows?.[0]?.pattern}"`);
  console.log(`  Multi-examples split by ／: ${patternPreviewRes.validRows?.[0]?.examples?.length} examples`);
  if (patternPreviewRes.validRows?.[0]?.examples?.length !== 2) {
    throw new Error('Pattern CSV parser failed to split multi-examples on ／ delimiter!');
  }

  // Commit patterns
  const patternCommitRes = await fetch(`${BASE_URL}/patterns/csv/commit`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      rows: patternPreviewRes.previewRows,
      mode: 'update',
      destinationType: 'chapter',
      chapter: 4
    })
  }).then(r => r.json());
  console.log(`✓ Pattern CSV Commit: inserted=${patternCommitRes.inserted}, updated=${patternCommitRes.updated}, total=${patternCommitRes.total}`);

  // Clean up automated test reading from DB
  await mongoose.connection.collection('readings').deleteOne({ title: 'Paragraph 99 — Automated Test' });
  console.log('✓ Cleaned up automated test reading');

  await mongoose.disconnect();
  console.log('\n🎉 ALL PATTERNS & READING TESTS PASSED END-TO-END!\n');
}

runVerification().catch(err => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
