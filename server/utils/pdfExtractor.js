import fs from 'fs';
import { PDFParse } from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import { Vocabulary } from '../models/Vocabulary.js';

/**
 * Japanese Regex Patterns
 */
const KANJI_REGEX = /[\u4e00-\u9faf]/;
const HIRAGANA_REGEX = /[\u3040-\u309f]/;
const KATAKANA_REGEX = /[\u30a0-\u30ff]/;
const JAPANESE_CHAR_REGEX = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/;

/**
 * Extracts and categorizes part of speech from text
 */
function inferPartOfSpeech(text, meaning) {
  const lower = (text + ' ' + meaning).toLowerCase();
  if (lower.includes('(v)') || lower.includes('[v]') || lower.includes('verb') || lower.includes('to ')) {
    return 'Verb';
  }
  if (lower.includes('(adj)') || lower.includes('i-adj') || lower.includes('na-adj') || lower.includes('adjective')) {
    return 'Adjective';
  }
  if (lower.includes('(adv)') || lower.includes('adverb')) {
    return 'Adverb';
  }
  if (lower.includes('(part)') || lower.includes('particle')) {
    return 'Particle';
  }
  if (lower.includes('(expr)') || lower.includes('expression') || lower.includes('phrase')) {
    return 'Expression';
  }
  if (lower.includes('(counter)') || lower.includes('counter')) {
    return 'Counter';
  }
  return 'Noun';
}

/**
 * Parse lines from extracted textbook text
 */
function parseVocabLines(rawText, defaultChapter, jlptLevel) {
  const lines = rawText.split('\n');
  const items = [];
  let currentChapter = defaultChapter;

  for (let rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Detect chapter markers like "第1課", "第 2 課", "Chapter 3", "Lesson 4", "L5"
    const chapterMatch = line.match(/(?:第\s*(\d+)\s*課|chapter\s*(\d+)|lesson\s*(\d+)|\bL\s*(\d+)\b)/i);
    if (chapterMatch) {
      const detectedNum = parseInt(chapterMatch[1] || chapterMatch[2] || chapterMatch[3] || chapterMatch[4], 10);
      if (detectedNum && detectedNum >= 1 && detectedNum <= 50) {
        currentChapter = detectedNum;
        continue;
      }
    }

    // Must contain Japanese characters to be a vocabulary candidate
    if (!JAPANESE_CHAR_REGEX.test(line)) {
      continue;
    }

    // Typical Minna no Nihongo / textbook patterns:
    // 1) わたし (私) — watashi — I / me
    // 2) 先生 [せんせい] sensei teacher
    // 3) 学生　がくせい　gakusei　student
    // 4) 行きます 【いきます】 to go (Verb)
    // 5) 日本語 - Japanese language
    
    // Split by common delimiters (tabs, multiple spaces, em-dashes, brackets, slashes)
    let parts = line.split(/[\t\s—–=\-:]+/).map(p => p.trim()).filter(Boolean);

    if (parts.length >= 2) {
      let japaneseWord = '';
      let kanji = '';
      let hiragana = '';
      let katakana = '';
      let romaji = '';
      let meaning = '';

      // Analyze parts
      const jpParts = [];
      const nonJpParts = [];

      for (const part of parts) {
        if (JAPANESE_CHAR_REGEX.test(part)) {
          jpParts.push(part.replace(/[【】\[\]()（）]/g, '').trim());
        } else {
          nonJpParts.push(part);
        }
      }

      if (jpParts.length === 0) continue;

      // Assign primary Japanese word and readings
      if (jpParts.length >= 2) {
        // e.g. ["私", "わたし"] or ["学生", "がくせい"]
        if (KANJI_REGEX.test(jpParts[0])) {
          kanji = jpParts[0];
          hiragana = jpParts[1];
          japaneseWord = jpParts[0];
        } else {
          hiragana = jpParts[0];
          kanji = jpParts[1];
          japaneseWord = jpParts[0];
        }
      } else {
        japaneseWord = jpParts[0];
        if (KANJI_REGEX.test(japaneseWord)) {
          kanji = japaneseWord;
        } else if (HIRAGANA_REGEX.test(japaneseWord)) {
          hiragana = japaneseWord;
        } else if (KATAKANA_REGEX.test(japaneseWord)) {
          katakana = japaneseWord;
        }
      }

      // Check non-Japanese parts for Romaji and English
      const englishTokens = [];
      for (const token of nonJpParts) {
        // Check if token looks like standard Hepburn romaji
        if (!romaji && /^[a-zāīūēō]+$/i.test(token) && token.length <= 15) {
          romaji = token.toLowerCase();
        } else {
          englishTokens.push(token);
        }
      }

      meaning = englishTokens.join(' ').replace(/[()]/g, '').trim();

      // If meaning is empty, skip
      if (!meaning || meaning.length < 2) continue;

      const partOfSpeech = inferPartOfSpeech(line, meaning);

      items.push({
        word: japaneseWord,
        kanji: kanji || (KANJI_REGEX.test(japaneseWord) ? japaneseWord : ''),
        hiragana: hiragana || (HIRAGANA_REGEX.test(japaneseWord) ? japaneseWord : ''),
        katakana: katakana || (KATAKANA_REGEX.test(japaneseWord) ? japaneseWord : ''),
        romaji: romaji || '',
        meaning: meaning,
        partOfSpeech: partOfSpeech,
        chapter: currentChapter,
        jlptLevel: jlptLevel || 'N5',
        duplicateStatus: 'NEW',
        duplicateOf: null,
        status: 'pending'
      });
    }
  }

  return items;
}

