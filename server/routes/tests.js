import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import fs from 'fs';
import { Test } from '../models/Test.js';
import { TestProgress } from '../models/TestProgress.js';
import { TestAttempt } from '../models/TestAttempt.js';
import { protect, optionalProtect } from '../middleware/auth.js';
import { parseAndValidateTestCSV } from '../utils/csvParser.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Apply optional auth for public student routes so we can attach progress if logged in
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
 * Answer Checker for Fill in the Blank:
 * - Trims unnecessary whitespace
 * - Exact match by default
 * - Case-insensitive match allowed ONLY for harmless Latin alphabet differences
 * - Non-Latin (Japanese kanji/kana) strictly exact
 * - No overly permissive fuzzy matching
 */
export function checkFillBlankAnswer(userAnswer, correctAnswer, acceptedAnswers = []) {
  const user = (userAnswer || '').toString().trim();
  if (!user) return false;

  const validTargets = [correctAnswer, ...(acceptedAnswers || [])]
    .map(a => (a || '').toString().trim())
    .filter(Boolean);

  for (const target of validTargets) {
    // 1. Exact match
    if (user === target) return true;

    // 2. Case-insensitive check strictly for Latin-only strings
    const isTargetLatin = /^[\x00-\x7F]+$/.test(target);
    const isUserLatin = /^[\x00-\x7F]+$/.test(user);
    if (isTargetLatin && isUserLatin && user.toLowerCase() === target.toLowerCase()) {
      return true;
    }
  }

  return false;
}

// ==========================================
// 1. PUBLIC / STUDENT ENDPOINTS
// ==========================================

/**
 * @route   GET /api/tests
 * @desc    Get all active tests for students.
 *          SECURITY: correctAnswer, acceptedAnswers, explanation stripped!
 * @access  Public / Student
 */
router.get('/', async (req, res) => {
  try {
    const tests = await Test.find({ isActive: true })
      .sort({ order: 1, createdAt: -1 })
      .lean();

    const sanitized = tests.map(test => ({
      id: test._id.toString(),
      _id: test._id.toString(),
      title: test.title,
      description: test.description || '',
      questionCount: test.questions ? test.questions.length : 0,
      order: test.order || 0,
      createdAt: test.createdAt
    }));

    return res.json({
      success: true,
      count: sanitized.length,
      data: sanitized
    });
  } catch (error) {
    console.error('Error fetching student tests:', error);
    return res.status(500).json({ success: false, message: 'Server error loading tests.' });
  }
});

/**
 * @route   GET /api/tests/progress/me
 * @desc    Get current user's test progress history
 * @access  Protected
 */
router.get('/progress/me', protect, async (req, res) => {
  try {
    const progressList = await TestProgress.find({ userId: req.user.id || req.user._id })
      .sort({ attemptedAt: -1 })
      .lean();

    return res.json({
      success: true,
      data: progressList
    });
  } catch (error) {
    console.error('Error fetching test progress:', error);
    return res.status(500).json({ success: false, message: 'Server error loading test progress.' });
  }
});

/**
 * @route   GET /api/tests/:id
 * @desc    Get single test for taking quiz.
 *          SECURITY: correctAnswer, acceptedAnswers, explanation stripped!
 * @access  Public / Student
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid test ID.' });
    }

    const test = await Test.findById(id).lean();
    if (!test || !test.isActive) {
      return res.status(404).json({ success: false, message: 'Test not found or inactive.' });
    }

    const sanitizedQuestions = (test.questions || []).map((q, idx) => ({
      id: q._id ? q._id.toString() : String(idx),
      _id: q._id ? q._id.toString() : String(idx),
      type: q.type,
      question: q.question,
      options: q.type === 'mcq' ? (q.options || []) : undefined
    }));

    return res.json({
      success: true,
      data: {
        id: test._id.toString(),
        _id: test._id.toString(),
        title: test.title,
        description: test.description || '',
        questionCount: sanitizedQuestions.length,
        questions: sanitizedQuestions
      }
    });
  } catch (error) {
    console.error('Error fetching test by ID:', error);
    return res.status(500).json({ success: false, message: 'Server error loading test.' });
  }
});

/**
 * @route   POST /api/tests/:id/start
 * @desc    Start an official test attempt for an authenticated student.
 *          Records startedAt on the server and sets status to 'started'.
 * @access  Protected
 */
