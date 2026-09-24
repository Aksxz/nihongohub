import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Vocabulary } from '../models/Vocabulary.js';
import { Kanji } from '../models/Kanji.js';
import { Import } from '../models/Import.js';
import { CustomChapter } from '../models/CustomChapter.js';
import { Pattern } from '../models/Pattern.js';
import { Reading } from '../models/Reading.js';
import { Listening } from '../models/Listening.js';
import { Test } from '../models/Test.js';
import { TestAttempt } from '../models/TestAttempt.js';
import { UserVocabulary } from '../models/UserVocabulary.js';
import { UserKanji } from '../models/UserKanji.js';
import { protect } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { uploadPdf, uploadImages, uploadCsv } from '../middleware/upload.js';
import { extractVocabFromPdf, extractVocabFromImages } from '../utils/pdfExtractor.js';
import { parseAndValidateCSV } from '../utils/csvParser.js';
import { getDBStatus } from '../config/db.js';
import crypto from 'crypto';
import fs from 'fs';

const router = express.Router();

const generateToken = (id, sessionId) => {
  const secret = process.env.JWT_SECRET || 'nihongohub_jwt_secret_token_key_2026_production';
  return jwt.sign({ id, sessionId }, secret, { expiresIn: '30d' });
};

// ==========================================
// ADMIN AUTHENTICATION
// ==========================================
// @route   POST /api/admin/auth/login
// @desc    Dedicated login for administrators
// @access  Public
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide administrator email and password.'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid administrator credentials.'
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid administrator credentials.'
      });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Administrator privileges required.'
      });
    }

    const sessionId = crypto.randomUUID();
    user.activeSessionId = sessionId;
    user.lastActivityAt = new Date();
    await user.save();

    const token = generateToken(user._id, sessionId);

    return res.json({
      success: true,
      message: 'Admin authentication successful.',
      token,
      user: user.toSafeObject()
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during admin authentication.'
    });
  }
});

// @route   POST /api/admin/auth/logout
// @desc    Admin logout
// @access  Public
router.post('/auth/logout', async (req, res) => {
  try {
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    if (token) {
      try {
        const secret = process.env.JWT_SECRET || 'nihongohub_jwt_secret_token_key_2026_production';
        let decoded = null;
        try {
          decoded = jwt.verify(token, secret);
        } catch (_) {
          decoded = jwt.decode(token);
        }
        if (decoded?.id || decoded?._id) {
          await User.findByIdAndUpdate(decoded.id || decoded._id, { activeSessionId: null });
        }
      } catch (e) {}
    }
    if (req.body && (req.body.userId || req.body.email)) {
      if (req.body.userId) {
        await User.findByIdAndUpdate(req.body.userId, { activeSessionId: null });
      } else if (req.body.email) {
        await User.findOneAndUpdate({ email: req.body.email.toLowerCase().trim() }, { activeSessionId: null });
      }
    }
    res.clearCookie('token');
  } catch (e) {}
  return res.json({
    success: true,
    message: 'Admin logged out successfully.'
  });
});

// @route   GET /api/admin/auth/me
// @desc    Get current admin profile
// @access  Admin
router.get('/auth/me', protect, requireAdmin, async (req, res) => {
  return res.json({
    success: true,
    user: req.user.toSafeObject()
  });
});

// Enforce authentication & admin role on all subsequent /api/admin routes
router.use(protect, requireAdmin);

// ==========================================
// 1. ADMIN STATISTICS
// ==========================================
// @route   GET /api/admin/statistics
// @desc    Get system and learning bank metrics
// @access  Admin
router.get('/statistics', async (req, res) => {
  try {
    const [
      totalUsers,
      totalVocab,
      n5Vocab,
      n4Vocab,
      n3Vocab,
      totalKanji,
      n5Kanji,
      n4Kanji,
      n3Kanji,
      pendingImports,
      totalPatterns,
      totalReadings,
      totalListenings,
      totalTests
    ] = await Promise.all([
      User.countDocuments(),
      Vocabulary.countDocuments(),
      Vocabulary.countDocuments({ jlptLevel: 'N5' }),
      Vocabulary.countDocuments({ jlptLevel: 'N4' }),
      Vocabulary.countDocuments({ jlptLevel: 'N3' }),
      Kanji.countDocuments(),
      Kanji.countDocuments({ jlptLevel: 'N5' }),
      Kanji.countDocuments({ jlptLevel: 'N4' }),
      Kanji.countDocuments({ jlptLevel: 'N3' }),
      Import.countDocuments({ status: 'pending' }),
      Pattern.countDocuments(),
      Reading.countDocuments(),
      Listening.countDocuments(),
      Test.countDocuments()
    ]);

    const dbStatus = getDBStatus();

    return res.json({
      success: true,
      data: {
        totalUsers,
        vocabulary: {
          total: totalVocab,
          n5: n5Vocab,
          n4: n4Vocab,
          n3: n3Vocab
        },
        kanji: {
          total: totalKanji,
          n5: n5Kanji,
          n4: n4Kanji,
          n3: n3Kanji
        },
        totalPatterns,
        totalReadings,
        totalListenings,
        totalTests,
        pendingImports,
        database: dbStatus
      }
    });
  } catch (error) {
    console.error('Error fetching admin statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin statistics.'
    });
  }
});

