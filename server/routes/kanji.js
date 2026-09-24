import express from 'express';
import { Kanji } from '../models/Kanji.js';
import { UserKanji } from '../models/UserKanji.js';
import { protect } from '../middleware/auth.js';
import { checkDbConnection } from '../config/db.js';

const router = express.Router();

router.use(checkDbConnection);

// @route   GET /api/kanji
// @desc    Get master Kanji with optional filtering by JLPT level, chapter, search
// @access  Public / Authenticated
router.get('/', async (req, res) => {
  try {
    const { jlpt, chapter, search, limit, skip = 0 } = req.query;

    const filter = {};

    if (jlpt && jlpt !== 'All') {
      filter.jlptLevel = jlpt;
    }

    if (chapter !== undefined && chapter !== null && chapter !== '') {
      if (chapter === 'extra') {
        filter.source = 'Extra';
      } else {
        filter.chapter = parseInt(chapter, 10);
      }
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { character: searchRegex },
        { meaning: searchRegex },
        { onyomi: searchRegex },
        { kunyomi: searchRegex }
      ];
    }

    let queryExec = Kanji.find(filter).sort({ chapter: 1, _id: 1 });

    if (skip && parseInt(skip, 10) > 0) {
      queryExec = queryExec.skip(parseInt(skip, 10));
    }

    if (limit !== undefined && limit !== null && limit !== '' && limit !== 'all' && limit !== '0' && parseInt(limit, 10) > 0) {
      queryExec = queryExec.limit(parseInt(limit, 10));
    }

    const items = await queryExec.lean();

    const total = await Kanji.countDocuments(filter);

    return res.json({
      success: true,
      count: items.length,
      total,
      data: items.map(k => ({
        ...k,
        id: k._id.toString()
      }))
    });
  } catch (error) {
    console.error('Error fetching kanji:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve Kanji.'
    });
  }
});

// @route   GET /api/kanji/:id
// @desc    Get single Kanji character
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const item = await Kanji.findById(req.params.id);
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
      message: 'Failed to retrieve Kanji.'
    });
  }
});

// @route   POST /api/kanji
// @desc    Create new master Kanji in MongoDB
// @access  Protected
router.post('/', protect, async (req, res) => {
  try {
    const char = (req.body.character || req.body.kanji || '').trim();
    const mean = (req.body.meaning || (Array.isArray(req.body.meanings) ? req.body.meanings[0] : '') || '').trim();
    const meanings = req.body.meanings || (mean ? [mean] : []);
    const { onyomi, kunyomi, readings, exampleWords, strokeCount, chapter, source } = req.body;
    const jlptLevel = req.body.jlptLevel || req.body.jlpt || 'N5';

    if (!char || !mean) {
      return res.status(400).json({
        success: false,
        message: 'Kanji character and English meaning are required.'
      });
    }

    const existing = await Kanji.findOne({ character: char });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Kanji "${char}" already exists in the master database.`
      });
    }

    const item = await Kanji.create({
      character: char,
      meaning: mean,
      meanings: meanings,
      onyomi: onyomi?.trim() || '',
      kunyomi: kunyomi?.trim() || '',
      readings: readings || [],
      exampleWords: exampleWords || [],
      strokeCount: strokeCount || 0,
      jlptLevel: jlptLevel,
      chapter: chapter !== undefined ? chapter : 1,
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
    console.error('Error creating kanji:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create Kanji character.'
    });
  }
});

// @route   PUT /api/kanji/:id
// @desc    Update master Kanji in MongoDB
// @access  Protected
router.put('/:id', protect, async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (updateData.kanji && !updateData.character) {
      updateData.character = updateData.kanji.trim();
    }
    if (updateData.jlpt && !updateData.jlptLevel) {
      updateData.jlptLevel = updateData.jlpt;
    }
    if (updateData.meaning && !updateData.meanings) {
      updateData.meanings = [updateData.meaning.trim()];
    }

    const item = await Kanji.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
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
    console.error('Error updating kanji:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update Kanji character.'
    });
  }
});

// @route   DELETE /api/kanji/:id
// @desc    Delete master Kanji from MongoDB
// @access  Protected
router.delete('/:id', protect, async (req, res) => {
  try {
    const item = await Kanji.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Kanji character not found.'
      });
    }

    // Clean up any user private customizations for this Kanji
    await UserKanji.deleteMany({ kanjiId: req.params.id });

    return res.json({
      success: true,
      message: `Deleted "${item.character}" from master database.`
    });
  } catch (error) {
    console.error('Error deleting kanji:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete Kanji character.'
    });
  }
});

export default router;
