import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  AlertTriangle, 
  BookmarkCheck, 
  BookOpen, 
  Layers, 
  Filter,
  Sparkles,
  ArrowRight,
  UploadCloud,
  FileSpreadsheet,
  HelpCircle,
  CheckCircle2,
  RotateCcw,
  FileText
} from 'lucide-react';
import { PatternItem, PatternExample } from '../../types/pattern';

interface CustomChapterOption {
  _id: string;
  name: string;
  code?: string;
  description?: string;
}

export const AdminPatternsManager: React.FC = () => {
  const [patterns, setPatterns] = useState<PatternItem[]>([]);
  const [customChapters, setCustomChapters] = useState<CustomChapterOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedJlpt, setSelectedJlpt] = useState<string>('all');
  const [selectedChapterFilter, setSelectedChapterFilter] = useState<string>('all');

  // Modal & Edit State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    title: string;
    formula: string;
    meaning: string;
    usage: string;
    jlptLevel: string;
    destinationType: 'chapter' | 'custom';
    chapter: number;
    customChapterId: string;
    order: number;
    examples: PatternExample[];
  }>({
    title: '',
    formula: '',
    meaning: '',
    usage: '',
    jlptLevel: 'N5',
    destinationType: 'chapter',
    chapter: 1,
    customChapterId: '',
    order: 0,
    examples: [{ japanese: '', reading: '', english: '' }]
  });

  // CSV Import State
  const [isCsvModalOpen, setIsCsvModalOpen] = useState<boolean>(false);
  const [csvStep, setCsvStep] = useState<'upload' | 'preview'>('upload');
  const [csvDestinationType, setCsvDestinationType] = useState<'chapter' | 'custom'>('chapter');
  const [csvChapter, setCsvChapter] = useState<number>(1);
  const [csvCustomChapterId, setCsvCustomChapterId] = useState<string>('');
  const [csvJlptLevel, setCsvJlptLevel] = useState<string>('N5');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvRawText, setCsvRawText] = useState<string>('');
  const [csvParsing, setCsvParsing] = useState<boolean>(false);
  const [csvCommitting, setCsvCommitting] = useState<boolean>(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvDuplicateMode, setCsvDuplicateMode] = useState<'skip' | 'update'>('skip');
  const [csvPreviewData, setCsvPreviewData] = useState<{
    totalRows: number;
    newCount: number;
    duplicateCount: number;
    previewRows: any[];
  } | null>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [patternsRes, customChRes] = await Promise.all([
        api.patterns.getAll({ limit: 1000 }),
        api.customChapters.getAll()
      ]);

      if (patternsRes && patternsRes.data) {
        setPatterns(patternsRes.data);
      }
      if (customChRes && customChRes.data) {
        const ccs = customChRes.data.map((cc: any) => ({
          _id: cc._id || cc.id,
          name: cc.name,
          code: cc.code,
          description: cc.description
        }));
        setCustomChapters(ccs);
        if (ccs.length > 0 && !csvCustomChapterId) {
          setCsvCustomChapterId(ccs[0]._id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load patterns or custom chapters:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingId(null);
    let defaultChapter = 1;
    let defaultDestType: 'chapter' | 'custom' = 'chapter';
    let defaultCustomId = customChapters.length > 0 ? customChapters[0]._id : '';

    if (selectedChapterFilter.startsWith('chapter:')) {
      defaultChapter = parseInt(selectedChapterFilter.replace('chapter:', ''), 10) || 1;
      defaultDestType = 'chapter';
    } else if (selectedChapterFilter.startsWith('custom:')) {
      defaultCustomId = selectedChapterFilter.replace('custom:', '');
      defaultDestType = 'custom';
    }

    setFormData({
      title: '',
      formula: '',
      meaning: '',
      usage: '',
      jlptLevel: selectedJlpt !== 'all' ? selectedJlpt : 'N5',
      destinationType: defaultDestType,
      chapter: defaultChapter,
      customChapterId: defaultCustomId,
      order: 0,
      examples: [{ japanese: '', reading: '', english: '' }]
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (pattern: PatternItem) => {
    setEditingId(pattern._id);
    setFormData({
      title: pattern.title || pattern.pattern || '',
      formula: pattern.pattern || '',
      meaning: pattern.meaning || '',
      usage: pattern.usage || '',
      jlptLevel: pattern.jlptLevel || 'N5',
      destinationType: pattern.destinationType || 'chapter',
      chapter: pattern.chapter || 1,
      customChapterId: pattern.customChapterId ? (pattern.customChapterId._id || pattern.customChapterId) : '',
      order: pattern.order || 0,
      examples: pattern.examples && pattern.examples.length > 0 
        ? pattern.examples.map(ex => ({
            japanese: ex.japanese || '',
            reading: ex.reading || '',
            english: ex.english || ''
          }))
        : [{ japanese: '', reading: '', english: '' }]
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleAddExample = () => {
    setFormData(prev => ({
      ...prev,
      examples: [...prev.examples, { japanese: '', reading: '', english: '' }]
    }));
  };

  const handleRemoveExample = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      examples: prev.examples.filter((_, i) => i !== idx)
    }));
  };

  const handleExampleChange = (idx: number, field: keyof PatternExample, value: string) => {
    setFormData(prev => {
      const updated = [...prev.examples];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, examples: updated };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.formula.trim()) {
      setModalError('Pattern formula is required.');
      return;
    }
    if (!formData.meaning.trim()) {
      setModalError('Meaning is required.');
      return;
    }
    if (formData.destinationType === 'custom' && !formData.customChapterId) {
      setModalError('Please select a custom chapter destination.');
      return;
    }

    const payload = {
      title: formData.title.trim() || formData.formula.trim(),
      pattern: formData.formula.trim(),
      meaning: formData.meaning.trim(),
      usage: formData.usage.trim(),
      jlptLevel: formData.jlptLevel,
      destinationType: formData.destinationType,
      chapter: formData.destinationType === 'chapter' ? Number(formData.chapter) : undefined,
      customChapterId: formData.destinationType === 'custom' ? formData.customChapterId : undefined,
      order: Number(formData.order) || 0,
      examples: formData.examples.filter(ex => ex.japanese.trim() || ex.english.trim())
    };

    try {
      setActionLoading(true);
      setModalError(null);

      if (editingId) {
        await api.patterns.update(editingId, payload);
        showToast('Grammar pattern updated successfully!');
      } else {
        await api.patterns.create(payload);
        showToast('Grammar pattern created successfully!');
      }

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to save pattern.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (pattern: PatternItem) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete pattern "${pattern.pattern}"?`
    );
    if (!confirmDelete) return;

    try {
      await api.patterns.delete(pattern._id);
      showToast('Pattern deleted successfully.');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete pattern.');
    }
  };

  // CSV Import Handlers
  const handleOpenCsvModal = () => {
    setCsvStep('upload');
    setCsvFile(null);
    setCsvRawText('');
    setCsvError(null);
    setCsvPreviewData(null);
    setCsvDuplicateMode('skip');
    
    if (selectedChapterFilter.startsWith('chapter:')) {
      setCsvChapter(parseInt(selectedChapterFilter.replace('chapter:', ''), 10) || 1);
      setCsvDestinationType('chapter');
    } else if (selectedChapterFilter.startsWith('custom:')) {
      setCsvCustomChapterId(selectedChapterFilter.replace('custom:', ''));
      setCsvDestinationType('custom');
    }

    setIsCsvModalOpen(true);
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setCsvError('Please select a valid .csv file.');
      return;
    }

    setCsvFile(file);
    setCsvError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvRawText(text || '');
    };
    reader.onerror = () => {
      setCsvError('Failed to read selected CSV file.');
    };
    reader.readAsText(file);
  };

  const handlePreviewCsv = async () => {
    if (!csvRawText.trim() && !csvFile) {
      setCsvError('Please select a CSV file first.');
      return;
    }

    try {
      setCsvParsing(true);
      setCsvError(null);

      const res = await api.patterns.previewCsv({
        csvText: csvRawText,
        destinationType: csvDestinationType,
        chapter: csvDestinationType === 'chapter' ? csvChapter : undefined,
        customChapterId: csvDestinationType === 'custom' ? csvCustomChapterId : undefined,
        jlptLevel: csvJlptLevel
      });

      if (res && res.success) {
        setCsvPreviewData({
          totalRows: res.totalRows,
          newCount: res.newCount,
          duplicateCount: res.duplicateCount,
          previewRows: res.previewRows || res.validRows || []
        });
        setCsvStep('preview');
      } else {
        setCsvError(res?.message || 'Failed to parse CSV.');
      }
    } catch (err: any) {
      setCsvError(err.message || 'Error occurred while validating CSV.');
    } finally {
      setCsvParsing(false);
    }
  };

  const handleCommitCsv = async () => {
    if (!csvPreviewData || !csvPreviewData.previewRows.length) return;

    try {
      setCsvCommitting(true);
      setCsvError(null);

      const res = await api.patterns.commitCsv({
        rows: csvPreviewData.previewRows,
        mode: csvDuplicateMode,
        destinationType: csvDestinationType,
        chapter: csvDestinationType === 'chapter' ? csvChapter : undefined,
        customChapterId: csvDestinationType === 'custom' ? csvCustomChapterId : undefined
      });

      if (res && res.success) {
        showToast(res.message || 'Patterns imported successfully!');
        setIsCsvModalOpen(false);
        loadData();
      } else {
        setCsvError(res?.message || 'Failed to commit patterns to database.');
      }
    } catch (err: any) {
      setCsvError(err.message || 'Error occurred while importing patterns.');
    } finally {
      setCsvCommitting(false);
    }
  };

  // Filtered patterns
  const filteredPatterns = useMemo(() => {
    return patterns.filter((p) => {
      const matchesSearch = 
        p.pattern.toLowerCase().includes(search.toLowerCase()) ||
        p.meaning.toLowerCase().includes(search.toLowerCase()) ||
        p.usage.toLowerCase().includes(search.toLowerCase()) ||
        (p.title && p.title.toLowerCase().includes(search.toLowerCase()));

      const matchesJlpt = selectedJlpt === 'all' || p.jlptLevel === selectedJlpt;

      let matchesChapter = true;
      if (selectedChapterFilter !== 'all') {
        if (selectedChapterFilter.startsWith('custom:')) {
          const customId = selectedChapterFilter.replace('custom:', '');
          const pCustomId = p.customChapterId?._id || p.customChapterId;
          matchesChapter = p.destinationType === 'custom' && String(pCustomId) === customId;
        } else if (selectedChapterFilter.startsWith('chapter:')) {
          const chNum = parseInt(selectedChapterFilter.replace('chapter:', ''), 10);
          matchesChapter = p.destinationType === 'chapter' && p.chapter === chNum;
        }
      }

      return matchesSearch && matchesJlpt && matchesChapter;
    });
  }, [patterns, search, selectedJlpt, selectedChapterFilter]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-20 right-6 z-50 bg-[#1a1918] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-500/30 animate-pop-in">
          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white">
            <Check className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-semibold">{successToast}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#eeece6] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <BookmarkCheck className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-[#1a1918]">Grammar Patterns Manager</h1>
          </div>
          <p className="text-xs text-[#8c8880] mt-1">
            Manage chapter-wise grammar formulas, usage notes, and JLPT level examples. Total patterns: {patterns.length}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCsvModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all cursor-pointer border border-indigo-200"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#1a1918] hover:bg-[#33312e] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Pattern</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-2xl border border-[#eeece6] shadow-xs">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8c8880]" />
          <input
            type="text"
            placeholder="Search pattern, formula, meaning..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#eeece6] bg-[#faf9f6] focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Chapter Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#8c8880] font-semibold">Chapter:</span>
          <select
            value={selectedChapterFilter}
            onChange={(e) => setSelectedChapterFilter(e.target.value)}
            className="flex-1 py-2 px-3 text-xs rounded-xl border border-[#eeece6] bg-[#faf9f6] focus:outline-none focus:border-indigo-500 font-medium"
          >
            <option value="all">All Chapters</option>
            <optgroup label="Standard Chapters (1–24)">
              {Array.from({ length: 24 }, (_, i) => i + 1).map((ch) => (
                <option key={`ch-${ch}`} value={`chapter:${ch}`}>
                  Chapter {ch}
                </option>
              ))}
            </optgroup>
            {customChapters.length > 0 && (
              <optgroup label="Custom Chapters">
                {customChapters.map((cc) => (
                  <option key={cc._id} value={`custom:${cc._id}`}>
                    {cc.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* JLPT Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#8c8880] font-semibold">JLPT:</span>
          <select
            value={selectedJlpt}
            onChange={(e) => setSelectedJlpt(e.target.value)}
            className="flex-1 py-2 px-3 text-xs rounded-xl border border-[#eeece6] bg-[#faf9f6] focus:outline-none focus:border-indigo-500 font-medium"
          >
            <option value="all">All Levels</option>
            <option value="N5">N5</option>
            <option value="N4">N4</option>
            <option value="N3">N3</option>
            <option value="N2">N2</option>
            <option value="N1">N1</option>
          </select>
        </div>
      </div>

      {/* Patterns List Table */}
      <div className="bg-white rounded-3xl border border-[#eeece6] overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent mb-3" />
            <p className="text-xs text-[#8c8880] font-medium">Loading patterns from MongoDB Atlas...</p>
          </div>
        ) : filteredPatterns.length === 0 ? (
          <div className="py-16 text-center px-4">
            <BookOpen className="w-12 h-12 text-[#8c8880]/30 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-[#1a1918]">No patterns found</h3>
            <p className="text-xs text-[#8c8880] mt-1 max-w-sm mx-auto">
              No grammar patterns match your current search or chapter filter. You can add one manually or import from CSV.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={handleOpenCsvModal}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Import CSV</span>
              </button>
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-[#1a1918] text-white hover:bg-[#33312e] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Pattern</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#faf9f6] border-b border-[#eeece6] text-[#8c8880] font-semibold">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4 w-32">Chapter</th>
                  <th className="py-3 px-4 w-52">Pattern / Formula</th>
                  <th className="py-3 px-4">Meaning & Usage</th>
                  <th className="py-3 px-4 w-28">Examples</th>
                  <th className="py-3 px-4 w-20 text-center">JLPT</th>
                  <th className="py-3 px-4 w-24 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eeece6]">
                {filteredPatterns.map((pat, idx) => {
                  const chapterLabel = pat.destinationType === 'custom'
                    ? (pat.customChapterId?.name || 'Custom')
                    : `Chapter ${pat.chapter || '-'}`;

                  return (
                    <tr key={pat._id} className="hover:bg-[#faf9f6]/60 transition-colors">
                      <td className="py-3 px-4 text-center text-[#8c8880] font-mono">
                        {idx + 1}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                          pat.destinationType === 'custom'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          {chapterLabel}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-extrabold text-sm text-[#1a1918] font-japanese">
                          {pat.pattern}
                        </div>
                        {pat.title && pat.title !== pat.pattern && (
                          <div className="text-[11px] text-[#8c8880] mt-0.5">
                            {pat.title}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#1a1918]">
                          {pat.meaning}
                        </div>
                        {pat.usage && (
                          <div className="text-[#8c8880] text-[11px] mt-0.5 line-clamp-2">
                            {pat.usage}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-medium text-[11px]">
                          {pat.examples?.length || 0} example(s)
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="font-bold text-indigo-600 bg-indigo-50/80 px-2 py-0.5 rounded text-[11px]">
                          {pat.jlptLevel || 'N5'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditModal(pat)}
                            className="p-1.5 rounded-lg text-[#6e6b66] hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Edit Pattern"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(pat)}
                            className="p-1.5 rounded-lg text-[#6e6b66] hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Pattern"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CSV Import Modal */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#eeece6] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#eeece6] flex items-center justify-between bg-[#faf9f6]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-100 text-indigo-700">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#1a1918]">Import Grammar Patterns from CSV</h2>
                  <p className="text-xs text-[#8c8880]">
                    {csvStep === 'upload' 
                      ? 'Upload CSV with columns: pattern, meaning, usage, example_japanese, example_english' 
                      : 'Review parsed patterns and select duplicate strategy before importing.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCsvModalOpen(false)}
                className="p-2 rounded-xl text-[#8c8880] hover:text-[#1a1918] hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error banner */}
            {csvError && (
              <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{csvError}</span>
              </div>
            )}

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {csvStep === 'upload' ? (
                <div className="space-y-4">
                  {/* Destination selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#1a1918] mb-1.5">
                        Destination Chapter Type
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setCsvDestinationType('chapter')}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border text-center transition-all ${
                            csvDestinationType === 'chapter'
                              ? 'bg-indigo-50 border-indigo-400 text-indigo-800'
                              : 'border-[#eeece6] text-[#6e6b66] hover:bg-[#faf9f6]'
                          }`}
                        >
                          Standard Chapter
                        </button>
                        <button
                          type="button"
                          onClick={() => setCsvDestinationType('custom')}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border text-center transition-all ${
                            csvDestinationType === 'custom'
                              ? 'bg-indigo-50 border-indigo-400 text-indigo-800'
                              : 'border-[#eeece6] text-[#6e6b66] hover:bg-[#faf9f6]'
                          }`}
                        >
                          Custom Chapter
                        </button>
                      </div>
                    </div>

                    <div>
                      {csvDestinationType === 'chapter' ? (
                        <>
                          <label className="block text-xs font-bold text-[#1a1918] mb-1.5">
                            Target Chapter (1–24)
                          </label>
                          <select
                            value={csvChapter}
                            onChange={(e) => setCsvChapter(Number(e.target.value))}
                            className="w-full py-2 px-3 text-xs rounded-xl border border-[#eeece6] bg-[#faf9f6] focus:outline-none focus:border-indigo-500 font-semibold"
                          >
                            {Array.from({ length: 24 }, (_, i) => i + 1).map((ch) => (
                              <option key={ch} value={ch}>
                                Chapter {ch}
                              </option>
                            ))}
                          </select>
                        </>
                      ) : (
                        <>
                          <label className="block text-xs font-bold text-[#1a1918] mb-1.5">
                            Target Custom Chapter
                          </label>
                          <select
                            value={csvCustomChapterId}
                            onChange={(e) => setCsvCustomChapterId(e.target.value)}
                            className="w-full py-2 px-3 text-xs rounded-xl border border-[#eeece6] bg-[#faf9f6] focus:outline-none focus:border-indigo-500 font-semibold"
                          >
                            {customChapters.map((cc) => (
                              <option key={cc._id} value={cc._id}>
                                {cc.name}
                              </option>
                            ))}
                          </select>
                        </>
                      )}
                    </div>
                  </div>

                  {/* JLPT Level */}
                  <div>
                    <label className="block text-xs font-bold text-[#1a1918] mb-1.5">
                      JLPT Level
                    </label>
                    <div className="flex gap-2">
                      {['N5', 'N4', 'N3', 'N2', 'N1'].map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setCsvJlptLevel(lvl)}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                            csvJlptLevel === lvl
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'border-[#eeece6] text-[#6e6b66] hover:bg-[#faf9f6]'
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* CSV File Input */}
                  <div>
                    <label className="block text-xs font-bold text-[#1a1918] mb-1.5">
                      Select CSV File
                    </label>
                    <div className="border-2 border-dashed border-[#eeece6] hover:border-indigo-400 rounded-2xl p-6 text-center bg-[#faf9f6] transition-colors">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleCsvFileChange}
                        id="pattern-csv-file"
                        className="hidden"
                      />
                      <label htmlFor="pattern-csv-file" className="cursor-pointer">
                        <UploadCloud className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                        <span className="text-xs font-bold text-[#1a1918] block">
                          {csvFile ? csvFile.name : 'Click to select Pattern CSV file'}
                        </span>
                        <span className="text-[11px] text-[#8c8880] mt-1 block">
                          Columns: pattern, meaning, usage, example_japanese, example_english
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                /* Step 2: Preview & Duplicate Strategy */
                <div className="space-y-4">
                  {/* Summary Bar */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-center">
                      <div className="text-lg font-bold text-indigo-700">{csvPreviewData?.totalRows || 0}</div>
                      <div className="text-[11px] font-semibold text-indigo-900">Total Patterns</div>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                      <div className="text-lg font-bold text-emerald-700">{csvPreviewData?.newCount || 0}</div>
                      <div className="text-[11px] font-semibold text-emerald-900">New Patterns</div>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-center">
                      <div className="text-lg font-bold text-amber-700">{csvPreviewData?.duplicateCount || 0}</div>
                      <div className="text-[11px] font-semibold text-amber-900">Duplicates Detected</div>
                    </div>
                  </div>

                  {/* Duplicate Strategy Option */}
                  {(csvPreviewData?.duplicateCount || 0) > 0 && (
                    <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-bold text-amber-900">Duplicate Handling Strategy</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                          csvDuplicateMode === 'skip' ? 'bg-white border-amber-500 font-bold text-amber-900' : 'border-transparent text-amber-800'
                        }`}>
                          <input
                            type="radio"
                            name="dupMode"
                            checked={csvDuplicateMode === 'skip'}
                            onChange={() => setCsvDuplicateMode('skip')}
                          />
                          <span>Skip duplicates (keep existing)</span>
                        </label>
                        <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                          csvDuplicateMode === 'update' ? 'bg-white border-amber-500 font-bold text-amber-900' : 'border-transparent text-amber-800'
                        }`}>
                          <input
                            type="radio"
                            name="dupMode"
                            checked={csvDuplicateMode === 'update'}
                            onChange={() => setCsvDuplicateMode('update')}
                          />
                          <span>Update existing records with CSV data</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Preview Table */}
                  <div>
                    <span className="text-xs font-bold text-[#1a1918] mb-1.5 block">
                      Preview Rows (First {Math.min(csvPreviewData?.previewRows?.length || 0, 10)})
                    </span>
                    <div className="max-h-60 overflow-y-auto border border-[#eeece6] rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#faf9f6] sticky top-0 border-b border-[#eeece6] text-[#8c8880]">
                          <tr>
                            <th className="p-2">Pattern</th>
                            <th className="p-2">Meaning</th>
                            <th className="p-2">Usage</th>
                            <th className="p-2 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eeece6]">
                          {csvPreviewData?.previewRows?.slice(0, 10).map((r, i) => (
                            <tr key={i} className="hover:bg-[#faf9f6]/40">
                              <td className="p-2 font-bold font-japanese text-[#1a1918]">{r.pattern}</td>
                              <td className="p-2 text-[#4a4744]">{r.meaning}</td>
                              <td className="p-2 text-[#8c8880] truncate max-w-xs">{r.usage}</td>
                              <td className="p-2 text-center">
                                {r.isDuplicate ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                    Duplicate
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    New
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#eeece6] flex items-center justify-between bg-[#faf9f6]">
              {csvStep === 'upload' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsCsvModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-[#8c8880] hover:text-[#1a1918]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handlePreviewCsv}
                    disabled={csvParsing || !csvRawText}
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {csvParsing ? 'Validating CSV...' : 'Parse & Preview'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setCsvStep('upload')}
                    className="px-4 py-2 text-xs font-bold text-[#8c8880] hover:text-[#1a1918]"
                  >
                    Back to Upload
                  </button>
                  <button
                    type="button"
                    onClick={handleCommitCsv}
                    disabled={csvCommitting}
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {csvCommitting ? 'Importing...' : `Commit ${csvPreviewData?.totalRows || 0} Patterns`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#eeece6] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#eeece6] flex items-center justify-between bg-[#faf9f6]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-100 text-indigo-700">
                  <BookmarkCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#1a1918]">
                    {editingId ? 'Edit Grammar Pattern' : 'Create Grammar Pattern'}
                  </h2>
                  <p className="text-xs text-[#8c8880]">
                    Provide the grammar pattern, meaning, usage notes, and JLPT examples.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-[#8c8880] hover:text-[#1a1918] hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error banner */}
            {modalError && (
              <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5">
              {/* Destination Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1a1918] mb-1.5">
                    Destination Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, destinationType: 'chapter' })}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border text-center transition-all ${
                        formData.destinationType === 'chapter'
                          ? 'bg-indigo-50 border-indigo-400 text-indigo-800'
                          : 'border-[#eeece6] text-[#6e6b66] hover:bg-[#faf9f6]'
                      }`}
                    >
                      Standard Chapter
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, destinationType: 'custom' })}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border text-center transition-all ${
                        formData.destinationType === 'custom'
                          ? 'bg-indigo-50 border-indigo-400 text-indigo-800'
                          : 'border-[#eeece6] text-[#6e6b66] hover:bg-[#faf9f6]'
                      }`}
                    >
                      Custom Chapter
                    </button>
                  </div>
                </div>

                <div>
                  {formData.destinationType === 'chapter' ? (
                    <>
                      <label className="block text-xs font-bold text-[#1a1918] mb-1.5">
                        Chapter (1–24)
                      </label>
                      <select
                        value={formData.chapter}
                        onChange={(e) => setFormData({ ...formData, chapter: parseInt(e.target.value, 10) })}
                        className="w-full py-2 px-3 text-xs rounded-xl border border-[#eeece6] bg-[#faf9f6] focus:outline-none focus:border-indigo-500 font-semibold"
                      >
                        {Array.from({ length: 24 }, (_, i) => i + 1).map((ch) => (
                          <option key={ch} value={ch}>
                            Chapter {ch}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <>
                      <label className="block text-xs font-bold text-[#1a1918] mb-1.5">
                        Select Custom Chapter
                      </label>
                      <select
                        value={formData.customChapterId}
                        onChange={(e) => setFormData({ ...formData, customChapterId: e.target.value })}
                        className="w-full py-2 px-3 text-xs rounded-xl border border-[#eeece6] bg-[#faf9f6] focus:outline-none focus:border-indigo-500 font-semibold"
                      >
                        {customChapters.map((cc) => (
                          <option key={cc._id} value={cc._id}>
                            {cc.name}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                </div>
              </div>

              {/* JLPT Level & Title */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#1a1918] mb-1.5">
                    Pattern Formula / Grammar Heading *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ～てはいけません / ～てはだめ"
                    value={formData.formula}
                    onChange={(e) => setFormData({ ...formData, formula: e.target.value, title: formData.title || e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#eeece6] bg-[#faf9f6] font-japanese font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1a1918] mb-1.5">
                    JLPT Level
                  </label>
                  <select
                    value={formData.jlptLevel}
                    onChange={(e) => setFormData({ ...formData, jlptLevel: e.target.value })}
                    className="w-full py-2 px-3 text-xs rounded-xl border border-[#eeece6] bg-[#faf9f6] focus:outline-none focus:border-indigo-500 font-semibold"
                  >
                    <option value="N5">N5</option>
                    <option value="N4">N4</option>
                    <option value="N3">N3</option>
                    <option value="N2">N2</option>
                    <option value="N1">N1</option>
                  </select>
                </div>
              </div>

              {/* Meaning */}
              <div>
                <label className="block text-xs font-bold text-[#1a1918] mb-1.5">
                  English Meaning *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. You must not do... / Prohibition"
                  value={formData.meaning}
                  onChange={(e) => setFormData({ ...formData, meaning: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#eeece6] bg-[#faf9f6] focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Usage Notes */}
              <div>
                <label className="block text-xs font-bold text-[#1a1918] mb-1.5">
                  Usage Notes / Formation
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Used with Verb-て form to express strong prohibition or rules."
                  value={formData.usage}
                  onChange={(e) => setFormData({ ...formData, usage: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#eeece6] bg-[#faf9f6] focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Example Sentences */}
              <div className="space-y-3 pt-2 border-t border-[#eeece6]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#1a1918]">
                    Example Sentences ({formData.examples.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddExample}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Example</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.examples.map((ex, exIdx) => (
                    <div key={exIdx} className="p-3 bg-[#faf9f6] rounded-2xl border border-[#eeece6] space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#8c8880]">
                        <span>Example #{exIdx + 1}</span>
                        {formData.examples.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveExample(exIdx)}
                            className="text-rose-500 hover:text-rose-700"
                            title="Remove example"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <input
                          type="text"
                          placeholder="Japanese: ここで タバコを すっては いけません。"
                          value={ex.japanese}
                          onChange={(e) => handleExampleChange(exIdx, 'japanese', e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#eeece6] bg-white font-japanese focus:outline-none focus:border-indigo-500"
                        />
                        <input
                          type="text"
                          placeholder="Reading / Furigana (optional): ここで たばこを すっては いけません。"
                          value={ex.reading || ''}
                          onChange={(e) => handleExampleChange(exIdx, 'reading', e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#eeece6] bg-white font-japanese text-[#6e6b66] focus:outline-none focus:border-indigo-500"
                        />
                        <input
                          type="text"
                          placeholder="English: You must not smoke cigarettes here."
                          value={ex.english}
                          onChange={(e) => handleExampleChange(exIdx, 'english', e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#eeece6] bg-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#eeece6]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#6e6b66] hover:bg-[#faf9f6] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? 'Saving...' : editingId ? 'Update Pattern' : 'Create Pattern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