// ==========================================
// 2. USER MANAGEMENT
// ==========================================
// @route   GET /api/admin/users
// @desc    List registered users
// @access  Admin
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({})
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: users.length,
      data: users.map(u => ({
        ...u,
        id: u._id.toString()
      }))
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve users.'
    });
  }
});

// @route   PUT /api/admin/users/:id/role
// @desc    Update user role (user/admin)
// @access  Admin
router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be "user" or "admin".'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    user.role = role;
    await user.save();

    return res.json({
      success: true,
      message: `User ${user.email} role updated to "${role}".`,
      data: user.toSafeObject()
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update user role.'
    });
  }
});

// ==========================================
// 3. MASTER VOCABULARY CRUD (ADMIN)
// ==========================================
// @route   POST /api/admin/vocabulary
// @desc    Create new master vocabulary word with destination routing
// @access  Admin
router.post('/vocabulary', async (req, res) => {
  try {
    const {
      word,
      kanji,
      hiragana,
      katakana,
      romaji,
      meaning,
      partOfSpeech,
      jlptLevel,
      chapter,
      destinationType = 'chapter',
      customChapterId,
      wordType = 'custom',
      source,
      exampleSentence
    } = req.body;

    if (!word || !word.trim() || !meaning || !meaning.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Japanese word and English meaning are required.'
      });
    }

    // Determine normalized destination fields
    let finalDestinationType = destinationType;
    let finalChapter = null;
    let finalCustomChapterId = null;

    if (finalDestinationType === 'custom') {
      if (!customChapterId) {
        return res.status(400).json({ success: false, message: 'Custom chapter selection is required.' });
      }
      finalCustomChapterId = customChapterId;
    } else if (finalDestinationType === 'extra') {
      finalChapter = null;
      finalCustomChapterId = null;
    } else {
      // Textbook chapter
      finalDestinationType = 'chapter';
      finalChapter = parseInt(chapter || '1', 10);
      finalCustomChapterId = null;
    }

    // Duplicate check per destination
    const dupQuery = {
      word: word.trim(),
      jlptLevel: jlptLevel || 'N5'
    };
    if (finalDestinationType === 'chapter') {
      dupQuery.chapter = finalChapter;
      dupQuery.destinationType = { $ne: 'extra' };
    } else if (finalDestinationType === 'custom') {
      dupQuery.customChapterId = finalCustomChapterId;
    } else {
      dupQuery.$or = [{ destinationType: 'extra' }, { chapter: null }];
    }

    const existing = await Vocabulary.findOne(dupQuery);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Word "${word.trim()}" already exists in the selected destination.`,
        duplicateItem: existing
      });
    }

    const finalWordType = (wordType === 'custom' || wordType === 'custom/extra') ? 'custom' : 'textbook';
    const finalSource = finalWordType === 'custom' ? 'Custom' : (source || 'Textbook');

    const item = await Vocabulary.create({
      word: word.trim(),
      kanji: kanji?.trim() || '',
      hiragana: hiragana?.trim() || '',
      katakana: katakana?.trim() || '',
      romaji: romaji?.trim() || '',
      meaning: meaning.trim(),
      partOfSpeech: partOfSpeech || 'Noun',
      jlptLevel: jlptLevel || 'N5',
      destinationType: finalDestinationType,
      chapter: finalChapter,
      customChapterId: finalCustomChapterId,
      wordType: finalWordType,
      source: finalSource,
      exampleSentence: exampleSentence?.trim() || ''
    });

    return res.status(201).json({
      success: true,
      message: `Successfully created "${item.word}"!`,
      data: {
        ...item.toObject(),
        id: item._id.toString()
      }
    });
  } catch (error) {
    console.error('Error creating vocabulary:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create vocabulary item.'
    });
  }
});

// @route   PUT /api/admin/vocabulary/:id
// @desc    Update master vocabulary word (supports changing destination)
// @access  Admin
router.put('/vocabulary/:id', async (req, res) => {
  try {
    const updateData = { ...req.body };

    if (updateData.destinationType === 'extra') {
      updateData.chapter = null;
      updateData.customChapterId = null;
      updateData.destinationType = 'extra';
    } else if (updateData.destinationType === 'custom') {
      updateData.chapter = null;
      updateData.destinationType = 'custom';
      if (!updateData.customChapterId) {
        return res.status(400).json({ success: false, message: 'Custom chapter is required.' });
      }
    } else if (updateData.destinationType === 'chapter') {
      updateData.chapter = parseInt(updateData.chapter || '1', 10);
      updateData.customChapterId = null;
      updateData.destinationType = 'chapter';
    }

    if (updateData.wordType) {
      updateData.wordType = (updateData.wordType === 'custom' || updateData.wordType === 'custom/extra') ? 'custom' : 'textbook';
      if (updateData.wordType === 'custom') {
        updateData.source = 'Custom';
      }
    }

    const item = await Vocabulary.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { returnDocument: 'after', runValidators: true }
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Vocabulary item not found.'
      });
    }

    return res.json({
      success: true,
      data: {
        ...item.toObject(),
        id: item._id.toString()
      }
    });
  } catch (error) {
    console.error('Error updating vocabulary item:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update vocabulary item.'
    });
  }
});

// @route   DELETE /api/admin/vocabulary/:id
// @desc    Delete master vocabulary word
// @access  Admin
router.delete('/vocabulary/:id', async (req, res) => {
  try {
    const item = await Vocabulary.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Vocabulary item not found.'
      });
    }

    // Clean up any UserVocabulary overlays strictly referencing this deleted ID
    try {
      await UserVocabulary.deleteMany({ vocabularyId: req.params.id });
    } catch (cleanupErr) {
      console.warn('UserVocabulary cleanup warning:', cleanupErr);
    }

    return res.json({
      success: true,
      message: `Deleted "${item.word}" from master database.`
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete vocabulary item.'
    });
  }
});

// @route   POST /api/admin/vocabulary/bulk-delete
// @desc    Bulk delete master vocabulary words
// @access  Admin
router.post('/vocabulary/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of vocabulary IDs to delete.'
      });
    }

    const validIds = ids.filter(id => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid vocabulary IDs provided.'
      });
    }

    const result = await Vocabulary.deleteMany({ _id: { $in: validIds } });

    // Clean up any UserVocabulary overlays strictly referencing deleted IDs
    try {
      await UserVocabulary.deleteMany({ vocabularyId: { $in: validIds } });
    } catch (cleanupErr) {
      console.warn('UserVocabulary cleanup warning:', cleanupErr);
    }

    return res.json({
      success: true,
      count: result.deletedCount,
      message: `Successfully deleted ${result.deletedCount} vocabulary item${result.deletedCount === 1 ? '' : 's'}.`
    });
  } catch (error) {
    console.error('Bulk delete vocabulary error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to bulk delete vocabulary items.'
    });
  }
});

// ==========================================
// 4. MASTER KANJI CRUD (ADMIN)
// ==========================================
// @route   POST /api/admin/kanji
// @desc    Create new master Kanji character
// @access  Admin
router.post('/kanji', async (req, res) => {
  try {
    const { character, meaning, meanings, onyomi, kunyomi, readings, exampleWords, strokeCount, jlptLevel, chapter, source } = req.body;

    if (!character || !meaning) {
      return res.status(400).json({
        success: false,
        message: 'Kanji character and English meaning are required.'
      });
    }

    const existing = await Kanji.findOne({ character: character.trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Kanji "${character}" already exists in the master database.`
      });
    }

    const item = await Kanji.create({
      character: character.trim(),
      meaning: meaning.trim(),
      meanings: meanings || [meaning.trim()],
      onyomi: onyomi?.trim() || '',
      kunyomi: kunyomi?.trim() || '',
      readings: readings || [],
      exampleWords: exampleWords || [],
      strokeCount: strokeCount || 0,
      jlptLevel: jlptLevel || 'N5',
      chapter: chapter || 1,
      source: source || 'Textbook'
    });

    return res.status(201).json({
      success: true,
      data: {
        ...item.toObject(),
        id: item._id.toString()
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create Kanji item.'
    });
  }
});

