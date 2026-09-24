import express from "express";
import mongoose from "mongoose";
import fs from "fs";
import { Pattern } from "../models/Pattern.js";
import { CustomChapter } from "../models/CustomChapter.js";
import { checkDbConnection } from "../config/db.js";
import { protect, optionalProtect } from "../middleware/auth.js";
import { uploadCsv } from "../middleware/upload.js";
import { parseAndValidatePatternsCSV } from "../utils/csvParser.js";

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

// @route   GET /api/patterns
// @desc    Get grammar patterns with optional filtering (jlpt, chapter, customChapterId, destinationType, search)
// @access  Public
router.get("/", async (req, res) => {
  try {
    const { jlpt, chapter, customChapterId, destinationType, search, limit, skip = 0 } = req.query;

    const filter = { isActive: true };

    if (jlpt && jlpt !== "All") {
      filter.jlptLevel = jlpt;
    }

    if (customChapterId) {
      filter.customChapterId = customChapterId;
    } else if (destinationType === "custom") {
      filter.destinationType = "custom";
    } else if (chapter !== undefined && chapter !== null && chapter !== "") {
      filter.chapter = parseInt(chapter, 10);
      filter.destinationType = "chapter";
      filter.customChapterId = null;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      filter.$or = [
        { title: searchRegex },
        { pattern: searchRegex },
        { meaning: searchRegex },
        { usage: searchRegex },
        { "examples.japanese": searchRegex },
        { "examples.english": searchRegex }
      ];
    }

    let queryExec = Pattern.find(filter)
      .populate("customChapterId", "name displayName title")
      .sort({ chapter: 1, order: 1, createdAt: 1 });

    if (skip && parseInt(skip, 10) > 0) {
      queryExec = queryExec.skip(parseInt(skip, 10));
    }

    if (limit !== undefined && limit !== null && limit !== "" && limit !== "all" && limit !== "0" && parseInt(limit, 10) > 0) {
      queryExec = queryExec.limit(parseInt(limit, 10));
    }

    const items = await queryExec.lean();
    const total = await Pattern.countDocuments(filter);

    return res.json({
      success: true,
      count: items.length,
      total,
      data: items.map(p => ({
        ...p,
        formula: p.pattern,
        id: p._id.toString()
      }))
    });
  } catch (error) {
    console.error("Error fetching patterns:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve grammar patterns."
    });
  }
});

// @route   GET /api/patterns/chapters
// @desc    Get dynamic 24-chapter overview with pattern counts (including 0-pattern empty chapters)
// @access  Public
router.get("/chapters", async (req, res) => {
  try {
    const { jlpt = "N5" } = req.query;
    const targetLevels = (!jlpt || jlpt === "All") ? ["N5", "N4", "N3"] : [jlpt];

    const filter = (!jlpt || jlpt === "All")
      ? { destinationType: "chapter", chapter: { $gt: 0 }, isActive: true }
      : { jlptLevel: jlpt, destinationType: "chapter", chapter: { $gt: 0 }, isActive: true };

    const dbCounts = await Pattern.aggregate([
      { $match: filter },
      { $group: { _id: { jlpt: "$jlptLevel", chapter: "$chapter" }, count: { $sum: 1 } } }
    ]);

    const countMap = new Map();
    dbCounts.forEach(c => {
      countMap.set(`${c._id.jlpt}_${c._id.chapter}`, c.count);
    });

    const result = [];
    for (const lvl of targetLevels) {
      const startCh = (lvl === "N4") ? 25 : 1;
      const endCh = (lvl === "N4") ? 50 : 24;

      const seenChapters = new Set();
      for (let ch = startCh; ch <= endCh; ch++) {
        seenChapters.add(ch);
        const count = countMap.get(`${lvl}_${ch}`) || 0;
        result.push({
          type: 'standard',
          jlpt: lvl,
          chapter: ch,
          chapterName: `第${ch}課`,
          title: `Chapter ${ch}`,
          count
        });
      }

      dbCounts.forEach(c => {
        if (c._id.jlpt === lvl && !seenChapters.has(c._id.chapter) && typeof c._id.chapter === "number") {
          result.push({
            type: 'standard',
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

    // Also include custom chapters with their pattern counts
    try {
      const customChapters = await CustomChapter.find({ isActive: true }).lean();
      if (customChapters && customChapters.length > 0) {
        const customCounts = await Pattern.aggregate([
          { $match: { destinationType: "custom", customChapterId: { $ne: null }, isActive: true } },
          { $group: { _id: "$customChapterId", count: { $sum: 1 } } }
        ]);
        const customCountMap = new Map();
        customCounts.forEach(c => customCountMap.set(c._id.toString(), c.count));

        for (const cc of customChapters) {
          result.push({
            type: 'custom',
            id: cc._id.toString(),
            customChapterId: cc._id.toString(),
            name: cc.name,
            title: cc.name,
            chapterName: cc.name,
            description: cc.description || '',
            count: customCountMap.get(cc._id.toString()) || 0
          });
        }
      }
    } catch (e) {
      console.error("Error aggregating custom chapters in /patterns/chapters:", e);
    }

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Error fetching pattern chapters:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve pattern chapters."
    });
  }
});

// @route   GET /api/patterns/:id
// @desc    Get single pattern by ID
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid pattern ID." });
    }

    const pattern = await Pattern.findById(req.params.id)
      .populate("customChapterId", "name displayName title")
      .lean();

    if (!pattern) {
      return res.status(404).json({ success: false, message: "Pattern not found." });
    }

    return res.json({
      success: true,
      data: {
        ...pattern,
        formula: pattern.pattern,
        id: pattern._id.toString()
      }
    });
  } catch (error) {
    console.error("Error fetching pattern:", error);
    return res.status(500).json({ success: false, message: "Failed to retrieve pattern." });
  }
});