/**
 * Extracts vocabulary from PDF file with duplicate checking against MongoDB
 */
export async function extractVocabFromPdf(filePath, jlptLevel = 'N5', chapterStart = 1, chapterEnd = 24) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`PDF file not found at path: ${filePath}`);
  }

  const dataBuffer = fs.readFileSync(filePath);
  console.log(`[PDF Importer] Loading PDF (${(dataBuffer.length / (1024 * 1024)).toFixed(2)} MB)...`);

  const parser = new PDFParse({ data: dataBuffer });
  let textResult;
  try {
    textResult = await parser.getText();
  } catch (err) {
    console.error('[PDF Importer] Error extracting text with PDFParse:', err.message);
    throw new Error(`Failed to parse PDF document structure: ${err.message}`);
  } finally {
    await parser.destroy();
  }

  const rawText = textResult?.text || '';
  const pageCount = textResult?.total || 1;

  // Clean out page markers added by pdf-parse (e.g. "-- 1 of 212 --")
  const cleanText = rawText.replace(/-- \d+ of \d+ --/g, '').trim();

  console.log(`[PDF Importer] Processed ${pageCount} pages, extracted ${cleanText.length} text characters.`);

  // Detect scanned / image-only condition (Requirement 12)
  if (cleanText.length === 0) {
    const error = new Error(
      `This PDF contains ${pageCount} pages, but appears to be a scanned or image-only document with no selectable text layer (0 text characters detected). An OCR (Optical Character Recognition) text layer is required to extract vocabulary from scanned image pages.`
    );
    error.isScannedPdf = true;
    error.pageCount = pageCount;
    throw error;
  }

  // Parse lines
  const parsedCandidates = parseVocabLines(rawText, chapterStart, jlptLevel);
  console.log(`[PDF Importer] Extracted ${parsedCandidates.length} candidate vocabulary lines.`);

  // Filter within requested chapter range
  const scopedCandidates = parsedCandidates.filter(item => {
    return item.chapter >= chapterStart && item.chapter <= chapterEnd;
  });

  // Duplicate detection against MongoDB master Vocabulary
  const existingMaster = await Vocabulary.find({
    jlptLevel: jlptLevel
  }).lean();

  const existingMap = new Map();
  existingMaster.forEach(v => {
    if (v.word) existingMap.set(v.word.toLowerCase(), v._id);
    if (v.kanji) existingMap.set(v.kanji.toLowerCase(), v._id);
    if (v.hiragana && v.kanji) existingMap.set(`${v.kanji}_${v.hiragana}`.toLowerCase(), v._id);
  });

  const finalItems = scopedCandidates.map(item => {
    let duplicateOf = null;
    const wordKey = item.word.toLowerCase();
    const kanjiKey = item.kanji ? item.kanji.toLowerCase() : null;
    const compoundKey = item.kanji && item.hiragana ? `${item.kanji}_${item.hiragana}`.toLowerCase() : null;

    if (existingMap.has(wordKey)) {
      duplicateOf = existingMap.get(wordKey);
    } else if (kanjiKey && existingMap.has(kanjiKey)) {
      duplicateOf = existingMap.get(kanjiKey);
    } else if (compoundKey && existingMap.has(compoundKey)) {
      duplicateOf = existingMap.get(compoundKey);
    }

    return {
      ...item,
      duplicateStatus: duplicateOf ? 'POSSIBLE DUPLICATE' : 'NEW',
      duplicateOf: duplicateOf ? duplicateOf.toString() : null
    };
  });

  return {
    rawPageCount: pageCount,
    extractedCount: finalItems.length,
    items: finalItems
  };
}

