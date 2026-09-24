import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
  CheckSquare, 
  Square, 
  Check, 
  X, 
  AlertTriangle, 
  Edit3, 
  Trash2, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Layers, 
  FileText, 
  RefreshCw,
  ArrowRight,
  Filter,
  Volume2
} from 'lucide-react';
import { soundEffects } from '../../utils/audio';

interface StagedItem {
  _id: string;
  word: string;
  kanji?: string;
  hiragana?: string;
  katakana?: string;
  romaji?: string;
  meaning: string;
  partOfSpeech?: string;
  chapter?: number;
  jlptLevel?: string;
  duplicateStatus: 'NEW' | 'POSSIBLE DUPLICATE';
  duplicateOf?: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface ImportJob {
  id: string;
  fileName: string;
  level: string;
  chapterRange: {
    start: number;
    end: number;
  };
  status: 'pending' | 'reviewed' | 'approved' | 'rejected';
  extractedCount: number;
  approvedCount: number;
  createdAt: string;
  items?: StagedItem[];
}

interface AdminImportReviewProps {
  initialImportId?: string | null;
  onNavigateImporter: () => void;
}

export const AdminImportReview: React.FC<AdminImportReviewProps> = ({ 
  initialImportId,
  onNavigateImporter 
}) => {
  const [importJobs, setImportJobs] = useState<ImportJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(initialImportId || null);
  const [currentJob, setCurrentJob] = useState<ImportJob | null>(null);
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [loadingJob, setLoadingJob] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  
  // Selection for bulk actions
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [replaceDuplicates, setReplaceDuplicates] = useState<boolean>(false);
  const [filterDuplicate, setFilterDuplicate] = useState<'all' | 'NEW' | 'POSSIBLE DUPLICATE'>('all');

  // Inline editing modal
  const [editingItem, setEditingItem] = useState<StagedItem | null>(null);
  const [editFormData, setEditFormData] = useState<{
    word: string;
    kanji: string;
    hiragana: string;
    romaji: string;
    meaning: string;
    partOfSpeech: string;
    chapter: number;
  }>({
    word: '',
    kanji: '',
    hiragana: '',
    romaji: '',
    meaning: '',
    partOfSpeech: 'Noun',
    chapter: 1
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchImportList = async () => {
    setLoadingList(true);
    try {
      const res = await api.admin.getImports();
      if (res.success) {
        setImportJobs(res.data);
        if (!selectedJobId && res.data.length > 0) {
          setSelectedJobId(res.data[0].id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load imports:', err);
    } finally {
      setLoadingList(false);
    }
  };

  const fetchJobDetails = async (jobId: string) => {
    setLoadingJob(true);
    try {
      const res = await api.admin.getImportById(jobId);
      if (res.success) {
        setCurrentJob(res.data);
        setSelectedItemIds([]);
      }
    } catch (err: any) {
      console.error('Failed to load import details:', err);
    } finally {
      setLoadingJob(false);
    }
  };

  useEffect(() => {
    fetchImportList();
  }, []);

  useEffect(() => {
    if (selectedJobId) {
      fetchJobDetails(selectedJobId);
    }
  }, [selectedJobId]);

  // Filtered items
  const displayedItems = (currentJob?.items || []).filter((item) => {
    if (filterDuplicate === 'all') return true;
    return item.duplicateStatus === filterDuplicate;
  });

  const pendingItems = (currentJob?.items || []).filter(i => i.status === 'pending');
  const duplicateItemsCount = (currentJob?.items || []).filter(i => i.duplicateStatus === 'POSSIBLE DUPLICATE').length;
  const newItemsCount = (currentJob?.items || []).filter(i => i.duplicateStatus === 'NEW').length;

  const toggleSelectItem = (id: string) => {
    if (selectedItemIds.includes(id)) {
      setSelectedItemIds(selectedItemIds.filter(i => i !== id));
    } else {
      setSelectedItemIds([...selectedItemIds, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedItemIds.length === displayedItems.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(displayedItems.map(i => i._id));
    }
  };

  // Open inline edit
  const openEditModal = (item: StagedItem) => {
    setEditingItem(item);
    setEditFormData({
      word: item.word || '',
      kanji: item.kanji || '',
      hiragana: item.hiragana || '',
      romaji: item.romaji || '',
      meaning: item.meaning || '',
      partOfSpeech: item.partOfSpeech || 'Noun',
      chapter: item.chapter || 1
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentJob || !editingItem) return;

    setActionLoading(true);
    try {
      const res = await api.admin.updateImportItem(currentJob.id, editingItem._id, editFormData);
      if (res.success) {
        setEditingItem(null);
        showToast(`Corrected "${editFormData.word}".`);
        fetchJobDetails(currentJob.id);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update item.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete item from staging
  const handleDeleteItem = async (itemId: string) => {
    if (!currentJob) return;
    setActionLoading(true);
    try {
      const res = await api.admin.deleteImportItem(currentJob.id, itemId);
      if (res.success) {
        showToast('Removed item from staging review.');
        fetchJobDetails(currentJob.id);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete item.');
    } finally {
      setActionLoading(false);
    }
  };

  // Approve selected or all valid
  const handleApprove = async (approveAll: boolean) => {
    if (!currentJob) return;

    setActionLoading(true);
    try {
      const options = {
        itemIds: approveAll ? undefined : selectedItemIds,
        replaceDuplicates
      };

      const res = await api.admin.approveImport(currentJob.id, options);
      if (res.success) {
        showToast(res.message);
        fetchJobDetails(currentJob.id);
        fetchImportList();
      }
    } catch (err: any) {
      alert(err.message || 'Approval failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Reject selected or all
  const handleReject = async (rejectAll: boolean) => {
    if (!currentJob) return;

    setActionLoading(true);
    try {
      const res = await api.admin.rejectImport(
        currentJob.id,
        rejectAll ? undefined : selectedItemIds
      );
      if (res.success) {
        showToast('Marked as rejected.');
        fetchJobDetails(currentJob.id);
        fetchImportList();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to reject.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-[#1a1918] text-white text-xs font-bold shadow-2xl flex items-center gap-2.5 animate-pop-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Job Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
              Staging Review Table
            </span>
            <span className="text-xs text-[#8c8880] font-serif-jp">承認確認キュー</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-japanese text-[#1a1918]">
            Staged Import Review
          </h2>
          <p className="text-xs text-[#8c8880] mt-0.5">
            Verify candidate words and review duplicate status before publishing to MongoDB master collections.
          </p>
        </div>

        {/* Job selector dropdown */}
        <div className="flex items-center gap-2">
          {importJobs.length > 0 && (
            <select
              value={selectedJobId || ''}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white border border-[#eeece6] text-xs font-bold text-[#1a1918] shadow-xs focus:outline-none"
            >
              {importJobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.fileName} ({job.level} • {job.extractedCount} words • {job.status})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => selectedJobId && fetchJobDetails(selectedJobId)}
            className="p-2 rounded-xl bg-white border border-[#eeece6] hover:bg-[#faf9f6] text-[#6e6b66] cursor-pointer"
            title="Refresh current job"
          >
            <RefreshCw className={`w-4 h-4 ${loadingJob ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {importJobs.length === 0 && !loadingList ? (
        <div className="bg-white rounded-3xl border border-[#eeece6] p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#1a1918]">
              No Staged Imports Found
            </h3>
            <p className="text-xs text-[#8c8880] max-w-sm mx-auto">
              You haven't uploaded any vocabulary PDFs yet. Upload a PDF to start extracting and reviewing vocabulary.
            </p>
          </div>
          <button
            onClick={onNavigateImporter}
            className="px-5 py-2.5 rounded-2xl bg-[#d93829] hover:bg-[#b92a1d] text-white text-xs font-bold transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer"
          >
            <span>Upload Vocabulary PDF</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : currentJob ? (
        <div className="space-y-4">
          
          {/* Batch Details & Duplicate Breakdown Bar */}
          <div className="p-5 rounded-2xl bg-white border border-[#eeece6] shadow-xs flex flex-wrap items-center justify-between gap-4">
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#1a1918]">
                  {currentJob.fileName}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 font-mono">
                  {currentJob.level}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                  currentJob.status === 'approved'
                    ? 'bg-emerald-100 text-emerald-800'
                    : currentJob.status === 'pending'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-neutral-100 text-neutral-800'
                }`}>
                  {currentJob.status}
                </span>
              </div>
              <div className="text-[11px] text-[#8c8880]">
                Chapters {currentJob.chapterRange?.start}–{currentJob.chapterRange?.end} • Created on {new Date(currentJob.createdAt).toLocaleDateString()}
              </div>
            </div>

            {/* Counts Badge breakdown */}
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                {newItemsCount} NEW
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                {duplicateItemsCount} POSSIBLE DUPLICATES
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-neutral-100 text-neutral-700 text-xs font-bold">
                {currentJob.approvedCount} / {currentJob.extractedCount} Approved
              </div>
            </div>

          </div>

          {/* Action Toolbar */}
          <div className="p-4 rounded-2xl bg-[#faf9f6] border border-[#eeece6] flex flex-wrap items-center justify-between gap-4">
            
            {/* Left Filter & Select */}
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 text-xs font-bold text-[#1a1918] cursor-pointer hover:opacity-80"
              >
                {selectedItemIds.length > 0 && selectedItemIds.length === displayedItems.length ? (
                  <CheckSquare className="w-4 h-4 text-[#d93829]" />
                ) : (
                  <Square className="w-4 h-4 text-[#8c8880]" />
                )}
                <span>Select All ({selectedItemIds.length}/{displayedItems.length})</span>
              </button>

              <div className="h-4 w-px bg-[#d4d0c8]" />

              {/* Filter */}
              <div className="flex items-center gap-1">
                {(['all', 'NEW', 'POSSIBLE DUPLICATE'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setFilterDuplicate(filter)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filterDuplicate === filter
                        ? 'bg-[#1a1918] text-white'
                        : 'text-[#6e6b66] hover:bg-white'
                    }`}
                  >
                    {filter === 'all' ? 'All Items' : filter === 'NEW' ? 'New Only' : 'Duplicates Only'}
                  </button>
                ))}
              </div>
            </div>

            {/* Right Bulk Actions */}
            <div className="flex flex-wrap items-center gap-3">
              
              {/* Toggle replace duplicates */}
              <label className="flex items-center gap-2 text-xs font-semibold text-[#6e6b66] cursor-pointer">
                <input
                  type="checkbox"
                  checked={replaceDuplicates}
                  onChange={(e) => setReplaceDuplicates(e.target.checked)}
                  className="rounded border-[#eeece6] text-[#d93829] focus:ring-0"
                />
                <span>Replace Existing Duplicates in Master</span>
              </label>

              {/* Approve Selected */}
              <button
                onClick={() => handleApprove(false)}
                disabled={selectedItemIds.length === 0 || actionLoading}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-40"
              >
                Approve Selected ({selectedItemIds.length})
              </button>

              {/* Approve All Valid */}
              <button
                onClick={() => handleApprove(true)}
                disabled={pendingItems.length === 0 || actionLoading}
                className="px-4 py-2 rounded-xl bg-[#d93829] hover:bg-[#b92a1d] text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-40"
              >
                Approve All Pending ({pendingItems.length})
              </button>

              {/* Reject */}
              <button
                onClick={() => handleReject(false)}
                disabled={selectedItemIds.length === 0 || actionLoading}
                className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold cursor-pointer disabled:opacity-40"
                title="Reject selected"
              >
                <X className="w-4 h-4" />
              </button>

            </div>

          </div>

          {/* Staging Review Table */}
          <div className="bg-white rounded-2xl border border-[#eeece6] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#faf9f6] border-b border-[#eeece6] text-[#6e6b66] font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-3.5 pl-4 w-10"></th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Ch</th>
                    <th className="p-3.5">Japanese Word</th>
                    <th className="p-3.5">Reading (Kana / Romaji)</th>
                    <th className="p-3.5">English Meaning</th>
                    <th className="p-3.5">Part of Speech</th>
                    <th className="p-3.5 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eeece6]">
                  {loadingJob ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-[#8c8880]">
                        Loading staged vocabulary...
                      </td>
                    </tr>
                  ) : displayedItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-[#8c8880]">
                        No items match the current filter.
                      </td>
                    </tr>
                  ) : (
                    displayedItems.map((item) => {
                      const isSelected = selectedItemIds.includes(item._id);
                      return (
                        <tr 
                          key={item._id} 
                          className={`hover:bg-[#faf9f6]/70 transition-colors ${
                            item.status === 'approved' ? 'bg-emerald-50/30' : ''
                          }`}
                        >
                          <td className="p-3.5 pl-4">
                            <button
                              onClick={() => toggleSelectItem(item._id)}
                              className="text-[#8c8880] hover:text-[#1a1918] cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-[#d93829]" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>

                          {/* Duplicate / Approval Badge */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5">
                              {item.status === 'approved' ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  ✓ Approved
                                </span>
                              ) : item.status === 'rejected' ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800">
                                  ✕ Rejected
                                </span>
                              ) : item.duplicateStatus === 'POSSIBLE DUPLICATE' ? (
                                <span 
                                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 cursor-help"
                                  title="Word already exists in master MongoDB collection"
                                >
                                  DUPLICATE
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  NEW
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="p-3.5 font-mono text-[#8c8880]">
                            Ch.{item.chapter || 1}
                          </td>

                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-japanese font-bold text-[#1a1918]">
                                {item.word}
                              </span>
                              {item.kanji && item.kanji !== item.word && (
                                <span className="text-[11px] text-[#8c8880] font-japanese">
                                  ({item.kanji})
                                </span>
                              )}
                              <button
                                onClick={() => soundEffects.speak(item.hiragana || item.word)}
                                className="p-1 text-[#8c8880] hover:text-[#1a1918] cursor-pointer"
                                title="Pronounce"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                          <td className="p-3.5">
                            <div className="text-xs text-[#1a1918] font-japanese">
                              {item.hiragana || item.katakana || '—'}
                            </div>
                            {item.romaji && (
                              <div className="text-[10px] text-[#8c8880] font-mono">
                                {item.romaji}
                              </div>
                            )}
                          </td>

                          <td className="p-3.5 font-medium text-[#1a1918]">
                            {item.meaning}
                          </td>

                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#faf9f6] border border-[#eeece6] text-[#6e6b66]">
                              {item.partOfSpeech || 'Noun'}
                            </span>
                          </td>

                          <td className="p-3.5 pr-4 text-right space-x-1">
                            <button
                              onClick={() => openEditModal(item)}
                              className="p-1.5 rounded-lg text-[#6e6b66] hover:text-[#1a1918] hover:bg-neutral-100 transition-colors cursor-pointer"
                              title="Edit extracted entry"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item._id)}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Remove from staging"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      ) : null}

      {/* INLINE EDIT MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => setEditingItem(null)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />

          <div className="relative bg-white rounded-3xl border border-[#eeece6] shadow-2xl max-w-lg w-full p-6 sm:p-7 z-10 animate-pop-in space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#eeece6]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  修
                </div>
                <h3 className="text-base font-bold text-[#1a1918]">
                  Edit Staged Entry
                </h3>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1.5 rounded-xl text-[#8c8880] hover:text-[#1a1918] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1a1918] mb-1">
                    Japanese Word *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.word}
                    onChange={(e) => setEditFormData({ ...editFormData, word: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#faf9f6] border border-[#eeece6] font-japanese font-bold text-sm focus:outline-none focus:border-[#1a1918]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1a1918] mb-1">
                    Kanji
                  </label>
                  <input
                    type="text"
                    value={editFormData.kanji}
                    onChange={(e) => setEditFormData({ ...editFormData, kanji: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#faf9f6] border border-[#eeece6] font-japanese font-bold text-sm focus:outline-none focus:border-[#1a1918]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1a1918] mb-1">
                    Reading (Hiragana)
                  </label>
                  <input
                    type="text"
                    value={editFormData.hiragana}
                    onChange={(e) => setEditFormData({ ...editFormData, hiragana: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#faf9f6] border border-[#eeece6] font-japanese focus:outline-none focus:border-[#1a1918]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1a1918] mb-1">
                    Romaji
                  </label>
                  <input
                    type="text"
                    value={editFormData.romaji}
                    onChange={(e) => setEditFormData({ ...editFormData, romaji: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#faf9f6] border border-[#eeece6] font-mono focus:outline-none focus:border-[#1a1918]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#1a1918] mb-1">
                  English Meaning *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.meaning}
                  onChange={(e) => setEditFormData({ ...editFormData, meaning: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#faf9f6] border border-[#eeece6] font-medium focus:outline-none focus:border-[#1a1918]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1a1918] mb-1">
                    Part of Speech
                  </label>
                  <select
                    value={editFormData.partOfSpeech}
                    onChange={(e) => setEditFormData({ ...editFormData, partOfSpeech: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl bg-[#faf9f6] border border-[#eeece6] font-medium focus:outline-none"
                  >
                    <option value="Noun">Noun</option>
                    <option value="Verb">Verb</option>
                    <option value="Adjective">Adjective</option>
                    <option value="Adverb">Adverb</option>
                    <option value="Particle">Particle</option>
                    <option value="Expression">Expression</option>
                    <option value="Counter">Counter</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#1a1918] mb-1">
                    Chapter
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={editFormData.chapter}
                    onChange={(e) => setEditFormData({ ...editFormData, chapter: parseInt(e.target.value || '1', 10) })}
                    className="w-full px-3 py-2 rounded-xl bg-[#faf9f6] border border-[#eeece6] font-bold text-center focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#eeece6]">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6e6b66] hover:bg-[#faf9f6] cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-[#1a1918] hover:bg-neutral-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Update Staged Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
