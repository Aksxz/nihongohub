import express from 'express';
import { UserVocabulary } from '../models/UserVocabulary.js';
import { protect } from '../middleware/auth.js';
import { checkDbConnection } from '../config/db.js';

const router = express.Router();

// Apply db check & auth middleware: derives req.user.id from JWT
router.use(checkDbConnection);
router.use(protect);

// @route   GET /api/user-vocabulary
// @desc    Get all private vocabulary customizations for current user
// @access  Private
router.get('/', async (req, res) => {
  try {
    // Critical: strictly scoped to authenticated user ID
    const overlays = await UserVocabulary.find({ userId: req.user.id }).lean();

    // Map into lookup dictionary keyed by vocabularyId
    const dictionary = {};
    overlays.forEach(item => {
      dictionary[item.vocabularyId] = {
        userId: item.userId.toString(),
        vocabularyId: item.vocabularyId,
        customMeaning: item.customMeaning || '',
        customReading: item.customReading || '',
        personalNote: item.personalNote || '',
        isFavorite: Boolean(item.favorite),
        isLearned: Boolean(item.learned),
        isDifficult: Boolean(item.difficult),
        isHidden: Boolean(item.hidden),
        status: item.status || 'normal',
        practiceCount: item.practiceCount || 0,
        correctCount: item.correctCount || 0,
        wrongCount: item.wrongCount || 0,
        consecutiveCorrect: item.consecutiveCorrect || 0,
        lastPracticed: item.lastPracticed ? new Date(item.lastPracticed).getTime() : null,
        lastIncorrect: item.lastIncorrect ? new Date(item.lastIncorrect).getTime() : null,
        lastCorrect: item.lastCorrect ? new Date(item.lastCorrect).getTime() : null,
        updatedAt: item.updatedAt ? new Date(item.updatedAt).getTime() : Date.now()
      };
    });

    return res.json({
      success: true,
      count: overlays.length,
      data: dictionary
    });
  } catch (error) {
    console.error('Error fetching user vocabulary overlays:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user vocabulary overlays.'
    });
  }
});

// @route   PUT /api/user-vocabulary/:vocabularyId
// @desc    Update or create private customization for a vocabulary word
// @access  Private
router.put('/:vocabularyId', async (req, res) => {
  try {
    const { vocabularyId } = req.params;
    const {
      customMeaning,
      customReading,
      personalNote,
      favorite,
      isFavorite,
      learned,
      isLearned,
      difficult,
      isDifficult,
      hidden,
      isHidden
    } = req.body;

    // Build update object
    const update = {};
    if (customMeaning !== undefined) update.customMeaning = customMeaning;
    if (customReading !== undefined) update.customReading = customReading;
    if (personalNote !== undefined) update.personalNote = personalNote;
    
    // Support both boolean naming conventions
    if (favorite !== undefined) update.favorite = Boolean(favorite);
    if (isFavorite !== undefined) update.favorite = Boolean(isFavorite);
    
    if (learned !== undefined) update.learned = Boolean(learned);
    if (isLearned !== undefined) update.learned = Boolean(isLearned);
    
    if (difficult !== undefined) update.difficult = Boolean(difficult);
    if (isDifficult !== undefined) update.difficult = Boolean(isDifficult);

    if (hidden !== undefined) update.hidden = Boolean(hidden);
    if (isHidden !== undefined) update.hidden = Boolean(isHidden);

    // Upsert record strictly belonging to authenticated user
    const overlay = await UserVocabulary.findOneAndUpdate(
      { userId: req.user.id, vocabularyId },
      { $set: update },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    );

    return res.json({
      success: true,
      message: 'Personal customization saved successfully.',
      data: {
        userId: overlay.userId.toString(),
        vocabularyId: overlay.vocabularyId,
        customMeaning: overlay.customMeaning || '',
        customReading: overlay.customReading || '',
        personalNote: overlay.personalNote || '',
        isFavorite: Boolean(overlay.favorite),
        isLearned: Boolean(overlay.learned),
        isDifficult: Boolean(overlay.difficult),
        isHidden: Boolean(overlay.hidden),
        updatedAt: overlay.updatedAt ? new Date(overlay.updatedAt).getTime() : Date.now()
      }
    });
  } catch (error) {
    console.error('Error saving user vocabulary customization:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save personal customization.'
    });
  }
});

