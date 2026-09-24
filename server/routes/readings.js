import express from "express";
import mongoose from "mongoose";
import fs from "fs";
import { Reading } from "../models/Reading.js";
import { ReadingProgress } from "../models/ReadingProgress.js";
import { Notification } from "../models/Notification.js";
import { checkDbConnection } from "../config/db.js";
import { protect, optionalProtect } from "../middleware/auth.js";
import { uploadCsv } from "../middleware/upload.js";
import { parseAndValidateReadingCSV } from "../utils/csvParser.js";

const router = express.Router();

router.use(checkDbConnection);
router.use(optionalProtect);

// Middleware to verify admin privileges
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied: Admin privileges required."
    });
  }
  next();
};

// Helper to sanitize reading for student view (strips correctAnswer)
function sanitizeReadingForStudent(reading) {
  return {
    ...reading,
    id: reading._id.toString(),
    questions: (reading.questions || []).map((q, idx) => ({
      _id: q._id ? q._id.toString() : String(idx),
      id: q._id ? q._id.toString() : String(idx),
      questionIndex: idx,
      question: q.question,
      options: q.options || [],
      // Do NOT expose correctAnswer to client before answering
    }))
  };
}

// @route   GET /api/readings
// @desc    Get all active reading passages for students (answers hidden)
// @access  Public / Authenticated
router.get("/", async (req, res) => {
  try {
    const { jlpt, search } = req.query;
    const filter = { isActive: true };

    if (jlpt && jlpt !== "All") {
      filter.jlptLevel = jlpt;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      filter.$or = [
        { title: searchRegex },
        { passage: searchRegex },
        { "questions.question": searchRegex }
      ];
    }

    const readings = await Reading.find(filter)
      .sort({ paragraphNumber: 1, order: 1, createdAt: 1 })
      .lean();

    // If user is authenticated, attach their best / latest score for each reading
    let progressMap = new Map();
    if (req.user) {
      const uId = req.user._id || (mongoose.Types.ObjectId.isValid(req.user.id) ? new mongoose.Types.ObjectId(req.user.id) : req.user.id);
      const userProgress = await ReadingProgress.find({ userId: uId })
        .sort({ attemptedAt: -1 })
        .lean();

      userProgress.forEach(p => {
        const rId = p.readingId.toString();
        if (!progressMap.has(rId)) {
          progressMap.set(rId, {
            score: p.score,
            totalQuestions: p.totalQuestions,
            percentage: p.percentage,
            latestScore: p.score,
            latestTotal: p.totalQuestions,
            latestPercentage: p.percentage,
            bestScore: p.score,
            bestPercentage: p.percentage,
            attemptCount: 1,
            lastAttemptedAt: p.attemptedAt
          });
        } else {
          const entry = progressMap.get(rId);
          entry.attemptCount += 1;
          if (p.score > entry.bestScore) {
            entry.bestScore = p.score;
            entry.bestPercentage = p.percentage;
            entry.score = p.score;
            entry.percentage = p.percentage;
          }
        }
      });
    }

    const data = readings.map(r => {
      const sanitized = sanitizeReadingForStudent(r);
      const userStats = progressMap.get(r._id.toString()) || null;
      return {
        ...sanitized,
        userProgress: userStats
      };
    });

    return res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    console.error("Error fetching readings:", error);
    return res.status(500).json({ success: false, message: "Failed to retrieve reading passages." });
  }
});

// @route   GET /api/readings/admin/all & GET /api/readings/admin
// @desc    Get all reading passages with full questions and correct answers for Admin
// @access  Protected (Admin only)
const handleAdminGetAllReadings = async (req, res) => {
  try {
    const { jlpt, search } = req.query;
    const filter = {};

    if (jlpt && jlpt !== "All" && jlpt !== "all") {
      filter.jlptLevel = jlpt;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      filter.$or = [
        { title: searchRegex },
        { passage: searchRegex },
        { "questions.question": searchRegex }
      ];
    }

    const readings = await Reading.find(filter)
      .sort({ paragraphNumber: 1, order: 1, createdAt: 1 })
      .lean();

    return res.json({
      success: true,
      count: readings.length,
      data: readings.map(r => ({
        ...r,
        id: r._id.toString()
      }))
    });
  } catch (error) {
    console.error("Error fetching admin readings:", error);
    return res.status(500).json({ success: false, message: "Failed to retrieve readings for admin." });
  }
};

