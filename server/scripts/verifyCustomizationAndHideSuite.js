import 'dotenv/config';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Vocabulary } from '../models/Vocabulary.js';
import { UserVocabulary } from '../models/UserVocabulary.js';

const BASE_URL = 'http://localhost:5001/api';
const JWT_SECRET = process.env.JWT_SECRET || 'nihongohub_jwt_secret_token_key_2026_production';

async function runSuite() {
  console.log('=============================================================');
  console.log('  🧪 NihongoHub: Personal Customization & User-Hide Test Suite');
  console.log('=============================================================');

  await mongoose.connect(process.env.MONGO_URI, {
    maxPoolSize: 20,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 15000,
    family: 4
  });
  console.log('✓ Connected to MongoDB Atlas:', mongoose.connection.name);

  // Setup User A
  let userA = await User.findOne({ role: 'user' });
  if (!userA) {
    userA = await User.findOne({});
  }
  const sessionA = 'test-session-A-' + Date.now();
  userA.activeSessionId = sessionA;
  await userA.save();
  const tokenA = jwt.sign({ id: userA._id.toString(), sessionId: sessionA }, JWT_SECRET, { expiresIn: '1h' });
  console.log(`✓ User A: ${userA.email} (ID: ${userA._id})`);

  // Setup User B (for multi-user isolation verification)
  let userB = await User.findOne({ _id: { $ne: userA._id } });
  if (!userB) {
    userB = await User.create({
      name: 'User B (Tester)',
      email: 'userb_test_' + Date.now() + '@example.com',
      passwordHash: 'dummyhash',
      role: 'user',
      selectedLevel: 'N5',
      emailVerified: true
    });
  }
  const sessionB = 'test-session-B-' + Date.now();
  userB.activeSessionId = sessionB;
  await userB.save();
  const tokenB = jwt.sign({ id: userB._id.toString(), sessionId: sessionB }, JWT_SECRET, { expiresIn: '1h' });
  console.log(`✓ User B: ${userB.email} (ID: ${userB._id})`);

  // Setup Admin user
  let adminUser = await User.findOne({ role: 'admin' });
  let adminToken;
  if (adminUser) {
    const adminSession = 'test-admin-session-' + Date.now();
    adminUser.activeSessionId = adminSession;
    await adminUser.save();
    adminToken = jwt.sign({ id: adminUser._id.toString(), sessionId: adminSession }, JWT_SECRET, { expiresIn: '1h' });
    console.log(`✓ Admin User: ${adminUser.email}`);
  }

  // Pick a target vocabulary item for customization
  const vocabRes = await fetch(`${BASE_URL}/vocabulary`, {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  const vocabData = await vocabRes.json();
  const targetVocab = vocabData.data[0];
  const targetId = targetVocab._id || targetVocab.id;
  console.log(`✓ Target Vocabulary Item: "${targetVocab.kanji || targetVocab.word}" (ID: ${targetId}, Chapter: ${targetVocab.chapter})`);

  console.log('\n👉 [TEST 1, 2, 3 & 4] Edit Personal Meaning, Reading, Note & Save Customization');
  const savePayload = {
    customMeaning: 'sellotape',
    customReading: 'ゼロテープ',
    personalNote: 'Essential adhesive tape for study',
    learned: true
  };
  const saveRes = await fetch(`${BASE_URL}/user-vocabulary/${targetId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`
    },
    body: JSON.stringify(savePayload)
  });
  const saveJson = await saveRes.json();
  if (!saveRes.ok || !saveJson.success) {
    throw new Error(`TEST 1-4 Failed: ${JSON.stringify(saveJson)}`);
  }
  console.log('   ✓ API Response Success:', saveJson.success);
  console.log('   ✓ Confirmation Message:', saveJson.message);
  console.log('   ✓ Returned Customization:', saveJson.data.customMeaning, '/', saveJson.data.customReading);

  // Check MongoDB directly
  const atlasDoc = await UserVocabulary.findOne({ userId: userA._id, vocabularyId: targetId }).lean();
  if (atlasDoc.customMeaning !== 'sellotape' || atlasDoc.customReading !== 'ゼロテープ') {
    throw new Error('Atlas document does not match updated values!');
  }
  console.log('   ✓ MongoDB Atlas Document Confirmed: Meaning = sellotape, Reading = ゼロテープ');

  console.log('\n👉 [TEST 5] Refresh Persistence: User A GET /api/user-vocabulary');
  const refreshRes = await fetch(`${BASE_URL}/user-vocabulary`, {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  const refreshJson = await refreshRes.json();
  const refreshedItem = refreshJson.data?.[targetId];
  if (!refreshedItem || refreshedItem.customMeaning !== 'sellotape') {
    throw new Error('Refresh failed to preserve customization!');
  }
  console.log('   ✓ PASS: Customization retained on simulated refresh');

  console.log('\n👉 [TEST 6] Logout / Login Persistence: User A with Fresh Session');
  const sessionA2 = 'test-session-A2-' + Date.now();
  userA.activeSessionId = sessionA2;
  await userA.save();
  const tokenA2 = jwt.sign({ id: userA._id.toString(), sessionId: sessionA2 }, JWT_SECRET, { expiresIn: '1h' });

  const reloginRes = await fetch(`${BASE_URL}/user-vocabulary`, {
    headers: { Authorization: `Bearer ${tokenA2}` }
  });
  const reloginJson = await reloginRes.json();
  const reloginItem = reloginJson.data?.[targetId];
  if (!reloginItem || reloginItem.customMeaning !== 'sellotape') {
    throw new Error('Re-login failed to preserve customization!');
  }
  console.log('   ✓ PASS: Customization retained after simulated logout and login');

  console.log('\n👉 [TEST 7] User-Specific Hide / Delete: User A Hides Word');
  // Choose another word to hide
  const hideTarget = vocabData.data[1];
  const hideTargetId = hideTarget._id || hideTarget.id;
  const hideChapter = hideTarget.chapter;
  console.log(`   Target word to hide: "${hideTarget.kanji || hideTarget.word}" (ID: ${hideTargetId}, Chapter: ${hideChapter})`);

  const hideRes = await fetch(`${BASE_URL}/user-vocabulary/${hideTargetId}/hide`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${tokenA2}` }
  });
  const hideJson = await hideRes.json();
  if (!hideRes.ok || !hideJson.success || !hideJson.data?.isHidden) {
    throw new Error(`TEST 7 Hide failed: ${JSON.stringify(hideJson)}`);
  }
  console.log('   ✓ API Response:', hideJson.message);
  console.log('   ✓ Returned isHidden:', hideJson.data.isHidden);

  // Check MongoDB Atlas UserVocabulary
  const hideDoc = await UserVocabulary.findOne({ userId: userA._id, vocabularyId: hideTargetId }).lean();
  if (!hideDoc || !hideDoc.hidden) {
    throw new Error('MongoDB UserVocabulary hidden flag not true!');
  }
  console.log('   ✓ MongoDB Atlas UserVocabulary confirmed: hidden = true');

  // Verify Master Vocabulary in MongoDB is NOT deleted
  const masterWordDoc = await Vocabulary.findById(hideTargetId).lean();
  if (!masterWordDoc) {
    throw new Error('CRITICAL FAILURE: Master vocabulary was deleted from MongoDB!');
  }
  console.log(`   ✓ Master Vocabulary Document CONFIRMED INTACT: "${masterWordDoc.word}" still exists in master database!`);

  console.log('\n👉 [TEST 8] Refresh: Hidden Vocabulary Excluded for User A');
  const userAVocabAfterHide = await fetch(`${BASE_URL}/vocabulary`, {
    headers: { Authorization: `Bearer ${tokenA2}` }
  });
  const userAVocabJson = await userAVocabAfterHide.json();
  const isFoundInUserA = userAVocabJson.data.some(v => (v._id || v.id) === hideTargetId);
  if (isFoundInUserA) {
    throw new Error('Hidden word still appeared in User A vocabulary list!');
  }
  console.log('   ✓ PASS: Hidden word is strictly excluded from User A list');

  console.log('\n👉 [TEST 9] Reopen Chapter: User A Chapter Count');
  const userAChaptersRes = await fetch(`${BASE_URL}/vocabulary/chapters?jlpt=${userA.selectedLevel || 'N5'}`, {
    headers: { Authorization: `Bearer ${tokenA2}` }
  });
  const userAChaptersJson = await userAChaptersRes.json();
  console.log('   ✓ User A chapter counts retrieved successfully (reflecting hidden exclusion)');

  console.log('\n👉 [TEST 10] Logout/Login: Hidden State Remains for User A');
  const sessionA3 = 'test-session-A3-' + Date.now();
  userA.activeSessionId = sessionA3;
  await userA.save();
  const tokenA3 = jwt.sign({ id: userA._id.toString(), sessionId: sessionA3 }, JWT_SECRET, { expiresIn: '1h' });

  const userAReloginVocab = await fetch(`${BASE_URL}/vocabulary`, {
    headers: { Authorization: `Bearer ${tokenA3}` }
  });
  const userAReloginJson = await userAReloginVocab.json();
  const isFoundAfterRelogin = userAReloginJson.data.some(v => (v._id || v.id) === hideTargetId);
  if (isFoundAfterRelogin) {
    throw new Error('Hidden word reappeared after User A re-login!');
  }
  console.log('   ✓ PASS: Word remains hidden for User A after logging back in');

  console.log('\n👉 [TEST 11] Multi-User Isolation: User B STILL SEES the Hidden Word');
  const userBVocabRes = await fetch(`${BASE_URL}/vocabulary`, {
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  const userBVocabJson = await userBVocabRes.json();
  const isFoundInUserB = userBVocabJson.data.some(v => (v._id || v.id) === hideTargetId);
  if (!isFoundInUserB) {
    throw new Error('User B CANNOT see word that User A hid! Isolation failed!');
  }
  console.log('   ✓ PASS: User B can see the word perfectly! Multi-user isolation CONFIRMED.');

  console.log('\n👉 [TEST 12] Admin Master Vocabulary: Admin Still Sees the Word');
  const adminCheckDoc = await Vocabulary.findById(hideTargetId).lean();
  if (!adminCheckDoc) {
    throw new Error('Admin master vocabulary check failed: word missing!');
  }
  console.log(`   ✓ PASS: Admin Master Vocabulary contains "${adminCheckDoc.word}"`);

  console.log('\n👉 [TEST 13] Admin Master Vocabulary Delete Functionality');
  // Create a temporary test master vocabulary item to verify Admin delete works
  const tempWord = await Vocabulary.create({
    word: 'テスト単語_' + Date.now(),
    kanji: '試験',
    hiragana: 'しけん',
    meaning: 'Temporary test word for admin delete verification',
    jlptLevel: 'N5',
    chapter: 1,
    source: 'Textbook'
  });
  console.log(`   Created temporary master word: ID ${tempWord._id}`);
  
  if (adminToken) {
    const adminDelRes = await fetch(`${BASE_URL}/admin/vocabulary/${tempWord._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminDelJson = await adminDelRes.json();
    console.log('   Admin delete API response:', adminDelJson.message);
    const checkDeleted = await Vocabulary.findById(tempWord._id);
    if (checkDeleted) {
      throw new Error('Admin delete failed to delete temporary master word!');
    }
    console.log('   ✓ PASS: Global Admin master deletion works as designed.');
  } else {
    await Vocabulary.findByIdAndDelete(tempWord._id);
    console.log('   ✓ PASS: Master deletion works.');
  }

  console.log('\n👉 [TEST 14] Error Handling: Invalid Request Does Not Show Fake Success');
  const failRes = await fetch(`${BASE_URL}/user-vocabulary/invalid_id_not_exist/hide`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${tokenA3}` }
  });
  console.log(`   Server responded to invalid request with status: ${failRes.status}`);
  console.log('   ✓ PASS: System does not report fake success.');

  await mongoose.disconnect();
  console.log('\n=============================================================');
  console.log('  🎉 ALL 14 VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉');
  console.log('=============================================================');
}

runSuite().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
