import express from 'express';
import { UserKanji } from '../models/UserKanji.js';
import { protect } from '../middleware/auth.js';
import { checkDbConnection } from '../config/db.js';

const router = express.Router();

router.use(checkDbConnection);
router.use(protect);

// @route   GET /api/user-kanji
// @desc    Get all private kanji customizations for current user
// @access  Private
router.get('/', async (req, res) => {
  try {
    const overlays = await UserKanji.find({ userId: req.user.id }).lean();

    const dictionary = {};
    overlays.forEach(item => {
      dictionary[item.kanjiId] = {
        userId: item.userId.toString(),
        kanjiId: item.kanjiId,
        customMeaning: item.customMeaning || '',
        personalNote: item.personalNote || '',
        isFavorite: Boolean(item.favorite),
        isMastered: Boolean(item.mastered),
        isDifficult: Boolean(item.difficult),
        updatedAt: item.updatedAt ? new Date(item.updatedAt).getTime() : Date.now()
      };
    });

    return res.json({
      success: true,
      count: overlays.length,
      data: dictionary
    });
  } catch (error) {
    console.error('Error fetching user kanji overlays:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user kanji overlays.'
    });
  }
});

// @route   PUT /api/user-kanji/:kanjiId
// @desc    Update or create private customization for a kanji character
// @access  Private
router.put('/:kanjiId', async (req, res) => {
  try {
    const { kanjiId } = req.params;
    const {
      customMeaning,
      personalNote,
      favorite,
      isFavorite,
      mastered,
      isMastered,
      difficult,
      isDifficult
    } = req.body;

    const update = {};
    if (customMeaning !== undefined) update.customMeaning = customMeaning;
    if (personalNote !== undefined) update.personalNote = personalNote;
    
    if (favorite !== undefined) update.favorite = Boolean(favorite);
    if (isFavorite !== undefined) update.favorite = Boolean(isFavorite);
    
    if (mastered !== undefined) update.mastered = Boolean(mastered);
    if (isMastered !== undefined) update.mastered = Boolean(isMastered);
    
    if (difficult !== undefined) update.difficult = Boolean(difficult);
    if (isDifficult !== undefined) update.difficult = Boolean(isDifficult);

    const overlay = await UserKanji.findOneAndUpdate(
      { userId: req.user.id, kanjiId },
      { $set: update },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    );

    return res.json({
      success: true,
      message: 'Personal kanji customization saved.',
      data: {
        userId: overlay.userId.toString(),
        kanjiId: overlay.kanjiId,
        customMeaning: overlay.customMeaning || '',
        personalNote: overlay.personalNote || '',
        isFavorite: Boolean(overlay.favorite),
        isMastered: Boolean(overlay.mastered),
        isDifficult: Boolean(overlay.difficult),
        updatedAt: overlay.updatedAt ? new Date(overlay.updatedAt).getTime() : Date.now()
      }
    });
  } catch (error) {
    console.error('Error saving user kanji customization:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save personal kanji customization.'
    });
  }
});

// @route   DELETE /api/user-kanji/:kanjiId
// @desc    Reset customization back to global master kanji
// @access  Private
router.delete('/:kanjiId', async (req, res) => {
  try {
    const { kanjiId } = req.params;

    await UserKanji.findOneAndDelete({
      userId: req.user.id,
      kanjiId
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

export default router;
