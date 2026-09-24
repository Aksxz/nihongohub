import express from 'express';
import { QuizResult } from '../models/QuizResult.js';
import { UserVocabulary } from '../models/UserVocabulary.js';
import { UserKanji } from '../models/UserKanji.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// @route   GET /api/quiz-results
// @desc    Get all quiz results for authenticated user
// @access  Private
router.get('/', async (req, res) => {
  try {
    const filter = { userId: req.user.id };
    if (req.query.type) {
      filter.type = req.query.type;
    }

    const results = await QuizResult.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit || '50', 10))
      .lean();

    return res.json({
      success: true,
      count: results.length,
      data: results.map(r => ({
        ...r,
        id: r._id.toString(),
        quizType: r.type,
        percentage: r.accuracy,
        totalQuestions: r.total,
        details: r.answers
      }))
    });
  } catch (error) {
    console.error('[QuizResults] Error fetching results:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve quiz results.'
    });
  }
});

// @route   POST /api/quiz-results
// @desc    Save a quiz result for authenticated user
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { type, quizType, mode, score, total, totalQuestions, accuracy, percentage, answers, details, level, chapter } = req.body;

    const actualScore = score !== undefined ? score : 0;
    const actualTotal = total !== undefined ? total : (totalQuestions !== undefined ? totalQuestions : 0);
    const actualType = (type || quizType || 'vocab') === 'vocabulary' ? 'vocab' : (type || quizType || 'vocab');

    const calcAccuracy = accuracy !== undefined 
      ? accuracy 
      : (percentage !== undefined ? percentage : (actualTotal > 0 ? Math.round((actualScore / actualTotal) * 100) : 0));

    const result = await QuizResult.create({
      userId: req.user.id,
      type: actualType,
      mode: mode || 'standard',
      level: level || 'N5',
      chapter: chapter || 1,
      score: actualScore,
      total: actualTotal,
      accuracy: calcAccuracy,
      answers: answers || details || [],
      timestamp: new Date()
    });

    // Update user-specific vocabulary practice records & Weak/Hard status
    const answerList = answers || details || [];
    if (Array.isArray(answerList) && answerList.length > 0 && actualType !== 'kanji') {
      for (const ans of answerList) {
        const vocabId = ans.itemId || ans.vocabId || ans.id;
        if (!vocabId) continue;
        const isCorrect = Boolean(ans.isCorrect);

        try {
          let userVocab = await UserVocabulary.findOne({
            userId: req.user.id,
            vocabularyId: vocabId.toString()
          });

          if (!userVocab) {
            userVocab = new UserVocabulary({
              userId: req.user.id,
              vocabularyId: vocabId.toString(),
              practiceCount: 0,
              correctCount: 0,
              wrongCount: 0,
              consecutiveCorrect: 0,
              status: 'normal'
            });
          }

          userVocab.practiceCount = (userVocab.practiceCount || 0) + 1;
          userVocab.lastPracticed = new Date();

          if (isCorrect) {
            userVocab.correctCount = (userVocab.correctCount || 0) + 1;
            userVocab.consecutiveCorrect = (userVocab.consecutiveCorrect || 0) + 1;
            userVocab.lastCorrect = new Date();

            // Status improvement:
            if (userVocab.status === 'weak') {
              // Correct answer recovers word from weak status
              userVocab.status = 'normal';
            } else if (userVocab.status === 'hard') {
              // Repeated correct answers allow recovery from hard status
              if (userVocab.consecutiveCorrect >= 2) {
                userVocab.status = 'weak';
                userVocab.difficult = false;
              }
            } else if (userVocab.consecutiveCorrect >= 3 && userVocab.correctCount / userVocab.practiceCount >= 0.8) {
              userVocab.status = 'mastered';
              userVocab.learned = true;
            }
          } else {
            userVocab.wrongCount = (userVocab.wrongCount || 0) + 1;
            userVocab.consecutiveCorrect = 0;
            userVocab.lastIncorrect = new Date();

            // Mistake classification:
            if (userVocab.status === 'weak') {
              // Repeated incorrect attempt while already Weak promotes to Hard
              userVocab.status = 'hard';
              userVocab.difficult = true;
            } else if (userVocab.status !== 'hard') {
              // First incorrect attempt marks word as Weak / V
              userVocab.status = 'weak';
            } else {
              userVocab.difficult = true;
            }
          }

          await userVocab.save();
        } catch (overlayErr) {
          console.warn('[QuizResults] Error updating UserVocabulary for', vocabId, overlayErr);
        }
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Quiz result saved successfully.',
      data: {
        ...result.toObject(),
        id: result._id.toString(),
        quizType: result.type,
        percentage: result.accuracy,
        totalQuestions: result.total,
        details: result.answers
      }
    });
  } catch (error) {
    console.error('[QuizResults] Error saving result:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to save quiz result.'
    });
  }
});

export default router;
