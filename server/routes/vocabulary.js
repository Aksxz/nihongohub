import express from 'express';
import mongoose from 'mongoose';
import { Vocabulary } from '../models/Vocabulary.js';
import { CustomChapter } from '../models/CustomChapter.js';
import { UserVocabulary } from '../models/UserVocabulary.js';
import { checkDbConnection } from '../config/db.js';
import { optionalProtect, protect } from '../middleware/auth.js';

const router = express.Router();

router.use(checkDbConnection);
router.use(optionalProtect);

// @route   GET /api/vocabulary
// @desc    Get master vocabulary with optional filtering by JLPT level, chapter, customChapterId, search
// @access  Public / Authenticated
router.get('/', async (req, res) => {
  try {
    const { jlpt, chapter, customChapterId, destinationType, search, limit, skip = 0 } = req.query;

    const filter = {};

    if (jlpt && jlpt !== 'All') {
      filter.jlptLevel = jlpt;
    }

    if (customChapterId) {
      filter.customChapterId = customChapterId;
    } else if (destinationType === 'custom') {
      filter.destinationType = 'custom';
    } else if (destinationType === 'extra') {
      filter.$or = [
        { destinationType: 'extra' },
        { source: 'Extra' },
        { chapter: null, customChapterId: null },
        { chapter: { $exists: false }, customChapterId: null },
        { chapter: { $lte: 0 }, customChapterId: null }
      ];
    } else if (chapter !== undefined && chapter !== null && chapter !== '') {
      if (chapter === 'extra') {
        filter.$or = [
          { destinationType: 'extra' },
          { source: 'Extra' },
          { chapter: null, customChapterId: null },
          { chapter: { $exists: false }, customChapterId: null },
          { chapter: { $lte: 0 }, customChapterId: null }
        ];
      } else {
        filter.chapter = parseInt(chapter, 10);
        filter.destinationType = { $ne: 'extra' };
        filter.customChapterId = null;
        filter.source = { $ne: 'Extra' };
      }
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { word: searchRegex },
        { kanji: searchRegex },
        { hiragana: searchRegex },
        { meaning: searchRegex },
        { romaji: searchRegex }
      ];
    }

    if (req.user) {
      const uId = req.user.id || req.user._id;
      const hiddenDocs = await UserVocabulary.find({
        $or: [{ userId: uId }, { userId: uId.toString() }],
        hidden: true
      }).select('vocabularyId').lean();
      if (hiddenDocs.length > 0) {
        const validHiddenIds = hiddenDocs
          .map(d => d.vocabularyId)
          .filter(id => id && mongoose.Types.ObjectId.isValid(id.toString()))
          .map(id => new mongoose.Types.ObjectId(id.toString()));
        if (validHiddenIds.length > 0) {
          filter._id = { ...(filter._id || {}), $nin: validHiddenIds };
        }
      }
    }

    let queryExec = Vocabulary.find(filter).sort({ chapter: 1, _id: 1 });

    if (skip && parseInt(skip, 10) > 0) {
      queryExec = queryExec.skip(parseInt(skip, 10));
    }

    if (limit !== undefined && limit !== null && limit !== '' && limit !== 'all' && limit !== '0' && parseInt(limit, 10) > 0) {
      queryExec = queryExec.limit(parseInt(limit, 10));
    }

    const items = await queryExec.lean();

    const total = await Vocabulary.countDocuments(filter);

    return res.json({
      success: true,
      count: items.length,
      total,
      data: items.map(v => ({
        ...v,
        id: v._id.toString()
      }))
    });
  } catch (error) {
    console.error('Error fetching vocabulary:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve vocabulary.'
    });
  }
});