router.post('/:id/start', protect, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid test ID.' });
    }

    const test = await Test.findById(id).lean();
    if (!test || !test.isActive) {
      return res.status(404).json({ success: false, message: 'Test not found or inactive.' });
    }

    const attempt = await TestAttempt.create({
      userId: req.user.id || req.user._id,
      testId: test._id,
      testTitle: test.title,
      userName: req.user.name || 'Anonymous User',
      userEmail: req.user.email || '',
      startedAt: new Date(),
      status: 'started'
    });

    return res.json({
      success: true,
      message: 'Test attempt started.',
      attemptId: attempt._id.toString(),
      startedAt: attempt.startedAt
    });
  } catch (error) {
    console.error('Error starting test attempt:', error);
    return res.status(500).json({ success: false, message: 'Server error starting test attempt.' });
  }
});

/**
 * @route   POST /api/tests/:id/submit
 * @desc    Submit student answers and evaluate score on server side.
 *          Persists user progress and updates/creates TestAttempt.
 * @access  Public / Student
 */
router.post('/:id/submit', async (req, res) => {
  try {
    const { id } = req.params;
    const { answers, attemptId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid test ID.' });
    }

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ success: false, message: 'Answers payload is required.' });
    }

    const test = await Test.findById(id);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found.' });
    }

    let score = 0;
    const totalQuestions = test.questions.length;
    const evaluationResults = [];

    test.questions.forEach((q, idx) => {
      const submittedAnswer = answers[String(idx)]
        || answers[q._id ? q._id.toString() : '']
        || answers[`question${idx + 1}`]
        || answers[`question_${idx + 1}`]
        || '';

      let isCorrect = false;
      const rawUserAns = (submittedAnswer || '').toString().trim();

      if (q.type === 'mcq') {
        isCorrect = rawUserAns.toUpperCase() === (q.correctAnswer || '').trim().toUpperCase();
      } else if (q.type === 'true_false') {
        const normUser = rawUserAns.toLowerCase();
        const normTarget = (q.correctAnswer || '').trim().toLowerCase();
        isCorrect = (normUser === 'true' && normTarget === 'true') || (normUser === 'false' && normTarget === 'false');
      } else if (q.type === 'fill_blank') {
        isCorrect = checkFillBlankAnswer(rawUserAns, q.correctAnswer, q.acceptedAnswers);
      }

      if (isCorrect) score++;

      evaluationResults.push({
        questionIndex: idx,
        questionId: q._id ? q._id.toString() : String(idx),
        questionText: q.question,
        questionType: q.type,
        options: q.type === 'mcq' ? q.options : undefined,
        userAnswer: rawUserAns,
        correctAnswer: q.correctAnswer,
        acceptedAnswers: q.type === 'fill_blank' ? q.acceptedAnswers : undefined,
        isCorrect,
        explanation: q.explanation || ''
      });
    });

    const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

    let savedProgressId = null;
    let savedAttemptId = null;

    if (req.user) {
      let attempt = null;
      if (attemptId && mongoose.Types.ObjectId.isValid(attemptId)) {
        attempt = await TestAttempt.findOne({
          _id: attemptId,
          userId: req.user.id || req.user._id
        });
      }

      if (!attempt) {
        attempt = await TestAttempt.findOne({
          userId: req.user.id || req.user._id,
          testId: test._id,
          status: 'started'
        }).sort({ createdAt: -1 });
      }

      if (!attempt) {
        attempt = new TestAttempt({
          userId: req.user.id || req.user._id,
          testId: test._id,
          testTitle: test.title,
          userName: req.user.name || 'Anonymous User',
          userEmail: req.user.email || '',
          startedAt: new Date(),
          status: 'started'
        });
      }

      attempt.submittedAt = new Date();
      attempt.status = 'submitted';
      attempt.score = score;
      attempt.totalMarks = totalQuestions;
      attempt.percentage = percentage;
      attempt.answers = evaluationResults.map(r => ({
        questionIndex: r.questionIndex,
        questionId: r.questionId,
        questionText: r.questionText,
        questionType: r.questionType,
        options: r.options,
        userAnswer: r.userAnswer,
        correctAnswer: r.correctAnswer,
        acceptedAnswers: r.acceptedAnswers,
        isCorrect: r.isCorrect,
        explanation: r.explanation
      }));

      await attempt.save();
      savedAttemptId = attempt._id.toString();

      const progressRecord = await TestProgress.create({
        userId: req.user.id || req.user._id,
        testId: test._id,
        score,
        totalQuestions,
        percentage,
        answers: evaluationResults.map(r => ({
          questionIndex: r.questionIndex,
          questionText: r.questionText,
          questionType: r.questionType,
          userAnswer: r.userAnswer,
          correctAnswer: r.correctAnswer,
          isCorrect: r.isCorrect,
          explanation: r.explanation
        })),
        attemptedAt: new Date()
      });
      savedProgressId = progressRecord._id.toString();
    }

    return res.json({
      success: true,
      message: 'Test submitted and evaluated successfully.',
      score,
      totalQuestions,
      percentage,
      savedProgressId,
      attemptId: savedAttemptId,
      results: evaluationResults
    });
  } catch (error) {
    console.error('Error submitting test answers:', error);
    return res.status(500).json({ success: false, message: 'Server error evaluating test.' });
  }
});

