import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const API_BASE = 'http://127.0.0.1:5001/api';
const ADMIN_KEY = process.env.ADMIN_SECRET_KEY || 'hSfABINCBucN24QqZ1h6Cd6jX3yHBC5gk60EBhpNgdyCw5y7hPWNHCQm0W2ximLC';

async function runTests() {
  console.log('===============================================================');
  console.log('   NIHONGOHUB USER PROGRESS PAGE VERIFICATION TEST SUITE');
  console.log('===============================================================');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] TEST ${totalTests}: ${message}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] TEST ${totalTests}: ${message}`);
      process.exitCode = 1;
    }
  }

  // --- Step 1: Register and Promote Admin
  const adminEmail = `admin_progress_${Date.now()}@nihongohub.test`;
  const adminPassword = 'AdminPassword123!';
  const adminRegRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Admin Tester', email: adminEmail, password: adminPassword, selectedLevel: 'N5' })
  });
  const adminRegData = await adminRegRes.json();
  assert(adminRegData.success, `Admin user registered: ${adminEmail}`);

  await fetch(`${API_BASE}/auth/promote-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, secretKey: ADMIN_KEY })
  });

  const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword })
  });
  const adminLoginData = await adminLoginRes.json();
  assert(adminLoginData.success && adminLoginData.token, 'Admin authenticated successfully with token');
  const adminToken = adminLoginData.token;

  // --- Step 2: Fetch Admin Progress
  const adminProgressRes = await fetch(`${API_BASE}/progress`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const adminProgressData = await adminProgressRes.json();
  assert(adminProgressData.success === true, 'GET /api/progress succeeds for authenticated user');
  assert(typeof adminProgressData.data.overallPercentage === 'number', 'overallPercentage is a valid number');
  assert(adminProgressData.data.totalVocabulary > 0, `totalVocabulary is populated (${adminProgressData.data.totalVocabulary} words)`);
  assert(Array.isArray(adminProgressData.data.chapterProgress), 'chapterProgress is an array');
  assert(adminProgressData.data.chapterProgress.length === 24, `chapterProgress has exactly 24 textbook chapters (got ${adminProgressData.data.chapterProgress.length})`);
  assert(Array.isArray(adminProgressData.data.customChapterProgress), 'customChapterProgress is an array');
  assert(typeof adminProgressData.data.extraVocabularyProgress === 'object', 'extraVocabularyProgress is an object');

  // Check Chapter 1 specifically
  const ch1 = adminProgressData.data.chapterProgress.find(c => c.chapterNumber === 1);
  assert(ch1 && ch1.total > 0, `Chapter 1 has textbook vocabulary (${ch1?.total} words)`);

  // Check Empty Chapter (e.g. Chapter 2)
  const ch2 = adminProgressData.data.chapterProgress.find(c => c.chapterNumber === 2);
  assert(ch2 !== undefined && typeof ch2.total === 'number' && typeof ch2.percentage === 'number', 'Empty chapters (e.g. Chapter 2) have total and percentage 0 without crashing');

  // --- Step 3: Register a Brand New User (0 Progress edge case)
  const testEmail = `progress_user_${Date.now()}@nihongohub.test`;
  const registerRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'New Progress Tester',
      email: testEmail,
      password: 'SecurePassword123!',
      selectedLevel: 'N5'
    })
  });
  const registerData = await registerRes.json();
  assert(registerData.success && registerData.token, `New test user registered (${testEmail})`);
  const newUserToken = registerData.token;
  const newUserId = registerData.user.id || registerData.user._id;

  // --- Step 4: Verify New User Progress is strictly 0%
  const newProgressRes = await fetch(`${API_BASE}/progress`, {
    headers: { Authorization: `Bearer ${newUserToken}` }
  });
  const newProgressData = await newProgressRes.json();
  assert(newProgressData.success === true, 'New user can fetch /api/progress');
  assert(newProgressData.data.overallPercentage === 0, `New user has overallPercentage 0 (got ${newProgressData.data.overallPercentage}%)`);
  assert(newProgressData.data.vocabularyLearned === 0, `New user has vocabularyLearned 0 (got ${newProgressData.data.vocabularyLearned})`);
  assert(newProgressData.data.vocabularyRemaining === newProgressData.data.totalVocabulary, `New user has vocabularyRemaining === totalVocabulary (${newProgressData.data.vocabularyRemaining})`);
  assert(newProgressData.data.quizStatistics.totalQuizzes === 0, 'New user has totalQuizzes 0');

  // --- Step 5: Test Progress Isolation (Overlay learning)
  // Fetch a vocabulary word from Chapter 1
  const vocabRes = await fetch(`${API_BASE}/vocabulary?chapter=1`);
  const vocabData = await vocabRes.json();
  assert(vocabData.success && vocabData.data.length > 0, 'Fetched Chapter 1 vocabulary items');
  const targetWord = vocabData.data[0];

  // Mark word as learned for new user
  const markLearnedRes = await fetch(`${API_BASE}/user-vocabulary/${targetWord.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${newUserToken}`
    },
    body: JSON.stringify({ learned: true, favorite: true })
  });
  const markLearnedData = await markLearnedRes.json();
  assert(markLearnedData.success === true, `Marked word "${targetWord.word}" as learned for new user`);

  // Re-fetch new user progress
  const updatedProgressRes = await fetch(`${API_BASE}/progress`, {
    headers: { Authorization: `Bearer ${newUserToken}` }
  });
  const updatedProgressData = await updatedProgressRes.json();
  assert(updatedProgressData.data.vocabularyLearned === 1, `New user progress dynamically updated to 1 learned word (got ${updatedProgressData.data.vocabularyLearned})`);
  const newCh1 = updatedProgressData.data.chapterProgress.find(c => c.chapterNumber === 1);
  assert(newCh1.learned === 1, `Chapter 1 progress dynamically updated to 1 learned word (got ${newCh1.learned})`);
  assert(newCh1.percentage > 0, `Chapter 1 percentage is now > 0% (got ${newCh1.percentage}%)`);

  // Verify other user (Admin) did NOT receive this overlay (Strict user data isolation)
  const recheckAdminRes = await fetch(`${API_BASE}/progress`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const recheckAdminData = await recheckAdminRes.json();
  assert(recheckAdminData.data.userId.toString() !== newUserId.toString(), 'User IDs are strictly isolated');
  assert(recheckAdminData.data.vocabularyLearned === 0, 'Admin vocabulary learned remains 0 (no bleed across users)');

  console.log('===============================================================');
  console.log(`  VERIFICATION RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('===============================================================');
}

runTests().catch(err => {
  console.error('Test script crashed:', err);
  process.exit(1);
});
