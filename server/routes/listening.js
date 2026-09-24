import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import fs from 'fs';
import { Listening } from '../models/Listening.js';
import { ListeningProgress } from '../models/ListeningProgress.js';
import { Notification } from '../models/Notification.js';
import { protect, optionalProtect } from '../middleware/auth.js';
import { parseAndValidateListeningCSV } from '../utils/csvParser.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Apply optional auth for public student routes so we can attach user progress if logged in
router.use(optionalProtect);

// Middleware to verify admin privileges
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Admin privileges required.'
    });
  }
  next();
};

/**
 * Strips sensitive data for normal students:
 * 1. DOES NOT expose the Japanese passage (hidden until audio request)
 * 2. DOES NOT expose correct answers (anti-cheat before submission)
 */
const sanitizeListeningForStudent = (doc) => {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  delete obj.passage; // Critical: Japanese passage text hidden from normal question view

  if (Array.isArray(obj.questions)) {
    obj.questions = obj.questions.map((q) => {
      const qObj = q.toObject ? q.toObject() : { ...q };
      delete qObj.correctAnswer;
      delete qObj.explanation;
      return qObj;
    });
  }

  return {
    ...obj,
    id: obj._id ? obj._id.toString() : obj.id
  };
};

// ==========================================
// STUDENT / PUBLIC ROUTES
// ==========================================

// @route   GET /api/listening
// @desc    Get all active listening exercises for students (sanitized: NO passage, NO correctAnswer)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { jlpt, search } = req.query;
    const filter = { isActive: true };

    if (jlpt && jlpt !== 'All' && jlpt !== 'all') {
      filter.jlptLevel = jlpt;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { title: searchRegex },
        { 'questions.question': searchRegex }
      ];
    }

    const listenings = await Listening.find(filter)
      .sort({ listeningNumber: 1, order: 1, createdAt: 1 })
      .lean();

    // If user is authenticated, attach user's latest progress
    let progressMap = new Map();
    if (req.user) {
      const uId = req.user._id || (mongoose.Types.ObjectId.isValid(req.user.id) ? new mongoose.Types.ObjectId(req.user.id) : req.user.id);
      const userProgressRecords = await ListeningProgress.find({ userId: uId }).lean();
      userProgressRecords.forEach((p) => {
        const existing = progressMap.get(p.listeningId.toString());
        if (!existing || new Date(p.attemptedAt) > new Date(existing.attemptedAt)) {
          progressMap.set(p.listeningId.toString(), {
            score: p.score,
            totalQuestions: p.totalQuestions,
            percentage: p.percentage,
            attemptedAt: p.attemptedAt
          });
        }
      });
    }

    const data = listenings.map((l) => {
      const sanitized = sanitizeListeningForStudent(l);
      const userStats = progressMap.get(l._id.toString()) || null;
      return {
        ...sanitized,
        userProgress: userStats
      };
    });

    return res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    console.error('Error fetching listening exercises:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve listening exercises.' });
  }
});

// @route   GET /api/listening/progress/me
// @desc    Get user\'s listening progress history
// @access  Protected / Authenticated
router.get('/progress/me', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const uId = req.user._id || req.user.id;
    const progressList = await ListeningProgress.find({ userId: uId })
      .populate('listeningId', 'title listeningNumber jlptLevel')
      .sort({ attemptedAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: progressList.length,
      data: progressList
    });
  } catch (error) {
    console.error('Error fetching user listening progress:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve listening progress.' });
  }
});

// ==========================================
// ADMIN ROUTES (Placed before /:id parameter)
// ==========================================

const handleAdminGetAll = async (req, res) => {
  try {
    const { jlpt, search } = req.query;
    const filter = {};

    if (jlpt && jlpt !== 'All' && jlpt !== 'all') {
      filter.jlptLevel = jlpt;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { title: searchRegex },
        { passage: searchRegex },
        { 'questions.question': searchRegex }
      ];
    }

    const listenings = await Listening.find(filter)
      .sort({ listeningNumber: 1, order: 1, createdAt: 1 })
      .lean();

    return res.json({
      success: true,
      count: listenings.length,
      data: listenings.map((l) => ({
        ...l,
        id: l._id.toString()
      }))
    });
  } catch (error) {
    console.error('Error fetching admin listening exercises:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve listening exercises for admin.' });
  }
};

router.get('/admin/all', protect, requireAdmin, handleAdminGetAll);
router.get('/admin', protect, requireAdmin, handleAdminGetAll);

