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
  Headphones, 
  Filter,
  ChevronDown,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  Volume2
} from 'lucide-react';
import { ListeningItem } from '../../types/listening';

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

export const AdminListeningManager: React.FC = () => {
  const [listenings, setListenings] = useState<ListeningItem[]>([]);
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
    listeningNumber: number;
    title: string;
    passage: string;
    jlptLevel: string;
    order: number;
    questions: AdminQuestionForm[];
  }>({
    listeningNumber: 1,
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
    previewListenings: any[];
  } | null>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.listening.adminGetAll();
      if (res && res.data) {
        setListenings(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load listening exercises:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingId(null);
    const nextNum = listenings.length > 0 
      ? Math.max(...listenings.map(l => l.listeningNumber || 0)) + 1 
      : 1;

    setFormData({
      listeningNumber: nextNum,
      title: '',
      passage: '',
      jlptLevel: 'N5',
      order: nextNum,
      questions: createDefaultQuestions()
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = async (item: ListeningItem) => {
    try {
      setActionLoading(true);
      setEditingId(item._id);
      const res = await api.listening.adminGetById(item._id);
      const data: ListeningItem = res.data;

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
        listeningNumber: data.listeningNumber || 1,
        title: data.title || '',
        passage: data.passage || '',
        jlptLevel: data.jlptLevel || 'N5',
        order: data.order || data.listeningNumber || 1,
        questions: formattedQuestions
      });
      setModalError(null);
      setIsModalOpen(true);
    } catch (err: any) {
      alert(err.message || 'Failed to load listening details.');
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
      setModalError('Listening exercise must have at least one question.');
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
      setModalError('Listening title is required.');
      return;
    }
    if (!formData.passage.trim()) {
      setModalError('Japanese listening paragraph text is required.');
      return;
    }
    if (!formData.listeningNumber || formData.listeningNumber < 1) {
      setModalError('Listening number must be a valid positive integer.');
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
      listeningNumber: Number(formData.listeningNumber),
      title: formData.title.trim(),
      passage: formData.passage,
      jlptLevel: formData.jlptLevel,
      order: Number(formData.order) || Number(formData.listeningNumber),
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
        await api.listening.update(editingId, payload);
        showToast('Listening exercise updated successfully!');
      } else {
        await api.listening.create(payload);
        showToast('Listening exercise created successfully!');
      }

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to save listening exercise.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (item: ListeningItem) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "Listening ${item.listeningNumber}: ${item.title}"?`
    );
    if (!confirmDelete) return;

    try {
      await api.listening.delete(item._id);
      showToast('Listening exercise deleted successfully.');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete listening exercise.');
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

      const res = await api.listening.previewCsv({
        csvText: csvRawText,
        jlptLevel: csvJlptLevel
      });

      if (res && res.success) {
        setCsvPreviewData({
          totalRows: res.totalRows,
          newCount: res.newCount,
          duplicateCount: res.duplicateCount,
          previewListenings: res.previewListenings || res.validListenings || []
        });
        setCsvStep('preview');
      } else {
        setCsvError(res?.message || 'Failed to parse Listening CSV.');
      }
    } catch (err: any) {
      setCsvError(err.message || 'Error occurred while validating Listening CSV.');
    } finally {
      setCsvParsing(false);
    }
  };

  const handleCommitCsv = async () => {
    if (!csvPreviewData || !csvPreviewData.previewListenings.length) return;

    try {
      setCsvCommitting(true);
      setCsvError(null);

      const res = await api.listening.commitCsv({
        listenings: csvPreviewData.previewListenings,
        mode: csvDuplicateMode
      });

      if (res && res.success) {
        showToast(res.message || 'Listening exercises imported successfully!');
        setIsCsvModalOpen(false);
        loadData();
      } else {
        setCsvError(res?.message || 'Failed to commit listening exercises to database.');
      }
    } catch (err: any) {
      setCsvError(err.message || 'Error occurred while importing listening exercises.');
    } finally {
      setCsvCommitting(false);
    }
  };

  // Filtered exercises
  const filteredListenings = useMemo(() => {
    return listenings.filter(l => {
      const matchesSearch = 
        l.title.toLowerCase().includes(search.toLowerCase()) ||
        l.passage.toLowerCase().includes(search.toLowerCase()) ||
        `listening ${l.listeningNumber}`.toLowerCase().includes(search.toLowerCase());

      const matchesJlpt = selectedJlpt === 'all' || l.jlptLevel === selectedJlpt;
      return matchesSearch && matchesJlpt;
    });
  }, [listenings, search, selectedJlpt]);

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
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Headphones className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-[#1a1918]">Listening Practice Manager</h1>
          </div>
          <p className="text-xs text-[#8c8880] mt-1">
            Manage exercise-wise Japanese listening passages, speech scripts, and 5-question MCQ tests with correct answer dropdown selectors. Total exercises: {listenings.length}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCsvModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all cursor-pointer border border-blue-200"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#1a1918] hover:bg-[#33312e] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Listening</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-2xl border border-[#eeece6] shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8c8880]" />
          <input
            type="text"
            placeholder="Search listening number, title, or Japanese text..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#eeece6] bg-[#faf9f6] focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#8c8880] font-semibold">JLPT Level:</span>
          <select
            value={selectedJlpt}
            onChange={(e) => setSelectedJlpt(e.target.value)}
            className="flex-1 py-2 px-3 text-xs rounded-xl border border-[#eeece6] bg-[#faf9f6] focus:outline-none focus:border-blue-500 font-medium"
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

      {/* Listening Exercises List Table */}
      <div className="bg-white rounded-3xl border border-[#eeece6] overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mb-3" />
            <p className="text-xs text-[#8c8880] font-medium">Loading listening exercises from MongoDB Atlas...</p>
          </div>
        ) : filteredListenings.length === 0 ? (
          <div className="py-16 text-center px-4">
            <Headphones className="w-12 h-12 text-[#8c8880]/30 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-[#1a1918]">No listening exercises found</h3>
            <p className="text-xs text-[#8c8880] mt-1 max-w-sm mx-auto">
              No listening exercises match your search or filter. You can add one manually or import from CSV.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={handleOpenCsvModal}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Import CSV</span>
              </button>
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-[#1a1918] text-white hover:bg-[#33312e] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Listening</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#faf9f6] border-b border-[#eeece6] text-[#8c8880] font-semibold">
                  <th className="py-3 px-4 w-16 text-center">Ex #</th>
                  <th className="py-3 px-4 w-52">Title</th>
                  <th className="py-3 px-4">Japanese Speech Paragraph (Admin Only)</th>
                  <th className="py-3 px-4 w-28 text-center">Questions</th>
                  <th className="py-3 px-4 w-20 text-center">JLPT</th>
                  <th className="py-3 px-4 w-24 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eeece6]">
                {filteredListenings.map((item) => (
                  <tr key={item._id} className="hover:bg-[#faf9f6]/60 transition-colors">
                    <td className="py-3 px-4 text-center">
                      <span className="font-extrabold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg border border-blue-200">
                        L{item.listeningNumber}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-[#1a1918]">
                        {item.title}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-[#6e6b66] font-japanese line-clamp-2 max-w-xl">
                        {item.passage}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200">
                        {item.questions?.length || 0} Questions
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                        {item.jlptLevel || 'N5'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 rounded-lg text-[#6e6b66] hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit Listening"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1.5 rounded-lg text-[#6e6b66] hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Listening"
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
                <div className="p-2.5 rounded-2xl bg-blue-100 text-blue-700">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#1a1918]">Import Listening Exercises from CSV</h2>
                  <p className="text-xs text-[#8c8880]">
                    {csvStep === 'upload' 
                      ? 'Upload CSV with title, passage, question_1..N, option_1_a..d, correct_answer_1..N' 
                      : 'Review parsed listening exercises and select duplicate strategy before importing.'}
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
                              ? 'bg-blue-600 border-blue-600 text-white'
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
                      Select Listening CSV File
                    </label>
                    <div className="border-2 border-dashed border-[#eeece6] hover:border-blue-400 rounded-2xl p-6 text-center bg-[#faf9f6] transition-colors">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleCsvFileChange}
                        id="listening-csv-file"
                        className="hidden"
                      />
                      <label htmlFor="listening-csv-file" className="cursor-pointer">
                        <UploadCloud className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                        <span className="text-xs font-bold text-[#1a1918] block">
                          {csvFile ? csvFile.name : 'Click to select Listening CSV file'}
                        </span>
                        <span className="text-[11px] text-[#8c8880] mt-1 block">
                          Supports 3, 4, 5, 6+ comprehension questions per exercise
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
                    <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-center">
                      <div className="text-lg font-bold text-blue-700">{csvPreviewData?.totalRows || 0}</div>
                      <div className="text-[11px] font-semibold text-blue-900">Total Exercises</div>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                      <div className="text-lg font-bold text-emerald-700">{csvPreviewData?.newCount || 0}</div>
                      <div className="text-[11px] font-semibold text-emerald-900">New Exercises</div>
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
                            name="dupModeListening"
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
                            name="dupModeListening"
                            checked={csvDuplicateMode === 'update'}
                            onChange={() => setCsvDuplicateMode('update')}
                          />
                          <span>Update existing exercises with CSV data</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Preview Table */}
                  <div>
                    <span className="text-xs font-bold text-[#1a1918] mb-1.5 block">
                      Preview Exercises (First {Math.min(csvPreviewData?.previewListenings?.length || 0, 5)})
                    </span>
                    <div className="max-h-60 overflow-y-auto border border-[#eeece6] rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#faf9f6] sticky top-0 border-b border-[#eeece6] text-[#8c8880]">
                          <tr>
                            <th className="p-2 w-12 text-center">Ex #</th>
                            <th className="p-2">Title</th>
                            <th className="p-2">Questions</th>
                            <th className="p-2 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eeece6]">
                          {csvPreviewData?.previewListenings?.slice(0, 5).map((l, i) => (
                            <tr key={i} className="hover:bg-[#faf9f6]/40">
                              <td className="p-2 text-center font-bold text-blue-700">
                                {l.listeningNumber || i + 1}
                              </td>
                              <td className="p-2 font-bold text-[#1a1918]">{l.title}</td>
                              <td className="p-2 text-blue-700 font-semibold">
                                {l.questions?.length || 0} questions
                              </td>
                              <td className="p-2 text-center">
                                {l.isDuplicate ? (
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
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all disabled:opacity-50 cursor-pointer"
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
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {csvCommitting ? 'Importing...' : `Commit ${csvPreviewData?.totalRows || 0} Exercises`}
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
                <div className="p-2.5 rounded-2xl bg-blue-100 text-blue-700">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#1a1918]">
                    {editingId ? 'Edit Listening Exercise' : 'Create Listening Exercise'}
                  </h2>
                  <p className="text-xs text-[#8c8880]">
                    Pure Japanese paragraph speech script and multiple-choice comprehension test.
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
              {/* Exercise Number & JLPT */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1a1918] mb-1.5">
                    Listening Number *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formData.listeningNumber}
                    onChange={(e) => setFormData({ ...formData, listeningNumber: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#eeece6] bg-[#faf9f6] font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1a1918] mb-1.5">
                    JLPT Level
                  </label>
                  <select
                    value={formData.jlptLevel}
                    onChange={(e) => setFormData({ ...formData, jlptLevel: e.target.value })}
                    className="w-full py-2 px-3 text-xs rounded-xl border border-[#eeece6] bg-[#faf9f6] focus:outline-none focus:border-blue-500 font-semibold"
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
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#eeece6] bg-[#faf9f6] focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-[#1a1918] mb-1.5">
                  Listening Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 自己紹介 (Self Introduction) or Listening 1 — 買い物"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#eeece6] bg-[#faf9f6] font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Japanese Speech Paragraph (Audio Script) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#1a1918] flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Japanese Listening Paragraph (音声原稿) *</span>
                  </label>
                  <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-semibold border border-amber-200">
                    Converted to audio • Hidden from students
                  </span>
                </div>
                <textarea
                  rows={6}
                  required
                  placeholder="Paste pure Japanese speech text here...&#10;はじめまして。わたしは マイク・ミラーです。アメリカから きました。どうぞ よろしく おねがいします。"
                  value={formData.passage}
                  onChange={(e) => setFormData({ ...formData, passage: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#eeece6] bg-[#faf9f6] font-japanese leading-relaxed focus:outline-none focus:border-blue-500"
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
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-200 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Question</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.questions.map((q, qIdx) => (
                    <div key={qIdx} className="p-4 bg-[#faf9f6] rounded-2xl border border-[#eeece6] space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-blue-800 bg-blue-100/70 px-2.5 py-0.5 rounded-lg">
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
                          placeholder={`Question ${qIdx + 1} prompt (e.g. この人は だれですか。)`}
                          value={q.question}
                          onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-[#eeece6] bg-white font-japanese font-semibold focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Options A, B, C, D */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {(['A', 'B', 'C', 'D'] as const).map((optKey) => (
                          <div key={optKey} className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                              q.correctAnswer === optKey
                                ? 'bg-blue-600 text-white shadow-xs'
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
                              className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-[#eeece6] bg-white font-japanese focus:outline-none focus:border-blue-500"
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
                            className="appearance-none bg-blue-50 border border-blue-300 text-blue-900 font-extrabold text-xs rounded-xl py-2 pl-4 pr-9 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs"
                          >
                            <option value="A">Option A</option>
                            <option value="B">Option B</option>
                            <option value="C">Option C</option>
                            <option value="D">Option D</option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-blue-700 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#eeece6] bg-white focus:outline-none focus:border-blue-500"
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
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? 'Saving...' : editingId ? 'Update Exercise' : 'Create Exercise'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