// @route   PUT /api/admin/kanji/:id
// @desc    Update master Kanji character
// @access  Admin
router.put('/kanji/:id', async (req, res) => {
  try {
    const item = await Kanji.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { returnDocument: 'after', runValidators: true }
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Kanji character not found.'
      });
    }

    return res.json({
      success: true,
      data: {
        ...item.toObject(),
        id: item._id.toString()
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update Kanji character.'
    });
  }
});

// @route   DELETE /api/admin/kanji/:id
// @desc    Delete master Kanji character
// @access  Admin
router.delete('/kanji/:id', async (req, res) => {
  try {
    const item = await Kanji.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Kanji character not found.'
      });
    }

    // Clean up any UserKanji overlays strictly referencing this deleted ID
    try {
      await UserKanji.deleteMany({ kanjiId: req.params.id });
    } catch (cleanupErr) {
      console.warn('UserKanji cleanup warning:', cleanupErr);
    }

    return res.json({
      success: true,
      message: `Deleted "${item.character}" from master database.`
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete Kanji character.'
    });
  }
});

// @route   POST /api/admin/kanji/bulk-delete
// @desc    Bulk delete master Kanji characters
// @access  Admin
router.post('/kanji/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of Kanji IDs to delete.'
      });
    }

    const validIds = ids.filter(id => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid Kanji IDs provided.'
      });
    }

    const result = await Kanji.deleteMany({ _id: { $in: validIds } });

    // Clean up any UserKanji overlays strictly referencing deleted IDs
    try {
      await UserKanji.deleteMany({ kanjiId: { $in: validIds } });
    } catch (cleanupErr) {
      console.warn('UserKanji cleanup warning:', cleanupErr);
    }

    return res.json({
      success: true,
      count: result.deletedCount,
      message: `Successfully deleted ${result.deletedCount} Kanji character${result.deletedCount === 1 ? '' : 's'}.`
    });
  } catch (error) {
    console.error('Bulk delete kanji error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to bulk delete Kanji characters.'
    });
  }
});

