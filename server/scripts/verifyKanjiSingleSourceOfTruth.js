import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Kanji } from '../models/Kanji.js';
import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';

dotenv.config();

const API_BASE = 'http://localhost:5001/api';

async function runVerification() {
  console.log('--- STARTING VERIFICATION: KANJI SINGLE SOURCE OF TRUTH ---');
  await mongoose.connect(process.env.MONGO_URI, { dbName: 'nihongohub' });
  console.log('✓ Connected to MongoDB:', mongoose.connection.name);

  // 1. Initial State: Count in MongoDB
  const initialCount = await Kanji.countDocuments();
  console.log(`\n[Scenario 1] MongoDB Initial Kanji Count: ${initialCount}`);

  // Test GET /api/kanji
  const getRes = await fetch(`${API_BASE}/kanji?limit=1000`).then(r => r.json());
  console.log(`[Scenario 1] GET /api/kanji response count: ${getRes.count}, total: ${getRes.total}, data.length: ${getRes.data.length}`);
  if (initialCount === 0 && getRes.data.length === 0) {
    console.log('✓ PASS: When MongoDB is empty, API returns 0 Kanji and empty data array');
  } else {
    console.error('✗ FAIL: Mismatch in initial count');
    process.exit(1);
  }

  // Obtain an auth token for mutations
  let user = await User.findOne({ email: 'admin@nihongohub.com' });
  if (!user) {
    user = await User.findOne({});
  }
  if (!user) {
    console.error('No user found in DB to sign token with');
    process.exit(1);
  }
  const sessionId = 'test-session-' + Date.now();
  user.activeSessionId = sessionId;
  await user.save();

  const secret = process.env.JWT_SECRET || 'nihongohub_jwt_secret_token_key_2026_production';
  const token = jwt.sign(
    { id: user._id, email: user.email, role: user.role || 'admin', sessionId },
    secret,
    { expiresIn: '1h' }
  );

  // 2. Scenario 5: Add 1 Kanji character directly via POST /api/kanji
  console.log('\n[Scenario 5] Adding 1 test Kanji (日) via POST /api/kanji...');
  const addRes = await fetch(`${API_BASE}/kanji`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      character: '日',
      meaning: 'Sun, Day',
      onyomi: 'ニチ, ジツ',
      kunyomi: 'ひ, か',
      jlptLevel: 'N5',
      chapter: 1,
      source: 'Textbook'
    })
  }).then(r => r.json());

  console.log('POST /api/kanji response:', addRes.success, addRes.data ? addRes.data.character : addRes.message);
  if (!addRes.success) {
    console.error('✗ Failed to add Kanji:', addRes);
    process.exit(1);
  }
  const createdId = addRes.data.id || addRes.data._id;

  const countAfterAdd = await Kanji.countDocuments();
  const getAfterAdd = await fetch(`${API_BASE}/kanji?limit=1000`).then(r => r.json());
  console.log(`MongoDB count after add: ${countAfterAdd}, GET /api/kanji count: ${getAfterAdd.count}`);
  if (countAfterAdd === 1 && getAfterAdd.count === 1 && getAfterAdd.data[0].character === '日') {
    console.log('✓ PASS: Added Kanji reflected directly in MongoDB (Count = 1) and API');
  } else {
    console.error('✗ FAIL: Kanji count not 1 after add');
    process.exit(1);
  }

  // 3. Scenario 6: Delete the Kanji character via DELETE /api/kanji/:id
  console.log(`\n[Scenario 6] Deleting Kanji (${createdId}) via DELETE /api/kanji/:id...`);
  const delRes = await fetch(`${API_BASE}/kanji/${createdId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }).then(r => r.json());

  console.log('DELETE /api/kanji response:', delRes.success, delRes.message);
  if (!delRes.success) {
    console.error('✗ Failed to delete Kanji:', delRes);
    process.exit(1);
  }

  const countAfterDel = await Kanji.countDocuments();
  const getAfterDel = await fetch(`${API_BASE}/kanji?limit=1000`).then(r => r.json());
  console.log(`MongoDB count after delete: ${countAfterDel}, GET /api/kanji count: ${getAfterDel.count}`);
  if (countAfterDel === 0 && getAfterDel.count === 0 && getAfterDel.data.length === 0) {
    console.log('✓ PASS: Deletion instantly removed Kanji from MongoDB (Count = 0) and API');
  } else {
    console.error('✗ FAIL: Kanji count not 0 after delete');
    process.exit(1);
  }

  // 4. Scenario 3 & 4 & 7: Check that no re-seeding occurs
  console.log('\n[Scenarios 3, 4, 7] Checking for unwanted automatic re-seeding...');
  const finalDbCount = await Kanji.countDocuments();
  console.log(`Final MongoDB Kanji collection document count: ${finalDbCount}`);
  if (finalDbCount === 0) {
    console.log('✓ PASS: MongoDB collection remains strictly at 0. Zero re-seeding!');
  } else {
    console.error('✗ FAIL: Unwanted documents found in Kanji collection');
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log('🎉 ALL KANJI SINGLE SOURCE OF TRUTH TESTS PASSED! 🎉');
  console.log('======================================================\n');
  await mongoose.disconnect();
  process.exit(0);
}

runVerification().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});
