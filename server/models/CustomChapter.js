import mongoose from 'mongoose';

const customChapterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Custom chapter name is required'],
      trim: true
    },
    displayName: {
      type: String,
      trim: true
    },
    japaneseName: {
      type: String,
      trim: true,
      default: ''
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    jlptLevel: {
      type: String,
      enum: ['N5', 'N4', 'N3', 'N2', 'N1'],
      default: 'N5'
    },
    order: {
      type: Number,
      default: 0
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

customChapterSchema.index({ jlptLevel: 1, order: 1 });
customChapterSchema.index({ name: 1, jlptLevel: 1 }, { unique: true });

export const CustomChapter = mongoose.model('CustomChapter', customChapterSchema);