// ==========================================
// 2. ADMIN ENDPOINTS
// ==========================================

/**
 * @route   GET /api/tests/admin/all
 * @desc    Get all tests with full questions (correct answers & explanations)
 * @access  Protected (Admin only)
 */
router.get('/admin/all', protect, requireAdmin, async (req, res) => {
  try {
    const tests = await Test.find().sort({ order: 1, createdAt: -1 }).lean();
    return res.json({
      success: true,
      count: tests.length,
      data: tests.map(t => ({
        ...t,
        id: t._id.toString()
      }))
    });
  } catch (error) {
    console.error('Error fetching admin tests:', error);
    return res.status(500).json({ success: false, message: 'Server error loading admin tests.' });
  }
});

/**
 * @route   GET /api/tests/admin/attempts
 * @desc    Get paginated, searchable, and filterable test attempts for admin
 * @access  Protected (Admin only)
 */
router.get('/admin/attempts', protect, requireAdmin, async (req, res) => {
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
 * @route   GET /api/tests/admin/attempts/:id
 * @desc    Get single test attempt with full question breakdown for admin
 * @access  Protected (Admin only)
 */
router.get('/admin/attempts/:id', protect, requireAdmin, async (req, res) => {
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
 * @route   DELETE /api/tests/admin/attempts/:id
 * @desc    Delete single test attempt without touching user, test, or progress
 * @access  Protected (Admin only)
 */
router.delete('/admin/attempts/:id', protect, requireAdmin, async (req, res) => {
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

/**
 * @route   GET /api/tests/admin/:id
 * @desc    Get single test full details for editing
 * @access  Protected (Admin only)
 */
router.get('/admin/:id', protect, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid test ID.' });
    }

    const test = await Test.findById(id).lean();
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found.' });
    }

    return res.json({
      success: true,
      data: {
        ...test,
        id: test._id.toString()
      }
    });
  } catch (error) {
    console.error('Error fetching admin test by ID:', error);
    return res.status(500).json({ success: false, message: 'Server error loading test.' });
  }
});

/**
 * @route   POST /api/tests
 * @desc    Create new test
 * @access  Protected (Admin only)
 */
router.post('/', protect, requireAdmin, async (req, res) => {
  try {
    const { title, description, questions, order, isActive } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Test title is required.' });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one question is required.' });
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qNum = i + 1;
      if (!q.question || !q.question.trim()) {
        return res.status(400).json({ success: false, message: `Question ${qNum} text is required.` });
      }
      if (!['mcq', 'true_false', 'fill_blank'].includes(q.type)) {
        return res.status(400).json({ success: false, message: `Question ${qNum} has invalid type: '${q.type}'.` });
      }
      if (q.type === 'mcq') {
        if (!Array.isArray(q.options) || q.options.length !== 4) {
          return res.status(400).json({ success: false, message: `Question ${qNum} (MCQ) must have exactly 4 options (A-D).` });
        }
        if (!['A', 'B', 'C', 'D'].includes((q.correctAnswer || '').toUpperCase())) {
          return res.status(400).json({ success: false, message: `Question ${qNum} (MCQ) correct answer must be A, B, C, or D.` });
        }
      } else if (q.type === 'true_false') {
        const lower = (q.correctAnswer || '').trim().toLowerCase();
        if (lower !== 'true' && lower !== 'false') {
          return res.status(400).json({ success: false, message: `Question ${qNum} (True/False) correct answer must be True or False.` });
        }
      } else if (q.type === 'fill_blank') {
        if (!q.correctAnswer || !q.correctAnswer.trim()) {
          return res.status(400).json({ success: false, message: `Question ${qNum} (Fill in Blank) correct answer is required.` });
        }
      }
    }

    let parsedOrder = parseInt(order, 10);
    if (isNaN(parsedOrder)) {
      const highest = await Test.findOne().sort({ order: -1 }).lean();
      parsedOrder = highest && highest.order !== undefined ? highest.order + 1 : 1;
    }

    const newTest = await Test.create({
      title: title.trim(),
      description: (description || '').trim(),
      questions: questions.map(q => ({
        type: q.type,
        question: q.question.trim(),
        options: q.type === 'mcq' ? q.options.map(opt => ({
          label: (opt.label || 'A').toUpperCase(),
          text: (opt.text || '').trim()
        })) : undefined,
        correctAnswer: q.type === 'true_false' 
          ? (q.correctAnswer.trim().toLowerCase() === 'true' ? 'True' : 'False')
          : (q.type === 'mcq' ? q.correctAnswer.trim().toUpperCase() : q.correctAnswer.trim()),
        acceptedAnswers: q.type === 'fill_blank' && Array.isArray(q.acceptedAnswers)
          ? q.acceptedAnswers.map(a => (a || '').trim()).filter(Boolean)
          : [],
        explanation: (q.explanation || '').trim()
      })),
      order: parsedOrder,
      isActive: isActive !== undefined ? Boolean(isActive) : true
    });

    return res.status(201).json({
      success: true,
      message: 'Test created successfully.',
      data: {
        ...newTest.toObject(),
        id: newTest._id.toString()
      }
    });
  } catch (error) {
    console.error('Error creating test:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to create test.' });
  }
});

