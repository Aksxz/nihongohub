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
  FileText, 
  BookOpen, 
  Filter,
  Sparkles,
  HelpCircle,
  ChevronDown,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  RotateCcw
} from 'lucide-react';
import { ReadingItem } from '../../types/reading';

interface AdminQuestionForm {
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
}

export const AdminReadingManager: React.FC = () => {
  const [readings, setReadings] = useState<ReadingItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedJlpt, setSelectedJlpt] = useState<string>('all');

  // Modal & Edit State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form State
  const createDefaultQuestions = (): AdminQuestionForm[] => [
    { question: '', options: { A: '', B: '', C: '', D: '' }, correctAnswer: 'A', explanation: '' },
    { question: '', options: { A: '', B: '', C: '', D: '' }, correctAnswer: 'B', explanation: '' },
    { question: '', options: { A: '', B: '', C: '', D: '' }, correctAnswer: 'C', explanation: '' },
    { question: '', options: { A: '', B: '', C: '', D: '' }, correctAnswer: 'D', explanation: '' },
    { question: '', options: { A: '', B: '', C: '', D: '' }, correctAnswer: 'A', explanation: '' }
  ];

  const [formData, setFormData] = useState<{
    paragraphNumber: number;
    title: string;
    passage: string;
    jlptLevel: string;
    order: number;
    questions: AdminQuestionForm[];
  }>({
    paragraphNumber: 1,
    title: '',
    passage: '',
    jlptLevel: 'N5',
    order: 1,
    questions: createDefaultQuestions()
  });

  // CSV Import State
  const [isCsvModalOpen, setIsCsvModalOpen] = useState<boolean>(false);
  const [csvStep, setCsvStep] = useState<'upload' | 'preview'>('upload');
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
    previewReadings: any[];
  } | null>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.readings.adminGetAll();
      if (res && res.data) {
        setReadings(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load readings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingId(null);
    const nextParagraphNum = readings.length > 0 
      ? Math.max(...readings.map(r => r.paragraphNumber || 0)) + 1 
      : 1;

    setFormData({
      paragraphNumber: nextParagraphNum,
      title: '',
      passage: '',
      jlptLevel: 'N5',
      order: nextParagraphNum,
      questions: createDefaultQuestions()
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = async (reading: ReadingItem) => {
    try {
      setActionLoading(true);
      setEditingId(reading._id);
      const res = await api.readings.adminGetById(reading._id);
      const data: ReadingItem = res.data;

      const formattedQuestions: AdminQuestionForm[] = (data.questions || []).map((q: any) => {
        const optMap: { A: string; B: string; C: string; D: string } = { A: '', B: '', C: '', D: '' };
        if (Array.isArray(q.options)) {
          q.options.forEach((opt: any) => {
            const lbl = (opt.label || 'A').toUpperCase() as 'A' | 'B' | 'C' | 'D';
            if (['A', 'B', 'C', 'D'].includes(lbl)) {
              optMap[lbl] = opt.text || '';
            }
          });
        }
        return {
          question: q.question || '',
          options: optMap,
          correctAnswer: (q.correctAnswer || 'A') as 'A' | 'B' | 'C' | 'D',
          explanation: q.explanation || ''
        };
      });

      while (formattedQuestions.length < 3) {
        formattedQuestions.push({
          question: '',
          options: { A: '', B: '', C: '', D: '' },
          correctAnswer: 'A',
          explanation: ''
        });
      }

      setFormData({
        paragraphNumber: data.paragraphNumber || 1,
        title: data.title || '',
        passage: data.passage || '',
        jlptLevel: data.jlptLevel || 'N5',
        order: data.order || data.paragraphNumber || 1,
        questions: formattedQuestions
      });
      setModalError(null);
      setIsModalOpen(true);
    } catch (err: any) {
      alert(err.message || 'Failed to load reading details for edit.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddQuestion = () => {
    setFormData(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        { question: '', options: { A: '', B: '', C: '', D: '' }, correctAnswer: 'A', explanation: '' }
      ]
    }));
  };

  const handleRemoveQuestion = (idx: number) => {
    if (formData.questions.length <= 1) {
      setModalError('Reading exercise must have at least one question.');
      return;
    }
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== idx)
    }));
  };

  const handleQuestionTextChange = (qIdx: number, text: string) => {
    setFormData(prev => {
      const updated = [...prev.questions];
      updated[qIdx] = { ...updated[qIdx], question: text };
      return { ...prev, questions: updated };
    });
  };

  const handleOptionChange = (qIdx: number, optKey: 'A' | 'B' | 'C' | 'D', text: string) => {
    setFormData(prev => {
      const updated = [...prev.questions];
      updated[qIdx] = {
        ...updated[qIdx],
        options: { ...updated[qIdx].options, [optKey]: text }
      };
      return { ...prev, questions: updated };
    });
  };

  const handleCorrectAnswerChange = (qIdx: number, val: 'A' | 'B' | 'C' | 'D') => {
    setFormData(prev => {
      const updated = [...prev.questions];
      updated[qIdx] = { ...updated[qIdx], correctAnswer: val };
      return { ...prev, questions: updated };
    });
  };

  const handleExplanationChange = (qIdx: number, text: string) => {
    setFormData(prev => {
      const updated = [...prev.questions];
      updated[qIdx] = { ...updated[qIdx], explanation: text };
      return { ...prev, questions: updated };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setModalError('Title is required.');
      return;
    }
    if (!formData.passage.trim()) {
      setModalError('Reading passage text is required.');
      return;
    }
    if (!formData.paragraphNumber || formData.paragraphNumber < 1) {
      setModalError('Paragraph number must be a valid positive integer.');
      return;
    }

    if (formData.questions.length < 1) {
      setModalError('At least one comprehension question is required.');
      return;
    }

    for (let i = 0; i < formData.questions.length; i++) {
      const q = formData.questions[i];
      if (!q.question.trim()) {
        setModalError(`Question ${i + 1} text is empty.`);
        return;
      }
      if (!q.options.A.trim() || !q.options.B.trim() || !q.options.C.trim() || !q.options.D.trim()) {
        setModalError(`Question ${i + 1} must have all 4 options (A, B, C, D) filled in.`);
        return;
      }
      if (!['A', 'B', 'C', 'D'].includes(q.correctAnswer)) {
        setModalError(`Question ${i + 1} must have a valid correct answer selected.`);
        return;
      }
    }

    const payload = {
      paragraphNumber: Number(formData.paragraphNumber),
      title: formData.title.trim(),
      passage: formData.passage,
      jlptLevel: formData.jlptLevel,
      order: Number(formData.order) || Number(formData.paragraphNumber),
      questions: formData.questions.map(q => ({
        question: q.question.trim(),
        options: [
          { label: 'A', text: q.options.A.trim() },
          { label: 'B', text: q.options.B.trim() },
          { label: 'C', text: q.options.C.trim() },
          { label: 'D', text: q.options.D.trim() }
        ],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation.trim()
      }))
    };

    try {
      setActionLoading(true);
      setModalError(null);

      if (editingId) {
        await api.readings.update(editingId, payload);
        showToast('Reading passage updated successfully!');
      } else {
        await api.readings.create(payload);
        showToast('Reading passage created successfully!');
      }

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to save reading passage.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (reading: ReadingItem) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "Paragraph ${reading.paragraphNumber}: ${reading.title}"?`
    );
    if (!confirmDelete) return;

    try {
      await api.readings.delete(reading._id);
      showToast('Reading passage deleted successfully.');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete reading passage.');
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

      const res = await api.readings.previewCsv({
        csvText: csvRawText,
        jlptLevel: csvJlptLevel
      });

      if (res && res.success) {
        setCsvPreviewData({
          totalRows: res.totalRows,
          newCount: res.newCount,
          duplicateCount: res.duplicateCount,
          previewReadings: res.previewReadings || res.validReadings || []
        });
        setCsvStep('preview');
      } else {
        setCsvError(res?.message || 'Failed to parse Reading CSV.');
      }
    } catch (err: any) {
      setCsvError(err.message || 'Error occurred while validating Reading CSV.');
    } finally {
      setCsvParsing(false);
    }
  };

  const handleCommitCsv = async () => {
    if (!csvPreviewData || !csvPreviewData.previewReadings.length) return;

    try {
      setCsvCommitting(true);
      setCsvError(null);

      const res = await api.readings.commitCsv({
        readings: csvPreviewData.previewReadings,
        mode: csvDuplicateMode
      });

      if (res && res.success) {
        showToast(res.message || 'Reading passages imported successfully!');
        setIsCsvModalOpen(false);
        loadData();
      } else {
        setCsvError(res?.message || 'Failed to commit readings to database.');
      }
    } catch (err: any) {
      setCsvError(err.message || 'Error occurred while importing readings.');
    } finally {
      setCsvCommitting(false);
    }
  };

  // Filtered readings
  const filteredReadings = useMemo(() => {
    return readings.filter(r => {
      const matchesSearch = 
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.passage.toLowerCase().includes(search.toLowerCase()) ||
        `paragraph ${r.paragraphNumber}`.toLowerCase().includes(search.toLowerCase());

      const matchesJlpt = selectedJlpt === 'all' || r.jlptLevel === selectedJlpt;
      return matchesSearch && matchesJlpt;
    });
  }, [readings, search, selectedJlpt]);

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
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <FileText className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-[#1a1918]">Reading Comprehension Manager</h1>
          </div>
          <p className="text-xs text-[#8c8880] mt-1">
            Manage paragraph-wise Japanese reading passages, raw Japanese text, and 5-6 question MCQ tests with correct answer dropdown selectors. Total passages: {readings.length}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCsvModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-all cursor-pointer border border-emerald-200"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#1a1918] hover:bg-[#33312e] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Passage</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-2xl border border-[#eeece6] shadow-xs">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8c8880]" />
          <input
            type="text"
            placeholder="Search paragraph number, title, or Japanese text..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#eeece6] bg-[#faf9f6] focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* JLPT Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#8c8880] font-semibold">JLPT Level:</span>
          <select
            value={selectedJlpt}
            onChange={(e) => setSelectedJlpt(e.target.value)}
            className="flex-1 py-2 px-3 text-xs rounded-xl border border-[#eeece6] bg-[#faf9f6] focus:outline-none focus:border-emerald-500 font-medium"
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

      {/* Readings List */}
      <div className="bg-white rounded-3xl border border-[#eeece6] overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent mb-3" />
            <p className="text-xs text-[#8c8880] font-medium">Loading reading passages from MongoDB Atlas...</p>
          </div>
        ) : filteredReadings.length === 0 ? (
          <div className="py-16 text-center px-4">
            <BookOpen className="w-12 h-12 text-[#8c8880]/30 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-[#1a1918]">No reading passages found</h3>
            <p className="text-xs text-[#8c8880] mt-1 max-w-sm mx-auto">
              No passages match your search or filter. You can add a new passage or import via CSV.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={handleOpenCsvModal}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Import CSV</span>
              </button>
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-[#1a1918] text-white hover:bg-[#33312e] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Passage</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#faf9f6] border-b border-[#eeece6] text-[#8c8880] font-semibold">
                  <th className="py-3 px-4 w-16 text-center">Para #</th>
                  <th className="py-3 px-4 w-60">Title</th>
                  <th className="py-3 px-4">Passage Excerpt</th>
                  <th className="py-3 px-4 w-28 text-center">Questions</th>
                  <th className="py-3 px-4 w-20 text-center">JLPT</th>
                  <th className="py-3 px-4 w-24 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eeece6]">
                {filteredReadings.map((reading) => (
                  <tr key={reading._id} className="hover:bg-[#faf9f6]/60 transition-colors">
                    <td className="py-3 px-4 text-center">
                      <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                        P{reading.paragraphNumber}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-[#1a1918]">
                        {reading.title}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-[#6e6b66] font-japanese line-clamp-2 max-w-xl">
                        {reading.passage}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200">
                        {reading.questions?.length || 0} Questions
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                        {reading.jlptLevel || 'N5'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEditModal(reading)}
                          className="p-1.5 rounded-lg text-[#6e6b66] hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Edit Passage"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(reading)}
                          className="p-1.5 rounded-lg text-[#6e6b66] hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Passage"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
                <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-700">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#1a1918]">Import Reading Passages from CSV</h2>
                  <p className="text-xs text-[#8c8880]">
                    {csvStep === 'upload' 
                      ? 'Upload CSV with title, passage, question_1..N, option_1_a..d, correct_answer_1..N' 
                      : 'Review parsed reading passages and select duplicate strategy before importing.'}
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
                  {/* JLPT Level */}
                  <div>
                    <label className="block text-xs font-bold text-[#1a1918] mb-1.5">
                      Default JLPT Level
                    </label>
                    <div className="flex gap-2">
                      {['N5', 'N4', 'N3', 'N2', 'N1'].map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setCsvJlptLevel(lvl)}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                            csvJlptLevel === lvl
                              ? 'bg-emerald-600 border-emerald-600 text-white'
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
                      Select Reading CSV File
                    </label>
                    <div className="border-2 border-dashed border-[#eeece6] hover:border-emerald-400 rounded-2xl p-6 text-center bg-[#faf9f6] transition-colors">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleCsvFileChange}
                        id="reading-csv-file"
                        className="hidden"
                      />
                      <label htmlFor="reading-csv-file" className="cursor-pointer">
                        <UploadCloud className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        <span className="text-xs font-bold text-[#1a1918] block">
                          {csvFile ? csvFile.name : 'Click to select Reading CSV file'}
                        </span>
                        <span className="text-[11px] text-[#8c8880] mt-1 block">
                          Supports 4, 5, 6+ comprehension questions per passage
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
                    <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-center">
                      <div className="text-lg font-bold text-emerald-700">{csvPreviewData?.totalRows || 0}</div>
                      <div className="text-[11px] font-semibold text-emerald-900">Total Passages</div>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-center">
                      <div className="text-lg font-bold text-blue-700">{csvPreviewData?.newCount || 0}</div>
                      <div className="text-[11px] font-semibold text-blue-900">New Passages</div>
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
                            name="dupModeReading"
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
                            name="dupModeReading"
                            checked={csvDuplicateMode === 'update'}
                            onChange={() => setCsvDuplicateMode('update')}
                          />
                          <span>Update existing passages with CSV data</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Preview Table */}
                  <div>
                    <span className="text-xs font-bold text-[#1a1918] mb-1.5 block">
                      Preview Passages (First {Math.min(csvPreviewData?.previewReadings?.length || 0, 5)})
                    </span>
                    <div className="max-h-60 overflow-y-auto border border-[#eeece6] rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#faf9f6] sticky top-0 border-b border-[#eeece6] text-[#8c8880]">
                          <tr>
                            <th className="p-2 w-12 text-center">Para #</th>
                            <th className="p-2">Title</th>
                            <th className="p-2">Questions</th>
                            <th className="p-2 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eeece6]">
                          {csvPreviewData?.previewReadings?.slice(0, 5).map((r, i) => (
                            <tr key={i} className="hover:bg-[#faf9f6]/40">
                              <td className="p-2 text-center font-bold text-emerald-700">
                                {r.paragraphNumber || i + 1}
                              </td>
                              <td className="p-2 font-bold text-[#1a1918]">{r.title}</td>
                              <td className="p-2 text-blue-700 font-semibold">
                                {r.questions?.length || 0} questions
                              </td>
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
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all disabled:opacity-50 cursor-pointer"
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
                    {csvCommitting ? 'Importing...' : `Commit ${csvPreviewData?.totalRows || 0} Passages`}
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
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#eeece6] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#eeece6] flex items-center justify-between bg-[#faf9f6]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-700">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#1a1918]">
                    {editingId ? 'Edit Reading Passage' : 'Create Reading Passage'}
                  </h2>
                  <p className="text-xs text-[#8c8880]">
                    Pure Hiragana/Kanji Japanese text and 5-question comprehension test.
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
            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6">
              {/* Paragraph Number & JLPT */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1a1918] mb-1.5">
                    Paragraph Number *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formData.paragraphNumber}
                    onChange={(e) => setFormData({ ...formData, paragraphNumber: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#eeece6] bg-[#faf9f6] font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1a1918] mb-1.5">
                    JLPT Level
                  </label>
                  <select
                    value={formData.jlptLevel}
                    onChange={(e) => setFormData({ ...formData, jlptLevel: e.target.value })}
                    className="w-full py-2 px-3 text-xs rounded-xl border border-[#eeece6] bg-[#faf9f6] focus:outline-none focus:border-emerald-500 font-semibold"
                  >
                    <option value="N5">N5</option>
                    <option value="N4">N4</option>
                    <option value="N3">N3</option>
                    <option value="N2">N2</option>
                    <option value="N1">N1</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1a1918] mb-1.5">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#eeece6] bg-[#faf9f6] focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-[#1a1918] mb-1.5">
                  Reading Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 私の一日 (My Day) or Paragraph 1 — 学校"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#eeece6] bg-[#faf9f6] font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Raw Japanese Passage */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#1a1918]">
                    Reading Passage Text (本文) *
                  </label>
                  <span className="text-[11px] text-[#8c8880]">
                    All Japanese characters, kanji, and linebreaks preserved
                  </span>
                </div>
                <textarea
                  rows={6}
                  required
                  placeholder="Paste pure Japanese text here...&#10;毎朝 7時に 起きます。朝ごはんを 食べてから、学校へ 行きます。"
                  value={formData.passage}
                  onChange={(e) => setFormData({ ...formData, passage: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#eeece6] bg-[#faf9f6] font-japanese leading-relaxed focus:outline-none focus:border-emerald-500"
                  style={{ fontFamily: "'Hiragino Sans', 'Yu Gothic', 'Noto Sans JP', sans-serif" }}
                />
              </div>

              {/* Comprehension Questions */}
              <div className="space-y-4 pt-2 border-t border-[#eeece6]">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-[#1a1918]">
                      Comprehension Questions ({formData.questions.length})
                    </label>
                    <p className="text-[11px] text-[#8c8880]">
                      Each question has 4 options (A, B, C, D) and an explicit Correct Answer selector dropdown.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Question</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.questions.map((q, qIdx) => (
                    <div key={qIdx} className="p-4 bg-[#faf9f6] rounded-2xl border border-[#eeece6] space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-lg">
                          Question {qIdx + 1}
                        </span>
                        {formData.questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(qIdx)}
                            className="text-rose-500 hover:text-rose-700 flex items-center gap-1 text-[11px]"
                            title="Remove Question"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>

                      {/* Question Text */}
                      <div>
                        <input
                          type="text"
                          required
                          placeholder={`Question ${qIdx + 1} prompt (e.g. この人は 何時に 起きますか。)`}
                          value={q.question}
                          onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-[#eeece6] bg-white font-japanese font-semibold focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      {/* Options A, B, C, D */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {(['A', 'B', 'C', 'D'] as const).map((optKey) => (
                          <div key={optKey} className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                              q.correctAnswer === optKey
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-gray-200 text-[#6e6b66]'
                            }`}>
                              {optKey}
                            </span>
                            <input
                              type="text"
                              required
                              placeholder={`Option ${optKey}`}
                              value={q.options[optKey]}
                              onChange={(e) => handleOptionChange(qIdx, optKey, e.target.value)}
                              className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-[#eeece6] bg-white font-japanese focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        ))}
                      </div>

                      {/* Correct Answer Dropdown Selector */}
                      <div className="p-3 bg-white rounded-xl border border-[#eeece6] flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#1a1918]">Correct Answer Selector:</span>
                          <span className="text-[11px] text-[#8c8880]">Choose which option is correct for evaluation</span>
                        </div>

                        <div className="relative inline-block">
                          <select
                            value={q.correctAnswer}
                            onChange={(e) => handleCorrectAnswerChange(qIdx, e.target.value as 'A' | 'B' | 'C' | 'D')}
                            className="appearance-none bg-emerald-50 border border-emerald-300 text-emerald-800 font-extrabold text-xs rounded-xl py-2 pl-4 pr-9 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs"
                          >
                            <option value="A">Option A</option>
                            <option value="B">Option B</option>
                            <option value="C">Option C</option>
                            <option value="D">Option D</option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-emerald-700 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      {/* Explanation */}
                      <div>
                        <label className="block text-[11px] font-bold text-[#4a4744] mb-1">
                          Explanation (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="Why this answer is correct (shown to students after submission)..."
                          value={q.explanation}
                          onChange={(e) => handleExplanationChange(qIdx, e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#eeece6] bg-white focus:outline-none focus:border-emerald-500"
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
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? 'Saving...' : editingId ? 'Update Passage' : 'Create Passage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