router.get('/admin/:id', protect, requireAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid listening exercise ID.' });
    }

    const listening = await Listening.findById(req.params.id).lean();
    if (!listening) {
      return res.status(404).json({ success: false, message: 'Listening exercise not found.' });
    }

    return res.json({
      success: true,
      data: {
        ...listening,
        id: listening._id.toString()
      }
    });
  } catch (error) {
    console.error('Error fetching admin listening exercise:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve listening exercise.' });
  }
});

// @route   POST /api/listening
// @desc    Create new listening exercise (Admin only)
router.post('/', protect, requireAdmin, async (req, res) => {
  try {
    const {
      title,
      listeningNumber,
      passage,
      questions,
      jlptLevel = 'N5',
      order = 0,
      isActive = true
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Listening title is required (e.g. Listening 1).' });
    }

    if (!passage || !passage.trim()) {
      return res.status(400).json({ success: false, message: 'Japanese listening paragraph is required.' });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one comprehension question is required.' });
    }

    // Validate each question
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question || !q.question.trim()) {
        return res.status(400).json({ success: false, message: `Question ${i + 1} text cannot be empty.` });
      }
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        return res.status(400).json({ success: false, message: `Question ${i + 1} must have exactly 4 options (A, B, C, D).` });
      }
      if (!['A', 'B', 'C', 'D'].includes(q.correctAnswer)) {
        return res.status(400).json({ success: false, message: `Question ${i + 1} must specify a valid correct answer (A, B, C, or D).` });
      }
    }

    let parsedNumber = listeningNumber;
    if (!parsedNumber) {
      const highest = await Listening.findOne().sort({ listeningNumber: -1 }).lean();
      parsedNumber = highest && highest.listeningNumber ? highest.listeningNumber + 1 : 1;
    }

    const newListening = await Listening.create({
      title: title.trim(),
      listeningNumber: parsedNumber,
      passage: passage.trim(),
      questions: questions.map((q) => ({
        question: q.question.trim(),
        options: q.options.map((opt) => ({
          label: (opt.label || 'A').toUpperCase(),
          text: (opt.text || '').trim()
        })),
        correctAnswer: (q.correctAnswer || 'A').toUpperCase(),
        explanation: (q.explanation || '').trim()
      })),
      jlptLevel,
      order: order !== undefined ? Number(order) : parsedNumber,
      isActive: isActive !== undefined ? isActive : true
    });

    // Create in-app notification for existing users after successful DB insertion
    try {
      await Notification.create({
        type: 'listening',
        title: 'New Listening Available',
        message: `A new listening exercise "${newListening.title}" has been added.`,
        contentId: newListening._id
      });
    } catch (notifErr) {
      console.error('Failed to create listening notification:', notifErr);
    }

    return res.status(201).json({
      success: true,
      message: 'Listening exercise created successfully.',
      data: {
        ...newListening.toObject(),
        id: newListening._id.toString()
      }
    });
  } catch (error) {
    console.error('Error creating listening exercise:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to create listening exercise.' });
  }
});

// @route   PUT /api/listening/:id
// @desc    Update listening exercise (Admin only)
router.put('/:id', protect, requireAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid listening ID.' });
    }

    const {
      title,
      listeningNumber,
      passage,
      questions,
      jlptLevel,
      order,
      isActive
    } = req.body;

    const updateFields = {};
    if (title !== undefined) updateFields.title = title.trim();
    if (listeningNumber !== undefined) updateFields.listeningNumber = Number(listeningNumber);
    if (passage !== undefined) updateFields.passage = passage.trim();
    if (jlptLevel !== undefined) updateFields.jlptLevel = jlptLevel;
    if (order !== undefined) updateFields.order = Number(order);
    if (isActive !== undefined) updateFields.isActive = isActive;

    if (questions !== undefined) {
      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one comprehension question is required.' });
      }
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.question || !q.question.trim()) {
          return res.status(400).json({ success: false, message: `Question ${i + 1} text cannot be empty.` });
        }
        if (!Array.isArray(q.options) || q.options.length !== 4) {
          return res.status(400).json({ success: false, message: `Question ${i + 1} must have 4 options.` });
        }
        if (!['A', 'B', 'C', 'D'].includes(q.correctAnswer)) {
          return res.status(400).json({ success: false, message: `Question ${i + 1} must have a valid correct answer (A, B, C, D).` });
        }
      }
      updateFields.questions = questions.map((q) => ({
        question: q.question.trim(),
        options: q.options.map((opt) => ({
          label: (opt.label || 'A').toUpperCase(),
          text: (opt.text || '').trim()
        })),
        correctAnswer: (q.correctAnswer || 'A').toUpperCase(),
        explanation: (q.explanation || '').trim()
      }));
    }

    const updated = await Listening.findByIdAndUpdate(req.params.id, updateFields, {
      new: true,
      runValidators: true
    }).lean();

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Listening exercise not found.' });
    }

    return res.json({
      success: true,
      message: 'Listening exercise updated successfully.',
      data: {
        ...updated,
        id: updated._id.toString()
      }
    });
  } catch (error) {
    console.error('Error updating listening exercise:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to update listening exercise.' });
  }
});