/**
 * @route   PUT /api/tests/:id
 * @desc    Update existing test
 * @access  Protected (Admin only)
 */
router.put('/:id', protect, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid test ID.' });
    }

    const test = await Test.findById(id);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found.' });
    }

    const { title, description, questions, order, isActive } = req.body;

    if (title !== undefined) test.title = title.trim();
    if (description !== undefined) test.description = (description || '').trim();
    if (order !== undefined) test.order = parseInt(order, 10) || 0;
    if (isActive !== undefined) test.isActive = Boolean(isActive);

    if (Array.isArray(questions)) {
      test.questions = questions.map(q => ({
        type: q.type,
        question: q.question.trim(),
        options: q.type === 'mcq' ? q.options.map(opt => ({
          label: (opt.label || 'A').toUpperCase(),
          text: (opt.text || '').trim()
        })) : undefined,
        correctAnswer: q.type === 'true_false' 
          ? (q.correctAnswer.trim().toLowerCase() === 'true' ? 'True' : 'False')
          : (q.type === 'mcq' ? q.correctAnswer.trim().toUpperCase() : q.correctAnswer.trim()),
        acceptedAnswers: q.type === 'fill_blank' && Array.isArray(q.acceptedAnswers)
          ? q.acceptedAnswers.map(a => (a || '').trim()).filter(Boolean)
          : [],
        explanation: (q.explanation || '').trim()
      }));
    }

    await test.save();

    return res.json({
      success: true,
      message: 'Test updated successfully.',
      data: {
        ...test.toObject(),
        id: test._id.toString()
      }
    });
  } catch (error) {
    console.error('Error updating test:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to update test.' });
  }
});

/**
 * @route   DELETE /api/tests/:id
 * @desc    Delete a test
 * @access  Protected (Admin only)
 */
router.delete('/:id', protect, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid test ID.' });
    }

    const deleted = await Test.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Test not found.' });
    }

    // Also clean up any associated student progress for this test
    await TestProgress.deleteMany({ testId: id });

    return res.json({
      success: true,
      message: 'Test and associated progress records deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting test:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting test.' });
  }
});

/**
 * @route   PATCH /api/tests/:id/toggle
 * @desc    Toggle test active/inactive status
 * @access  Protected (Admin only)
 */