// ==========================================
// 4.5. CUSTOM CHAPTERS MANAGEMENT (ADMIN)
// ==========================================
// @route   POST /api/admin/custom-chapters
// @desc    Create new custom vocabulary chapter
// @access  Admin
router.post('/custom-chapters', async (req, res) => {
  try {
    const { name, displayName, japaneseName, description, jlptLevel = 'N5' } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Custom chapter name is required.' });
    }

    const cleanName = name.trim();
    const existing = await CustomChapter.findOne({ name: cleanName, jlptLevel });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Custom chapter "${cleanName}" already exists for ${jlptLevel}.`
      });
    }

    const count = await CustomChapter.countDocuments({ jlptLevel });
    const chapter = await CustomChapter.create({
      name: cleanName,
      displayName: displayName?.trim() || cleanName,
      japaneseName: japaneseName?.trim() || '',
      description: description?.trim() || '',
      jlptLevel,
      order: count + 1,
      createdBy: req.user.id
    });

    return res.status(201).json({
      success: true,
      message: `Created custom chapter "${chapter.name}"!`,
      data: {
        ...chapter.toObject(),
        id: chapter._id.toString()
      }
    });
  } catch (error) {
    console.error('Error creating custom chapter:', error);
    return res.status(500).json({ success: false, message: 'Failed to create custom chapter.' });
  }
});

// @route   PUT /api/admin/custom-chapters/:id
// @desc    Update or rename custom chapter
// @access  Admin
router.put('/custom-chapters/:id', async (req, res) => {
  try {
    const { name, displayName, japaneseName, description, jlptLevel, order } = req.body;
    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (displayName !== undefined) update.displayName = displayName.trim();
    if (japaneseName !== undefined) update.japaneseName = japaneseName.trim();
    if (description !== undefined) update.description = description.trim();
    if (jlptLevel !== undefined) update.jlptLevel = jlptLevel;
    if (order !== undefined) update.order = order;

    const chapter = await CustomChapter.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { returnDocument: 'after', runValidators: true }
    );

    if (!chapter) {
      return res.status(404).json({ success: false, message: 'Custom chapter not found.' });
    }

    return res.json({
      success: true,
      message: `Updated custom chapter "${chapter.name}"!`,
      data: {
        ...chapter.toObject(),
        id: chapter._id.toString()
      }
    });
  } catch (error) {
    console.error('Error updating custom chapter:', error);
    return res.status(500).json({ success: false, message: 'Failed to update custom chapter.' });
  }
});

// @route   DELETE /api/admin/custom-chapters/:id
// @desc    Delete custom chapter and safely reassign all words to Extra Vocabulary
// @access  Admin
router.delete('/custom-chapters/:id', async (req, res) => {
  try {
    const chapter = await CustomChapter.findById(req.params.id);
    if (!chapter) {
      return res.status(404).json({ success: false, message: 'Custom chapter not found.' });
    }

    // Safely move affected vocabulary words to Extra Vocabulary deck so nothing is ever lost!
    const reassigned = await Vocabulary.updateMany(
      { customChapterId: chapter._id },
      {
        $set: {
          destinationType: 'extra',
          chapter: null,
          customChapterId: null,
          source: 'Extra'
        }
      }
    );

    await CustomChapter.findByIdAndDelete(req.params.id);

    return res.json({
      success: true,
      message: `Deleted custom chapter "${chapter.name}". Safely moved ${reassigned.modifiedCount} words to Extra Vocabulary.`
    });
  } catch (error) {
    console.error('Error deleting custom chapter:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete custom chapter.' });
  }
});

// ==========================================
// 4.6. CSV VOCABULARY IMPORTER
// ==========================================
// @route   POST /api/admin/import/csv-preview
// @desc    Parse uploaded CSV file, validate rows, check duplicates against selected destination, return preview
// @access  Admin
router.post('/import/csv-preview', uploadCsv.single('csvFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Please upload a valid CSV file.'
    });
  }

  const filePath = req.file.path;

  try {
    const csvContent = fs.readFileSync(filePath, 'utf8');
    const {
      destinationType = 'chapter',
      chapter,
      customChapterId,
      jlptLevel = 'N5',
      wordType = 'custom'
    } = req.body;

    const defaultDestination = {
      destinationType,
      chapter: destinationType === 'chapter' ? parseInt(chapter || '1', 10) : null,
      customChapterId: destinationType === 'custom' ? customChapterId : null,
      wordType
    };

    const parseResult = parseAndValidateCSV(csvContent, jlptLevel, defaultDestination);

    if (!parseResult.success) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: parseResult.message,
        errors: parseResult.errors
      });
    }

    // Check duplicates against master Vocabulary in MongoDB for this destination
    const words = parseResult.validRows.map(r => r.word.trim());
    const dupQuery = {
      word: { $in: words },
      jlptLevel: jlptLevel || 'N5'
    };

    if (destinationType === 'chapter') {
      dupQuery.chapter = parseInt(chapter || '1', 10);
      dupQuery.destinationType = { $ne: 'extra' };
    } else if (destinationType === 'custom') {
      dupQuery.customChapterId = customChapterId;
    } else {
      dupQuery.$or = [{ destinationType: 'extra' }, { chapter: null }];
    }

    const existingDocs = await Vocabulary.find(dupQuery).select('word meaning').lean();
    const existingWordMap = new Map();
    existingDocs.forEach(d => {
      existingWordMap.set(d.word.trim(), d);
    });

    let duplicateCount = 0;
    const previewRows = parseResult.validRows.map(row => {
      const isDup = existingWordMap.has(row.word.trim());
      if (isDup) duplicateCount++;
      return {
        ...row,
        duplicateStatus: isDup ? 'DUPLICATE' : 'NEW',
        existingMeaning: isDup ? existingWordMap.get(row.word.trim()).meaning : undefined
      };
    });

    // Cleanup temp file
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    const responsePayload = {
      fileName: req.file.originalname,
      totalRows: parseResult.totalRows,
      validRows: parseResult.validCount,
      validCount: parseResult.validCount,
      invalidRows: parseResult.invalidCount,
      invalidCount: parseResult.invalidCount,
      duplicatesCount: duplicateCount,
      duplicateCount,
      newCount: parseResult.validCount - duplicateCount,
      destinationType,
      chapter: destinationType === 'chapter' ? parseInt(chapter || '1', 10) : null,
      customChapterId: destinationType === 'custom' ? customChapterId : null,
      jlptLevel,
      items: previewRows,
      previewRows: previewRows.slice(0, 100),
      allValidRows: previewRows,
      errors: parseResult.errors
    };

    return res.json({
      success: true,
      data: responsePayload,
      ...responsePayload
    });
  } catch (error) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    console.error('Error previewing CSV:', error);
    return res.status(500).json({
      success: false,
      message: `Failed to process CSV file: ${error.message}`
    });
  }
});

// @route   POST /api/admin/import/csv-commit
// @desc    Commit validated CSV items to master MongoDB
// @access  Admin
router.post('/import/csv-commit', async (req, res) => {
  try {
    const {
      items,
      destinationType = 'chapter',
      chapter,
      customChapterId,
      jlptLevel = 'N5',
      wordType = 'custom',
      fileName = 'uploaded.csv',
      replaceDuplicates = false
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No vocabulary items provided for import.'
      });
    }

    let targetChapter = null;
    let targetCustomChapterId = null;

    if (destinationType === 'chapter') {
      targetChapter = parseInt(chapter || '1', 10);
    } else if (destinationType === 'custom') {
      if (!customChapterId) {
        return res.status(400).json({ success: false, message: 'Custom chapter is required.' });
      }
      targetCustomChapterId = customChapterId;
    }

    let insertedCount = 0;
    let updatedCount = 0;

    for (const item of items) {
      if (!item.word || !item.meaning) continue;

      const vocabData = {
        word: item.word.trim(),
        kanji: item.kanji?.trim() || '',
        hiragana: item.hiragana?.trim() || '',
        katakana: item.katakana?.trim() || '',
        romaji: item.romaji?.trim() || '',
        meaning: item.meaning.trim(),
        partOfSpeech: item.partOfSpeech || 'Noun',
        jlptLevel: item.jlptLevel || jlptLevel || 'N5',
        destinationType,
        chapter: targetChapter,
        customChapterId: targetCustomChapterId,
        wordType: (wordType === 'custom' || wordType === 'custom/extra') ? 'custom' : 'textbook',
        source: 'CSV Import',
        exampleSentence: item.exampleSentence?.trim() || ''
      };

      // Check existing duplicate in this destination
      const dupQuery = {
        word: vocabData.word,
        jlptLevel: vocabData.jlptLevel
      };
      if (destinationType === 'chapter') {
        dupQuery.chapter = targetChapter;
        dupQuery.destinationType = { $ne: 'extra' };
      } else if (destinationType === 'custom') {
        dupQuery.customChapterId = targetCustomChapterId;
      } else {
        dupQuery.$or = [{ destinationType: 'extra' }, { chapter: null }];
      }

      const existing = await Vocabulary.findOne(dupQuery);
      if (existing) {
        if (replaceDuplicates) {
          await Vocabulary.findByIdAndUpdate(existing._id, { $set: vocabData });
          updatedCount++;
        }
        // If not replacing duplicates, skip
      } else {
        await Vocabulary.create(vocabData);
        insertedCount++;
      }
    }

    // Save audit record in Import collection
    try {
      await Import.create({
        fileName,
        level: jlptLevel,
        chapterRange: {
          start: targetChapter || 1,
          end: targetChapter || 1
        },
        status: 'approved',
        extractedCount: items.length,
        approvedCount: insertedCount + updatedCount,
        createdBy: req.user.id
      });
    } catch (_) {}

    return res.json({
      success: true,
      message: `Successfully imported ${insertedCount + updatedCount} vocabulary words (${insertedCount} new, ${updatedCount} updated)!`,
      insertedCount,
      updatedCount,
      total: insertedCount + updatedCount,
      data: {
        insertedCount,
        updatedCount,
        total: insertedCount + updatedCount,
        destinationType,
        chapter: targetChapter,
        customChapterId: targetCustomChapterId
      }
    });
  } catch (error) {
    console.error('Error committing CSV import:', error);
    return res.status(500).json({
      success: false,
      message: `Failed to save imported vocabulary: ${error.message}`
    });
  }
});

// ==========================================
// 5. PDF IMPORTER & REVIEW PIPELINE
// ==========================================
// @route   POST /api/admin/import/pdf
// @desc    Upload textbook PDF, extract vocabulary, detect duplicates, and stage in imports collection
// @access  Admin
router.post('/import/pdf', uploadPdf.single('pdfFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Please upload a PDF textbook file.'
    });
  }

  const filePath = req.file.path;

  try {
    const level = req.body.level || 'N5';
    const startChapter = parseInt(req.body.startChapter || '1', 10);
    const endChapter = parseInt(req.body.endChapter || (level === 'N5' ? '24' : '50'), 10);

    // Run extraction pipeline
    const extractionResult = await extractVocabFromPdf(filePath, level, startChapter, endChapter);

    // Save to Import collection as "pending"
    // CRITICAL: NEVER auto-publish raw PDF extraction!
    const importDoc = await Import.create({
      fileName: req.file.originalname,
      level,
      chapterRange: {
        start: startChapter,
        end: endChapter
      },
      status: 'pending',
      extractedCount: extractionResult.extractedCount,
      approvedCount: 0,
      items: extractionResult.items,
      createdBy: req.user.id
    });

    // Cleanup uploaded temp file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return res.status(201).json({
      success: true,
      message: `Extracted ${extractionResult.extractedCount} candidate vocabulary entries from "${req.file.originalname}". Ready for Admin Review.`,
      data: {
        importId: importDoc._id.toString(),
        fileName: importDoc.fileName,
        level: importDoc.level,
        extractedCount: importDoc.extractedCount,
        status: importDoc.status,
        createdAt: importDoc.createdAt
      }
    });
  } catch (error) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    console.error('[Admin PDF Import] Extraction error:', error.message);
    const statusCode = error.isScannedPdf ? 422 : 500;
    return res.status(statusCode).json({
      success: false,
      isScannedPdf: !!error.isScannedPdf,
      pageCount: error.pageCount || 0,
      message: `Failed to extract vocabulary from PDF: ${error.message}`
    });
  }
});

// @route   POST /api/admin/import/images
// @desc    Upload textbook scan/photo images, OCR extract vocabulary, and stage in imports collection
// @access  Admin
router.post('/import/images', uploadImages.array('imageFiles', 10), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Please upload at least one image file (JPG, PNG, WebP).'
    });
  }

  const filePaths = req.files.map(f => f.path);

  try {
    const level = req.body.level || 'N5';
    const startChapter = parseInt(req.body.startChapter || '1', 10);
    const endChapter = parseInt(req.body.endChapter || (level === 'N5' ? '24' : '50'), 10);

    const extractionResult = await extractVocabFromImages(filePaths, level, startChapter, endChapter);

    const importDoc = await Import.create({
      fileName: req.files.map(f => f.originalname).join(', '),
      level,
      chapterRange: {
        start: startChapter,
        end: endChapter
      },
      status: 'pending',
      extractedCount: extractionResult.extractedCount,
      approvedCount: 0,
      items: extractionResult.items,
      createdBy: req.user.id
    });

    // Cleanup uploaded temp files
    filePaths.forEach(fp => {
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    });

    return res.status(201).json({
      success: true,
      message: `Extracted ${extractionResult.extractedCount} candidate vocabulary entries from ${req.files.length} image(s). Ready for Admin Review.`,
      data: {
        importId: importDoc._id.toString(),
        fileName: importDoc.fileName,
        level: importDoc.level,
        extractedCount: importDoc.extractedCount,
        status: importDoc.status,
        createdAt: importDoc.createdAt
      }
    });
  } catch (error) {
    filePaths.forEach(fp => {
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    });
    console.error('[Admin Image Import] OCR error:', error.message);
    return res.status(500).json({
      success: false,
      message: `Failed to extract vocabulary from images: ${error.message}`
    });
  }
});

// @route   GET /api/admin/imports
// @desc    List all staged import jobs
// @access  Admin
router.get('/imports', async (req, res) => {
  try {
    const imports = await Import.find({})
      .select('-items') // Omits large array for performance
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: imports.length,
      data: imports.map(i => ({
        ...i,
        id: i._id.toString()
      }))
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve imports.'
    });
  }
});

// @route   GET /api/admin/imports/:id
// @desc    Get specific import job with full item details for review
// @access  Admin
router.get('/imports/:id', async (req, res) => {
  try {
    const importDoc = await Import.findById(req.params.id);
    if (!importDoc) {
      return res.status(404).json({
        success: false,
        message: 'Import job not found.'
      });
    }

    return res.json({
      success: true,
      data: {
        ...importDoc.toObject(),
        id: importDoc._id.toString()
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve import job.'
    });
  }
});

// @route   PUT /api/admin/imports/:id/item/:itemId
// @desc    Admin corrects/edits an extracted item in the staging area
// @access  Admin
router.put('/imports/:id/item/:itemId', async (req, res) => {
  try {
    const importDoc = await Import.findById(req.params.id);
    if (!importDoc) {
      return res.status(404).json({
        success: false,
        message: 'Import job not found.'
      });
    }

    const item = importDoc.items.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Extracted item not found in this import.'
      });
    }

    // Apply corrections
    const { word, kanji, hiragana, katakana, romaji, meaning, partOfSpeech, chapter, jlptLevel, duplicateStatus } = req.body;
    if (word !== undefined) item.word = word;
    if (kanji !== undefined) item.kanji = kanji;
    if (hiragana !== undefined) item.hiragana = hiragana;
    if (katakana !== undefined) item.katakana = katakana;
    if (romaji !== undefined) item.romaji = romaji;
    if (meaning !== undefined) item.meaning = meaning;
    if (partOfSpeech !== undefined) item.partOfSpeech = partOfSpeech;
    if (chapter !== undefined) item.chapter = parseInt(chapter, 10);
    if (jlptLevel !== undefined) item.jlptLevel = jlptLevel;
    if (duplicateStatus !== undefined) item.duplicateStatus = duplicateStatus;

    await importDoc.save();

    return res.json({
      success: true,
      message: 'Item updated in staging area.',
      data: item
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update item.'
    });
  }
});

// @route   DELETE /api/admin/imports/:id/item/:itemId
// @desc    Admin deletes an erroneous extracted item from staging
// @access  Admin
router.delete('/imports/:id/item/:itemId', async (req, res) => {
  try {
    const importDoc = await Import.findById(req.params.id);
    if (!importDoc) {
      return res.status(404).json({
        success: false,
        message: 'Import job not found.'
      });
    }

    const item = importDoc.items.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in this import.'
      });
    }

    importDoc.items.pull({ _id: req.params.itemId });
    importDoc.extractedCount = importDoc.items.length;
    await importDoc.save();

    return res.json({
      success: true,
      message: 'Item removed from import review table.'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete item from review.'
    });
  }
});

// @route   POST /api/admin/imports/:id/approve
// @desc    Approve selected (or all valid) items and publish them to master Vocabulary collection
// @access  Admin
router.post('/imports/:id/approve', async (req, res) => {
  try {
    const { itemIds, replaceDuplicates = false } = req.body;

    const importDoc = await Import.findById(req.params.id);
    if (!importDoc) {
      return res.status(404).json({
        success: false,
        message: 'Import job not found.'
      });
    }

    // Determine target items: either specific itemIds or all pending items
    const targetItems = Array.isArray(itemIds) && itemIds.length > 0
      ? importDoc.items.filter(i => itemIds.includes(i._id.toString()) && i.status !== 'approved')
      : importDoc.items.filter(i => i.status === 'pending');

    if (targetItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No eligible pending items found to approve.'
      });
    }

    let insertedCount = 0;
    let updatedCount = 0;

    for (const item of targetItems) {
      const vocabData = {
        word: item.word,
        kanji: item.kanji || '',
        hiragana: item.hiragana || '',
        katakana: item.katakana || '',
        romaji: item.romaji || '',
        meaning: item.meaning,
        partOfSpeech: item.partOfSpeech || 'Noun',
        jlptLevel: item.jlptLevel || importDoc.level,
        chapter: item.chapter || 1,
        source: 'PDF Import'
      };

      if (item.duplicateStatus === 'POSSIBLE DUPLICATE' && replaceDuplicates && item.duplicateOf) {
        // Replace existing duplicate in master
        await Vocabulary.findByIdAndUpdate(item.duplicateOf, { $set: vocabData });
        updatedCount++;
      } else {
        // Insert new entry into master Vocabulary
        await Vocabulary.create(vocabData);
        insertedCount++;
      }

      item.status = 'approved';
    }

    // Update import job metadata
    importDoc.approvedCount = importDoc.items.filter(i => i.status === 'approved').length;
    if (importDoc.approvedCount >= importDoc.items.length) {
      importDoc.status = 'approved';
    } else {
      importDoc.status = 'reviewed';
    }

    await importDoc.save();

    return res.json({
      success: true,
      message: `Successfully approved and published ${insertedCount + updatedCount} vocabulary entries (${insertedCount} new, ${updatedCount} replaced) to master MongoDB!`,
      data: {
        insertedCount,
        updatedCount,
        approvedCount: importDoc.approvedCount,
        status: importDoc.status
      }
    });
  } catch (error) {
    console.error('Approval error:', error);
    return res.status(500).json({
      success: false,
      message: `Failed to approve and publish entries: ${error.message}`
    });
  }
});

// @route   POST /api/admin/imports/:id/reject
// @desc    Reject entire import job or specific items
// @access  Admin
router.post('/imports/:id/reject', async (req, res) => {
  try {
    const { itemIds } = req.body;

    const importDoc = await Import.findById(req.params.id);
    if (!importDoc) {
      return res.status(404).json({
        success: false,
        message: 'Import job not found.'
      });
    }

    if (Array.isArray(itemIds) && itemIds.length > 0) {
      importDoc.items.forEach(i => {
        if (itemIds.includes(i._id.toString())) {
          i.status = 'rejected';
        }
      });
    } else {
      importDoc.status = 'rejected';
      importDoc.items.forEach(i => {
        if (i.status === 'pending') i.status = 'rejected';
      });
    }

    await importDoc.save();

    return res.json({
      success: true,
      message: 'Items marked as rejected.'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to reject import.'
    });
  }
});

// ==========================================
// TEST ATTEMPTS & TEST RESULTS (ADMIN ONLY)
// ==========================================

/**
 * @route   GET /api/admin/test-attempts
 * @desc    Get paginated, searchable, and filterable test attempts
 * @access  Protected (Admin only)
 */
router.post('/test-attempts', protect, requireAdmin, (req, res) => res.status(405).json({ success: false, message: 'Method Not Allowed' }));

router.get('/test-attempts', protect, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const { q, status, testId, userId } = req.query;

    const filter = {};
    if (status && ['started', 'submitted'].includes(status)) {
      filter.status = status;
    }
    if (testId && mongoose.Types.ObjectId.isValid(testId)) {
      filter.testId = new mongoose.Types.ObjectId(testId);
    }
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      filter.userId = new mongoose.Types.ObjectId(userId);
    }
    if (q && q.trim()) {
      const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { userName: regex },
        { userEmail: regex },
        { testTitle: regex }
      ];
    }

    const total = await TestAttempt.countDocuments(filter);
    const attempts = await TestAttempt.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const formattedAttempts = attempts.map(a => ({
      id: a._id.toString(),
      _id: a._id.toString(),
      userId: a.userId ? a.userId.toString() : '',
      userName: a.userName,
      userEmail: a.userEmail,
      testId: a.testId ? a.testId.toString() : '',
      testTitle: a.testTitle,
      startedAt: a.startedAt,
      submittedAt: a.submittedAt || null,
      status: a.status,
      score: a.score || 0,
      totalMarks: a.totalMarks || 0,
      percentage: a.percentage || 0,
      durationSeconds: a.submittedAt && a.startedAt
        ? Math.max(0, Math.round((new Date(a.submittedAt).getTime() - new Date(a.startedAt).getTime()) / 1000))
        : null,
      questionCount: a.answers ? a.answers.length : 0,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt
    }));

    return res.json({
      success: true,
      count: formattedAttempts.length,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      limit,
      data: formattedAttempts,
      attempts: formattedAttempts
    });
  } catch (error) {
    console.error('Error fetching admin test attempts:', error);
    return res.status(500).json({ success: false, message: 'Server error loading test attempts.' });
  }
});

/**
 * @route   GET /api/admin/test-attempts/:id
 * @desc    Get single test attempt with full question breakdown
 * @access  Protected (Admin only)
 */
router.get('/test-attempts/:id', protect, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid attempt ID.' });
    }

    const attempt = await TestAttempt.findById(id).lean();
    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Test attempt not found.' });
    }

    return res.json({
      success: true,
      data: {
        ...attempt,
        id: attempt._id.toString(),
        _id: attempt._id.toString(),
        userId: attempt.userId ? attempt.userId.toString() : '',
        testId: attempt.testId ? attempt.testId.toString() : '',
        durationSeconds: attempt.submittedAt && attempt.startedAt
          ? Math.max(0, Math.round((new Date(attempt.submittedAt).getTime() - new Date(attempt.startedAt).getTime()) / 1000))
          : null
      }
    });
  } catch (error) {
    console.error('Error fetching admin test attempt by ID:', error);
    return res.status(500).json({ success: false, message: 'Server error loading test attempt details.' });
  }
});

/**
 * @route   DELETE /api/admin/test-attempts/:id
 * @desc    Delete single test attempt without touching user, test, or progress
 * @access  Protected (Admin only)
 */
router.delete('/test-attempts/:id', protect, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid attempt ID.' });
    }

    const deleted = await TestAttempt.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Test attempt not found.' });
    }

    return res.json({
      success: true,
      message: 'Test attempt deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting test attempt:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting test attempt.' });
  }
});

export default router;
