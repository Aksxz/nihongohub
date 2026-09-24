import mongoose from 'mongoose';

const studyNoteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: [true, 'Note title is required'],
      trim: true
    },
    content: {
      type: String,
      default: ''
    },
    category: {
      type: String,
      default: 'General'
    },
    relatedVocabulary: {
      type: [String],
      default: []
    },
    relatedKanji: {
      type: [String],
      default: []
    },
    jlptLevel: {
      type: String,
      enum: ['N5', 'N4', 'N3', 'N2', 'N1', 'All', ''],
      default: 'N5'
    },
    chapter: {
      type: Number,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Index to ensure user can only query their own notes
studyNoteSchema.index({ userId: 1, createdAt: -1 });

export const StudyNote = mongoose.model('StudyNote', studyNoteSchema);