router.get("/admin/all", protect, requireAdmin, handleAdminGetAllReadings);
router.get("/admin", protect, requireAdmin, handleAdminGetAllReadings);

// @route   GET /api/readings/progress/me
// @desc    Get authenticated user's reading progress history
// @access  Protected
router.get("/progress/me", protect, async (req, res) => {
  try {
    const history = await ReadingProgress.find({ userId: req.user.id })
      .populate("readingId", "title paragraphNumber jlptLevel")
      .sort({ attemptedAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: history.length,
      data: history.map(h => ({
        ...h,
        id: h._id.toString()
      }))
    });
  } catch (error) {
    console.error("Error fetching reading progress:", error);
    return res.status(500).json({ success: false, message: "Failed to retrieve reading progress." });
  }
});

// @route   GET /api/readings/:id
// @desc    Get single reading passage for student (correct answers stripped)
// @access  Public / Authenticated
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid reading ID." });
    }

    const reading = await Reading.findById(req.params.id).lean();
    if (!reading) {
      return res.status(404).json({ success: false, message: "Reading passage not found." });
    }

    let userStats = null;
    if (req.user) {
      const uId = req.user._id || (mongoose.Types.ObjectId.isValid(req.user.id) ? new mongoose.Types.ObjectId(req.user.id) : req.user.id);
      const latestProgress = await ReadingProgress.findOne({ userId: uId, readingId: reading._id })
        .sort({ attemptedAt: -1 })
        .lean();
      if (latestProgress) {
        userStats = {
          score: latestProgress.score,
          totalQuestions: latestProgress.totalQuestions,
          percentage: latestProgress.percentage,
          latestScore: latestProgress.score,
          latestTotal: latestProgress.totalQuestions,
          latestPercentage: latestProgress.percentage,
          lastAttemptedAt: latestProgress.attemptedAt
        };
      }
    }

    return res.json({
      success: true,
      data: {
        ...sanitizeReadingForStudent(reading),
        userProgress: userStats
      }
    });
  } catch (error) {
    console.error("Error fetching reading:", error);
    return res.status(500).json({ success: false, message: "Failed to retrieve reading passage." });
  }
});

// @route   GET /api/readings/admin/:id
// @desc    Get single reading passage for admin with correct answers intact
// @access  Protected (Admin only)
router.get("/admin/:id", protect, requireAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid reading ID." });
    }

    const reading = await Reading.findById(req.params.id).lean();
    if (!reading) {
      return res.status(404).json({ success: false, message: "Reading passage not found." });
    }

    return res.json({
      success: true,
      data: {
        ...reading,
        id: reading._id.toString()
      }
    });
  } catch (error) {
    console.error("Error fetching admin reading:", error);
    return res.status(500).json({ success: false, message: "Failed to retrieve reading passage." });
  }
});

