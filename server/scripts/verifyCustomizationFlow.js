import 'dotenv/config';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { User } from '/Users/akshsaini/.gemini/antigravity/scratch/japanese-vocab-app/server/models/User.js';
import { Vocabulary } from '/Users/akshsaini/.gemini/antigravity/scratch/japanese-vocab-app/server/models/Vocabulary.js';
import { UserVocabulary } from '/Users/akshsaini/.gemini/antigravity/scratch/japanese-vocab-app/server/models/UserVocabulary.js';

async function testFullFlow() {
  console.log('=== Step 1: Connecting to MongoDB Atlas for verification ===');
  await mongoose.connect(process.env.MONGO_URI, {
    maxPoolSize: 20,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 15000,
    family: 4,
  });
  console.log('Connected to MongoDB Atlas:', mongoose.connection.name);

  // Find a user or get admin user
  const user = await User.findOne({});
  if (!user) {
    console.error('No user found in database!');
    process.exit(1);
  }
  console.log(`Using user ID: ${user._id} (email: ${user.email})`);

  // Ensure activeSessionId exists
  const sessionId = 'test-session-' + Date.now();
  user.activeSessionId = sessionId;
  await user.save();

  const secret = process.env.JWT_SECRET || 'nihongohub_jwt_secret_token_key_2026_production';
  const token = jwt.sign({ id: user._id.toString(), sessionId }, secret, { expiresIn: '1h' });

  // 1. GET /api/vocabulary from running server
  console.log('\n=== Step 2: Testing GET /api/vocabulary via HTTP ===');
  const vocabRes = await fetch('http://localhost:5001/api/vocabulary', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const vocabData = await vocabRes.json();
  console.log(`GET /api/vocabulary status: ${vocabRes.status}, count: ${vocabData.count || vocabData.data?.length}`);
  if (!vocabRes.ok || !vocabData.data || vocabData.data.length === 0) {
    console.error('Failed to get vocabulary from server');
    process.exit(1);
  }

  const targetVocab = vocabData.data[0];
  const targetId = targetVocab._id || targetVocab.id;
  console.log(`Target vocabulary item: ${targetVocab.kanji || targetVocab.kana} (ID: ${targetId})`);

  // 2. PUT /api/user-vocabulary/:id with customization
  console.log('\n=== Step 3: Saving Personal Customization via HTTP PUT ===');
  const updatePayload = {
    customMeaning: 'sellotape',
    customReading: 'ゼロテープ',
    learned: true
  };

  const putRes = await fetch(`http://localhost:5001/api/user-vocabulary/${targetId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(updatePayload)
  });
  const putData = await putRes.json();
  console.log(`PUT /api/user-vocabulary/${targetId} status: ${putRes.status}`);
  console.log('PUT response:', JSON.stringify(putData));

  if (!putRes.ok || !putData.success) {
    console.error('PUT request failed!');
    process.exit(1);
  }

  // 3. Verify directly in MongoDB Atlas
  console.log('\n=== Step 4: Direct MongoDB Atlas Verification ===');
  const directDoc = await UserVocabulary.findOne({
    userId: user._id,
    vocabularyId: targetId
  }).lean();

  console.log('MongoDB Atlas document retrieved directly:');
  console.log({
    _id: directDoc._id,
    userId: directDoc.userId.toString(),
    vocabularyId: directDoc.vocabularyId,
    customMeaning: directDoc.customMeaning,
    customReading: directDoc.customReading,
    learned: directDoc.learned
  });

  const matchesExpected = directDoc &&
    directDoc.customMeaning === 'sellotape' &&
    directDoc.customReading === 'ゼロテープ' &&
    directDoc.learned === true;

  console.log(`Document matches expected values: ${matchesExpected ? 'YES (CONFIRMED)' : 'NO'}`);

  // 4. Verify GET /api/user-vocabulary (simulating page reload/refresh)
  console.log('\n=== Step 5: Simulating Page Refresh (GET /api/user-vocabulary) ===');
  const getOverlayRes = await fetch('http://localhost:5001/api/user-vocabulary', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const getOverlayData = await getOverlayRes.json();
  const savedItem = getOverlayData.data?.[targetId];
  console.log('Retrieved from GET /api/user-vocabulary after refresh:');
  console.log(savedItem);

  const getOverlayConfirmed = savedItem &&
    savedItem.customMeaning === 'sellotape' &&
    savedItem.customReading === 'ゼロテープ' &&
    savedItem.isLearned === true;

  console.log(`Customization preserved after refresh: ${getOverlayConfirmed ? 'PASS' : 'FAIL'}`);

  // 5. Simulating logout/login with a new session ID
  console.log('\n=== Step 6: Simulating Logout and Login with New Session ===');
  const newSessionId = 'test-session-relogin-' + Date.now();
  user.activeSessionId = newSessionId;
  await user.save();
  const newToken = jwt.sign({ id: user._id.toString(), sessionId: newSessionId }, secret, { expiresIn: '1h' });

  const reloginRes = await fetch('http://localhost:5001/api/user-vocabulary', {
    headers: { 'Authorization': `Bearer ${newToken}` }
  });
  const reloginData = await reloginRes.json();
  const reloginItem = reloginData.data?.[targetId];
  console.log('Retrieved after re-login:');
  console.log(reloginItem);

  const reloginConfirmed = reloginItem &&
    reloginItem.customMeaning === 'sellotape' &&
    reloginItem.customReading === 'ゼロテープ' &&
    reloginItem.isLearned === true;

  console.log(`Customization preserved after logout/login: ${reloginConfirmed ? 'PASS' : 'FAIL'}`);

  await mongoose.disconnect();
  console.log('\n=== All verification tests completed successfully! ===');
}

testFullFlow().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
