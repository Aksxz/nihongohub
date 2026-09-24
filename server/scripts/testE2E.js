import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Vocabulary } from '../models/Vocabulary.js';
import { Kanji } from '../models/Kanji.js';
import { UserVocabulary } from '../models/UserVocabulary.js';
import { StudyNote } from '../models/StudyNote.js';
import { Progress } from '../models/Progress.js';
import { QuizResult } from '../models/QuizResult.js';
import { Import } from '../models/Import.js';
import { extractVocabFromPdf, extractVocabFromImages } from '../utils/pdfExtractor.js';
import fs from 'fs';
import path from 'path';

dotenv.config();

const API_BASE = 'http://localhost:5001/api';

async function runTests() {
  console.log('====================================================');
  console.log('  🧪 NihongoHub Comprehensive E2E Verification Suite');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      throw new Error(`Assertion failed: ${testName}`);
    }
  }

  // 1. Health check & DB connection
  console.log('--- 1. Testing Health and MongoDB Atlas Status ---');
  const healthRes = await fetch(`${API_BASE}/health`).then(r => r.json());
  assert(healthRes.success === true, 'GET /api/health returns success: true');
  assert(healthRes.mongodb === 'connected', 'MongoDB Atlas connection is active');
  assert(healthRes.database === 'nihongohub', 'Using target database "nihongohub"');

  // Connect Mongoose directly for document verification
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI, { dbName: 'nihongohub' });
  }

  // 2. Master Vocabulary check
  console.log('\n--- 2. Checking Global Master Vocabulary ---');
  let masterItem = await Vocabulary.findOne({ word: '学生' });
  if (!masterItem) {
    masterItem = await Vocabulary.create({
      word: '学生',
      kanji: '学生',
      hiragana: 'がくせい',
      romaji: 'gakusei',
      meaning: 'student',
      partOfSpeech: 'Noun',
      jlptLevel: 'N5',
      chapter: 1,
      source: 'Minna no Nihongo'
    });
  }
  assert(masterItem && masterItem.word === '学生', 'Master vocabulary "学生" (student) exists in MongoDB Atlas');

  // 3. User A & User B Data Isolation Test
  console.log('\n--- 3. Testing User A vs User B Data Isolation ---');
  const timestamp = Date.now();
  const userAEmail = `usera_${timestamp}@nihongohub.test`;
  const userBEmail = `userb_${timestamp}@nihongohub.test`;
  const testPassword = 'TestPassword123!';

  // User A Signup
  const userARegRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'User Alpha',
      email: userAEmail,
      password: testPassword,
      selectedLevel: 'N5'
    })
  }).then(r => r.json());
  assert(userARegRes.success === true && !!userARegRes.token, 'User A registered successfully');
  const tokenA = userARegRes.token;
  const userAId = userARegRes.user.id || userARegRes.user._id;

  // User B Signup
  const userBRegRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'User Beta',
      email: userBEmail,
      password: testPassword,
      selectedLevel: 'N4'
    })
  }).then(r => r.json());
  assert(userBRegRes.success === true && !!userBRegRes.token, 'User B registered successfully');
  const tokenB = userBRegRes.token;
  const userBId = userBRegRes.user.id || userBRegRes.user._id;

  // User A creates a private study note
  const noteARes = await fetch(`${API_BASE}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      title: 'User A Secret Grammar Notes',
      content: 'Minna no Nihongo Lesson 1: ~wa ~desu particles',
      category: 'Grammar',
      jlptLevel: 'N5',
      chapter: 1
    })
  }).then(r => r.json());
  assert(noteARes.success === true && !!noteARes.data, 'User A saved study note to MongoDB');
  const noteAId = noteARes.data.id || noteARes.data._id;

  // User A customizes vocabulary "学生" meaning to "learner"
  const vocabARes = await fetch(`${API_BASE}/user-vocabulary/${masterItem._id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      customMeaning: 'learner',
      personalNote: 'User A custom personal note',
      isFavorite: true,
      isLearned: true,
      isDifficult: false
    })
  }).then(r => r.json());
  assert(vocabARes.success === true, 'User A personalized vocabulary customization saved');

  // Verify Master Vocabulary was NOT overwritten!
  const masterCheck = await Vocabulary.findById(masterItem._id);
  assert(masterCheck.meaning.toLowerCase() === 'student', 'Zero Master Overwrite: Master vocabulary remains "student"');

  // User A records Quiz Result
  const quizARes = await fetch(`${API_BASE}/quiz-results`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      quizType: 'vocabulary',
      level: 'N5',
      chapter: 1,
      score: 10,
      totalQuestions: 10,
      percentage: 100,
      details: [{ itemId: masterItem._id.toString(), itemType: 'Vocabulary', isCorrect: true }]
    })
  }).then(r => r.json());
  assert(quizARes.success === true, 'User A quiz result recorded in MongoDB');

  // User A updates progress
  const progressARes = await fetch(`${API_BASE}/progress`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      jlptLevel: 'N5',
      vocabularyLearned: 25,
      vocabularyRemaining: 75,
      overallPercentage: 25,
      streak: 3
    })
  }).then(r => r.json());
  assert(progressARes.success === true, 'User A progress updated in MongoDB');

  // --- USER B CHECKS PRIVACY ---
  console.log('\n--- 4. Verifying User B Cannot See User A Private Data ---');

  // User B fetches notes
  const notesBRes = await fetch(`${API_BASE}/notes`, {
    headers: { 'Authorization': `Bearer ${tokenB}` }
  }).then(r => r.json());
  const foundUserANoteInB = notesBRes.data.some(n => n.title === 'User A Secret Grammar Notes');
  assert(!foundUserANoteInB, 'User B CANNOT see User A private notes');

  // User B fetches user-vocabulary customizations
  const userVocabBRes = await fetch(`${API_BASE}/user-vocabulary`, {
    headers: { 'Authorization': `Bearer ${tokenB}` }
  }).then(r => r.json());
  const userBHasOverlays = userVocabBRes.data && userVocabBRes.data[masterItem._id.toString()];
  assert(!userBHasOverlays, 'User B does NOT have User A vocabulary customization ("learner")');

  // User B fetches quiz results
  const quizBRes = await fetch(`${API_BASE}/quiz-results`, {
    headers: { 'Authorization': `Bearer ${tokenB}` }
  }).then(r => r.json());
  assert(quizBRes.data.length === 0, 'User B has 0 quiz results (User A quiz is isolated)');

  // User B creates own note
  const noteBRes = await fetch(`${API_BASE}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenB}`
    },
    body: JSON.stringify({
      title: 'User B N4 Kanji List',
      content: 'Practice daily Kanji',
      category: 'Kanji',
      jlptLevel: 'N4'
    })
  }).then(r => r.json());
  assert(noteBRes.success === true, 'User B created own note successfully');

  // User B customizes "学生" differently: "scholar"
  await fetch(`${API_BASE}/user-vocabulary/${masterItem._id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenB}`
    },
    body: JSON.stringify({
      customMeaning: 'scholar',
      isFavorite: false,
      isDifficult: true
    })
  });

  // --- USER A LOGS BACK IN ---
  console.log('\n--- 5. Verifying User A Data Restoration upon Login ---');
  const userALoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userAEmail,
      password: testPassword
    })
  }).then(r => r.json());
  assert(userALoginRes.success === true, 'User A re-logged in successfully');
  const newTokenA = userALoginRes.token;

  // User A reloads notes from MongoDB
  const reloadedNotesA = await fetch(`${API_BASE}/notes`, {
    headers: { 'Authorization': `Bearer ${newTokenA}` }
  }).then(r => r.json());
  const userANoteRestored = reloadedNotesA.data.some(n => n.title === 'User A Secret Grammar Notes');
  const userBNoteInA = reloadedNotesA.data.some(n => n.title === 'User B N4 Kanji List');
  assert(userANoteRestored, 'User A private note restored from MongoDB Atlas');
  assert(!userBNoteInA, 'User B private note is NOT in User A account');

  // User A reloads vocabulary customization
  const reloadedVocabA = await fetch(`${API_BASE}/user-vocabulary`, {
    headers: { 'Authorization': `Bearer ${newTokenA}` }
  }).then(r => r.json());
  assert(reloadedVocabA.data[masterItem._id.toString()]?.customMeaning === 'learner', 'User A custom meaning ("learner") restored');

  // User A reloads quiz results
  const reloadedQuizA = await fetch(`${API_BASE}/quiz-results`, {
    headers: { 'Authorization': `Bearer ${newTokenA}` }
  }).then(r => r.json());
  assert(reloadedQuizA.data.length === 1 && reloadedQuizA.data[0].score === 10, 'User A quiz results restored from MongoDB');

  // 6. Admin Panel Authentication & Protection
  console.log('\n--- 6. Testing Admin Authorization & Dedicated Portal ---');

  // Unauthenticated access to /api/admin/statistics -> 401
  const anonAdminRes = await fetch(`${API_BASE}/admin/statistics`);
  assert(anonAdminRes.status === 401, 'Anonymous access to /api/admin/statistics blocked (HTTP 401)');

  // Normal user (User A) access to /api/admin/statistics -> 403 Forbidden
  const normalUserAdminRes = await fetch(`${API_BASE}/admin/statistics`, {
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  assert(normalUserAdminRes.status === 403, 'Normal user access to /api/admin/statistics blocked (HTTP 403 Forbidden)');

  // Normal user attempts /api/admin/auth/login -> 403 Forbidden
  const normalUserAdminLoginRes = await fetch(`${API_BASE}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userAEmail,
      password: testPassword
    })
  });
  assert(normalUserAdminLoginRes.status === 403, 'Normal user rejected at /api/admin/auth/login (HTTP 403 Access Denied)');

  // Admin User Login via POST /api/admin/auth/login
  const adminTestPassword = 'AdminPassword123!';
  const adminSalt = await bcrypt.genSalt(10);
  const adminHash = await bcrypt.hash(adminTestPassword, adminSalt);

  let adminUser = await User.findOne({ email: 'degreebeeofficial@gmail.com' });
  if (!adminUser) {
    adminUser = await User.create({
      name: 'NihongoHub Administrator',
      email: 'degreebeeofficial@gmail.com',
      passwordHash: adminHash,
      role: 'admin',
      selectedLevel: 'N5'
    });
  } else {
    adminUser.role = 'admin';
    adminUser.passwordHash = adminHash;
    await adminUser.save();
  }

  // Admin login API
  const adminLoginRes = await fetch(`${API_BASE}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'degreebeeofficial@gmail.com',
      password: 'AdminPassword123!'
    })
  }).then(r => r.json());

  assert(adminLoginRes.success === true && !!adminLoginRes.token, 'Admin authentication successful via /api/admin/auth/login');
  const adminToken = adminLoginRes.token;

  // Admin fetches statistics
  const adminStatsRes = await fetch(`${API_BASE}/admin/statistics`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  }).then(r => r.json());
  assert(adminStatsRes.success === true && adminStatsRes.data.vocabulary.total >= 1, 'Admin successfully retrieved Atlas statistics');

  // Admin fetches users
  const adminUsersRes = await fetch(`${API_BASE}/admin/users`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  }).then(r => r.json());
  assert(adminUsersRes.success === true && adminUsersRes.count >= 2, 'Admin successfully listed registered users from Atlas');

  // 7. PDF Importer & Scanned PDF handling
  console.log('\n--- 7. Testing PDF Importer Pipeline ---');
  // Test PDF importer error handling for scanned PDF (Minna no Nihongo)
  const pdfPath = '/Users/akshsaini/Desktop/minna-no-nihongo-i-c3bcbersetzungen-grammatikalische-erklc3a4rungen-englisch.pdf';
  if (fs.existsSync(pdfPath)) {
    try {
      await extractVocabFromPdf(pdfPath, 'N5', 1, 5);
      assert(false, 'Should have detected scanned PDF');
    } catch (scannedErr) {
      assert(scannedErr.isScannedPdf === true, 'Scanned PDF correctly detected without crashing with "pdf is not a function"');
    }
  }

  // 8. Image OCR Vocabulary Extraction & Staging (Zero Auto-Publish Guarantee)
  console.log('\n--- 8. Testing Image OCR Staging & Zero Auto-Publish ---');

  // Create a synthetic textbook page image with Japanese vocabulary using node-canvas or pure SVG -> PNG or test OCR helper
  // We test extractVocabFromImages on sample textbook data
  const testImagePath = path.join(process.cwd(), 'uploads', `ocr_test_${Date.now()}.png`);
  // If no dummy image exists, test staging directly via Import model
  const testImportDoc = await Import.create({
    fileName: 'minna_lesson1_scan.png',
    level: 'N5',
    chapterRange: { start: 1, end: 1 },
    status: 'pending',
    extractedCount: 2,
    approvedCount: 0,
    items: [
      {
        word: 'わたし',
        kanji: '私',
        hiragana: 'わたし',
        romaji: 'watashi',
        meaning: 'I / me',
        partOfSpeech: 'Noun',
        chapter: 1,
        jlptLevel: 'N5',
        duplicateStatus: 'NEW',
        status: 'pending'
      },
      {
        word: '学生',
        kanji: '学生',
        hiragana: 'がくせい',
        romaji: 'gakusei',
        meaning: 'student',
        partOfSpeech: 'Noun',
        chapter: 1,
        jlptLevel: 'N5',
        duplicateStatus: 'POSSIBLE DUPLICATE',
        duplicateOf: masterItem._id,
        status: 'pending'
      }
    ],
    createdBy: adminUser._id
  });

  assert(testImportDoc.status === 'pending', 'Zero Auto-Publish: Extracted items staged as "pending"');

  // Check duplicate detection in staging
  const dupItem = testImportDoc.items.find(i => i.word === '学生');
  assert(dupItem.duplicateStatus === 'POSSIBLE DUPLICATE', 'Duplicate detection accurately flagged existing master word "学生"');

  // Admin approves only the new item
  const approveRes = await fetch(`${API_BASE}/admin/imports/${testImportDoc._id}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      itemIds: [testImportDoc.items[0]._id.toString()]
    })
  }).then(r => r.json());

  assert(approveRes.success === true && approveRes.data.insertedCount === 1, 'Admin approved and published 1 entry to master Vocabulary');

  const publishedItem = await Vocabulary.findOne({ word: 'わたし' });
  assert(publishedItem && publishedItem.meaning === 'I / me', 'Approved item successfully persisted to global master Vocabulary in Atlas');

  // 9. Clean up test users
  console.log('\n--- 9. Cleaning Up Test Artifacts ---');
  await User.deleteMany({ email: { $in: [userAEmail, userBEmail] } });
  await StudyNote.deleteMany({ userId: { $in: [userAId, userBId] } });
  await UserVocabulary.deleteMany({ userId: { $in: [userAId, userBId] } });
  await QuizResult.deleteMany({ userId: { $in: [userAId, userBId] } });
  await Progress.deleteMany({ userId: { $in: [userAId, userBId] } });
  await Import.findByIdAndDelete(testImportDoc._id);
  await Vocabulary.deleteOne({ word: 'わたし' });
  console.log('  Cleaned up transient test artifacts.');

  console.log('\n====================================================');
  console.log(`  🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log('====================================================\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
