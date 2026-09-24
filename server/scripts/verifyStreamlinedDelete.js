import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { Vocabulary } from '../models/Vocabulary.js';
import { Kanji } from '../models/Kanji.js';
import { UserVocabulary } from '../models/UserVocabulary.js';
import { UserKanji } from '../models/UserKanji.js';
import { User } from '../models/User.js';

const API_BASE = 'http://localhost:5001/api';

async function runTests() {
  console.log('--- STARTING STREAMLINED DELETE VERIFICATION ---');

  // Connect to DB directly for state assertions
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is not set in environment.');
  }

  await mongoose.connect(mongoUri, { dbName: 'nihongohub' });
  console.log('✓ Connected to MongoDB Atlas directly');

  // Find or create admin user
  let adminUser = await User.findOne({ role: 'admin' });
  if (!adminUser) {
    adminUser = await User.create({
      name: 'System Admin',
      email: `admin_${Date.now()}@nihongohub.test`,
      password: 'password123',
      role: 'admin'
    });
  }

  // Generate valid token directly
  const jwtSecret = process.env.JWT_SECRET || 'nihongohub_jwt_secret_token_key_2026_production';
  const jwt = await import('jsonwebtoken');
  const adminToken = jwt.default.sign({ id: adminUser._id }, jwtSecret, { expiresIn: '1d' });
  console.log(`✓ Admin token generated for: ${adminUser.email} (ID: ${adminUser._id})`);

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  };

  // -------------------------------------------------------------
  // TEST 1: Single-Word Instant Delete (Vocabulary)
  // -------------------------------------------------------------
  console.log('\n--- TEST 1: Single-Word Instant Delete (Vocabulary) ---');
  const testWord1 = await Vocabulary.create({
    word: '単体テスト削除_語彙1',
    meaning: 'Test single delete word 1',
    romaji: 'tantai_test_1',
    partOfSpeech: 'Noun',
    jlptLevel: 'N5',
    chapter: 1,
    source: 'Custom'
  });
  console.log(`Created test word: "${testWord1.word}" (ID: ${testWord1._id})`);

  // Add a dummy UserVocabulary overlay to verify cleanup
  const dummyUserId = new mongoose.Types.ObjectId();
  await UserVocabulary.create({
    userId: dummyUserId,
    vocabularyId: testWord1._id.toString(),
    customMeaning: 'User personal meaning',
    learned: true
  });

  // Call DELETE /api/admin/vocabulary/:id
  const deleteRes1 = await fetch(`${API_BASE}/admin/vocabulary/${testWord1._id}`, {
    method: 'DELETE',
    headers: authHeaders
  });
  const deleteData1 = await deleteRes1.json();
  console.log('Single Delete API Response:', deleteData1);

  if (!deleteData1.success) {
    throw new Error(`Expected success: true, got: ${JSON.stringify(deleteData1)}`);
  }

  // Verify DB state
  const checkWord1 = await Vocabulary.findById(testWord1._id);
  if (checkWord1) {
    throw new Error(`Word ${testWord1._id} still exists in Vocabulary collection!`);
  }
  const checkOverlay1 = await UserVocabulary.findOne({ vocabularyId: testWord1._id.toString() });
  if (checkOverlay1) {
    throw new Error(`Overlay for ${testWord1._id} was not cleaned up!`);
  }
  console.log('✓ TEST 1 PASSED: Single word deleted immediately and overlay cleaned up.');

  // -------------------------------------------------------------
  // TEST 2: Bulk Delete Vocabulary (3 words in single batch)
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Bulk Delete Vocabulary (3 words in single batch) ---');
  const bulkWords = await Vocabulary.create([
    {
      word: '一括テスト語彙_A',
      meaning: 'Batch test vocab A',
      romaji: 'ikkatsu_a',
      partOfSpeech: 'Noun',
      jlptLevel: 'N5',
      chapter: 2,
      source: 'Custom'
    },
    {
      word: '一括テスト語彙_B',
      meaning: 'Batch test vocab B',
      romaji: 'ikkatsu_b',
      partOfSpeech: 'Verb',
      jlptLevel: 'N5',
      chapter: 2,
      source: 'Custom'
    },
    {
      word: '一括テスト語彙_C',
      meaning: 'Batch test vocab C',
      romaji: 'ikkatsu_c',
      partOfSpeech: 'Adjective',
      jlptLevel: 'N5',
      chapter: 2,
      source: 'Custom'
    }
  ]);

  const bulkIds = bulkWords.map(w => w._id.toString());
  console.log(`Created 3 bulk test words with IDs: ${bulkIds.join(', ')}`);

  // Call POST /api/admin/vocabulary/bulk-delete
  const bulkRes = await fetch(`${API_BASE}/admin/vocabulary/bulk-delete`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ ids: bulkIds })
  });
  const bulkData = await bulkRes.json();
  console.log('Bulk Delete API Response:', bulkData);

  if (!bulkData.success || bulkData.count !== 3) {
    throw new Error(`Expected success: true and count: 3, got: ${JSON.stringify(bulkData)}`);
  }

  // Verify all 3 deleted from DB
  const remainingCount = await Vocabulary.countDocuments({ _id: { $in: bulkIds } });
  if (remainingCount !== 0) {
    throw new Error(`Expected 0 remaining words in DB, found ${remainingCount}`);
  }
  console.log('✓ TEST 2 PASSED: All 3 vocabulary words deleted in a single batch operation.');

  // -------------------------------------------------------------
  // TEST 3: Single Kanji Instant Delete
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Single Kanji Instant Delete ---');
  // Ensure non-existent character
  await Kanji.deleteMany({ character: { $in: ['鑾', '鑵', '鑶', '鑷'] } });

  const testKanji1 = await Kanji.create({
    character: '鑾',
    meaning: 'Imperial bell / Test',
    onyomi: 'ラン',
    kunyomi: 'すず',
    strokeCount: 27,
    jlptLevel: 'N5',
    chapter: 1
  });
  console.log(`Created test Kanji: "${testKanji1.character}" (ID: ${testKanji1._id})`);

  // Add dummy UserKanji overlay
  await UserKanji.create({
    userId: dummyUserId,
    kanjiId: testKanji1._id.toString(),
    customMeaning: 'Test overlay meaning',
    mastered: true
  });

  // Call DELETE /api/admin/kanji/:id
  const deleteKanjiRes = await fetch(`${API_BASE}/admin/kanji/${testKanji1._id}`, {
    method: 'DELETE',
    headers: authHeaders
  });
  const deleteKanjiData = await deleteKanjiRes.json();
  console.log('Single Kanji Delete API Response:', deleteKanjiData);

  if (!deleteKanjiData.success) {
    throw new Error(`Expected success: true, got: ${JSON.stringify(deleteKanjiData)}`);
  }

  const checkKanji = await Kanji.findById(testKanji1._id);
  if (checkKanji) {
    throw new Error(`Kanji ${testKanji1._id} still exists in DB!`);
  }
  const checkKanjiOverlay = await UserKanji.findOne({ kanjiId: testKanji1._id.toString() });
  if (checkKanjiOverlay) {
    throw new Error(`UserKanji overlay for ${testKanji1._id} was not cleaned up!`);
  }
  console.log('✓ TEST 3 PASSED: Single Kanji deleted immediately and overlay cleaned up.');

  // -------------------------------------------------------------
  // TEST 4: Bulk Delete Kanji (3 characters in single batch)
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Bulk Delete Kanji (3 characters in single batch) ---');
  const bulkKanji = await Kanji.create([
    {
      character: '鑵',
      meaning: 'Can / boiler test',
      onyomi: 'カン',
      kunyomi: 'つるべ',
      strokeCount: 25,
      jlptLevel: 'N5',
      chapter: 1
    },
    {
      character: '鑶',
      meaning: 'Storehouse / weapon test',
      onyomi: 'ゾウ',
      kunyomi: 'くら',
      strokeCount: 25,
      jlptLevel: 'N5',
      chapter: 1
    },
    {
      character: '鑷',
      meaning: 'Forceps / tweezers test',
      onyomi: 'ジョウ',
      kunyomi: 'けぬき',
      strokeCount: 26,
      jlptLevel: 'N5',
      chapter: 1
    }
  ]);

  const bulkKanjiIds = bulkKanji.map(k => k._id.toString());
  console.log(`Created 3 bulk test Kanji with IDs: ${bulkKanjiIds.join(', ')}`);

  // Call POST /api/admin/kanji/bulk-delete
  const bulkKanjiRes = await fetch(`${API_BASE}/admin/kanji/bulk-delete`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ ids: bulkKanjiIds })
  });
  const bulkKanjiData = await bulkKanjiRes.json();
  console.log('Bulk Kanji Delete API Response:', bulkKanjiData);

  if (!bulkKanjiData.success || bulkKanjiData.count !== 3) {
    throw new Error(`Expected success: true and count: 3, got: ${JSON.stringify(bulkKanjiData)}`);
  }

  const remainingKanjiCount = await Kanji.countDocuments({ _id: { $in: bulkKanjiIds } });
  if (remainingKanjiCount !== 0) {
    throw new Error(`Expected 0 remaining Kanji in DB, found ${remainingKanjiCount}`);
  }
  console.log('✓ TEST 4 PASSED: All 3 Kanji characters deleted in a single batch operation.');

  // -------------------------------------------------------------
  // TEST 5: Data Safety & Isolation (Unrelated words/progress untouched)
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Data Isolation & Safety Check ---');
  const controlWord = await Vocabulary.create({
    word: '保護対象語彙',
    meaning: 'Protected vocab should never be deleted',
    romaji: 'hogo_taishou',
    partOfSpeech: 'Noun',
    jlptLevel: 'N5',
    chapter: 1,
    source: 'Custom'
  });

  const controlOverlay = await UserVocabulary.create({
    userId: dummyUserId,
    vocabularyId: controlWord._id.toString(),
    customMeaning: 'Protected overlay',
    learned: true
  });

  // Attempt bulk delete with unrelated non-existent ID
  const bogusId = new mongoose.Types.ObjectId().toString();
  const bogusBulkRes = await fetch(`${API_BASE}/admin/vocabulary/bulk-delete`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ ids: [bogusId] })
  });
  const bogusBulkData = await bogusBulkRes.json();
  console.log('Bogus Bulk Delete Result:', bogusBulkData);

  // Assert control word and overlay are 100% intact
  const verifyControl = await Vocabulary.findById(controlWord._id);
  const verifyOverlay = await UserVocabulary.findById(controlOverlay._id);
  if (!verifyControl || !verifyOverlay) {
    throw new Error('Data isolation failure: Control record or overlay was affected!');
  }

  // Cleanup control word properly
  await Vocabulary.findByIdAndDelete(controlWord._id);
  await UserVocabulary.findByIdAndDelete(controlOverlay._id);
  console.log('✓ TEST 5 PASSED: Data isolation confirmed. Zero collateral damage to unrelated records.');

  // -------------------------------------------------------------
  // TEST 6: Validation & Error Handling
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: Validation & Error Handling ---');
  const emptyRes = await fetch(`${API_BASE}/admin/vocabulary/bulk-delete`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ ids: [] })
  });
  if (emptyRes.status !== 400) {
    throw new Error(`Expected 400 for empty IDs, got ${emptyRes.status}`);
  }

  const invalidRes = await fetch(`${API_BASE}/admin/vocabulary/bulk-delete`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ ids: ['invalid-id-format'] })
  });
  if (invalidRes.status !== 400) {
    throw new Error(`Expected 400 for invalid ID format, got ${invalidRes.status}`);
  }
  console.log('✓ TEST 6 PASSED: Proper 400 validation on empty arrays and invalid IDs.');

  await mongoose.disconnect();
  console.log('\n======================================================');
  console.log('🎉 ALL STREAMLINED DELETION VERIFICATION TESTS PASSED!');
  console.log('======================================================\n');
}

runTests().catch(err => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
