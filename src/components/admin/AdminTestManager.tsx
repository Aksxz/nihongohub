import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Upload, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  X, 
  ChevronDown, 
  ChevronUp, 
  HelpCircle,
  FileText,
  RotateCcw,
  Sparkles,
  Download
} from 'lucide-react';
import { api } from '../../services/api';
import { TestItem, TestQuestion, TestQuestionType } from '../../types/test';

export const AdminTestManager: React.FC = () => {
  const [tests, setTests] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal: Create / Edit Test
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    order: number;
    isActive: boolean;
    questions: TestQuestion[];
  }>({
    title: '',
    description: '',
    order: 0,
    isActive: true,
    questions: []
  });
  const [modalSaving, setModalSaving] = useState<boolean>(false);

  // Modal: CSV Import
  const [isCsvModalOpen, setIsCsvModalOpen] = useState<boolean>(false);
  const [csvText, setCsvText] = useState<string>('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any | null>(null);
  const [csvLoading, setCsvLoading] = useState<boolean>(false);
  const [csvMode, setCsvMode] = useState<'skip' | 'update'>('skip');

  // Modal: Delete Confirm
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchTests = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.tests.adminGetAll();
      if (res && res.data) {
        setTests(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load admin tests:', err);
      setError(err?.message || 'Failed to load tests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  const openCreateModal = () => {
    setEditingTestId(null);
    setFormData({
      title: `Test ${tests.length + 1}`,
      description: '',
      order: tests.length + 1,
      isActive: true,
      questions: [
        {
          type: 'mcq',
          question: '',
          options: [
            { label: 'A', text: '' },
            { label: 'B', text: '' },
            { label: 'C', text: '' },
            { label: 'D', text: '' }
          ],
          correctAnswer: 'A',
          explanation: ''
        }
      ]
    });
    setIsModalOpen(true);
    setError(null);
  };

  const openEditModal = async (testId: string) => {
    try {
      setModalSaving(true);
      setError(null);
      const res = await api.tests.adminGetById(testId);
      if (res && res.data) {
        const t = res.data;
        setEditingTestId(t.id || t._id);
        setFormData({
          title: t.title,
          description: t.description || '',
          order: t.order || 0,
          isActive: t.isActive !== undefined ? t.isActive : true,
          questions: (t.questions || []).map(q => ({
            type: q.type,
            question: q.question,
            options: q.type === 'mcq' ? (q.options || [
              { label: 'A', text: '' },
              { label: 'B', text: '' },
              { label: 'C', text: '' },
              { label: 'D', text: '' }
            ]) : undefined,
            correctAnswer: q.correctAnswer || (q.type === 'mcq' ? 'A' : q.type === 'true_false' ? 'True' : ''),
            acceptedAnswers: q.acceptedAnswers || [],
            explanation: q.explanation || ''
          }))
        });
        setIsModalOpen(true);
      }
    } catch (err: any) {
      console.error('Failed to fetch test for editing:', err);
      setError(err?.message || 'Failed to load test details.');
    } finally {
      setModalSaving(false);
    }
  };

  const handleAddQuestion = (type: TestQuestionType = 'mcq') => {
    const newQ: TestQuestion = {
      type,
      question: '',
      options: type === 'mcq' ? [
        { label: 'A', text: '' },
        { label: 'B', text: '' },
        { label: 'C', text: '' },
        { label: 'D', text: '' }
      ] : undefined,
      correctAnswer: type === 'mcq' ? 'A' : type === 'true_false' ? 'True' : '',
      acceptedAnswers: type === 'fill_blank' ? [] : undefined,
      explanation: ''
    };

    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, newQ]
    }));
  };

  const handleRemoveQuestion = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== idx)
    }));
  };

  const handleQuestionChange = (idx: number, field: string, value: any) => {
    setFormData(prev => {
      const updated = [...prev.questions];
      const q = { ...updated[idx], [field]: value };

      // If switching type, initialize defaults appropriately
      if (field === 'type') {
        if (value === 'mcq') {
          q.options = [
            { label: 'A', text: '' },
            { label: 'B', text: '' },
            { label: 'C', text: '' },
            { label: 'D', text: '' }
          ];
          q.correctAnswer = 'A';
          delete q.acceptedAnswers;
        } else if (value === 'true_false') {
          delete q.options;
          q.correctAnswer = 'True';
          delete q.acceptedAnswers;
        } else if (value === 'fill_blank') {
          delete q.options;
          q.correctAnswer = '';
          q.acceptedAnswers = [];
        }
      }

      updated[idx] = q;
      return { ...prev, questions: updated };
    });
  };

  const handleOptionChange = (qIdx: number, optLabel: 'A' | 'B' | 'C' | 'D', text: string) => {
    setFormData(prev => {
      const updated = [...prev.questions];
      const q = { ...updated[qIdx] };
      if (q.options) {
        q.options = q.options.map(opt => opt.label === optLabel ? { ...opt, text } : opt);
      }
      updated[qIdx] = q;
      return { ...prev, questions: updated };
    });
  };

  const handleSaveTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Please enter a test title.');
      return;
    }

    if (formData.questions.length === 0) {
      alert('Please add at least one question to the test.');
      return;
    }

    for (let i = 0; i < formData.questions.length; i++) {
      const q = formData.questions[i];
      if (!q.question.trim()) {
        alert(`Question ${i + 1} text cannot be empty.`);
        return;
      }
      if (q.type === 'mcq') {
        if (!q.options || q.options.some(o => !o.text.trim())) {
          alert(`Question ${i + 1} (MCQ) must have all 4 options filled out.`);
          return;
        }
      } else if (q.type === 'fill_blank') {
        if (!q.correctAnswer || !q.correctAnswer.trim()) {
          alert(`Question ${i + 1} (Fill in Blank) correct answer cannot be empty.`);
          return;
        }
      }
    }

    try {
      setModalSaving(true);
      setError(null);

      if (editingTestId) {
        await api.tests.update(editingTestId, formData);
        setSuccessMsg(`Test "${formData.title}" updated successfully.`);
      } else {
        await api.tests.create(formData);
        setSuccessMsg(`Test "${formData.title}" created successfully.`);
      }

      setIsModalOpen(false);
      fetchTests();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to save test:', err);
      alert(err?.message || 'Failed to save test.');
    } finally {
      setModalSaving(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await api.tests.toggle(id);
      fetchTests();
    } catch (err: any) {
      console.error('Failed to toggle test status:', err);
      alert(err?.message || 'Failed to toggle test status.');
    }
  };

  const handleDeleteTest = async () => {
    if (!deleteTargetId) return;
    try {
      setIsDeleting(true);
      await api.tests.delete(deleteTargetId);
      setDeleteTargetId(null);
      setSuccessMsg('Test deleted successfully.');
      fetchTests();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to delete test:', err);
      alert(err?.message || 'Failed to delete test.');
    } finally {
      setIsDeleting(false);
    }
  };

  // CSV Preview & Commit
  const handlePreviewCsv = async () => {
    try {
      setCsvLoading(true);
      setError(null);

      let payload: any;
      if (csvFile) {
        const fd = new FormData();
        fd.append('file', csvFile);
        payload = fd;
      } else if (csvText.trim()) {
        payload = { csvText: csvText.trim() };
      } else {
        alert('Please select a CSV file or paste CSV text.');
        return;
      }

      const res = await api.tests.previewCsv(payload);
      if (res && res.success) {
        setCsvPreview(res);
      } else {
        alert(res?.message || 'CSV preview failed.');
      }
    } catch (err: any) {
      console.error('CSV Preview Error:', err);
      alert(err?.message || 'Failed to parse CSV.');
    } finally {
      setCsvLoading(false);
    }
  };

  const handleCommitCsv = async () => {
    if (!csvPreview || !csvPreview.previewTests) return;
    try {
      setCsvLoading(true);
      setError(null);
      const res = await api.tests.commitCsv(csvPreview.previewTests, csvMode);
      if (res && res.success) {
        setSuccessMsg(res.message);
        setIsCsvModalOpen(false);
        setCsvPreview(null);
        setCsvText('');
        setCsvFile(null);
        fetchTests();
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        alert(res?.message || 'Commit failed.');
      }
    } catch (err: any) {
      console.error('CSV Commit Error:', err);
      alert(err?.message || 'Failed to import CSV.');
    } finally {
      setCsvLoading(false);
    }
  };

  const sampleCsvContent = `test_title,test_description,question_type,question,option_a,option_b,option_c,option_d,correct_answer,accepted_answers,explanation
JLPT N5 Diagnostic Test,Comprehensive review of basic Japanese grammar and vocab,mcq,日曜日 学校へ 行きません。,は,に,で,を,B,,Day of week takes particle に.
JLPT N5 Diagnostic Test,Comprehensive review of basic Japanese grammar and vocab,true_false,「食べる」 is a Ru-verb (Group 2).,,,,True,,食べる follows vowel e before ru.
JLPT N5 Diagnostic Test,Comprehensive review of basic Japanese grammar and vocab,fill_blank,田中さんの 国は どこですか。 (Write "Japan" in Hiragana),,,,にほん,にっぽん,Japan is pronounced にほん or にっぽん.`;

  const downloadSampleCsv = () => {
    const blob = new Blob([sampleCsvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'nihongohub_tests_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredTests = tests.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <CheckSquare className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-stone-900 tracking-tight">
              Tests Management
            </h1>
          </div>
          <p className="text-stone-500 text-xs">
            Create, edit, and organize multiple-choice, true/false, and fill-in-the-blank assessment tests.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setIsCsvModalOpen(true);
              setCsvPreview(null);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4 text-stone-500" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Test</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tests by title or description..."
            className="w-full pl-10 pr-4 py-2 rounded-2xl bg-white border border-stone-200 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        <div className="text-xs text-stone-500 font-medium">
          Total: <span className="font-bold text-stone-800">{filteredTests.length}</span> tests
        </div>
      </div>

      {/* Tests Table */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-400 text-xs font-medium">
            <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading tests...
          </div>
        ) : filteredTests.length === 0 ? (
          <div className="p-12 text-center">
            <CheckSquare className="w-10 h-10 text-stone-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-stone-700">No Tests Found</h3>
            <p className="text-stone-400 text-xs mt-1">
              {searchTerm ? 'No tests match your search query.' : 'Click "New Test" or "Import CSV" to add tests.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Test Title</th>
                  <th className="py-3 px-4">Questions</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredTests.map((test) => {
                  const qCount = test.questions ? test.questions.length : 0;

                  return (
                    <tr key={test.id || test._id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-stone-500">
                        #{test.order || 0}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-stone-900 text-sm">{test.title}</div>
                        {test.description && (
                          <div className="text-stone-500 text-[11px] line-clamp-1 mt-0.5">
                            {test.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[11px]">
                          {qCount} Questions
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleStatus(test.id || test._id)}
                          className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider cursor-pointer transition-all ${
                            test.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-stone-100 text-stone-500 border border-stone-200'
                          }`}
                        >
                          {test.isActive ? 'Active' : 'Disabled'}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-stone-400">
                        {test.createdAt ? new Date(test.createdAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(test.id || test._id)}
                            title="Edit Test"
                            className="p-1.5 rounded-lg text-stone-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTargetId(test.id || test._id)}
                            title="Delete Test"
                            className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* ==================================================== */}
      {/* MODAL: CREATE / EDIT TEST                           */}
      {/* ==================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 animate-pop-in my-8">
            {/* Modal Header */}
            <div className="p-6 border-b border-stone-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <CheckSquare className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-stone-900">
                    {editingTestId ? 'Edit Test' : 'Create New Test'}
                  </h2>
                  <p className="text-stone-500 text-xs">Configure title, options, and question bank.</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveTest} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* General Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Test Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. JLPT N5 Midterm Assessment"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Description (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Overview of syllabus or focus areas covered in this test..."
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              {/* Questions Section */}
              <div className="pt-4 border-t border-stone-100">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">
                      Questions ({formData.questions.length})
                    </h3>
                    <p className="text-stone-500 text-[11px]">Supports Multiple Choice, True/False, and Fill-in-the-Blank.</p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAddQuestion('mcq')}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs cursor-pointer"
                    >
                      + MCQ
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddQuestion('true_false')}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs cursor-pointer"
                    >
                      + True/False
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddQuestion('fill_blank')}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs cursor-pointer"
                    >
                      + Blank
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {formData.questions.map((q, idx) => (
                    <div 
                      key={idx}
                      className="p-5 rounded-2xl bg-stone-50/70 border border-stone-200 space-y-3 relative group"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-stone-200 text-stone-700 text-xs font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <select
                            value={q.type}
                            onChange={(e) => handleQuestionChange(idx, 'type', e.target.value as TestQuestionType)}
                            className="bg-white border border-stone-200 rounded-lg px-2.5 py-1 text-xs font-bold text-stone-700 outline-none"
                          >
                            <option value="mcq">Multiple Choice (MCQ)</option>
                            <option value="true_false">True / False</option>
                            <option value="fill_blank">Fill in the Blank</option>
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(idx)}
                          className="p-1 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Remove Question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Question Text */}
                      <div>
                        <input
                          type="text"
                          required
                          value={q.question}
                          onChange={(e) => handleQuestionChange(idx, 'question', e.target.value)}
                          placeholder="Question text..."
                          className="w-full px-3 py-2 bg-white rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none font-medium"
                        />
                      </div>

                      {/* TYPE A: MCQ OPTIONS */}
                      {q.type === 'mcq' && (
                        <div className="space-y-2 pt-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(['A', 'B', 'C', 'D'] as const).map(label => {
                              const opt = q.options?.find(o => o.label === label);
                              return (
                                <div key={label} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-stone-200">
                                  <span className="font-bold text-stone-600 text-xs">{label}:</span>
                                  <input
                                    type="text"
                                    required
                                    value={opt ? opt.text : ''}
                                    onChange={(e) => handleOptionChange(idx, label, e.target.value)}
                                    placeholder={`Option ${label} text...`}
                                    className="w-full text-xs outline-none bg-transparent"
                                  />
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-xs font-bold text-stone-700">Correct Answer:</span>
                            <select
                              value={q.correctAnswer}
                              onChange={(e) => handleQuestionChange(idx, 'correctAnswer', e.target.value)}
                              className="bg-white border border-stone-200 rounded-lg px-3 py-1 text-xs font-bold text-amber-700 outline-none"
                            >
                              <option value="A">Option A</option>
                              <option value="B">Option B</option>
                              <option value="C">Option C</option>
                              <option value="D">Option D</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {/* TYPE B: TRUE / FALSE */}
                      {q.type === 'true_false' && (
                        <div className="flex items-center gap-3 pt-2">
                          <span className="text-xs font-bold text-stone-700">Correct Answer:</span>
                          <select
                            value={q.correctAnswer}
                            onChange={(e) => handleQuestionChange(idx, 'correctAnswer', e.target.value)}
                            className="bg-white border border-stone-200 rounded-lg px-3 py-1 text-xs font-bold text-amber-700 outline-none"
                          >
                            <option value="True">True (正しい)</option>
                            <option value="False">False (誤り)</option>
                          </select>
                        </div>
                      )}

                      {/* TYPE C: FILL IN THE BLANK */}
                      {q.type === 'fill_blank' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                          <div>
                            <label className="block text-[11px] font-bold text-stone-600 mb-1">
                              Primary Correct Answer *
                            </label>
                            <input
                              type="text"
                              required
                              value={q.correctAnswer}
                              onChange={(e) => handleQuestionChange(idx, 'correctAnswer', e.target.value)}
                              placeholder="e.g. にほん"
                              className="w-full px-3 py-1.5 bg-white rounded-xl border border-stone-200 text-xs outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-stone-600 mb-1">
                              Accepted Alternatives (Comma-separated)
                            </label>
                            <input
                              type="text"
                              value={(q.acceptedAnswers || []).join(', ')}
                              onChange={(e) => handleQuestionChange(
                                idx, 
                                'acceptedAnswers', 
                                e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                              )}
                              placeholder="e.g. にっぽん, 日本"
                              className="w-full px-3 py-1.5 bg-white rounded-xl border border-stone-200 text-xs outline-none"
                            />
                          </div>
                        </div>
                      )}

                      {/* Explanation */}
                      <div className="pt-1">
                        <input
                          type="text"
                          value={q.explanation || ''}
                          onChange={(e) => handleQuestionChange(idx, 'explanation', e.target.value)}
                          placeholder="Optional explanation shown to student after submitting test..."
                          className="w-full px-3 py-1.5 bg-white rounded-xl border border-stone-200 text-[11px] text-stone-600 placeholder:text-stone-400 outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSaving}
                  className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {modalSaving ? 'Saving...' : editingTestId ? 'Update Test' : 'Create Test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: CSV IMPORT                                    */}
      {/* ==================================================== */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-stone-200 animate-pop-in my-8 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <Upload className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-stone-900">Import Tests via CSV</h2>
                  <p className="text-stone-500 text-xs">Upload bulk tests with MCQ, True/False, and Fill-in-the-Blank.</p>
                </div>
              </div>
              <button
                onClick={() => setIsCsvModalOpen(false)}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template Download Hint */}
            <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex items-center justify-between gap-3 text-xs">
              <div className="text-amber-800">
                <span className="font-bold">Need the standard format?</span>
                <p className="text-[11px] text-amber-700/90 mt-0.5">Rows with the same test_title are grouped automatically into one test.</p>
              </div>
              <button
                onClick={downloadSampleCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Sample CSV</span>
              </button>
            </div>

            {/* Upload or Paste */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Upload CSV File
                </label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setCsvFile(file);
                    setCsvPreview(null);
                  }}
                  className="w-full text-xs text-stone-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Or Paste CSV Text
                </label>
                <textarea
                  rows={4}
                  value={csvText}
                  onChange={(e) => {
                    setCsvText(e.target.value);
                    setCsvPreview(null);
                  }}
                  placeholder="Paste CSV rows here..."
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-xs font-mono outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <button
                type="button"
                onClick={handlePreviewCsv}
                disabled={csvLoading || (!csvFile && !csvText.trim())}
                className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-900 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {csvLoading ? 'Validating CSV...' : 'Preview CSV Content'}
              </button>
            </div>

            {/* Preview Section */}
            {csvPreview && (
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-stone-800">
                  <span>Detected Tests: {csvPreview.totalTests} ({csvPreview.totalQuestions} questions)</span>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">{csvPreview.newCount} New</span>
                    {csvPreview.duplicateCount > 0 && (
                      <span className="text-amber-600 font-bold">{csvPreview.duplicateCount} Duplicates</span>
                    )}
                  </div>
                </div>

                {csvPreview.duplicateCount > 0 && (
                  <div className="flex items-center gap-3 pt-2 border-t border-stone-200 text-xs">
                    <span className="font-bold text-stone-700">Duplicate Strategy:</span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="csvMode"
                        value="skip"
                        checked={csvMode === 'skip'}
                        onChange={() => setCsvMode('skip')}
                      />
                      <span>Skip Existing</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="csvMode"
                        value="update"
                        checked={csvMode === 'update'}
                        onChange={() => setCsvMode('update')}
                      />
                      <span>Update Existing</span>
                    </label>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleCommitCsv}
                  disabled={csvLoading}
                  className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {csvLoading ? 'Importing...' : 'Commit Import to Database'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: DELETE CONFIRMATION                           */}
      {/* ==================================================== */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-xl border border-stone-200 animate-pop-in">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Delete Test?</h3>
              <p className="text-stone-500 text-xs mt-1">
                This will permanently delete this test and its associated student scores. This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-bold text-xs hover:bg-stone-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTest}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