/**
 * Extracts vocabulary from uploaded scan/photo images using Tesseract OCR
 */
export async function extractVocabFromImages(imagePaths, jlptLevel = 'N5', chapterStart = 1, chapterEnd = 24) {
  if (!imagePaths || imagePaths.length === 0) {
    throw new Error('No images provided for vocabulary extraction.');
  }

  let fullText = '';
  let worker = null;
  try {
    worker = await createWorker('jpn+eng');
    for (const imgPath of imagePaths) {
      if (fs.existsSync(imgPath)) {
        console.log(`[OCR Importer] Running OCR on ${imgPath}...`);
        const { data: { text } } = await worker.recognize(imgPath);
        fullText += '\n' + (text || '');
      }
    }
  } catch (ocrErr) {
    console.warn('[OCR Extractor] Tesseract recognition error:', ocrErr.message);
    throw new Error(`OCR processing failed: ${ocrErr.message}`);
  } finally {
    if (worker) {
      await worker.terminate().catch(() => {});
    }
  }

  // Parse extracted text lines using parseVocabLines
  const parsedCandidates = parseVocabLines(fullText, chapterStart, jlptLevel);
  console.log(`[OCR Importer] Parsed ${parsedCandidates.length} candidate vocabulary lines from OCR.`);

  // Filter within requested chapter range
  const scopedCandidates = parsedCandidates.filter(item => {
    return item.chapter >= chapterStart && item.chapter <= chapterEnd;
  });

  const candidatesToProcess = scopedCandidates.length > 0 ? scopedCandidates : parsedCandidates;

  // Duplicate detection against MongoDB master Vocabulary
  const existingMaster = await Vocabulary.find({
    jlptLevel: jlptLevel
  }).lean();

  const existingMap = new Map();
  existingMaster.forEach(v => {
    if (v.word) existingMap.set(v.word.toLowerCase(), v._id);
    if (v.kanji) existingMap.set(v.kanji.toLowerCase(), v._id);
    if (v.hiragana && v.kanji) existingMap.set(`${v.kanji}_${v.hiragana}`.toLowerCase(), v._id);
  });

  const finalItems = candidatesToProcess.map(item => {
    let duplicateOf = null;
    const wordKey = item.word.toLowerCase();
    const kanjiKey = item.kanji ? item.kanji.toLowerCase() : null;
    const compoundKey = item.kanji && item.hiragana ? `${item.kanji}_${item.hiragana}`.toLowerCase() : null;

    if (existingMap.has(wordKey)) {
      duplicateOf = existingMap.get(wordKey);
    } else if (kanjiKey && existingMap.has(kanjiKey)) {
      duplicateOf = existingMap.get(kanjiKey);
    } else if (compoundKey && existingMap.has(compoundKey)) {
      duplicateOf = existingMap.get(compoundKey);
    }

    return {
      ...item,
      duplicateStatus: duplicateOf ? 'POSSIBLE DUPLICATE' : 'NEW',
      duplicateOf: duplicateOf ? duplicateOf.toString() : null
    };
  });

  return {
    rawImageCount: imagePaths.length,
    extractedCount: finalItems.length,
    items: finalItems
  };
}
