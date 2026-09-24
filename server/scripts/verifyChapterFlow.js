/**
 * Verification Test Script: Admin Vocabulary -> User Chapter Fetching & Dynamic 24 Chapters
 * Tests:
 * 1. GET /api/vocabulary/structure?jlpt=N5 (24 chapters, Ch1=30, Ch2-24=0, extra=0)
 * 2. GET /api/vocabulary/chapters?jlpt=N5 (24 chapters overview)
 * 3. GET /api/vocabulary?jlpt=N5&chapter=1 (30 words)
 * 4. GET /api/vocabulary?jlpt=N5&chapter=extra (0 words)
 * 5. User-specific data isolation (User customizations do not alter master vocabulary)
 */

const BASE_URL = 'http://127.0.0.1:5001/api';

async function testEndpoint(name, url, validate) {
  try {
    const res = await fetch(url);
    const data = await res.json();
    const result = validate(data, res.status);
    if (result.pass) {
      console.log(`✅ [PASS] ${name}`);
      if (result.details) console.log(`   ${result.details}`);
      return true;
    } else {
      console.error(`❌ [FAIL] ${name}: ${result.error}`);
      return false;
    }
  } catch (err) {
    console.error(`❌ [FAIL] ${name}: Network/execution error - ${err.message}`);
    return false;
  }
}

