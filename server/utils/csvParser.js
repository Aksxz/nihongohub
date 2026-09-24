/**
 * Robust, zero-dependency CSV Parser with Flexible Column Mapping & Validation
 */

// Normalizes header keys by removing spaces, underscores, hyphens, and converting to lowercase
function normalizeHeaderKey(key) {
  if (!key) return '';
  return key.toLowerCase().replace(/[\s_\-]/g, '').trim();
}

// Flexible header aliases
const HEADER_ALIASES = {
  word: [
    'japanese', 'japaneseword', 'word', 'vocabulary', 'kanji', 'kana',
    'jp', 'nihongo', '単語', '日本語'
  ],
  reading: [
    'reading', 'hiragana', 'furigana', 'kana', 'yomi', 'pronunciation',
    '読み', 'ひらがな'
  ],
  meaning: [
    'meaning', 'english', 'translation', 'definition', 'meanings',
    'englishmeaning', 'eng', '意味', '英語'
  ],
  partOfSpeech: [
    'partofspeech', 'pos', 'type', 'speech', 'wordtype', 'category', '品詞'
  ],
  exampleSentence: [
    'example', 'examplesentence', 'sentence', 'examples', '例文', '短文'
  ],
  romaji: [
    'romaji', 'roma-ji', 'romanized', 'latin'
  ],
  kanji: [
    'kanjicharacter', 'kanjionly', '漢字'
  ],
  katakana: [
    'katakana', 'カタカナ'
  ],
  jlptLevel: [
    'jlpt', 'jlptlevel', 'level'
  ],
  chapter: [
    'chapter', 'chapternumber', 'ch'
  ]
};

const VALID_POS = ['Noun', 'Verb', 'Adjective', 'Adverb', 'Particle', 'Expression', 'Counter', 'Other'];

function normalizePOS(pos) {
  if (!pos) return 'Noun';
  const clean = pos.trim().toLowerCase();
  for (const valid of VALID_POS) {
    if (valid.toLowerCase() === clean) return valid;
  }
  if (clean.includes('verb')) return 'Verb';
  if (clean.includes('adj')) return 'Adjective';
  if (clean.includes('adv')) return 'Adverb';
  if (clean.includes('noun')) return 'Noun';
  if (clean.includes('part')) return 'Particle';
  if (clean.includes('expr')) return 'Expression';
  if (clean.includes('count')) return 'Counter';
  return 'Other';
}

/**
 * Tokenize CSV text into a 2D array of strings
 */