// @route   GET /api/vocabulary/structure
// @desc    Get complete 24-chapter structure, custom chapters, and extra vocabulary
// @access  Public
router.get('/structure', async (req, res) => {
  try {
    const jlpt = req.query.jlpt || 'N5';

    // 1. Fetch all vocabulary for this JLPT level from master MongoDB
    const allItems = await Vocabulary.find({ jlptLevel: jlpt })
      .sort({ chapter: 1, _id: 1 })
      .lean();

    let formattedAll = allItems.map(v => ({
      ...v,
      id: v._id.toString()
    }));

    if (req.user) {
      const hiddenDocs = await UserVocabulary.find({ userId: req.user.id, hidden: true }).select('vocabularyId').lean();
      if (hiddenDocs.length > 0) {
        const hiddenSet = new Set(hiddenDocs.map(d => d.vocabularyId.toString()));
        formattedAll = formattedAll.filter(v => !hiddenSet.has(v.id) && !hiddenSet.has(v._id.toString()));
      }
    }

    // Fetch custom chapters for this JLPT level
    const customChapterDocs = await CustomChapter.find({
      $or: [{ jlptLevel: jlpt }, { jlptLevel: 'All' }, { jlptLevel: { $exists: false } }]
    }).sort({ order: 1, createdAt: 1 }).lean();

    const customChaptersMap = new Map();
    customChapterDocs.forEach(c => {
      customChaptersMap.set(c._id.toString(), {
        ...c,
        id: c._id.toString(),
        wordCount: 0,
        vocabularies: []
      });
    });

    // 2. Build 24 standard textbook chapters for N5 (Chapters 1 to 24), 26 for N4 (25 to 50), 24 for others
    let chapterDefs = [];
    if (jlpt === 'N5') {
      chapterDefs = Array.from({ length: 24 }, (_, i) => ({
        chapterNumber: i + 1,
        chapterName: `第${i + 1}課`,
        title: `Chapter ${i + 1}`
      }));
    } else if (jlpt === 'N4') {
      chapterDefs = Array.from({ length: 26 }, (_, i) => ({
        chapterNumber: i + 25,
        chapterName: `第${i + 25}課`,
        title: `Chapter ${i + 25}`
      }));
    } else {
      chapterDefs = Array.from({ length: 24 }, (_, i) => ({
        chapterNumber: i + 1,
        chapterName: `第${i + 1}課`,
        title: `Chapter ${i + 1}`
      }));
    }

    // Include any additional chapters found in MongoDB outside default range (textbook chapters only)
    const dbChapterNums = new Set(
      allItems
        .filter(v => typeof v.chapter === 'number' && v.chapter > 0 && v.source !== 'Extra' && v.destinationType !== 'extra' && !v.customChapterId)
        .map(v => v.chapter)
    );
    dbChapterNums.forEach(chNum => {
      if (!chapterDefs.some(c => c.chapterNumber === chNum)) {
        chapterDefs.push({
          chapterNumber: chNum,
          chapterName: `第${chNum}課`,
          title: `Chapter ${chNum}`
        });
      }
    });

    chapterDefs.sort((a, b) => a.chapterNumber - b.chapterNumber);

    // 3. Separate chapter items vs custom chapter items vs extra items
    const extraVocabulary = [];
    const chapterMap = new Map();
    chapterDefs.forEach(c => chapterMap.set(c.chapterNumber, []));

    formattedAll.forEach(item => {
      const isCustom = item.customChapterId && customChaptersMap.has(item.customChapterId.toString());
      const isExtra = item.destinationType === 'extra' || (!item.customChapterId && (item.source === 'Extra' || !item.chapter || item.chapter <= 0));

      if (isCustom) {
        const customCh = customChaptersMap.get(item.customChapterId.toString());
        customCh.vocabularies.push(item);
        customCh.wordCount = customCh.vocabularies.length;
      } else if (isExtra) {
        extraVocabulary.push(item);
      } else if (item.chapter && item.destinationType !== 'extra' && !item.customChapterId) {
        if (chapterMap.has(item.chapter)) {
          chapterMap.get(item.chapter).push(item);
        } else {
          chapterMap.set(item.chapter, [item]);
        }
      } else {
        extraVocabulary.push(item);
      }
    });

    const chapters = chapterDefs.map(c => {
      const words = chapterMap.get(c.chapterNumber) || [];
      return {
        chapterNumber: c.chapterNumber,
        chapterName: c.chapterName,
        title: c.title,
        wordCount: words.length,
        vocabularies: words
      };
    });

    return res.json({
      success: true,
      jlpt,
      chapters,
      customChapters: Array.from(customChaptersMap.values()),
      extraVocabulary,
      extraVocabularyCount: extraVocabulary.length,
      totalMasterCount: formattedAll.length
    });
  } catch (error) {
    console.error('Error fetching vocabulary structure:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve vocabulary structure.'
    });
  }
});

