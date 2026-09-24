import express from 'express';
import { StudyNote } from '../models/StudyNote.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// @route   GET /api/notes
// @desc    Get all study notes belonging to current user
// @access  Private
router.get('/', async (req, res) => {
  try {
    const notes = await StudyNote.find({ userId: req.user.id })
      .sort({ updatedAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: notes.length,
      data: notes.map(n => ({
        ...n,
        id: n._id.toString()
      }))
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve study notes.'
    });
  }
});

// @route   POST /api/notes
// @desc    Create a new private study note
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { title, content, category, relatedVocabulary, relatedKanji, jlptLevel, chapter } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Please provide note title.'
      });
    }

    const note = await StudyNote.create({
      userId: req.user.id,
      title: title.trim(),
      content: content || '',
      category: category || 'General',
      relatedVocabulary: relatedVocabulary || [],
      relatedKanji: relatedKanji || [],
      jlptLevel: jlptLevel || 'N5',
      chapter: chapter || null
    });

    return res.status(201).json({
      success: true,
      data: {
        ...note.toObject(),
        id: note._id.toString()
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create note.'
    });
  }
});

// @route   PUT /api/notes/:id
// @desc    Update a private study note
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const note = await StudyNote.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found or access denied.'
      });
    }

    const { title, content, category, relatedVocabulary, relatedKanji, jlptLevel, chapter } = req.body;

    if (title !== undefined) note.title = title.trim();
    if (content !== undefined) note.content = content;
    if (category !== undefined) note.category = category;
    if (relatedVocabulary !== undefined) note.relatedVocabulary = relatedVocabulary;
    if (relatedKanji !== undefined) note.relatedKanji = relatedKanji;
    if (jlptLevel !== undefined) note.jlptLevel = jlptLevel;
    if (chapter !== undefined) note.chapter = chapter;

    await note.save();

    return res.json({
      success: true,
      data: {
        ...note.toObject(),
        id: note._id.toString()
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update note.'
    });
  }
});

// @route   DELETE /api/notes/:id
// @desc    Delete a private study note
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const note = await StudyNote.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found or access denied.'
      });
    }

    return res.json({
      success: true,
      message: 'Note deleted successfully.'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete note.'
    });
  }
});

export default router;