router.patch('/:id/toggle', protect, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid test ID.' });
    }

    const test = await Test.findById(id);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found.' });
    }

    test.isActive = !test.isActive;
    await test.save();

    return res.json({
      success: true,
      message: `Test ${test.isActive ? 'enabled' : 'disabled'} successfully.`,
      isActive: test.isActive
    });
  } catch (error) {
    console.error('Error toggling test status:', error);
    return res.status(500).json({ success: false, message: 'Server error toggling test status.' });
  }
});

/**
 * @route   POST /api/tests/csv/preview (and alias /import-csv/preview)
 * @desc    Upload & preview CSV file for Tests with duplicate conflict detection
 * @access  Protected (Admin only)
 */
router.post(['/csv/preview', '/import-csv/preview'], protect, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    let csvContent = '';
    if (req.file) {
      csvContent = fs.readFileSync(req.file.path, 'utf-8');
      fs.unlinkSync(req.file.path);
    } else if (req.body.csvText) {
      csvContent = req.body.csvText;
    } else if (req.body.csvContent) {
      csvContent = req.body.csvContent;
    } else {
      return res.status(400).json({ success: false, message: 'No CSV file or csvText provided.' });
    }

    const parseResult = parseAndValidateTestCSV(csvContent);
    if (!parseResult.success) {
      return res.status(400).json(parseResult);
    }

    const existingTests = await Test.find({}, 'title').lean();
    const existingTitles = new Set(existingTests.map(t => (t.title || '').trim().toLowerCase()));

    const previewTests = parseResult.validTests.map(test => {
      const isDuplicate = existingTitles.has((test.title || '').trim().toLowerCase());
      return {
        ...test,
        isDuplicate
      };
    });

    const duplicateCount = previewTests.filter(t => t.isDuplicate).length;
    const newCount = previewTests.length - duplicateCount;

    return res.json({
      success: true,
      totalTests: previewTests.length,
      totalQuestions: parseResult.totalQuestions,
      duplicateCount,
      newCount,
      previewTests,
      tests: previewTests,
      summary: {
        totalRows: parseResult.totalRows,
        validTests: previewTests.length,
        duplicateCount,
        newCount
      }
    });
  } catch (error) {
    console.error('Error previewing tests CSV:', error);
    return res.status(500).json({ success: false, message: 'Server error parsing tests CSV.' });
  }
});

/**
 * @route   POST /api/tests/csv/commit (and alias /import-csv/commit)
 * @desc    Commit parsed CSV tests into MongoDB Atlas
 * @access  Protected (Admin only)
 */
router.post(['/csv/commit', '/import-csv/commit'], protect, requireAdmin, async (req, res) => {
  try {
    const tests = Array.isArray(req.body.tests) ? req.body.tests : [];
    const mode = req.body.mode || req.body.duplicateMode || 'skip'; // 'skip' or 'update'

    if (tests.length === 0) {
      return res.status(400).json({ success: false, message: 'No tests provided for commit.' });
    }

    const highest = await Test.findOne().sort({ order: -1 }).lean();
    let nextOrder = highest && highest.order !== undefined ? highest.order + 1 : 1;

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const t of tests) {
      const title = (t.title || '').trim();
      if (!title || !Array.isArray(t.questions) || t.questions.length === 0) continue;

      const existing = await Test.findOne({ title });

      if (existing) {
        if (mode === 'update') {
          existing.description = t.description || existing.description;
          existing.questions = t.questions;
          existing.isActive = true;
          await existing.save();
          updatedCount++;
        } else {
          skippedCount++;
        }
      } else {
        await Test.create({
          title,
          description: t.description || '',
          questions: t.questions,
          order: nextOrder++,
          isActive: true
        });
        insertedCount++;
      }
    }

    let message = `${insertedCount} tests created successfully.`;
    if (updatedCount > 0) message += ` (${updatedCount} updated)`;
    if (skippedCount > 0) message += ` (${skippedCount} duplicates skipped)`;

    return res.json({
      success: true,
      message,
      inserted: insertedCount,
      updated: updatedCount,
      skipped: skippedCount,
      total: tests.length
    });
  } catch (error) {
    console.error('Error committing tests CSV:', error);
    return res.status(500).json({ success: false, message: 'Server error committing tests.' });
  }
});

export default router;