// @route   GET /api/vocabulary/chapters
// @desc    Get dynamic 24-chapter overview with word counts (including 0-word empty chapters)
// @access  Public
router.get('/chapters', async (req, res) => {
  try {
    const { jlpt = 'N5' } = req.query;
    const targetLevels = (!jlpt || jlpt === 'All') ? ['N5', 'N4', 'N3'] : [jlpt];

    // Aggregate counts of textbook words from MongoDB (excluding custom chapters & extra)
    const filter = (!jlpt || jlpt === 'All')
      ? { destinationType: { $ne: 'extra' }, customChapterId: null, source: { $ne: 'Extra' }, chapter: { $gt: 0 } }
      : { jlptLevel: jlpt, destinationType: { $ne: 'extra' }, customChapterId: null, source: { $ne: 'Extra' }, chapter: { $gt: 0 } };

    if (req.user) {
      const uId = req.user.id || req.user._id;
      const hiddenDocs = await UserVocabulary.find({
        $or: [{ userId: uId }, { userId: uId.toString() }],
        hidden: true
      }).select('vocabularyId').lean();
      if (hiddenDocs.length > 0) {
        const validHiddenIds = hiddenDocs
          .map(d => d.vocabularyId)
          .filter(id => id && mongoose.Types.ObjectId.isValid(id.toString()))
          .map(id => new mongoose.Types.ObjectId(id.toString()));
        if (validHiddenIds.length > 0) {
          filter._id = { ...(filter._id || {}), $nin: validHiddenIds };
        }
      }
    }

    const dbCounts = await Vocabulary.aggregate([
      { $match: filter },
      { $group: { _id: { jlpt: '$jlptLevel', chapter: '$chapter' }, count: { $sum: 1 } } }
    ]);

    const countMap = new Map();
    dbCounts.forEach(c => {
      countMap.set(`${c._id.jlpt}_${c._id.chapter}`, c.count);
    });

    const result = [];
    for (const lvl of targetLevels) {
      const startCh = (lvl === 'N4') ? 25 : 1;
      const endCh = (lvl === 'N4') ? 50 : 24;

      const seenChapters = new Set();
      for (let ch = startCh; ch <= endCh; ch++) {
        seenChapters.add(ch);
        const count = countMap.get(`${lvl}_${ch}`) || 0;
        result.push({
          jlpt: lvl,
          chapter: ch,
          chapterName: `第${ch}課`,
          title: `Chapter ${ch}`,
          count
        });
      }

      // Also include any chapters in DB outside default range
      dbCounts.forEach(c => {
        if (c._id.jlpt === lvl && !seenChapters.has(c._id.chapter) && typeof c._id.chapter === 'number') {
          result.push({
            jlpt: lvl,
            chapter: c._id.chapter,
            chapterName: `第${c._id.chapter}課`,
            title: `Chapter ${c._id.chapter}`,
            count: c.count
          });
        }
      });
    }

    result.sort((a, b) => {
      if (a.jlpt !== b.jlpt) return a.jlpt.localeCompare(b.jlpt);
      return a.chapter - b.chapter;
    });

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching chapter overview:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve chapter overview.'
    });
  }
});

// @route   GET /api/vocabulary/:id
// @desc    Get single vocabulary item
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const item = await Vocabulary.findById(req.params.id);
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
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve item.'
    });
  }
});

// @route   PUT /api/vocabulary/:id/hide
// @desc    Hide vocabulary item for authenticated user (Zero master overwrite)
// @access  Private
router.put('/:id/hide', protect, async (req, res) => {
  try {
    const overlay = await UserVocabulary.findOneAndUpdate(
      { userId: req.user.id, vocabularyId: req.params.id },
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
  } catch (err) {
    console.error('Error hiding vocabulary item:', err);
    return res.status(500).json({
      success: false,
      message: 'Unable to remove vocabulary. Please try again.'
    });
  }
});

// @route   DELETE /api/vocabulary/:id/user
// @desc    Alias for removing/hiding vocabulary for authenticated user
// @access  Private
router.delete('/:id/user', protect, async (req, res) => {
  try {
    const overlay = await UserVocabulary.findOneAndUpdate(
      { userId: req.user.id, vocabularyId: req.params.id },
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
  } catch (err) {
    console.error('Error hiding vocabulary item:', err);
    return res.status(500).json({
      success: false,
      message: 'Unable to remove vocabulary. Please try again.'
    });
  }
});

export default router;