// @route   DELETE /api/listening/:id
// @desc    Delete listening exercise and clean up user progress (Admin only)
router.delete('/:id', protect, requireAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid listening ID.' });
    }

    const deleted = await Listening.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Listening exercise not found.' });
    }

    // Clean up related progress records
    await ListeningProgress.deleteMany({ listeningId: req.params.id });

    return res.json({
      success: true,
      message: 'Listening exercise deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting listening exercise:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete listening exercise.' });
  }
});

// ==========================================
// CSV PREVIEW & COMMIT
// ==========================================

router.post('/csv/preview', protect, requireAdmin, upload.single('file'), async (req, res) => {
  let filePath = null;
  try {
    let csvContent = '';
    if (req.file) {
      filePath = req.file.path;
      csvContent = fs.readFileSync(filePath, 'utf-8');
    } else if (req.body.csvText) {
      csvContent = req.body.csvText;
    } else {
      return res.status(400).json({ success: false, message: 'Please provide a CSV file or csvText.' });
    }

    const { jlptLevel = 'N5' } = req.body;
    const parseResult = parseAndValidateListeningCSV(csvContent, jlptLevel);

    if (filePath && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (_) {}
    }

    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: parseResult.message,
        errors: parseResult.errors
      });
    }

    // Check duplicates against existing listenings in MongoDB
    const titles = parseResult.validListenings.map((l) => l.title.trim());
    const existingDocs = await Listening.find({
      title: { $in: titles }
    }).select('title passage').lean();

    const existingMap = new Map();
    existingDocs.forEach((d) => {
      existingMap.set(d.title.trim(), d);
    });

    let duplicateCount = 0;
    const previewListenings = parseResult.validListenings.map((l) => {
      const isDup = existingMap.has(l.title.trim());
      if (isDup) duplicateCount++;
      return {
        ...l,
        isDuplicate: isDup,
        existingId: isDup ? existingMap.get(l.title.trim())._id.toString() : null
      };
    });

    return res.json({
      success: true,
      totalRows: parseResult.validListenings.length,
      validListenings: previewListenings,
      duplicateCount,
      newCount: parseResult.validListenings.length - duplicateCount,
      previewListenings
    });
  } catch (error) {
    if (filePath && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (_) {}
    }
    console.error('Error previewing listening CSV:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to parse CSV.' });
  }
});

router.post('/csv/commit', protect, requireAdmin, async (req, res) => {
  try {
    const records = Array.isArray(req.body.listenings)
      ? req.body.listenings
      : (Array.isArray(req.body.rows) ? req.body.rows : []);
    const mode = req.body.mode || req.body.duplicateMode || 'skip';

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: 'No listening records provided for commit.' });
    }

    const latest = await Listening.findOne().sort({ listeningNumber: -1 }).lean();
    let nextNum = latest && latest.listeningNumber ? latest.listeningNumber + 1 : 1;

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const r of records) {
      const title = (r.title || '').trim();
      const passage = (r.passage || '').trim();
      if (!title || !passage) continue;

      const existing = await Listening.findOne({
        $or: [
          { title },
          { passage }
        ]
      });

      if (existing) {
        if (mode === 'update') {
          existing.title = title;
          existing.passage = passage;
          if (r.listeningNumber) existing.listeningNumber = r.listeningNumber;
          existing.questions = r.questions || existing.questions;
          existing.jlptLevel = r.jlptLevel || existing.jlptLevel;
          existing.isActive = true;
          await existing.save();
          updatedCount++;
        } else {
          skippedCount++;
        }
      } else {
        const lNum = r.listeningNumber || nextNum++;
        const createdDoc = await Listening.create({
          title,
          listeningNumber: lNum,
          passage,
          questions: r.questions || [],
          jlptLevel: r.jlptLevel || 'N5',
          order: lNum,
          isActive: true
        });
        insertedCount++;
        try {
          await Notification.create({
            type: 'listening',
            title: 'New Listening Available',
            message: `A new listening exercise "${title}" has been added.`,
            contentId: createdDoc._id
          });
        } catch (_) {}
      }
    }

    let message = `${insertedCount} listening exercises imported successfully.`;
    if (updatedCount > 0) message += ` (${updatedCount} updated)`;
    if (skippedCount > 0) message += ` (${skippedCount} duplicates skipped)`;

    return res.json({
      success: true,
      message,
      inserted: insertedCount,
      updated: updatedCount,
      skipped: skippedCount,
      total: records.length
    });
  } catch (error) {
    console.error('Error committing listening CSV:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to commit listening exercises.' });
  }
});