// @route   PUT /api/user-vocabulary/:vocabularyId/hide
// @desc    Hide a vocabulary item for the authenticated user only (Zero master overwrite)
// @access  Private
router.put('/:vocabularyId/hide', async (req, res) => {
  try {
    const { vocabularyId } = req.params;

    const overlay = await UserVocabulary.findOneAndUpdate(
      { userId: req.user.id, vocabularyId },
      { $set: { hidden: true } },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    );

    return res.json({
      success: true,
      message: 'Vocabulary removed from your list.',
      data: {
        userId: overlay.userId.toString(),
        vocabularyId: overlay.vocabularyId,
        isHidden: true,
        updatedAt: overlay.updatedAt ? new Date(overlay.updatedAt).getTime() : Date.now()
      }
    });
  } catch (error) {
    console.error('Error hiding vocabulary item for user:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to remove vocabulary. Please try again.'
    });
  }
});

// @route   PUT /api/user-vocabulary/:vocabularyId/unhide
// @desc    Unhide / restore a hidden vocabulary item for the authenticated user
// @access  Private
router.put('/:vocabularyId/unhide', async (req, res) => {
  try {
    const { vocabularyId } = req.params;

    const overlay = await UserVocabulary.findOneAndUpdate(
      { userId: req.user.id, vocabularyId },
      { $set: { hidden: false } },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    );

    return res.json({
      success: true,
      message: 'Vocabulary restored to your list.',
      data: {
        userId: overlay.userId.toString(),
        vocabularyId: overlay.vocabularyId,
        isHidden: false,
        updatedAt: overlay.updatedAt ? new Date(overlay.updatedAt).getTime() : Date.now()
      }
    });
  } catch (error) {
    console.error('Error restoring vocabulary item for user:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to restore vocabulary. Please try again.'
    });
  }
});

// @route   DELETE /api/user-vocabulary/:vocabularyId
// @desc    Reset customization back to global master vocabulary
// @access  Private
router.delete('/:vocabularyId', async (req, res) => {
  try {
    const { vocabularyId } = req.params;

    await UserVocabulary.findOneAndDelete({
      userId: req.user.id,
      vocabularyId
    });

    return res.json({
      success: true,
      message: 'Customization reset to global master defaults.'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to reset customization.'
    });
  }
});

// @route   POST /api/user-vocabulary/record-attempt
// @desc    Record a single or batch practice attempt for vocabulary
// @access  Private
router.post('/record-attempt', async (req, res) => {
  try {
    const { vocabularyId, isCorrect, attempts } = req.body;
    const itemsToProcess = Array.isArray(attempts)
      ? attempts
      : (vocabularyId !== undefined ? [{ vocabularyId, isCorrect }] : []);

    if (itemsToProcess.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No practice attempts provided.'
      });
    }

    const updatedRecords = [];

    for (const item of itemsToProcess) {
      const vId = item.vocabularyId || item.itemId || item.vocabId;
      if (!vId) continue;
      const correct = Boolean(item.isCorrect);

      let userVocab = await UserVocabulary.findOne({
        userId: req.user.id,
        vocabularyId: vId.toString()
      });

      if (!userVocab) {
        userVocab = new UserVocabulary({
          userId: req.user.id,
          vocabularyId: vId.toString(),
          practiceCount: 0,
          correctCount: 0,
          wrongCount: 0,
          consecutiveCorrect: 0,
          status: 'normal'
        });
      }

      userVocab.practiceCount = (userVocab.practiceCount || 0) + 1;
      userVocab.lastPracticed = new Date();

      if (correct) {
        userVocab.correctCount = (userVocab.correctCount || 0) + 1;
        userVocab.consecutiveCorrect = (userVocab.consecutiveCorrect || 0) + 1;
        userVocab.lastCorrect = new Date();

        if (userVocab.status === 'weak') {
          userVocab.status = 'normal';
        } else if (userVocab.status === 'hard') {
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

        if (userVocab.status === 'weak') {
          userVocab.status = 'hard';
          userVocab.difficult = true;
        } else if (userVocab.status !== 'hard') {
          userVocab.status = 'weak';
        } else {
          userVocab.difficult = true;
        }
      }

      await userVocab.save();
      updatedRecords.push(userVocab);
    }

    return res.json({
      success: true,
      message: `Processed ${updatedRecords.length} practice attempts.`,
      count: updatedRecords.length,
      data: updatedRecords
    });
  } catch (error) {
    console.error('Error recording practice attempt:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record practice attempt.'
    });
  }
});

export default router;