// @route   POST /api/readings
// @desc    Create new reading passage with 5 MCQs and admin-defined correct answers
// @access  Protected (Admin only)
router.post("/", protect, requireAdmin, async (req, res) => {
  try {
    const {
      title,
      paragraphNumber,
      passage,
      questions,
      jlptLevel = "N5",
      order = 0,
      isActive = true
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Reading title is required (e.g. Paragraph 1)." });
    }

    if (!passage || !passage.trim()) {
      return res.status(400).json({ success: false, message: "Reading passage text is required." });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: "At least one reading question is required." });
    }

    // Validate every question strictly (Requirement 5 & 8)
    const validLabels = new Set(["A", "B", "C", "D"]);
    const cleanedQuestions = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qNum = i + 1;

      if (!q.question || !q.question.trim()) {
        return res.status(400).json({
          success: false,
          message: `Question ${qNum}: Question text is required.`
        });
      }

      if (!Array.isArray(q.options) || q.options.length !== 4) {
        return res.status(400).json({
          success: false,
          message: `Question ${qNum}: Exactly 4 options (A, B, C, D) are required.`
        });
      }

      const cleanedOptions = [];
      for (const label of ["A", "B", "C", "D"]) {
        const opt = q.options.find(o => o && o.label === label);
        if (!opt || !opt.text || !opt.text.trim()) {
          return res.status(400).json({
            success: false,
            message: `Question ${qNum}: Option ${label} text is required.`
          });
        }
        cleanedOptions.push({ label, text: opt.text.trim() });
      }

      if (!q.correctAnswer || !validLabels.has(q.correctAnswer.toUpperCase())) {
        return res.status(400).json({
          success: false,
          message: `Question ${qNum}: You must select a valid Correct Answer (A, B, C, or D).`
        });
      }

      cleanedQuestions.push({
        question: q.question.trim(),
        options: cleanedOptions,
        correctAnswer: q.correctAnswer.toUpperCase(),
        explanation: q.explanation ? q.explanation.trim() : ""
      });
    }

    // Auto-calculate paragraphNumber if not provided
    let pNum = parseInt(paragraphNumber, 10);
    if (isNaN(pNum) || pNum <= 0) {
      const latestReading = await Reading.findOne().sort({ paragraphNumber: -1 }).lean();
      pNum = latestReading && latestReading.paragraphNumber ? latestReading.paragraphNumber + 1 : 1;
    }

    const newReading = await Reading.create({
      title: title.trim(),
      paragraphNumber: pNum,
      passage: passage.trim(),
      questions: cleanedQuestions,
      jlptLevel,
      order: parseInt(order, 10) || 0,
      isActive: Boolean(isActive)
    });

    // Create in-app notification for existing users after successful DB insertion
    try {
      await Notification.create({
        type: 'reading',
        title: 'New Reading Available',
        message: `A new reading exercise "${newReading.title}" has been added.`,
        contentId: newReading._id
      });
    } catch (notifErr) {
      console.error('Failed to create reading notification:', notifErr);
    }

    return res.status(201).json({
      success: true,
      message: "Reading passage created successfully.",
      data: {
        ...newReading.toObject(),
        id: newReading._id.toString()
      }
    });
  } catch (error) {
    console.error("Error creating reading:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to create reading passage." });
  }
});

// @route   PUT /api/readings/:id
// @desc    Update reading passage and questions
// @access  Protected (Admin only)
router.put("/:id", protect, requireAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid reading ID." });
    }

    const {
      title,
      paragraphNumber,
      passage,
      questions,
      jlptLevel,
      order,
      isActive
    } = req.body;

    const updates = {};
    if (title !== undefined) updates.title = title.trim();
    if (paragraphNumber !== undefined) updates.paragraphNumber = parseInt(paragraphNumber, 10);
    if (passage !== undefined) updates.passage = passage.trim();
    if (jlptLevel !== undefined) updates.jlptLevel = jlptLevel;
    if (order !== undefined) updates.order = parseInt(order, 10);
    if (isActive !== undefined) updates.isActive = Boolean(isActive);

    if (Array.isArray(questions)) {
      const validLabels = new Set(["A", "B", "C", "D"]);
      const cleanedQuestions = [];

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const qNum = i + 1;

        if (!q.question || !q.question.trim()) {
          return res.status(400).json({
            success: false,
            message: `Question ${qNum}: Question text is required.`
          });
        }

        if (!Array.isArray(q.options) || q.options.length !== 4) {
          return res.status(400).json({
            success: false,
            message: `Question ${qNum}: Exactly 4 options (A, B, C, D) are required.`
          });
        }

        const cleanedOptions = [];
        for (const label of ["A", "B", "C", "D"]) {
          const opt = q.options.find(o => o && o.label === label);
          if (!opt || !opt.text || !opt.text.trim()) {
            return res.status(400).json({
              success: false,
              message: `Question ${qNum}: Option ${label} text is required.`
            });
          }
          cleanedOptions.push({ label, text: opt.text.trim() });
        }

        if (!q.correctAnswer || !validLabels.has(q.correctAnswer.toUpperCase())) {
          return res.status(400).json({
            success: false,
            message: `Question ${qNum}: You must select a valid Correct Answer (A, B, C, or D).`
          });
        }

        cleanedQuestions.push({
          question: q.question.trim(),
          options: cleanedOptions,
          correctAnswer: q.correctAnswer.toUpperCase(),
          explanation: q.explanation ? q.explanation.trim() : ""
        });
      }
      updates.questions = cleanedQuestions;
    }

    const updated = await Reading.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).lean();
    if (!updated) {
      return res.status(404).json({ success: false, message: "Reading passage not found." });
    }

    return res.json({
      success: true,
      message: "Reading passage updated successfully.",
      data: {
        ...updated,
        id: updated._id.toString()
      }
    });
  } catch (error) {
    console.error("Error updating reading:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to update reading passage." });
  }
});