// @route   POST /api/patterns
// @desc    Create a new grammar pattern
// @access  Protected (Admin only)
router.post("/", protect, requireAdmin, async (req, res) => {
  try {
    const {
      title,
      pattern,
      formula,
      meaning,
      usage = "",
      examples = [],
      jlptLevel = "N5",
      destinationType = "chapter",
      chapter,
      customChapterId,
      order = 0
    } = req.body;

    const patternFormula = (pattern || formula || "").trim();

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Pattern title is required." });
    }
    if (!patternFormula) {
      return res.status(400).json({ success: false, message: "Pattern formula is required." });
    }
    if (!meaning || !meaning.trim()) {
      return res.status(400).json({ success: false, message: "Pattern meaning is required." });
    }

    let parsedChapter = null;
    let parsedCustomId = null;

    if (destinationType === "custom") {
      if (!customChapterId || !mongoose.Types.ObjectId.isValid(customChapterId)) {
        return res.status(400).json({ success: false, message: "Valid custom chapter selection is required." });
      }
      parsedCustomId = customChapterId;
    } else {
      if (chapter === undefined || chapter === null || isNaN(parseInt(chapter, 10))) {
        return res.status(400).json({ success: false, message: "Chapter number (1-24) is required." });
      }
      parsedChapter = parseInt(chapter, 10);
    }

    // Clean examples
    const cleanedExamples = Array.isArray(examples)
      ? examples.filter(ex => ex && ex.japanese && ex.japanese.trim() && ex.english && ex.english.trim())
      : [];

    const newPattern = await Pattern.create({
      title: title.trim(),
      pattern: patternFormula,
      meaning: meaning.trim(),
      usage: usage ? usage.trim() : "",
      examples: cleanedExamples,
      jlptLevel,
      destinationType,
      chapter: parsedChapter,
      customChapterId: parsedCustomId,
      order: parseInt(order, 10) || 0,
      isActive: true
    });

    const obj = newPattern.toObject();

    return res.status(201).json({
      success: true,
      message: "Grammar pattern created successfully.",
      data: {
        ...obj,
        formula: obj.pattern,
        id: newPattern._id.toString()
      }
    });
  } catch (error) {
    console.error("Error creating pattern:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to create grammar pattern." });
  }
});

// @route   PUT /api/patterns/:id
// @desc    Update an existing grammar pattern
// @access  Protected (Admin only)
router.put("/:id", protect, requireAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid pattern ID." });
    }

    const {
      title,
      pattern,
      formula,
      meaning,
      usage,
      examples,
      jlptLevel,
      destinationType,
      chapter,
      customChapterId,
      order,
      isActive
    } = req.body;

    const updates = {};
    if (title !== undefined) updates.title = title.trim();
    const patternFormula = pattern !== undefined ? pattern : formula;
    if (patternFormula !== undefined) updates.pattern = patternFormula.trim();
    if (meaning !== undefined) updates.meaning = meaning.trim();
    if (usage !== undefined) updates.usage = usage.trim();
    if (jlptLevel !== undefined) updates.jlptLevel = jlptLevel;
    if (destinationType !== undefined) updates.destinationType = destinationType;
    if (order !== undefined) updates.order = parseInt(order, 10) || 0;
    if (isActive !== undefined) updates.isActive = Boolean(isActive);

    if (destinationType === "custom") {
      if (customChapterId && mongoose.Types.ObjectId.isValid(customChapterId)) {
        updates.customChapterId = customChapterId;
        updates.chapter = null;
      }
    } else if (destinationType === "chapter" || chapter !== undefined) {
      if (chapter !== undefined && chapter !== null) {
        updates.chapter = parseInt(chapter, 10);
        updates.customChapterId = null;
      }
    }

    if (Array.isArray(examples)) {
      updates.examples = examples.filter(ex => ex && ex.japanese && ex.japanese.trim() && ex.english && ex.english.trim());
    }

    const updated = await Pattern.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).lean();
    if (!updated) {
      return res.status(404).json({ success: false, message: "Pattern not found." });
    }

    return res.json({
      success: true,
      message: "Grammar pattern updated successfully.",
      data: {
        ...updated,
        formula: updated.pattern,
        id: updated._id.toString()
      }
    });
  } catch (error) {
    console.error("Error updating pattern:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to update grammar pattern." });
  }
});

