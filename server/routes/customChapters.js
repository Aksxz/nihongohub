import express from 'express';
import { CustomChapter } from '../models/CustomChapter.js';
import { Vocabulary } from '../models/Vocabulary.js';

const router = express.Router();

// @route   GET /api/custom-chapters
// @desc    Get all custom chapters with dynamic word counts
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { jlpt = 'N5' } = req.query;
    const filter = (jlpt && jlpt !== 'all' && jlpt !== 'All') ? { jlptLevel: jlpt } : {};

    const chapters = await CustomChapter.find(filter)
      .sort({ order: 1, createdAt: 1 })
      .lean();

    // Aggregate counts of vocabulary assigned to each custom chapter
    const counts = await Vocabulary.aggregate([
      { $match: { customChapterId: { $ne: null } } },
      { $group: { _id: '$customChapterId', count: { $sum: 1 } } }
    ]);

    const countMap = new Map();
    counts.forEach(c => {
      countMap.set(c._id.toString(), c.count);
    });

    const data = chapters.map(ch => ({
      id: ch._id.toString(),
      _id: ch._id.toString(),
      name: ch.name,
      displayName: ch.displayName || ch.name,
      japaneseName: ch.japaneseName || '',
      description: ch.description || '',
      jlptLevel: ch.jlptLevel || 'N5',
      order: ch.order || 0,
      wordCount: countMap.get(ch._id.toString()) || 0,
      createdAt: ch.createdAt ? new Date(ch.createdAt).getTime() : Date.now()
    }));

    return res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    console.error('Error fetching custom chapters:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve custom chapters.'
    });
  }
});

// @route   GET /api/custom-chapters/:id
// @desc    Get single custom chapter details
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const chapter = await CustomChapter.findById(req.params.id).lean();
    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: 'Custom chapter not found.'
      });
    }

    const wordCount = await Vocabulary.countDocuments({ customChapterId: chapter._id });

    return res.json({
      success: true,
      data: {
        id: chapter._id.toString(),
        _id: chapter._id.toString(),
        name: chapter.name,
        displayName: chapter.displayName || chapter.name,
        japaneseName: chapter.japaneseName || '',
        description: chapter.description || '',
        jlptLevel: chapter.jlptLevel || 'N5',
        order: chapter.order || 0,
        wordCount,
        createdAt: chapter.createdAt ? new Date(chapter.createdAt).getTime() : Date.now()
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve custom chapter.'
    });
  }
});

export default router;