// @route   DELETE /api/readings/:id
// @desc    Delete reading passage and its associated progress
// @access  Protected (Admin only)
router.delete("/:id", protect, requireAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid reading ID." });
    }

    const deleted = await Reading.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Reading passage not found." });
    }

    // Clean up related progress records
    await ReadingProgress.deleteMany({ readingId: req.params.id });

    return res.json({
      success: true,
      message: "Reading passage deleted successfully."
    });
  } catch (error) {
    console.error("Error deleting reading:", error);
    return res.status(500).json({ success: false, message: "Failed to delete reading passage." });
  }
});

// @route   POST /api/readings/:id/submit
// @desc    Submit answers for evaluation by server (Requirement 9 & 10)
// @access  Public / Authenticated
router.post("/:id/submit", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid reading ID." });
    }

    const reading = await Reading.findById(req.params.id).lean();
    if (!reading) {
      return res.status(404).json({ success: false, message: "Reading passage not found." });
    }

    const { answers } = req.body;
    if (!answers || typeof answers !== "object") {
      return res.status(400).json({ success: false, message: "Answers payload is required." });
    }

    let score = 0;
    const totalQuestions = reading.questions.length;
    const evaluationResults = [];

    reading.questions.forEach((q, idx) => {
      // User can submit either answers["0"] or answers[q._id] or answers[idx] or answers["question1"]
      const submittedAnswer = answers[String(idx)] || answers[q._id ? q._id.toString() : ""] || answers[`question${idx + 1}`] || "";
      const normalizedSubmitted = typeof submittedAnswer === "string" ? submittedAnswer.trim().toUpperCase() : "";
      const isCorrect = normalizedSubmitted === q.correctAnswer;

      if (isCorrect) {
        score++;
      }

      evaluationResults.push({
        questionIndex: idx,
        questionId: q._id ? q._id.toString() : String(idx),
        questionText: q.question,
        options: q.options,
        userAnswer: normalizedSubmitted,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation || ""
      });
    });

    const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

    // If user is authenticated, save ReadingProgress to MongoDB (Requirement 11)
    let savedProgressId = null;
    if (req.user) {
      const progressRecord = await ReadingProgress.create({
        userId: req.user.id || req.user._id,
        readingId: reading._id,
        score,
        totalQuestions,
        percentage,
        answers: evaluationResults.map(r => ({
          questionIndex: r.questionIndex,
          questionText: r.questionText,
          userAnswer: r.userAnswer,
          correctAnswer: r.correctAnswer,
          isCorrect: r.isCorrect
        })),
        attemptedAt: new Date()
      });
      savedProgressId = progressRecord._id.toString();
    }

    const payload = {
      readingId: reading._id.toString(),
      readingTitle: reading.title,
      paragraphNumber: reading.paragraphNumber,
      score,
      totalQuestions,
      percentage,
      progressId: savedProgressId,
      results: evaluationResults
    };

    return res.json({
      success: true,
      ...payload,
      data: payload
    });
  } catch (error) {
    console.error("Error evaluating reading submission:", error);
    return res.status(500).json({ success: false, message: "Failed to evaluate reading submission." });
  }
});