// @route   DELETE /api/patterns/:id
// @desc    Delete a grammar pattern
// @access  Protected (Admin only)
router.delete("/:id", protect, requireAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid pattern ID." });
    }

    const deleted = await Pattern.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Pattern not found." });
    }

    return res.json({
      success: true,
      message: "Grammar pattern deleted successfully."
    });
  } catch (error) {
    console.error("Error deleting pattern:", error);
    return res.status(500).json({ success: false, message: "Failed to delete grammar pattern." });
  }
});

// @route   POST /api/patterns/csv/preview
// @desc    Preview and validate Pattern CSV before import
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

    const {
      destinationType = "chapter",
      chapter = 1,
      customChapterId,
      jlptLevel = "N5"
    } = req.body;

    const destinationConfig = {
      destinationType,
      chapter: destinationType === "chapter" ? parseInt(chapter, 10) || 1 : null,
      customChapterId: destinationType === "custom" ? customChapterId : null,
      jlptLevel
    };

    const parseResult = parseAndValidatePatternsCSV(csvContent, destinationConfig);

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

    // Detect duplicates in MongoDB by (chapter/customChapter + pattern)
    const patternsList = parseResult.validRows.map(r => r.pattern.trim());
    const dupQuery = {
      pattern: { $in: patternsList }
    };
    if (destinationType === "custom" && customChapterId) {
      dupQuery.destinationType = "custom";
      dupQuery.customChapterId = customChapterId;
    } else {
      dupQuery.destinationType = "chapter";
      dupQuery.chapter = parseInt(chapter, 10) || 1;
    }

    const existingDocs = await Pattern.find(dupQuery).select("pattern meaning").lean();
    const existingMap = new Map();
    existingDocs.forEach(d => {
      existingMap.set(d.pattern.trim(), d);
    });

    let duplicateCount = 0;
    const previewRows = parseResult.validRows.map(row => {
      const isDup = existingMap.has(row.pattern.trim());
      if (isDup) duplicateCount++;
      return {
        ...row,
        isDuplicate: isDup,
        existingId: isDup ? existingMap.get(row.pattern.trim())._id.toString() : null
      };
    });

    return res.json({
      success: true,
      totalRows: parseResult.validRows.length,
      validRows: previewRows,
      duplicateCount,
      newCount: parseResult.validRows.length - duplicateCount,
      previewRows
    });
  } catch (error) {
    if (filePath && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (_) {}
    }
    console.error("Error previewing patterns CSV:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to parse CSV." });
  }
});

// @route   POST /api/patterns/csv/commit
// @desc    Commit parsed patterns into MongoDB
// @access  Protected (Admin only)
router.post("/csv/commit", protect, requireAdmin, async (req, res) => {
  try {
    const { rows = [], destinationType = "chapter", chapter = 1, customChapterId, jlptLevel = "N5" } = req.body;
    const mode = req.body.duplicateMode || req.body.mode || "skip";

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: "No pattern rows provided for commit." });
    }

    const parsedChapter = destinationType === "chapter" ? (parseInt(chapter, 10) || 1) : null;
    const parsedCustomId = destinationType === "custom" ? customChapterId : null;

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const r of rows) {
      const pText = (r.pattern || r.formula || "").trim();
      if (!pText) continue;

      const dupFilter = { pattern: pText };
      if (destinationType === "custom" && parsedCustomId) {
        dupFilter.destinationType = "custom";
        dupFilter.customChapterId = parsedCustomId;
      } else {
        dupFilter.destinationType = "chapter";
        dupFilter.chapter = parsedChapter;
      }

      const existing = await Pattern.findOne(dupFilter);

      if (existing) {
        if (mode === "update") {
          existing.title = r.title || pText;
          existing.meaning = r.meaning;
          existing.usage = r.usage || "";
          existing.examples = r.examples || [];
          existing.jlptLevel = r.jlptLevel || jlptLevel;
          existing.isActive = true;
          await existing.save();
          updatedCount++;
        } else {
          skippedCount++;
        }
      } else {
        await Pattern.create({
          title: r.title || pText,
          pattern: pText,
          meaning: r.meaning,
          usage: r.usage || "",
          examples: r.examples || [],
          jlptLevel: r.jlptLevel || jlptLevel,
          destinationType,
          chapter: parsedChapter,
          customChapterId: parsedCustomId,
          order: r.order || 0,
          isActive: true
        });
        insertedCount++;
      }
    }

    let message = `${insertedCount} patterns imported successfully.`;
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
      total: rows.length
    });
  } catch (error) {
    console.error("Error committing patterns CSV:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to commit patterns." });
  }
});

export default router;