// ==========================================
// STUDENT AUDIO TEXT & SUBMISSION ROUTES
// ==========================================

// @route   GET or POST /api/listening/:id/audio-text
// @desc    Securely fetch passage text exclusively for browser SpeechSynthesis playback
// @access  Public / Authenticated
const handleAudioText = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid listening ID.' });
    }

    const listening = await Listening.findById(req.params.id).select('passage title listeningNumber').lean();
    if (!listening) {
      return res.status(404).json({ success: false, message: 'Listening exercise not found.' });
    }

    return res.json({
      success: true,
      audioText: listening.passage,
      title: listening.title,
      listeningNumber: listening.listeningNumber
    });
  } catch (error) {
    console.error('Error fetching audio text:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve audio text.' });
  }
};

router.get('/:id/audio-text', handleAudioText);
router.post('/:id/audio-text', handleAudioText);

// @route   GET /api/listening/:id
// @desc    Get single listening exercise for student (sanitized: NO passage, NO correctAnswer)
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid listening ID.' });
    }

    const listening = await Listening.findById(req.params.id).lean();
    if (!listening) {
      return res.status(404).json({ success: false, message: 'Listening exercise not found.' });
    }

    let userStats = null;
    if (req.user) {
      const uId = req.user._id || (mongoose.Types.ObjectId.isValid(req.user.id) ? new mongoose.Types.ObjectId(req.user.id) : req.user.id);
      const latestProgress = await ListeningProgress.findOne({ userId: uId, listeningId: listening._id })
        .sort({ attemptedAt: -1 })
        .lean();
      if (latestProgress) {
        userStats = {
          score: latestProgress.score,
          totalQuestions: latestProgress.totalQuestions,
          percentage: latestProgress.percentage,
          attemptedAt: latestProgress.attemptedAt
        };
      }
    }

    return res.json({
      success: true,
      data: {
        ...sanitizeListeningForStudent(listening),
        userProgress: userStats
      }
    });
  } catch (error) {
    console.error('Error fetching listening exercise:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve listening exercise.' });
  }
});

// @route   POST /api/listening/:id/submit
// @desc    Submit answers for evaluation by server (Security: evaluated server-side)
// @access  Public / Authenticated
router.post('/:id/submit', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid listening ID.' });
    }

    const listening = await Listening.findById(req.params.id).lean();
    if (!listening) {
      return res.status(404).json({ success: false, message: 'Listening exercise not found.' });
    }

    const { answers } = req.body;
    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ success: false, message: 'Answers payload is required.' });
    }

    let score = 0;
    const totalQuestions = listening.questions.length;
    const evaluationResults = [];

    listening.questions.forEach((q, idx) => {
      const submittedAnswer = answers[String(idx)] 
        || answers[q._id ? q._id.toString() : ''] 
        || answers[`question${idx + 1}`] 
        || answers[`question_${idx + 1}`] 
        || '';
      const normalizedSubmitted = typeof submittedAnswer === 'string' ? submittedAnswer.trim().toUpperCase() : '';
      const isCorrect = normalizedSubmitted === q.correctAnswer;

      if (isCorrect) {
        score++;
      }

      evaluationResults.push({
        questionIndex: idx,
        questionId: q._id ? q._id.toString() : String(idx),
        questionText: q.question,
        options: q.options,
        userAnswer: normalizedSubmitted,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation || ''
      });
    });

    const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

    let savedProgressId = null;
    if (req.user) {
      const progressRecord = await ListeningProgress.create({
        userId: req.user.id || req.user._id,
        listeningId: listening._id,
        score,
        totalQuestions,
        percentage,
        answers: evaluationResults.map((r) => ({
          questionIndex: r.questionIndex,
          questionText: r.questionText,
          userAnswer: r.userAnswer,
          correctAnswer: r.correctAnswer,
          isCorrect: r.isCorrect
        })),
        attemptedAt: new Date()
      });
      savedProgressId = progressRecord._id.toString();
    }

    const payload = {
      listeningId: listening._id.toString(),
      listeningTitle: listening.title,
      listeningNumber: listening.listeningNumber,
      score,
      totalQuestions,
      percentage,
      progressId: savedProgressId,
      results: evaluationResults
    };

    return res.json({
      success: true,
      ...payload,
      data: payload
    });
  } catch (error) {
    console.error('Error evaluating listening submission:', error);
    return res.status(500).json({ success: false, message: 'Failed to evaluate listening submission.' });
  }
});

export default router;
