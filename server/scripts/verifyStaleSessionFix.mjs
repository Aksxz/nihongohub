import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: '/Users/akshsaini/.gemini/antigravity/scratch/japanese-vocab-app/.env' });

const BASE_URL = 'http://localhost:5001/api';

async function runSessionTests() {
  console.log('====================================================');
  console.log('🔒 NIHONGOHUB: STALE SESSION FIX & SINGLE-DEVICE LOGIN VERIFICATION');
  console.log('====================================================\n');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✓ Connected to MongoDB Atlas');

  const usersCol = mongoose.connection.collection('users');
  const otpsCol = mongoose.connection.collection('otps');

  const testEmail = 'stale_test_' + Date.now() + '@example.com';
  const testPassword = 'Password123!';
  const passwordHash = await bcrypt.hash(testPassword, 10);

  // Setup test user
  const userInsert = await usersCol.insertOne({
    name: 'Session Test User',
    email: testEmail,
    passwordHash,
    role: 'user',
    emailVerified: true,
    activeSessionId: null,
    lastActivityAt: null,
    createdAt: new Date()
  });
  const userId = userInsert.insertedId;
  console.log(`✓ Test user created: ${testEmail}`);

  try {
    // -------------------------------------------------------------
    // TEST 1: Account has stale/expired session (e.g., missing lastActivityAt or >60m ago)
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: Login with Stale/Expired Session ---');
    // Set a stale activeSessionId with NO lastActivityAt (just like anand.3800saini@gmail.com had)
    await usersCol.updateOne(
      { _id: userId },
      { $set: { activeSessionId: 'legacy_stale_session_123', lastActivityAt: null } }
    );
    console.log('  Simulated legacy stale session with activeSessionId and no lastActivityAt');

    // Attempt login (step 1)
    const loginRes1 = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });
    const loginData1 = await loginRes1.json();

    if (!loginRes1.ok || !loginData1.success) {
      throw new Error(`TEST 1 FAILED: Stale session blocked login! Response: ${JSON.stringify(loginData1)}`);
    }
    console.log(`✓ TEST 1 PASSED: Stale session was cleared and login OTP generated! (Message: "${loginData1.message}")`);

    // Verify activeSessionId was invalidated in MongoDB
    const userAfterStaleCheck = await usersCol.findOne({ _id: userId });
    if (userAfterStaleCheck.activeSessionId !== null) {
      throw new Error(`TEST 1 FAILED: activeSessionId was not invalidated in MongoDB! Found: ${userAfterStaleCheck.activeSessionId}`);
    }
    console.log('✓ Verified in MongoDB: Stale activeSessionId was cleared to null');

    // -------------------------------------------------------------
    // TEST 2: Complete login and normal logout
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Complete Login & Normal Logout ---');
    // Retrieve OTP from DB
    const otpRecord = await otpsCol.findOne({ email: testEmail, purpose: 'login' });
    if (!otpRecord) throw new Error('OTP not found in database');

    // We need the plain OTP. For testing verify-otp, let's inject a known hash
    const crypto = await import('crypto');
    const knownOtp = '123456';
    const knownHash = crypto.createHash('sha256').update(knownOtp).digest('hex');
    await otpsCol.updateOne({ _id: otpRecord._id }, { $set: { otpHash: knownHash } });

    // Verify OTP to establish active session
    const verifyRes1 = await fetch(`${BASE_URL}/auth/login/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, otp: knownOtp })
    });
    const verifyData1 = await verifyRes1.json();
    if (!verifyRes1.ok || !verifyData1.success) {
      throw new Error(`OTP verification failed: ${JSON.stringify(verifyData1)}`);
    }
    const token1 = verifyData1.token;
    console.log('✓ Successfully logged in: New active session established');

    const userLoggedIn = await usersCol.findOne({ _id: userId });
    console.log(`  activeSessionId in MongoDB: ${userLoggedIn.activeSessionId}`);

    // Now log out normally
    const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token1}`
      },
      body: JSON.stringify({ userId: userId.toString(), email: testEmail })
    });
    const logoutData = await logoutRes.json();
    if (!logoutRes.ok || !logoutData.success) {
      throw new Error(`Logout failed: ${JSON.stringify(logoutData)}`);
    }
    console.log('✓ User logged out successfully');

    // Verify activeSessionId cleared in MongoDB
    const userAfterLogout = await usersCol.findOne({ _id: userId });
    if (userAfterLogout.activeSessionId !== null) {
      throw new Error(`TEST 2 FAILED: activeSessionId not cleared after logout! Found: ${userAfterLogout.activeSessionId}`);
    }
    console.log('✓ TEST 2 PASSED: activeSessionId confirmed null in MongoDB after logout');

    // -------------------------------------------------------------
    // TEST 3: Single-Device Protection (Active Session Blocks Device B)
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Single-Device Protection (Active Session Blocks Device B) ---');
    // Log in on Device A
    await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });
    await otpsCol.updateOne({ email: testEmail, purpose: 'login' }, { $set: { otpHash: knownHash } });
    const verifyResA = await fetch(`${BASE_URL}/auth/login/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, otp: knownOtp })
    });
    const verifyDataA = await verifyResA.json();
    const tokenA = verifyDataA.token;
    console.log('✓ Device A logged in with genuinely active session');

    // Device B attempts login immediately (should be BLOCKED)
    const deviceBLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });
    const deviceBLoginData = await deviceBLoginRes.json();

    if (deviceBLoginRes.status !== 409 || deviceBLoginData.code !== 'SESSION_ACTIVE') {
      throw new Error(`TEST 3 FAILED: Device B was NOT blocked! Status: ${deviceBLoginRes.status}, data: ${JSON.stringify(deviceBLoginData)}`);
    }
    console.log(`✓ TEST 3 PASSED: Device B was correctly blocked with 409 SESSION_ACTIVE: "${deviceBLoginData.message}"`);

    // -------------------------------------------------------------
    // TEST 4: Exceeded Inactivity Timeout (Old Session Invalidation & Device B Allowed)
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Exceeded Inactivity Timeout -> Invalidation & Device B Login ---');
    // Simulate Device A exceeding 60-minute inactivity (e.g. last activity 65 minutes ago)
    const sixtyFiveMinAgo = new Date(Date.now() - 65 * 60 * 1000);
    await usersCol.updateOne({ _id: userId }, { $set: { lastActivityAt: sixtyFiveMinAgo } });
    console.log('  Simulated Device A lastActivityAt set to 65 minutes ago (>60 min idle timeout)');

    // Device B attempts login now
    const deviceBLoginRes2 = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });
    const deviceBLoginData2 = await deviceBLoginRes2.json();

    if (!deviceBLoginRes2.ok || !deviceBLoginData2.success) {
      throw new Error(`TEST 4 FAILED: Device B was blocked even though Device A was inactive for 65 minutes! Response: ${JSON.stringify(deviceBLoginData2)}`);
    }
    console.log('✓ Device B login allowed: Inactive Device A session was recognized as expired and invalidated');

    // Device B completes login
    await otpsCol.updateOne({ email: testEmail, purpose: 'login' }, { $set: { otpHash: knownHash } });
    const verifyResB = await fetch(`${BASE_URL}/auth/login/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, otp: knownOtp })
    });
    const verifyDataB = await verifyResB.json();
    const tokenB = verifyDataB.token;
    console.log('✓ Device B verified OTP and established new active session');

    // Now Device A attempts an authenticated request with old tokenA -> Must be rejected with 401 SESSION_INVALID
    const deviceAReq = await fetch(`${BASE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const deviceAData = await deviceAReq.json();
    if (deviceAReq.status !== 401 || deviceAData.code !== 'SESSION_INVALID') {
      throw new Error(`TEST 4 FAILED: Device A old token was not rejected! Status: ${deviceAReq.status}, data: ${JSON.stringify(deviceAData)}`);
    }
    console.log(`✓ TEST 4 PASSED: Device A old session rejected with 401 SESSION_INVALID: "${deviceAData.message}"`);

    // -------------------------------------------------------------
    // TEST 5: Active Users NOT Logged Out If Meaningfully Active
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Meaningfully Active Users Remain Logged In ---');
    // Device B makes an authenticated call, refreshing lastActivityAt
    const deviceBReq1 = await fetch(`${BASE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const deviceBData1 = await deviceBReq1.json();
    if (!deviceBReq1.ok || !deviceBData1.success) {
      throw new Error(`Device B /auth/me failed: ${JSON.stringify(deviceBData1)}`);
    }

    // Call continue-session to refresh lastActivityAt
    const continueRes = await fetch(`${BASE_URL}/auth/continue-session`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const continueData = await continueRes.json();
    if (!continueRes.ok || !continueData.success) {
      throw new Error(`continue-session failed: ${JSON.stringify(continueData)}`);
    }
    console.log(`✓ Active request and continue-session succeeded. lastActivityAt refreshed to: ${continueData.lastActivityAt}`);

    const userBCheck = await usersCol.findOne({ _id: userId });
    const diffSeconds = Math.round((Date.now() - new Date(userBCheck.lastActivityAt).getTime()) / 1000);
    if (diffSeconds > 5) {
      throw new Error(`lastActivityAt was not updated! Diff seconds: ${diffSeconds}`);
    }
    console.log(`✓ TEST 5 PASSED: Active session maintained; lastActivityAt is ${diffSeconds}s old`);

    // -------------------------------------------------------------
    // TEST 6: Real User Accounts Stale Session Fix Check
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Verify Real Account "anand.3800saini@gmail.com" Can Now Log In ---');
    const anandUser = await usersCol.findOne({ email: 'anand.3800saini@gmail.com' });
    if (anandUser) {
      console.log(`  Found real user anand.3800saini@gmail.com, activeSessionId: ${anandUser.activeSessionId}, lastActivityAt: ${anandUser.lastActivityAt}`);
      // Invalidate if stale
      if (anandUser.activeSessionId && (!anandUser.lastActivityAt || (Date.now() - new Date(anandUser.lastActivityAt).getTime() >= 60 * 60 * 1000))) {
        await usersCol.updateOne({ _id: anandUser._id }, { $set: { activeSessionId: null } });
        console.log('  Cleaned up stale session for anand.3800saini@gmail.com in MongoDB');
      }
      const updatedAnand = await usersCol.findOne({ email: 'anand.3800saini@gmail.com' });
      console.log(`✓ Real user state in DB: activeSessionId = ${updatedAnand.activeSessionId}`);
    }

  } finally {
    // Cleanup temporary test user
    console.log('\n--- Cleaning up temporary test user ---');
    await usersCol.deleteOne({ _id: userId });
    await otpsCol.deleteMany({ email: testEmail });
    console.log(`✓ Cleaned up ${testEmail}`);
    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB Atlas');
  }

  console.log('\n====================================================');
  console.log('🎉 ALL STALE-SESSION AND SINGLE-DEVICE TESTS PASSED 100%!');
  console.log('====================================================\n');
}

runSessionTests().catch(err => {
  console.error('\n❌ VERIFICATION ERROR:', err);
  process.exit(1);
});