// @route   POST /api/readings/csv/preview
// @desc    Preview and validate Reading CSV before import
// @access  Protected (Admin only)
router.post("/csv/preview", protect, requireAdmin, uploadCsv.single("file"), async (req, res) => {
  let filePath = null;
  try {
    let csvContent = "";
    if (req.file) {
      filePath = req.file.path;
      csvContent = fs.readFileSync(filePath, "utf-8");
    } else if (req.body.csvText) {
      csvContent = req.body.csvText;
    } else {
      return res.status(400).json({ success: false, message: "Please provide a CSV file or csvText." });
    }

    const { jlptLevel = "N5" } = req.body;
    const parseResult = parseAndValidateReadingCSV(csvContent, jlptLevel);

    if (filePath && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (_) {}
    }

    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: parseResult.message,
        errors: parseResult.errors
      });
    }

    // Check duplicates against existing readings in MongoDB by (title + passage)
    const titles = parseResult.validReadings.map(r => r.title.trim());
    const existingDocs = await Reading.find({
      title: { $in: titles }
    }).select("title passage").lean();

    const existingMap = new Map();
    existingDocs.forEach(d => {
      const key = `${d.title.trim()}_${d.passage.trim().slice(0, 50)}`;
      existingMap.set(key, d);
      existingMap.set(d.title.trim(), d);
    });

    let duplicateCount = 0;
    const previewReadings = parseResult.validReadings.map(r => {
      const key = `${r.title.trim()}_${r.passage.trim().slice(0, 50)}`;
      const isDup = existingMap.has(key) || existingMap.has(r.title.trim());
      if (isDup) duplicateCount++;
      return {
        ...r,
        isDuplicate: isDup,
        existingId: isDup ? (existingMap.get(key) || existingMap.get(r.title.trim()))._id.toString() : null
      };
    });

    return res.json({
      success: true,
      totalRows: parseResult.validReadings.length,
      validReadings: previewReadings,
      duplicateCount,
      newCount: parseResult.validReadings.length - duplicateCount,
      previewReadings
    });
  } catch (error) {
    if (filePath && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (_) {}
    }
    console.error("Error previewing reading CSV:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to parse reading CSV." });
  }
});

// @route   POST /api/readings/csv/commit
// @desc    Commit parsed readings into MongoDB
// @access  Protected (Admin only)
router.post("/csv/commit", protect, requireAdmin, async (req, res) => {
  try {
    const records = Array.isArray(req.body.readings) ? req.body.readings : (Array.isArray(req.body.rows) ? req.body.rows : []);
    const mode = req.body.mode || req.body.duplicateMode || "skip";

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: "No reading records provided for commit." });
    }

    // Get current max paragraphNumber in DB
    const latestReading = await Reading.findOne().sort({ paragraphNumber: -1 }).lean();
    let nextParagraphNum = latestReading && latestReading.paragraphNumber ? latestReading.paragraphNumber + 1 : 1;

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const r of records) {
      const title = (r.title || "").trim();
      const passage = (r.passage || "").trim();
      if (!title || !passage) continue;

      // Find if duplicate exists by title OR (title + passage)
      const existing = await Reading.findOne({
        $or: [
          { title },
          { passage }
        ]
      });

      if (existing) {
        if (mode === "update") {
          existing.title = title;
          existing.passage = passage;
          if (r.paragraphNumber) existing.paragraphNumber = r.paragraphNumber;
          existing.questions = r.questions || existing.questions;
          existing.jlptLevel = r.jlptLevel || existing.jlptLevel;
          existing.isActive = true;
          await existing.save();
          updatedCount++;
        } else {
          skippedCount++;
        }
      } else {
        const pNum = r.paragraphNumber || nextParagraphNum++;
        const createdDoc = await Reading.create({
          title,
          paragraphNumber: pNum,
          passage,
          questions: r.questions || [],
          jlptLevel: r.jlptLevel || "N5",
          order: pNum,
          isActive: true
        });
        insertedCount++;
        try {
          await Notification.create({
            type: 'reading',
            title: 'New Reading Available',
            message: `A new reading exercise "${title}" has been added.`,
            contentId: createdDoc._id
          });
        } catch (_) {}
      }
    }

    let message = `${insertedCount} readings imported successfully.`;
    if (updatedCount > 0) {
      message += ` (${updatedCount} updated)`;
    }
    if (skippedCount > 0) {
      message += ` (${skippedCount} duplicates skipped)`;
    }

    return res.json({
      success: true,
      message,
      inserted: insertedCount,
      updated: updatedCount,
      skipped: skippedCount,
      total: records.length
    });
  } catch (error) {
    console.error("Error committing readings CSV:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to commit readings." });
  }
});

export default router;
