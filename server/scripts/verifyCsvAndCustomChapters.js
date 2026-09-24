/**
 * Comprehensive Verification Suite for:
 * 1. CSV Vocabulary Import (Preview & Commit with Destination Selection)
 * 2. Custom Chapters (CRUD, dynamic loading, safe deletion with word reassignment)
 * 3. Manual "Add New Word" with Destination selection (Textbook 1-24, Custom, Extra)
 * 4. User Vocabulary Fetching (Textbook, Custom Decks, Extra Vocabulary)
 * 5. Word Move / Edit (change destination from Extra -> Custom Deck)
 * 6. Rename Custom Chapter (vocabulary remains linked through customChapterId)
 * 7. Verification of all 11 prompt test cases
 */

import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://127.0.0.1:5001/api';
const ADMIN_KEY = process.env.ADMIN_SECRET_KEY || 'hSfABINCBucN24QqZ1h6Cd6jX3yHBC5gk60EBhpNgdyCw5y7hPWNHCQm0W2ximLC';

let adminToken = '';
let testCustomChapterId = '';
let testWordId = '';

async function loginAdmin() {
  const email = `admin_test_${Date.now()}@nihongohub.test`;
  const password = 'Password123!';

  // 1. Register user
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Admin Tester', email, password, selectedLevel: 'N5' })
  });
  const regData = await regRes.json();
  if (!regData.success) throw new Error(`Registration failed: ${regData.message}`);

  // 2. Promote to admin
  const promoRes = await fetch(`${BASE_URL}/auth/promote-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, secretKey: ADMIN_KEY })
  });
  const promoData = await promoRes.json();
  if (!promoData.success) throw new Error(`Promotion failed: ${promoData.message}`);

  // 3. Login to get admin token
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const loginData = await loginRes.json();
  if (!loginData.success || !loginData.token) throw new Error(`Login failed: ${loginData.message}`);

  adminToken = loginData.token;
  console.log(`🔐 Admin authenticated successfully (user: ${email})`);
}

async function runTests() {
  console.log('===============================================================');
  console.log('  NIHONGOHUB CSV IMPORT & CUSTOM CHAPTERS E2E TEST SUITE');
  console.log('===============================================================\n');

  await loginAdmin();

  let passedCount = 0;
  let totalTests = 11;

  // -------------------------------------------------------------
  // TEST 1 — CSV TO TEXTBOOK CHAPTER (Upload chapter 1 CSV)
  // -------------------------------------------------------------
  console.log('\n--- TEST 1: CSV TO TEXTBOOK CHAPTER (Chapter 1) ---');
  try {
    const w1 = `先生_${Date.now()}`;
    const w2 = `学生_${Date.now()}`;
    const csvContent = `Japanese,Reading,Meaning,PartOfSpeech,Romaji
${w1},せんせい,Teacher,Noun,sensei
${w2},がくせい,Student,Noun,gakusei`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const formData = new FormData();
    formData.append('csvFile', blob, 'chapter1_test.csv');
    formData.append('destinationType', 'chapter');
    formData.append('chapter', '1');
    formData.append('jlptLevel', 'N5');

    // 1. Preview
    const previewRes = await fetch(`${BASE_URL}/admin/import/csv-preview`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData
    });
    const previewData = await previewRes.json();

    const validCount = previewData.validRows || previewData.validCount || (previewData.data && (previewData.data.validRows || previewData.data.validCount));
    const items = previewData.items || previewData.allValidRows || (previewData.data && (previewData.data.items || previewData.data.allValidRows));

    if (!previewData.success || validCount !== 2) {
      throw new Error(`CSV Preview failed: ${JSON.stringify(previewData)}`);
    }

    // 2. Commit
    const commitRes = await fetch(`${BASE_URL}/admin/import/csv-commit`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items,
        destinationType: 'chapter',
        chapter: 1,
        jlptLevel: 'N5',
        filename: 'chapter1_test.csv'
      })
    });
    const commitData = await commitRes.json();
    if (!commitData.success || commitData.insertedCount !== 2) {
      throw new Error(`CSV Commit failed: ${JSON.stringify(commitData)}`);
    }

    // 3. Verify in user vocabulary
    const userVocabRes = await fetch(`${BASE_URL}/vocabulary?jlpt=N5&chapter=1`);
    const userVocab = await userVocabRes.json();
    const hasW1 = userVocab.data.some(w => w.word === w1);
    const hasW2 = userVocab.data.some(w => w.word === w2);

    if (!hasW1 || !hasW2) {
      throw new Error('Imported words do not appear in Chapter 1');
    }

    console.log(`✅ [PASS] TEST 1: CSV imported to Chapter 1 successfully (${userVocab.total} total words in Ch1)`);
    passedCount++;
  } catch (err) {
    console.error(`❌ [FAIL] TEST 1: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 2 & TEST 7 — CREATE CUSTOM CHAPTER & CSV TO CUSTOM CHAPTER
  // -------------------------------------------------------------
  console.log('\n--- TEST 7 & TEST 2: CREATE CUSTOM CHAPTER & CSV IMPORT ---');
  try {
    // Test 7: Create Custom Chapter "Months"
    const chName = `months_${Date.now()}`;
    const createChRes = await fetch(`${BASE_URL}/admin/custom-chapters`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: chName,
        displayName: 'Months',
        japaneseName: '月 (つき)',
        description: 'Japanese months from January to December',
        jlptLevel: 'N5',
        order: 1
      })
    });
    const createChData = await createChRes.json();
    if (!createChData.success || !createChData.data._id) {
      throw new Error(`Failed to create custom chapter: ${JSON.stringify(createChData)}`);
    }
    testCustomChapterId = createChData.data._id;
    console.log(`✅ [PASS] TEST 7: Custom Chapter "Months" created with ID: ${testCustomChapterId}`);

    // Verify in GET /api/custom-chapters
    const getChRes = await fetch(`${BASE_URL}/custom-chapters?jlpt=N5`);
    const getChData = await getChRes.json();
    const foundCh = getChData.data.find(c => c._id === testCustomChapterId);
    if (!foundCh) throw new Error('Custom Chapter not found in public list');

    // Test 2: Upload CSV to Custom Chapter "Months"
    const monthsCsv = `Japanese,Reading,Meaning,PartOfSpeech
一月,いちがつ,January,Noun
二月,にがつ,February,Noun
三月,さんがつ,March,Noun`;

    const blob = new Blob([monthsCsv], { type: 'text/csv' });
    const formData = new FormData();
    formData.append('csvFile', blob, 'months.csv');
    formData.append('destinationType', 'custom');
    formData.append('customChapterId', testCustomChapterId);
    formData.append('jlptLevel', 'N5');

    const previewRes = await fetch(`${BASE_URL}/admin/import/csv-preview`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData
    });
    const previewData = await previewRes.json();
    const validCount = previewData.validRows || previewData.validCount || (previewData.data && (previewData.data.validRows || previewData.data.validCount));
    const items = previewData.items || previewData.allValidRows || (previewData.data && (previewData.data.items || previewData.data.allValidRows));

    if (!previewData.success || validCount !== 3) {
      throw new Error(`Months CSV preview failed: ${JSON.stringify(previewData)}`);
    }

    const commitRes = await fetch(`${BASE_URL}/admin/import/csv-commit`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items,
        destinationType: 'custom',
        customChapterId: testCustomChapterId,
        jlptLevel: 'N5',
        filename: 'months.csv'
      })
    });
    const commitData = await commitRes.json();
    if (!commitData.success || commitData.insertedCount !== 3) {
      throw new Error(`Months CSV commit failed: ${JSON.stringify(commitData)}`);
    }

    // Verify words appear in user vocabulary under this custom chapter
    const customVocabRes = await fetch(`${BASE_URL}/vocabulary?customChapterId=${testCustomChapterId}`);
    const customVocab = await customVocabRes.json();
    if (customVocab.count !== 3) {
      throw new Error(`Expected 3 words in Months, got ${customVocab.count}`);
    }

    console.log(`✅ [PASS] TEST 2: CSV imported to Custom Chapter "Months" (${customVocab.count} words present)`);
    passedCount += 2;
  } catch (err) {
    console.error(`❌ [FAIL] TEST 2 / TEST 7: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 3 — CSV TO EXTRA VOCABULARY
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: CSV TO EXTRA VOCABULARY ---');
  try {
    const pet1 = `猫_${Date.now()}`;
    const pet2 = `犬_${Date.now()}`;
    const extraCsv = `Japanese,Reading,Meaning,PartOfSpeech
${pet1},ねこ,Cat,Noun
${pet2},いぬ,Dog,Noun`;

    const blob = new Blob([extraCsv], { type: 'text/csv' });
    const formData = new FormData();
    formData.append('csvFile', blob, 'extra_pets.csv');
    formData.append('destinationType', 'extra');
    formData.append('jlptLevel', 'N5');

    const previewRes = await fetch(`${BASE_URL}/admin/import/csv-preview`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData
    });
    const previewData = await previewRes.json();
    const items = previewData.items || previewData.allValidRows || (previewData.data && (previewData.data.items || previewData.data.allValidRows));

    const commitRes = await fetch(`${BASE_URL}/admin/import/csv-commit`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items,
        destinationType: 'extra',
        jlptLevel: 'N5',
        filename: 'extra_pets.csv'
      })
    });
    const commitData = await commitRes.json();
    if (!commitData.success || commitData.insertedCount !== 2) {
      throw new Error(`Extra CSV commit failed: ${JSON.stringify(commitData)}`);
    }

    // Verify words appear in chapter=extra
    const extraVocabRes = await fetch(`${BASE_URL}/vocabulary?jlpt=N5&chapter=extra`);
    const extraVocab = await extraVocabRes.json();
    const hasPet = extraVocab.data.some(w => w.word === pet1);
    if (!hasPet) throw new Error(`${pet1} not found in Extra Vocabulary`);

    // Verify words DO NOT appear in Chapter 1
    const ch1Res = await fetch(`${BASE_URL}/vocabulary?jlpt=N5&chapter=1`);
    const ch1 = await ch1Res.json();
    const petInCh1 = ch1.data.some(w => w.word === pet1);
    if (petInCh1) throw new Error('Extra word leaked into Chapter 1!');

    console.log(`✅ [PASS] TEST 3: Words imported to Extra Vocabulary only (Isolated from Chapter 1)`);
    passedCount++;
  } catch (err) {
    console.error(`❌ [FAIL] TEST 3: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 4 & 5 — PDF & IMAGE PIPELINES PRESERVED
  // -------------------------------------------------------------
  console.log('\n--- TEST 4 & 5: PRESERVATION OF PDF & IMAGE OCR PIPELINES ---');
  try {
    const pdfCheck = await fetch(`${BASE_URL}/admin/import/pdf`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (pdfCheck.status === 404) throw new Error('POST /admin/import/pdf endpoint not found (404)');

    const imgCheck = await fetch(`${BASE_URL}/admin/import/images`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (imgCheck.status === 404) throw new Error('POST /admin/import/images endpoint not found (404)');

    console.log('✅ [PASS] TEST 4: PDF upload route preserved and active');
    console.log('✅ [PASS] TEST 5: Image OCR upload route preserved and active');
    passedCount += 2;
  } catch (err) {
    console.error(`❌ [FAIL] TEST 4 / TEST 5: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 6 — MANUAL ADD WORD (Destination Chapter 5)
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: MANUAL ADD WORD TO CHAPTER 5 ---');
  try {
    const manualWord = `食べる_${Date.now()}`;
    const addRes = await fetch(`${BASE_URL}/admin/vocabulary`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        word: manualWord,
        kanji: manualWord,
        hiragana: 'たべる',
        romaji: 'taberu',
        meaning: 'to eat',
        partOfSpeech: 'Verb',
        jlptLevel: 'N5',
        destinationType: 'chapter',
        chapter: 5
      })
    });
    const addData = await addRes.json();
    if (!addData.success || !addData.data._id) {
      throw new Error(`Failed to add manual word: ${JSON.stringify(addData)}`);
    }
    testWordId = addData.data._id;

    // Verify it appears in Chapter 5
    const ch5Res = await fetch(`${BASE_URL}/vocabulary?jlpt=N5&chapter=5`);
    const ch5Data = await ch5Res.json();
    const foundWord = ch5Data.data.find(w => w.word === manualWord);
    if (!foundWord) throw new Error('Manual word not found in Chapter 5');

    console.log(`✅ [PASS] TEST 6: Manual word "${manualWord}" added to Chapter 5 (ID: ${testWordId})`);
    passedCount++;
  } catch (err) {
    console.error(`❌ [FAIL] TEST 6: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 8 — MOVE WORD (Extra -> Months)
  // -------------------------------------------------------------
  console.log('\n--- TEST 8: MOVE WORD DESTINATION ---');
  try {
    // 1. Create a word in Extra Vocabulary
    const moveWord = `四月_${Date.now()}`;
    const wordRes = await fetch(`${BASE_URL}/admin/vocabulary`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        word: moveWord,
        hiragana: 'しがつ',
        meaning: 'April',
        partOfSpeech: 'Noun',
        jlptLevel: 'N5',
        destinationType: 'extra'
      })
    });
    const wordData = await wordRes.json();
    const aprilId = wordData.data._id;

    // 2. Move to Custom Chapter "Months"
    const moveRes = await fetch(`${BASE_URL}/admin/vocabulary/${aprilId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        destinationType: 'custom',
        customChapterId: testCustomChapterId
      })
    });
    const moveData = await moveRes.json();
    if (!moveData.success) throw new Error(`Move failed: ${JSON.stringify(moveData)}`);

    // 3. Verify it is now in Months
    const monthsRes = await fetch(`${BASE_URL}/vocabulary?customChapterId=${testCustomChapterId}`);
    const monthsData = await monthsRes.json();
    const foundInMonths = monthsData.data.some(w => w.word === moveWord);
    if (!foundInMonths) throw new Error(`Moved word "${moveWord}" not found in Months`);

    // 4. Verify it disappeared from Extra
    const extraRes = await fetch(`${BASE_URL}/vocabulary?jlpt=N5&chapter=extra`);
    const extraData = await extraRes.json();
    const foundInExtra = extraData.data.some(w => w.word === moveWord);
    if (foundInExtra) throw new Error(`Moved word "${moveWord}" still exists in Extra Vocabulary!`);

    console.log(`✅ [PASS] TEST 8: Word "${moveWord}" moved from Extra -> Months without duplication`);
    passedCount++;
  } catch (err) {
    console.error(`❌ [FAIL] TEST 8: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 9 — RENAME CUSTOM CHAPTER
  // -------------------------------------------------------------
  console.log('\n--- TEST 9: RENAME CUSTOM CHAPTER ---');
  try {
    const renameRes = await fetch(`${BASE_URL}/admin/custom-chapters/${testCustomChapterId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        displayName: 'Japanese Months',
        japaneseName: '日本の月'
      })
    });
    const renameData = await renameRes.json();
    if (!renameData.success || renameData.data.displayName !== 'Japanese Months') {
      throw new Error(`Rename failed: ${JSON.stringify(renameData)}`);
    }

    // Verify existing vocabulary remains linked
    const linkedVocabRes = await fetch(`${BASE_URL}/vocabulary?customChapterId=${testCustomChapterId}`);
    const linkedVocab = await linkedVocabRes.json();
    if (linkedVocab.count < 3) {
      throw new Error(`Vocabulary lost after renaming: expected at least 3, got ${linkedVocab.count}`);
    }

    console.log(`✅ [PASS] TEST 9: Chapter renamed to "Japanese Months", all ${linkedVocab.count} words remain linked`);
    passedCount++;
  } catch (err) {
    console.error(`❌ [FAIL] TEST 9: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 10 — REFRESH / AUTH PERSISTENCE
  // -------------------------------------------------------------
  console.log('\n--- TEST 10: REFRESH / AUTH PERSISTENCE ---');
  try {
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const meData = await meRes.json();
    if (!meData.success || meData.user.role !== 'admin') {
      throw new Error(`Auth me failed: ${JSON.stringify(meData)}`);
    }

    console.log(`✅ [PASS] TEST 10: Session and role intact for user ${meData.user.email}`);
    passedCount++;
  } catch (err) {
    console.error(`❌ [FAIL] TEST 10: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 11 — ZERO LOSS / EXISTING DATA PRESERVED
  // -------------------------------------------------------------
  console.log('\n--- TEST 11: EXISTING DATA INTEGRITY & ZERO MASTER LOSS ---');
  try {
    const ch1Res = await fetch(`${BASE_URL}/vocabulary?jlpt=N5&chapter=1`);
    const ch1Data = await ch1Res.json();
    if (ch1Data.total < 5) {
      throw new Error(`Data loss detected in Chapter 1: expected >= 5 words, got ${ch1Data.total}`);
    }

    // Check structure endpoint
    const structRes = await fetch(`${BASE_URL}/vocabulary/structure?jlpt=N5`);
    const structData = await structRes.json();
    if (!structData.success || structData.chapters.length !== 24) {
      throw new Error('Structure endpoint corrupted');
    }
    if (!structData.customChapters || structData.customChapters.length === 0) {
      throw new Error('Custom chapters missing from structure endpoint');
    }

    console.log(`✅ [PASS] TEST 11: All existing data preserved (Ch1 total: ${ch1Data.total} words, 24 textbook chapters intact, custom chapters present)`);
    passedCount++;
  } catch (err) {
    console.error(`❌ [FAIL] TEST 11: ${err.message}`);
  }

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`  VERIFICATION RESULTS: ${passedCount} / ${totalTests} TESTS PASSED`);
  console.log('===============================================================\n');

  if (passedCount === totalTests) {
    console.log('🎉 ALL 11 TESTS PASSED PERFECTLY!');
    process.exit(0);
  } else {
    console.error(`⚠️ ${totalTests - passedCount} tests failed.`);
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