export function parseCSVToRows(csvText) {
  if (!csvText) return [];
  // Strip UTF-8 BOM
  let text = csvText.charCodeAt(0) === 0xFEFF ? csvText.slice(1) : csvText;

  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote ("")
          currentField += '"';
          i += 2;
          continue;
        } else {
          // End of quote
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
        i++;
        continue;
      } else if (char === '\r') {
        if (nextChar === '\n') i++; // Skip \r\n
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.some(c => c !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.some(c => c !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(c => c !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Parse and validate a CSV string into structured vocabulary entries
 */
export function parseAndValidateCSV(csvText, defaultJlpt = 'N5', defaultDestination = {}) {
  const rows = parseCSVToRows(csvText);
  if (rows.length === 0) {
    return {
      success: false,
      message: 'The uploaded CSV file is empty.',
      totalRows: 0,
      validRows: [],
      invalidRows: [],
      errors: ['File contains no readable rows.']
    };
  }

  const rawHeaders = rows[0];
  const headerMap = {};

  // Map each standard field to its column index in the CSV
  rawHeaders.forEach((h, colIndex) => {
    const norm = normalizeHeaderKey(h);
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(norm) && headerMap[field] === undefined) {
        headerMap[field] = colIndex;
      }
    }
  });

  // Verify critical fields can be mapped
  if (headerMap.word === undefined) {
    // If no explicit word header, check if column 0 has Japanese text or fallback
    headerMap.word = 0;
  }
  if (headerMap.meaning === undefined && rawHeaders.length > 1) {
    // Fallback: second or third column might be meaning
    headerMap.meaning = rawHeaders.length > 2 ? 2 : 1;
  }

  const validRows = [];
  const invalidRows = [];
  const errors = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const rowNum = r + 1; // 1-indexed line number in CSV file

    // Extract values
    const word = (row[headerMap.word] || '').trim();
    const reading = headerMap.reading !== undefined ? (row[headerMap.reading] || '').trim() : '';
    const meaning = headerMap.meaning !== undefined ? (row[headerMap.meaning] || '').trim() : '';
    const partOfSpeechRaw = headerMap.partOfSpeech !== undefined ? (row[headerMap.partOfSpeech] || '').trim() : '';
    const exampleSentence = headerMap.exampleSentence !== undefined ? (row[headerMap.exampleSentence] || '').trim() : '';
    const romaji = headerMap.romaji !== undefined ? (row[headerMap.romaji] || '').trim() : '';
    const kanjiExplicit = headerMap.kanji !== undefined ? (row[headerMap.kanji] || '').trim() : '';
    const katakana = headerMap.katakana !== undefined ? (row[headerMap.katakana] || '').trim() : '';
    const rowJlpt = headerMap.jlptLevel !== undefined ? (row[headerMap.jlptLevel] || '').trim() : '';
    const rowChapter = headerMap.chapter !== undefined ? (row[headerMap.chapter] || '').trim() : '';

    // Validate required fields
    if (!word && !meaning) {
      // Empty row
      continue;
    }

    if (!word) {
      errors.push(`Row ${rowNum}: Missing Japanese Word`);
      invalidRows.push({ rowNum, row, reason: 'Missing Japanese Word' });
      continue;
    }

    if (!meaning) {
      errors.push(`Row ${rowNum}: Missing English Meaning for "${word}"`);
      invalidRows.push({ rowNum, row, word, reason: 'Missing Meaning' });
      continue;
    }

    // Determine kanji / hiragana
    const hasKanji = /[\u4e00-\u9faf]/.test(word);
    const kanji = kanjiExplicit || (hasKanji ? word : '');
    const hiragana = reading || (!hasKanji ? word : '');

    // Format item
    validRows.push({
      rowNum,
      word,
      kanji,
      hiragana,
      katakana,
      romaji,
      meaning,
      partOfSpeech: normalizePOS(partOfSpeechRaw),
      exampleSentence,
      jlptLevel: rowJlpt ? (rowJlpt.toUpperCase().startsWith('N') ? rowJlpt.toUpperCase() : `N${rowJlpt}`) : defaultJlpt,
      chapter: rowChapter ? parseInt(rowChapter, 10) : defaultDestination.chapter,
      destinationType: defaultDestination.destinationType || 'chapter',
      customChapterId: defaultDestination.customChapterId || null,
      wordType: defaultDestination.wordType || 'custom',
      source: 'CSV Import'
    });
  }

  return {
    success: true,
    totalRows: rows.length - 1,
    validCount: validRows.length,
    invalidCount: invalidRows.length,
    validRows,
    invalidRows,
    errors
  };
}

/**
 * Validates and parses a Pattern CSV file
 * Required columns: pattern, meaning, usage, example_japanese, example_english
 */
export function parseAndValidatePatternsCSV(csvText, destinationConfig = {}) {
  const rows = parseCSVToRows(csvText);
  if (!rows || rows.length < 2) {
    return {
      success: false,
      message: 'CSV file is empty or missing data rows.'
    };
  }

  const rawHeaders = rows[0];
  const headerMap = {};
  rawHeaders.forEach((h, idx) => {
    if (!h) return;
    const clean = h.toLowerCase().replace(/[\s_\-]/g, '').trim();
    headerMap[clean] = idx;
  });

  // Check required column aliases
  const requiredCols = [
    { key: 'pattern', aliases: ['pattern', 'grammar', 'formula', 'grammarpattern'] },
    { key: 'meaning', aliases: ['meaning', 'english', 'translation', 'englishmeaning'] },
    { key: 'usage', aliases: ['usage', 'note', 'notes', 'context', 'usagenote', 'usagenotes'] },
    { key: 'example_japanese', aliases: ['examplejapanese', 'japaneseexample', 'examplejp', 'examplesentence', 'example'] },
    { key: 'example_english', aliases: ['exampleenglish', 'englishexample', 'exampleen', 'exampletranslation'] }
  ];

  const matchedIndices = {};
  for (const col of requiredCols) {
    let found = false;
    for (const alias of col.aliases) {
      if (headerMap[alias] !== undefined) {
        matchedIndices[col.key] = headerMap[alias];
        found = true;
        break;
      }
    }
    if (!found) {
      return {
        success: false,
        message: `Missing required column: ${col.key}`
      };
    }
  }

  const validRows = [];
  const errors = [];

  for (let rIdx = 1; rIdx < rows.length; rIdx++) {
    const row = rows[rIdx];
    const rowNum = rIdx + 1;

    // Check if entire row is empty
    if (!row || row.every(c => !c || !c.trim())) {
      continue;
    }

    const patternVal = (row[matchedIndices.pattern] || '').trim();
    const meaningVal = (row[matchedIndices.meaning] || '').trim();
    const usageVal = (row[matchedIndices.usage] || '').trim();
    const exJpVal = (row[matchedIndices.example_japanese] || '').trim();
    const exEnVal = (row[matchedIndices.example_english] || '').trim();

    if (!patternVal) {
      errors.push({ row: rowNum, problem: 'Missing pattern text', value: '' });
      continue;
    }
    if (!meaningVal) {
      errors.push({ row: rowNum, problem: 'Missing meaning', value: '' });
      continue;
    }
    if (!usageVal) {
      errors.push({ row: rowNum, problem: 'Missing usage note', value: '' });
      continue;
    }
    if (!exJpVal) {
      errors.push({ row: rowNum, problem: 'Missing Japanese example sentence', value: '' });
      continue;
    }
    if (!exEnVal) {
      errors.push({ row: rowNum, problem: 'Missing English example translation', value: '' });
      continue;
    }

    // Parse examples: split by ／ or / if present
    const jParts = exJpVal.split(/[／/]/).map(s => s.trim()).filter(Boolean);
    const eParts = exEnVal.split(/[／/]/).map(s => s.trim()).filter(Boolean);
    const examples = [];

    if (jParts.length > 1 && jParts.length === eParts.length) {
      for (let k = 0; k < jParts.length; k++) {
        examples.push({
          japanese: jParts[k],
          reading: '',
          english: eParts[k]
        });
      }
    } else {
      examples.push({
        japanese: exJpVal,
        reading: '',
        english: exEnVal
      });
    }

    validRows.push({
      rowNum,
      title: patternVal,
      pattern: patternVal,
      formula: patternVal,
      meaning: meaningVal,
      usage: usageVal,
      examples,
      destinationType: destinationConfig.destinationType || 'chapter',
      chapter: destinationConfig.destinationType === 'custom' ? null : (parseInt(destinationConfig.chapter, 10) || 1),
      customChapterId: destinationConfig.destinationType === 'custom' ? destinationConfig.customChapterId : null,
      jlptLevel: destinationConfig.jlptLevel || 'N5',
      order: validRows.length + 1
    });
  }

  if (errors.length > 0) {
    return {
      success: false,
      message: `Validation failed on ${errors.length} row(s).`,
      errors
    };
  }

  if (validRows.length === 0) {
    return {
      success: false,
      message: 'No valid pattern rows found in the CSV.'
    };
  }

  return {
    success: true,
    totalRows: validRows.length,
    validRows
  };
}

/**
 * Validates and parses a Reading CSV file
 * Supports arbitrary question counts (e.g. 4, 5, 6 questions)
 * Columns: title, passage, question_1, option_1_a, option_1_b, option_1_c, option_1_d, correct_answer_1 ...
 */
export function parseAndValidateReadingCSV(csvText, defaultJlpt = 'N5') {
  const rows = parseCSVToRows(csvText);
  if (!rows || rows.length < 2) {
    return {
      success: false,
      message: 'CSV file is empty or missing data rows.'
    };
  }

  const rawHeaders = rows[0];
  const headerMap = {};
  rawHeaders.forEach((h, idx) => {
    if (!h) return;
    const clean = h.toLowerCase().replace(/[\s\-]/g, '_').trim();
    headerMap[clean] = idx;
    // Also without underscores
    const noUnderscore = clean.replace(/_/g, '');
    headerMap[noUnderscore] = idx;
  });

  // Match title and passage
  const titleIdx = headerMap['title'] !== undefined ? headerMap['title'] : headerMap['passage_title'];
  const passageIdx = headerMap['passage'] !== undefined ? headerMap['passage'] : (headerMap['content'] !== undefined ? headerMap['content'] : headerMap['text']);

  if (titleIdx === undefined) {
    return { success: false, message: 'Missing required column: title' };
  }
  if (passageIdx === undefined) {
    return { success: false, message: 'Missing required column: passage' };
  }

  // Detect questions dynamically (question_1, question_2, ..., question_6, etc.)
  const questionConfigs = [];
  for (let q = 1; q <= 20; q++) {
    const qKey = `question_${q}`;
    const qKeyNoUnderscore = `question${q}`;
    const qIdx = headerMap[qKey] !== undefined ? headerMap[qKey] : headerMap[qKeyNoUnderscore];

    if (qIdx !== undefined) {
      // Must have options and correct_answer for this question
      const optA = headerMap[`option_${q}_a`] !== undefined ? headerMap[`option_${q}_a`] : headerMap[`option${q}a`];
      const optB = headerMap[`option_${q}_b`] !== undefined ? headerMap[`option_${q}_b`] : headerMap[`option${q}b`];
      const optC = headerMap[`option_${q}_c`] !== undefined ? headerMap[`option_${q}_c`] : headerMap[`option${q}c`];
      const optD = headerMap[`option_${q}_d`] !== undefined ? headerMap[`option_${q}_d`] : headerMap[`option${q}d`];
      const ansIdx = headerMap[`correct_answer_${q}`] !== undefined 
        ? headerMap[`correct_answer_${q}`] 
        : (headerMap[`correctanswer${q}`] !== undefined 
          ? headerMap[`correctanswer${q}`] 
          : headerMap[`answer_${q}`]);

      const missingCols = [];
      if (optA === undefined) missingCols.push(`option_${q}_a`);
      if (optB === undefined) missingCols.push(`option_${q}_b`);
      if (optC === undefined) missingCols.push(`option_${q}_c`);
      if (optD === undefined) missingCols.push(`option_${q}_d`);
      if (ansIdx === undefined) missingCols.push(`correct_answer_${q}`);

      if (missingCols.length > 0) {
        return {
          success: false,
          message: `Missing required column(s) for Question ${q}: ${missingCols.join(', ')}`
        };
      }

      questionConfigs.push({
        qNum: q,
        qIdx,
        optA,
        optB,
        optC,
        optD,
        ansIdx
      });
    }
  }

  if (questionConfigs.length === 0) {
    return {
      success: false,
      message: 'No comprehension questions detected in CSV headers (e.g. question_1, option_1_a..d, correct_answer_1).'
    };
  }

  const validReadings = [];
  const errors = [];

  for (let rIdx = 1; rIdx < rows.length; rIdx++) {
    const row = rows[rIdx];
    const rowNum = rIdx + 1;

    if (!row || row.every(c => !c || !c.trim())) {
      continue;
    }

    const titleVal = (row[titleIdx] || '').trim();
    const passageVal = (row[passageIdx] || '').trim();

    if (!titleVal) {
      errors.push({ row: rowNum, problem: 'Missing reading title', value: '' });
      continue;
    }
    if (!passageVal) {
      errors.push({ row: rowNum, problem: 'Missing passage text', value: '' });
      continue;
    }

    // Try extracting paragraph number from title (e.g. "Paragraph 1 — ...")
    let pNum = undefined;
    const pMatch = titleVal.match(/(?:Paragraph|第|Part)\s*(\d+)/i) || titleVal.match(/^(\d+)[\.\s—\-]/);
    if (pMatch && pMatch[1]) {
      pNum = parseInt(pMatch[1], 10);
    }

    const questions = [];
    let rowHasError = false;

    for (const qConf of questionConfigs) {
      const qText = (row[qConf.qIdx] || '').trim();
      const aText = (row[qConf.optA] || '').trim();
      const bText = (row[qConf.optB] || '').trim();
      const cText = (row[qConf.optC] || '').trim();
      const dText = (row[qConf.optD] || '').trim();
      const ansVal = (row[qConf.ansIdx] || '').trim().toUpperCase();

      if (!qText) {
        errors.push({ row: rowNum, problem: `Question ${qConf.qNum} text is missing`, value: '' });
        rowHasError = true;
        break;
      }
      if (!aText || !bText || !cText || !dText) {
        errors.push({ row: rowNum, problem: `Question ${qConf.qNum} is missing one or more options (A, B, C, D)`, value: '' });
        rowHasError = true;
        break;
      }
      if (!['A', 'B', 'C', 'D'].includes(ansVal)) {
        errors.push({ row: rowNum, problem: `Question ${qConf.qNum} correct answer must be 'A', 'B', 'C', or 'D'`, value: ansVal });
        rowHasError = true;
        break;
      }

      questions.push({
        question: qText,
        options: [
          { label: 'A', text: aText },
          { label: 'B', text: bText },
          { label: 'C', text: cText },
          { label: 'D', text: dText }
        ],
        correctAnswer: ansVal,
        explanation: ''
      });
    }

    if (rowHasError) continue;

    validReadings.push({
      rowNum,
      title: titleVal,
      paragraphNumber: pNum,
      passage: passageVal,
      jlptLevel: defaultJlpt,
      questions
    });
  }

  if (errors.length > 0) {
    return {
      success: false,
      message: `Validation failed on ${errors.length} item(s).`,
      errors
    };
  }

  if (validReadings.length === 0) {
    return {
      success: false,
      message: 'No valid reading rows found in the CSV.'
    };
  }

  return {
    success: true,
    totalRows: validReadings.length,
    questionCountPerReading: questionConfigs.length,
    validReadings
  };
}

/**
 * Validates and parses a Listening CSV file
 * Supports arbitrary question counts (e.g. 3, 4, 5, 6+ questions)
 * Columns: title, passage (or audio_text/script), question_1, option_1_a, option_1_b, option_1_c, option_1_d, correct_answer_1 ...
 */
export function parseAndValidateListeningCSV(csvText, defaultJlpt = 'N5') {
  const rows = parseCSVToRows(csvText);
  if (!rows || rows.length < 2) {
    return {
      success: false,
      message: 'CSV file is empty or missing data rows.'
    };
  }

  const rawHeaders = rows[0];
  const headerMap = {};
  rawHeaders.forEach((h, idx) => {
    if (!h) return;
    const clean = h.toLowerCase().replace(/[\s\-]/g, '_').trim();
    headerMap[clean] = idx;
    const noUnderscore = clean.replace(/_/g, '');
    headerMap[noUnderscore] = idx;
  });

  const titleIdx = headerMap['title'] !== undefined 
    ? headerMap['title'] 
    : (headerMap['listening_title'] !== undefined ? headerMap['listening_title'] : headerMap['name']);
  
  const passageIdx = headerMap['passage'] !== undefined 
    ? headerMap['passage'] 
    : (headerMap['audio_text'] !== undefined 
      ? headerMap['audio_text'] 
      : (headerMap['script'] !== undefined 
        ? headerMap['script'] 
        : (headerMap['content'] !== undefined ? headerMap['content'] : headerMap['text'])));

  if (titleIdx === undefined) {
    return { success: false, message: 'Missing required column: title (or listening_title)' };
  }
  if (passageIdx === undefined) {
    return { success: false, message: 'Missing required column: passage (or audio_text / script)' };
  }

  // Detect questions dynamically (question_1, question_2, ..., question_6, etc.)
  const questionConfigs = [];
  for (let q = 1; q <= 20; q++) {
    const qKey = `question_${q}`;
    const qKeyNoUnderscore = `question${q}`;
    const qIdx = headerMap[qKey] !== undefined ? headerMap[qKey] : headerMap[qKeyNoUnderscore];

    if (qIdx !== undefined) {
      const optA = headerMap[`option_${q}_a`] !== undefined ? headerMap[`option_${q}_a`] : headerMap[`option${q}a`];
      const optB = headerMap[`option_${q}_b`] !== undefined ? headerMap[`option_${q}_b`] : headerMap[`option${q}b`];
      const optC = headerMap[`option_${q}_c`] !== undefined ? headerMap[`option_${q}_c`] : headerMap[`option${q}c`];
      const optD = headerMap[`option_${q}_d`] !== undefined ? headerMap[`option_${q}_d`] : headerMap[`option${q}d`];
      const ansIdx = headerMap[`correct_answer_${q}`] !== undefined 
        ? headerMap[`correct_answer_${q}`] 
        : (headerMap[`correctanswer${q}`] !== undefined 
          ? headerMap[`correctanswer${q}`] 
          : headerMap[`answer_${q}`]);

      const missingCols = [];
      if (optA === undefined) missingCols.push(`option_${q}_a`);
      if (optB === undefined) missingCols.push(`option_${q}_b`);
      if (optC === undefined) missingCols.push(`option_${q}_c`);
      if (optD === undefined) missingCols.push(`option_${q}_d`);
      if (ansIdx === undefined) missingCols.push(`correct_answer_${q}`);

      if (missingCols.length > 0) {
        return {
          success: false,
          message: `Missing required column(s) for Question ${q}: ${missingCols.join(', ')}`
        };
      }

      questionConfigs.push({
        qNum: q,
        qIdx,
        optA,
        optB,
        optC,
        optD,
        ansIdx
      });
    }
  }

  if (questionConfigs.length === 0) {
    return {
      success: false,
      message: 'No comprehension questions detected in CSV headers (e.g. question_1, option_1_a..d, correct_answer_1).'
    };
  }

  const validListenings = [];
  const errors = [];

  for (let rIdx = 1; rIdx < rows.length; rIdx++) {
    const row = rows[rIdx];
    const rowNum = rIdx + 1;

    if (!row || row.every(c => !c || !c.trim())) {
      continue;
    }

    const titleVal = (row[titleIdx] || '').trim();
    const passageVal = (row[passageIdx] || '').trim();

    if (!titleVal) {
      errors.push({ row: rowNum, problem: 'Missing listening exercise title', value: '' });
      continue;
    }
    if (!passageVal) {
      errors.push({ row: rowNum, problem: 'Missing Japanese listening paragraph / audio script', value: '' });
      continue;
    }

    // Try extracting listening number from title (e.g. "Listening 1 — ...")
    let lNum = undefined;
    const lMatch = titleVal.match(/(?:Listening|第|Lesson|Part)\s*(\d+)/i) || titleVal.match(/^(\d+)[\.\s—\-]/);
    if (lMatch && lMatch[1]) {
      lNum = parseInt(lMatch[1], 10);
    }

    const questions = [];
    let rowHasError = false;

    for (const qConf of questionConfigs) {
      const qText = (row[qConf.qIdx] || '').trim();
      const aText = (row[qConf.optA] || '').trim();
      const bText = (row[qConf.optB] || '').trim();
      const cText = (row[qConf.optC] || '').trim();
      const dText = (row[qConf.optD] || '').trim();
      const ansVal = (row[qConf.ansIdx] || '').trim().toUpperCase();

      if (!qText) {
        errors.push({ row: rowNum, problem: `Question ${qConf.qNum} text is missing`, value: '' });
        rowHasError = true;
        break;
      }
      if (!aText || !bText || !cText || !dText) {
        errors.push({ row: rowNum, problem: `Question ${qConf.qNum} is missing one or more options (A, B, C, D)`, value: '' });
        rowHasError = true;
        break;
      }
      if (!['A', 'B', 'C', 'D'].includes(ansVal)) {
        errors.push({ row: rowNum, problem: `Question ${qConf.qNum} correct answer must be 'A', 'B', 'C', or 'D'`, value: ansVal });
        rowHasError = true;
        break;
      }

      questions.push({
        question: qText,
        options: [
          { label: 'A', text: aText },
          { label: 'B', text: bText },
          { label: 'C', text: cText },
          { label: 'D', text: dText }
        ],
        correctAnswer: ansVal,
        explanation: ''
      });
    }

    if (rowHasError) continue;

    validListenings.push({
      rowNum,
      title: titleVal,
      listeningNumber: lNum,
      passage: passageVal,
      jlptLevel: defaultJlpt,
      questions
    });
  }

  if (errors.length > 0) {
    return {
      success: false,
      message: `Validation failed on ${errors.length} item(s).`,
      errors
    };
  }

  if (validListenings.length === 0) {
    return {
      success: false,
      message: 'No valid listening rows found in the CSV.'
    };
  }

  return {
    success: true,
    totalRows: validListenings.length,
    questionCountPerListening: questionConfigs.length,
    validListenings
  };
}


/**
 * Parses and validates CSV for Tests module.
 * Groups rows by test_title.
 * Supported question_type values: mcq, true_false, fill_blank.
 */
export function parseAndValidateTestCSV(csvText) {
  const rows = parseCSVToRows(csvText);
  if (!rows || rows.length < 2) {
    return { success: false, message: 'CSV file is empty or missing headers.' };
  }

  const rawHeaders = rows[0];
  const headerMap = {};
  rawHeaders.forEach((h, idx) => {
    headerMap[normalizeHeaderKey(h)] = idx;
  });

  const getCol = (normalizedName) => headerMap[normalizedName];

  const colTestTitle = getCol('testtitle') ?? getCol('title');
  const colTestDesc = getCol('testdescription') ?? getCol('description');
  const colQType = getCol('questiontype') ?? getCol('type');
  const colQuestion = getCol('question');
  const colOptA = getCol('optiona') ?? getCol('option1');
  const colOptB = getCol('optionb') ?? getCol('option2');
  const colOptC = getCol('optionc') ?? getCol('option3');
  const colOptD = getCol('optiond') ?? getCol('option4');
  const colCorrectAns = getCol('correctanswer') ?? getCol('answer');
  const colAcceptedAns = getCol('acceptedanswers') ?? getCol('accepted');
  const colExplanation = getCol('explanation') ?? getCol('explain');

  if (colTestTitle === undefined || colQType === undefined || colQuestion === undefined || colCorrectAns === undefined) {
    return {
      success: false,
      message: 'Missing required columns in CSV header. Required: test_title, question_type, question, correct_answer.'
    };
  }

  const errors = [];
  const testsByTitle = new Map();

  for (let rIdx = 1; rIdx < rows.length; rIdx++) {
    const row = rows[rIdx];
    const rowNum = rIdx + 1;
    if (!row || row.every(cell => !cell || !cell.trim())) continue;

    const testTitle = (row[colTestTitle] || '').trim();
    if (!testTitle) {
      errors.push({ row: rowNum, problem: 'Missing test_title', value: '' });
      continue;
    }

    const testDesc = colTestDesc !== undefined ? (row[colTestDesc] || '').trim() : '';
    const rawType = (row[colQType] || '').trim().toLowerCase().replace(/[\s_\-]/g, '');
    let qType = '';
    if (rawType === 'mcq' || rawType === 'multiplechoice') qType = 'mcq';
    else if (rawType === 'truefalse' || rawType === 'tf' || rawType === 'boolean') qType = 'true_false';
    else if (rawType === 'fillblank' || rawType === 'fillintheblank' || rawType === 'blank') qType = 'fill_blank';
    else {
      errors.push({ row: rowNum, problem: `Invalid question_type: '${row[colQType]}'. Must be mcq, true_false, or fill_blank`, value: row[colQType] });
      continue;
    }

    const questionText = (row[colQuestion] || '').trim();
    if (!questionText) {
      errors.push({ row: rowNum, problem: 'Question text is empty', value: '' });
      continue;
    }

    const correctAnsRaw = (row[colCorrectAns] || '').trim();
    if (!correctAnsRaw) {
      errors.push({ row: rowNum, problem: 'Correct answer is required', value: '' });
      continue;
    }

    const explanation = colExplanation !== undefined ? (row[colExplanation] || '').trim() : '';

    let questionObj = {
      type: qType,
      question: questionText,
      explanation
    };

    if (qType === 'mcq') {
      const optA = colOptA !== undefined ? (row[colOptA] || '').trim() : '';
      const optB = colOptB !== undefined ? (row[colOptB] || '').trim() : '';
      const optC = colOptC !== undefined ? (row[colOptC] || '').trim() : '';
      const optD = colOptD !== undefined ? (row[colOptD] || '').trim() : '';

      if (!optA || !optB || !optC || !optD) {
        errors.push({ row: rowNum, problem: 'MCQ question must provide all 4 options (option_a, option_b, option_c, option_d)', value: '' });
        continue;
      }

      const normAns = correctAnsRaw.toUpperCase();
      if (!['A', 'B', 'C', 'D'].includes(normAns)) {
        errors.push({ row: rowNum, problem: `MCQ correct_answer must be A, B, C, or D. Got '${correctAnsRaw}'`, value: correctAnsRaw });
        continue;
      }

      questionObj.options = [
        { label: 'A', text: optA },
        { label: 'B', text: optB },
        { label: 'C', text: optC },
        { label: 'D', text: optD }
      ];
      questionObj.correctAnswer = normAns;
    } else if (qType === 'true_false') {
      const lower = correctAnsRaw.toLowerCase();
      let normalizedTF = '';
      if (lower === 'true' || lower === 't' || lower === 'yes' || lower === '1') normalizedTF = 'True';
      else if (lower === 'false' || lower === 'f' || lower === 'no' || lower === '0') normalizedTF = 'False';
      else {
        errors.push({ row: rowNum, problem: `True/False correct_answer must be True or False. Got '${correctAnsRaw}'`, value: correctAnsRaw });
        continue;
      }
      questionObj.correctAnswer = normalizedTF;
    } else if (qType === 'fill_blank') {
      questionObj.correctAnswer = correctAnsRaw;
      const rawAccepted = colAcceptedAns !== undefined ? (row[colAcceptedAns] || '').trim() : '';
      if (rawAccepted) {
        questionObj.acceptedAnswers = rawAccepted.split(/[,|]/).map(s => s.trim()).filter(Boolean);
      } else {
        questionObj.acceptedAnswers = [];
      }
    }

    if (!testsByTitle.has(testTitle)) {
      testsByTitle.set(testTitle, {
        title: testTitle,
        description: testDesc,
        questions: []
      });
    }

    const existingTest = testsByTitle.get(testTitle);
    if (!existingTest.description && testDesc) {
      existingTest.description = testDesc;
    }
    existingTest.questions.push(questionObj);
  }

  if (errors.length > 0) {
    return {
      success: false,
      message: `Validation failed on ${errors.length} row(s).`,
      errors
    };
  }

  const validTests = Array.from(testsByTitle.values());
  if (validTests.length === 0) {
    return {
      success: false,
      message: 'No valid tests or questions found in the CSV.'
    };
  }

  const totalQuestions = validTests.reduce((acc, t) => acc + t.questions.length, 0);

  return {
    success: true,
    totalTests: validTests.length,
    totalQuestions,
    validTests
  };
}
