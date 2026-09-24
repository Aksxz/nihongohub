import express from 'express';
import { Progress } from '../models/Progress.js';
import { UserVocabulary } from '../models/UserVocabulary.js';
import { UserKanji } from '../models/UserKanji.js';
import { Vocabulary } from '../models/Vocabulary.js';
import { Kanji } from '../models/Kanji.js';
import { CustomChapter } from '../models/CustomChapter.js';
import { QuizResult } from '../models/QuizResult.js';
import { protect } from '../middleware/auth.js';
import { checkDbConnection } from '../config/db.js';

const router = express.Router();

router.use(checkDbConnection);
router.use(protect);

// @route   GET /api/progress
// @desc    Get dynamic study progress for current authenticated user
// @access  Private
router.get('/', async (req, res) => {
  try {
    const targetLevel = req.query.jlpt || req.user.selectedLevel || 'N5';

    // 1. Fetch user overlays and quiz history for this specific user
    const [userVocabs, userKanjis, quizResults] = await Promise.all([
      UserVocabulary.find({ userId: req.user.id }).lean(),
      UserKanji.find({ userId: req.user.id }).lean(),
      QuizResult.find({ userId: req.user.id }).sort({ timestamp: -1 }).lean()
    ]);

    // 2. Fetch master data for the targeted JLPT level
    const [allVocabs, allKanjis, customChapters] = await Promise.all([
      Vocabulary.find({ jlptLevel: targetLevel }).lean(),
      Kanji.find({ jlptLevel: targetLevel }).lean(),
      CustomChapter.find({ jlptLevel: targetLevel }).sort({ order: 1, createdAt: 1 }).lean()
    ]);

    // 3. Sets of practiced, learned, and hidden items
    const hiddenVocabIds = new Set(
      userVocabs.filter(uv => uv.hidden).map(uv => uv.vocabularyId.toString())
    );
    const activeVocabs = allVocabs.filter(v => !hiddenVocabIds.has(v._id.toString()));

    const practicedVocabIds = new Set(
      userVocabs.filter(uv => (uv.practiceCount || 0) > 0).map(uv => uv.vocabularyId.toString())
    );
    const learnedVocabIds = new Set(
      userVocabs.filter(uv => uv.learned || uv.status === 'mastered').map(uv => uv.vocabularyId.toString())
    );
    const masteredKanjiIds = new Set(
      userKanjis.filter(uk => uk.mastered).map(uk => uk.kanjiId.toString())
    );

    // 4. Overall vocabulary counts (scoped to user's active non-hidden vocabulary)
    const totalVocabulary = activeVocabs.length;
    const wordsPracticed = activeVocabs.filter(v => practicedVocabIds.has(v._id.toString())).length;
    const wordsLearned = activeVocabs.filter(v => learnedVocabIds.has(v._id.toString())).length;
    const wordsRemaining = Math.max(0, totalVocabulary - wordsLearned);

    // Kanji counts
    const totalKanji = allKanjis.length;
    const kanjiLearned = allKanjis.filter(
      k => masteredKanjiIds.has(k._id.toString()) || (k.id && masteredKanjiIds.has(k.id.toString()))
    ).length;
    const kanjiRemaining = Math.max(0, totalKanji - kanjiLearned);

    // Overall progress percentage based on practiced vocabulary
    const overallPercentage = totalVocabulary > 0 ? Math.round((wordsPracticed / totalVocabulary) * 100) : 0;

    // 5. Practice Attempts & Accuracy calculation
    const vocabAttempts = userVocabs.reduce((acc, uv) => acc + (uv.practiceCount || 0), 0);
    const vocabCorrect = userVocabs.reduce((acc, uv) => acc + (uv.correctCount || 0), 0);
    const vocabWrong = userVocabs.reduce((acc, uv) => acc + (uv.wrongCount || 0), 0);

    const quizTotalQuestions = quizResults.reduce((acc, q) => acc + (q.total || 0), 0);
    const quizCorrectAnswers = quizResults.reduce((acc, q) => acc + (q.score || 0), 0);
    const quizWrongAnswers = Math.max(0, quizTotalQuestions - quizCorrectAnswers);

    const totalPracticeAttempts = Math.max(vocabAttempts, quizTotalQuestions);
    const totalCorrect = Math.max(vocabCorrect, quizCorrectAnswers);
    const totalWrong = Math.max(vocabWrong, quizWrongAnswers);
    const averageAccuracy = totalPracticeAttempts > 0 ? Math.round((totalCorrect / totalPracticeAttempts) * 100) : 0;

    // 6. Chapter Progress Breakdown (Textbook Chapters 1–24 for N5, 25–50 for N4)
    const chapterRange = targetLevel === 'N4' 
      ? Array.from({ length: 26 }, (_, i) => i + 25)
      : Array.from({ length: 24 }, (_, i) => i + 1);

    const chapterProgress = chapterRange.map(chNum => {
      const chWords = activeVocabs.filter(
        v => v.chapter === chNum && v.destinationType !== 'extra' && !v.customChapterId && v.source !== 'Extra'
      );
      const total = chWords.length;
      const practiced = chWords.filter(v => practicedVocabIds.has(v._id.toString())).length;
      const learned = chWords.filter(v => learnedVocabIds.has(v._id.toString())).length;
      const percentage = total > 0 ? Math.round((practiced / total) * 100) : 0;

      return {
        chapter: chNum,
        chapterNumber: chNum,
        title: `Chapter ${chNum}`,
        japaneseTitle: `第${chNum}課`,
        total,
        practiced,
        learned,
        percentage,
        empty: total === 0
      };
    });

    // 7. Custom Chapters Breakdown
    const customChapterProgress = customChapters.map(cc => {
      const ccWords = activeVocabs.filter(
        v => v.customChapterId && v.customChapterId.toString() === cc._id.toString()
      );
      const total = ccWords.length;
      const practiced = ccWords.filter(v => practicedVocabIds.has(v._id.toString())).length;
      const learned = ccWords.filter(v => learnedVocabIds.has(v._id.toString())).length;
      const percentage = total > 0 ? Math.round((practiced / total) * 100) : 0;

      return {
        id: cc._id.toString(),
        name: cc.name,
        displayName: cc.displayName || cc.name,
        japaneseName: cc.japaneseName || '',
        description: cc.description || '',
        total,
        practiced,
        learned,
        percentage,
        empty: total === 0
      };
    });

    // 8. Extra Vocabulary Breakdown
    const extraWords = allVocabs.filter(
      v => v.destinationType === 'extra' || (!v.customChapterId && (v.source === 'Extra' || !v.chapter || v.chapter <= 0))
    );
    const extraTotal = extraWords.length;
    const extraPracticed = extraWords.filter(v => practicedVocabIds.has(v._id.toString())).length;
    const extraLearned = extraWords.filter(v => learnedVocabIds.has(v._id.toString())).length;
    const extraPercentage = extraTotal > 0 ? Math.round((extraPracticed / extraTotal) * 100) : 0;

    const extraVocabularyProgress = {
      total: extraTotal,
      practiced: extraPracticed,
      learned: extraLearned,
      percentage: extraPercentage,
      empty: extraTotal === 0
    };

    // 9. Weak Words & Hard Words Mapping
    const vocabById = new Map(allVocabs.map(v => [v._id.toString(), v]));

    const missingVocabIds = userVocabs
      .map(uv => uv.vocabularyId)
      .filter(id => id && !vocabById.has(id.toString()));

    if (missingVocabIds.length > 0) {
      const extraVocabsFound = await Vocabulary.find({ _id: { $in: missingVocabIds } }).lean();
      extraVocabsFound.forEach(v => vocabById.set(v._id.toString(), v));
    }

    const mapToWordDetail = (uv) => {
      const v = vocabById.get(uv.vocabularyId.toString()) || {};
      const attempts = (uv.practiceCount || 0) + (uv.wrongCount || 0);
      const acc = attempts > 0 ? Math.round(((uv.correctCount || 0) / attempts) * 100) : 0;
      const displayWord = v.word || v.kanji || '—';
      return {
        id: uv.vocabularyId.toString(),
        vocabularyId: uv.vocabularyId.toString(),
        japanese: displayWord,
        word: displayWord,
        reading: v.hiragana || v.katakana || v.romaji || '',
        romaji: v.romaji || '',
        english: uv.customMeaning || v.meaning || '',
        meaning: uv.customMeaning || v.meaning || '',
        partOfSpeech: v.partOfSpeech || 'Noun',
        chapter: v.chapter || null,
        destinationType: v.destinationType || 'chapter',
        status: uv.status || (uv.difficult ? 'hard' : 'normal'),
        wrongCount: uv.wrongCount || 0,
        correctCount: uv.correctCount || 0,
        practiceCount: uv.practiceCount || 0,
        accuracy: acc,
        lastPracticed: uv.lastPracticed ? new Date(uv.lastPracticed).getTime() : null,
        lastIncorrect: uv.lastIncorrect ? new Date(uv.lastIncorrect).getTime() : null
      };
    };

    const weakWords = userVocabs
      .filter(uv => uv.status === 'weak')
      .map(mapToWordDetail);

    const hardWords = userVocabs
      .filter(uv => uv.status === 'hard' || uv.difficult === true)
      .map(mapToWordDetail);

    // 10. Sync & Persist to user's Progress record in MongoDB
    const progressDoc = await Progress.findOneAndUpdate(
      { userId: req.user.id },
      {
        $set: {
          level: targetLevel,
          chapterProgress,
          vocabularyLearned: wordsLearned,
          vocabularyRemaining: wordsRemaining,
          wordsPracticed,
          totalPracticeAttempts,
          weakWordsCount: weakWords.length,
          hardWordsCount: hardWords.length,
          kanjiLearned,
          kanjiRemaining,
          overallPercentage,
          quizStatistics: {
            totalQuizzes: quizResults.length,
            correctAnswers: totalCorrect,
            wrongAnswers: totalWrong,
            averageAccuracy
          }
        }
      },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    );

    return res.json({
      success: true,
      data: {
        _id: progressDoc._id,
        userId: req.user.id,
        level: targetLevel,
        overallPercentage,
        totalVocabulary,
        wordsPracticed,
        wordsLearned,
        vocabularyLearned: wordsLearned,
        vocabularyRemaining: wordsRemaining,
        totalPracticeAttempts,
        accuracy: averageAccuracy,
        overallAccuracy: averageAccuracy,
        totalKanji,
        kanjiLearned,
        kanjiRemaining,
        chapterProgress,
        customChapterProgress,
        extraVocabularyProgress,
        weakWords,
        hardWords,
        weakWordsCount: weakWords.length,
        hardWordsCount: hardWords.length,
        quizStatistics: {
          totalQuizzes: quizResults.length,
          correctAnswers: totalCorrect,
          wrongAnswers: totalWrong,
          averageAccuracy
        },
        studyTime: progressDoc.studyTime || 0,
        streak: progressDoc.streak || 0,
        lastStudyDate: progressDoc.lastStudyDate || null
      }
    });
  } catch (error) {
    console.error('Error fetching dynamic progress:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve progress data.'
    });
  }
});

// @route   PUT /api/progress
// @desc    Update study progress for current user
// @access  Private
router.put('/', async (req, res) => {
  try {
    const updateData = req.body;
    delete updateData.userId; // Prevent userId tampering

    const progress = await Progress.findOneAndUpdate(
      { userId: req.user.id },
      { $set: updateData },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    );

    return res.json({
      success: true,
      message: 'Progress updated successfully.',
      data: progress
    });
  } catch (error) {
    console.error('Error updating progress:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update progress.'
    });
  }
});

export default router;