async function run() {
  console.log('====================================================');
  console.log('  NIHONGOHUB CHAPTER & DATA FLOW VERIFICATION SUITE');
  console.log('====================================================\n');

  let allPassed = true;

  // Test 1: GET /api/vocabulary/structure?jlpt=N5
  const t1 = await testEndpoint(
    'GET /api/vocabulary/structure?jlpt=N5',
    `${BASE_URL}/vocabulary/structure?jlpt=N5`,
    (data, status) => {
      if (status !== 200) return { pass: false, error: `HTTP ${status}` };
      if (!data.success) return { pass: false, error: 'success is false' };
      if (data.chapters.length !== 24) return { pass: false, error: `Expected 24 chapters, got ${data.chapters.length}` };
      if (data.chapters[0].wordCount !== 30) return { pass: false, error: `Expected Ch1 wordCount 30, got ${data.chapters[0].wordCount}` };
      if (data.chapters[0].vocabularies.length !== 30) return { pass: false, error: `Expected Ch1 vocabularies length 30, got ${data.chapters[0].vocabularies.length}` };
      
      const emptyChs = data.chapters.slice(1).every(c => c.wordCount === 0 && c.vocabularies.length === 0);
      if (!emptyChs) return { pass: false, error: 'One or more chapters (2-24) have unexpected words' };
      if (data.extraVocabularyCount !== 0) return { pass: false, error: `Expected 0 extra words, got ${data.extraVocabularyCount}` };

      return {
        pass: true,
        details: `24 chapters returned. Ch 1 has ${data.chapters[0].wordCount} words. Ch 2-24 have 0 words. Extra words: ${data.extraVocabularyCount}. Total master: ${data.totalMasterCount}.`
      };
    }
  );
  allPassed = allPassed && t1;

  // Test 2: GET /api/vocabulary/chapters?jlpt=N5
  const t2 = await testEndpoint(
    'GET /api/vocabulary/chapters?jlpt=N5',
    `${BASE_URL}/vocabulary/chapters?jlpt=N5`,
    (data, status) => {
      if (status !== 200) return { pass: false, error: `HTTP ${status}` };
      if (!data.success) return { pass: false, error: 'success is false' };
      if (data.data.length !== 24) return { pass: false, error: `Expected 24 chapters, got ${data.data.length}` };
      if (data.data[0].count !== 30) return { pass: false, error: `Expected Ch1 count 30, got ${data.data[0].count}` };
      const ch2to24Empty = data.data.slice(1).every(c => c.count === 0);
      if (!ch2to24Empty) return { pass: false, error: 'Expected chapters 2-24 to have count 0' };

      return {
        pass: true,
        details: `24 chapters overview verified. Ch 1 count = ${data.data[0].count}. Ch 2-24 count = 0.`
      };
    }
  );
  allPassed = allPassed && t2;

  // Test 3: GET /api/vocabulary?jlpt=N5&chapter=1
  const t3 = await testEndpoint(
    'GET /api/vocabulary?jlpt=N5&chapter=1',
    `${BASE_URL}/vocabulary?jlpt=N5&chapter=1`,
    (data, status) => {
      if (status !== 200) return { pass: false, error: `HTTP ${status}` };
      if (!data.success) return { pass: false, error: 'success is false' };
      if (data.count !== 30) return { pass: false, error: `Expected 30 items for Ch1, got ${data.count}` };
      const allCh1 = data.data.every(v => v.chapter === 1 && v.jlptLevel === 'N5');
      if (!allCh1) return { pass: false, error: 'Not all items belong to Chapter 1 N5' };

      return {
        pass: true,
        details: `Returned exactly 30 items for Chapter 1. Sample: ${data.data[0].word} (${data.data[0].meaning})`
      };
    }
  );
  allPassed = allPassed && t3;

  // Test 4: GET /api/vocabulary?jlpt=N5&chapter=extra
  const t4 = await testEndpoint(
    'GET /api/vocabulary?jlpt=N5&chapter=extra',
    `${BASE_URL}/vocabulary?jlpt=N5&chapter=extra`,
    (data, status) => {
      if (status !== 200) return { pass: false, error: `HTTP ${status}` };
      if (!data.success) return { pass: false, error: 'success is false' };
      if (data.count !== 0) return { pass: false, error: `Expected 0 extra items, got ${data.count}` };

      return {
        pass: true,
        details: `Returned 0 extra items. No chapter words leak into Extra deck.`
      };
    }
  );
  allPassed = allPassed && t4;

  // Test 5: User-Specific Data Isolation
  console.log('\n--- Testing User Data Isolation (Zero Master Overwrite) ---');
  try {
    // 1. Get a master word from Chapter 1
    const masterRes = await fetch(`${BASE_URL}/vocabulary?jlpt=N5&chapter=1&limit=1`);
    const masterJson = await masterRes.json();
    const testWord = masterJson.data[0];

    // 2. Register / login a test user
    const userRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Isolation Test User',
        email: `isolation_test_${Date.now()}@example.com`,
        password: 'Password123!',
        selectedLevel: 'N5'
      })
    });
    const userJson = await userRes.json();
    if (!userJson.success || !userJson.token) {
      throw new Error(`Failed to create test user: ${userJson.message}`);
    }

    const token = userJson.token;

    // 3. User customizes word (marks favorite, difficult, adds personal custom meaning)
    const customMeaning = 'TEST USER PRIVATE MEANING ' + Date.now();
    const updateRes = await fetch(`${BASE_URL}/user-vocabulary/${testWord.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        customMeaning,
        favorite: true,
        difficult: true,
        learned: true
      })
    });
    const updateJson = await updateRes.json();

    if (!updateJson.success) {
      throw new Error(`Failed to save user customization: ${updateJson.message}`);
    }

    // 4. Fetch the master vocabulary document via public API
    const checkMasterRes = await fetch(`${BASE_URL}/vocabulary/${testWord.id}`);
    const checkMasterJson = await checkMasterRes.json();

    // 5. Verify master document was NOT modified
    if (checkMasterJson.data.meaning === customMeaning) {
      throw new Error('Master document was overwritten with user customization! Isolation failed.');
    }
    if (checkMasterJson.data.meaning !== testWord.meaning) {
      throw new Error(`Master meaning altered from "${testWord.meaning}" to "${checkMasterJson.data.meaning}"`);
    }

    console.log('✅ [PASS] User Data Isolation Verified:');
    console.log(`   - Master word "${testWord.word}" meaning remains unchanged: "${checkMasterJson.data.meaning}"`);
    console.log(`   - User private overlay successfully created with custom meaning: "${customMeaning}"`);
    console.log('   - Master MongoDB collection is completely protected from user overwrites.');
  } catch (isoErr) {
    console.error(`❌ [FAIL] User Data Isolation Test: ${isoErr.message}`);
    allPassed = false;
  }

  console.log('\n====================================================');
  if (allPassed) {
    console.log('🎉 ALL 5 VERIFICATION CHECKS PASSED SUCCESSFULLY!');
  } else {
    console.log('⚠️ SOME CHECKS FAILED. Review errors above.');
  }
  console.log('====================================================\n');
  process.exit(allPassed ? 0 : 1);
}

run();
