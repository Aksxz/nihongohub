import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  AlertTriangle, 
  BookOpen, 
  Volume2, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  Layers,
  FolderPlus,
  FolderCog
} from 'lucide-react';
import { soundEffects } from '../../utils/audio';

interface MasterVocabItem {
  id?: string;
  _id?: string;
  word: string;
  kanji?: string;
  hiragana?: string;
  katakana?: string;
  romaji?: string;
  meaning: string;
  partOfSpeech: string;
  jlptLevel: string;
  chapter: number | null;
  source: string;
  destinationType?: 'chapter' | 'custom' | 'extra';
  customChapterId?: string;
  wordType?: 'textbook' | 'custom' | 'extra';
}

interface CustomChapterItem {
  _id?: string;
  id?: string;
  name: string;
  displayName: string;
  japaneseName?: string;
  description?: string;
  jlptLevel: string;
  order: number;
  wordCount?: number;
}

export const AdminVocabManager: React.FC = () => {
  const [items, setItems] = useState<MasterVocabItem[]>([]);
  const [customChapters, setCustomChapters] = useState<CustomChapterItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedJlpt, setSelectedJlpt] = useState<string>('N5');
  const [destinationFilter, setDestinationFilter] = useState<string>('all'); // 'all' | 'chapter' | 'custom' | 'extra'
  const [selectedChapter, setSelectedChapter] = useState<string>('all');
  const [selectedCustomChapterId, setSelectedCustomChapterId] = useState<string>('all');
  
  // Selection & Modal states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<MasterVocabItem | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Custom Chapter Modal states
  const [isChapterModalOpen, setIsChapterModalOpen] = useState<boolean>(false);
  const [editingChapter, setEditingChapter] = useState<CustomChapterItem | null>(null);
  const [deletingChapter, setDeletingChapter] = useState<CustomChapterItem | null>(null);
  const [chapterFormData, setChapterFormData] = useState<{
    name: string;
    displayName: string;
    japaneseName: string;
    description: string;
    jlptLevel: string;
    order: number;
  }>({
    name: '',
    displayName: '',
    japaneseName: '',
    description: '',
    jlptLevel: 'N5',
    order: 1
  });

  // Word Form inputs
  const [formData, setFormData] = useState<{
    word: string;
    kanji: string;
    hiragana: string;
    katakana: string;
    romaji: string;
    meaning: string;
    partOfSpeech: string;
    jlptLevel: string;
    destinationType: 'chapter' | 'custom' | 'extra';
    chapter: number;
    customChapterId: string;
  }>({
    word: '',
    kanji: '',
    hiragana: '',
    katakana: '',
    romaji: '',
    meaning: '',
    partOfSpeech: 'Noun',
    jlptLevel: 'N5',
    destinationType: 'chapter',
    chapter: 1,
    customChapterId: ''
  });

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const loadCustomChapters = async () => {
    try {
      const res = await api.customChapters.getAll();
      if (res.success && res.data) {
        setCustomChapters(res.data);
      }
    } catch (err) {
      console.error('Error fetching custom chapters:', err);
    }
  };

  const fetchVocab = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 1000 };
      if (selectedJlpt && selectedJlpt !== 'all') params.jlpt = selectedJlpt;
      
      if (destinationFilter === 'chapter') {
        if (selectedChapter && selectedChapter !== 'all') {
          params.chapter = parseInt(selectedChapter, 10);
        } else {
          params.destinationType = 'chapter';
        }
      } else if (destinationFilter === 'custom') {
        if (selectedCustomChapterId && selectedCustomChapterId !== 'all') {
          params.customChapterId = selectedCustomChapterId;
        } else {
          params.destinationType = 'custom';
        }
      } else if (destinationFilter === 'extra') {
        params.chapter = 'extra';
      } else {
        if (selectedChapter && selectedChapter !== 'all') {
          params.chapter = parseInt(selectedChapter, 10);
        }
      }

      if (search.trim()) params.search = search.trim();

      const res = await api.vocabulary.getAll(params);
      if (res.success) {
        setItems(res.data);
      }
    } catch (err: any) {
      console.error('Error fetching vocabulary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomChapters();
  }, []);

  useEffect(() => {
    fetchVocab();
  }, [selectedJlpt, destinationFilter, selectedChapter, selectedCustomChapterId]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVocab();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const openAddModal = () => {
    setFormData({
      word: '',
      kanji: '',
      hiragana: '',
      katakana: '',
      romaji: '',
      meaning: '',
      partOfSpeech: 'Noun',
      jlptLevel: selectedJlpt !== 'all' ? selectedJlpt : 'N5',
      destinationType: destinationFilter === 'custom' ? 'custom' : destinationFilter === 'extra' ? 'extra' : 'chapter',
      chapter: selectedChapter !== 'all' ? parseInt(selectedChapter, 10) : 1,
      customChapterId: customChapters.length > 0 ? (customChapters[0]._id || customChapters[0].id || '') : ''
    });
    setModalError(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (item: MasterVocabItem) => {
    setEditingItem(item);
    
    let destType: 'chapter' | 'custom' | 'extra' = 'chapter';
    if (item.destinationType) {
      destType = item.destinationType;
    } else if (item.customChapterId) {
      destType = 'custom';
    } else if (item.source === 'Extra' || !item.chapter || item.chapter <= 0) {
      destType = 'extra';
    }

    setFormData({
      word: item.word || '',
      kanji: item.kanji || '',
      hiragana: item.hiragana || '',
      katakana: item.katakana || '',
      romaji: item.romaji || '',
      meaning: item.meaning || '',
      partOfSpeech: item.partOfSpeech || 'Noun',
      jlptLevel: item.jlptLevel || 'N5',
      destinationType: destType,
      chapter: item.chapter || 1,
      customChapterId: item.customChapterId || (customChapters.length > 0 ? (customChapters[0]._id || customChapters[0].id || '') : '')
    });
    setModalError(null);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.word.trim() || !formData.meaning.trim()) {
      setModalError('Japanese word and English meaning are required.');
      return;
    }
    if (formData.destinationType === 'custom' && !formData.customChapterId) {
      setModalError('Please select a custom chapter destination.');
      return;
    }

    setActionLoading(true);
    setModalError(null);
    try {
      const payload: any = {
        word: formData.word.trim(),
        kanji: formData.kanji.trim() || undefined,
        hiragana: formData.hiragana.trim() || undefined,
        katakana: formData.katakana.trim() || undefined,
        romaji: formData.romaji.trim() || undefined,
        meaning: formData.meaning.trim(),
        partOfSpeech: formData.partOfSpeech,
        jlptLevel: formData.jlptLevel,
        destinationType: formData.destinationType
      };

      if (formData.destinationType === 'chapter') {
        payload.chapter = formData.chapter;
        payload.customChapterId = null;
        payload.source = 'Textbook';
      } else if (formData.destinationType === 'custom') {
        payload.customChapterId = formData.customChapterId;
        payload.chapter = null;
        payload.source = 'Custom';
      } else {
        payload.destinationType = 'extra';
        payload.chapter = null;
        payload.customChapterId = null;
        payload.source = 'Extra';
      }

      const res = await api.admin.createVocabulary(payload);
      if (res.success) {
        setIsAddModalOpen(false);
        showToast(`Added "${formData.word}" to Master Vocabulary!`);
        fetchVocab();
        loadCustomChapters();
      }
    } catch (err: any) {
      setModalError(err.message || 'Failed to save vocabulary.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const itemId = editingItem.id || editingItem._id;
    if (!itemId) return;

    setActionLoading(true);
    setModalError(null);
    try {
      const payload: any = {
        word: formData.word.trim(),
        kanji: formData.kanji.trim() || undefined,
        hiragana: formData.hiragana.trim() || undefined,
        katakana: formData.katakana.trim() || undefined,
        romaji: formData.romaji.trim() || undefined,
        meaning: formData.meaning.trim(),
        partOfSpeech: formData.partOfSpeech,
        jlptLevel: formData.jlptLevel,
        destinationType: formData.destinationType
      };

      if (formData.destinationType === 'chapter') {
        payload.chapter = formData.chapter;
        payload.customChapterId = null;
        payload.source = 'Textbook';
      } else if (formData.destinationType === 'custom') {
        payload.customChapterId = formData.customChapterId;
        payload.chapter = null;
        payload.source = 'Custom';
      } else {
        payload.destinationType = 'extra';
        payload.chapter = null;
        payload.customChapterId = null;
        payload.source = 'Extra';
      }

      const res = await api.admin.updateVocabulary(itemId, payload);
      if (res.success) {
        setEditingItem(null);
        showToast(`Updated "${formData.word}".`);
        fetchVocab();
        loadCustomChapters();
      }
    } catch (err: any) {
      setModalError(err.message || 'Failed to update vocabulary.');
    } finally {
      setActionLoading(false);
    }
  };

  // Single-word deletion: deletes immediately without second confirmation modal
  const handleDeleteSingle = async (item: MasterVocabItem) => {
    const itemId = item.id || item._id;
    if (!itemId) return;

    setActionLoading(true);
    try {
      const res = await api.admin.deleteVocabulary(itemId);
      if (res.success) {
        showToast(res.message || `Deleted "${item.word}" from master database.`);
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });
        fetchVocab();
        loadCustomChapters();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete vocabulary item.');
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk deletion: deletes all selected items in one batch operation without individual confirmations
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const idsToDelete = Array.from(selectedIds);

    setActionLoading(true);
    try {
      const res = await api.admin.bulkDeleteVocabulary(idsToDelete);
      if (res.success) {
        showToast(res.message || `Successfully deleted ${res.count} vocabulary items.`);
        setSelectedIds(new Set());
        fetchVocab();
        loadCustomChapters();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to bulk delete vocabulary items.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleSelectAll = () => {
    if (items.length === 0) return;
    const allVisibleSelected = items.every(item => {
      const id = item.id || item._id;
      return id && selectedIds.has(id);
    });

    if (allVisibleSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        items.forEach(item => {
          const id = item.id || item._id;
          if (id) next.delete(id);
        });
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        items.forEach(item => {
          const id = item.id || item._id;
          if (id) next.add(id);
        });
        return next;
      });
    }
  };

  const handleToggleSelectItem = (itemId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  // Custom Chapter CRUD Handlers
  const openNewChapterModal = () => {
    setEditingChapter(null);
    setChapterFormData({
      name: '',
      displayName: '',
      japaneseName: '',
      description: '',
      jlptLevel: selectedJlpt !== 'all' ? selectedJlpt : 'N5',
      order: customChapters.length + 1
    });
    setModalError(null);
    setIsChapterModalOpen(true);
  };

  const openEditChapterModal = (ch: CustomChapterItem) => {
    setEditingChapter(ch);
    setChapterFormData({
      name: ch.name || '',
      displayName: ch.displayName || ch.name,
      japaneseName: ch.japaneseName || '',
      description: ch.description || '',
      jlptLevel: ch.jlptLevel || 'N5',
      order: ch.order || 1
    });
    setModalError(null);
    setIsChapterModalOpen(true);
  };

  const handleSaveChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapterFormData.displayName.trim()) {
      setModalError('Chapter title is required.');
      return;
    }

    setActionLoading(true);
    setModalError(null);
    try {
      const slugName = chapterFormData.name.trim() || 
        chapterFormData.displayName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

      const payload = {
        name: slugName,
        displayName: chapterFormData.displayName.trim(),
        japaneseName: chapterFormData.japaneseName.trim() || undefined,
        description: chapterFormData.description.trim() || undefined,
        jlptLevel: chapterFormData.jlptLevel,
        order: Number(chapterFormData.order) || 1
      };

      if (editingChapter) {
        const chId = editingChapter._id || editingChapter.id;
        const res = await api.admin.customChapters.update(chId!, payload);
        if (res.success) {
          setIsChapterModalOpen(false);
          showToast(`Updated custom chapter "${payload.displayName}".`);
          loadCustomChapters();
          fetchVocab();
        }
      } else {
        const res = await api.admin.customChapters.create(payload);
        if (res.success) {
          setIsChapterModalOpen(false);
          showToast(`Created custom chapter "${payload.displayName}".`);
          loadCustomChapters();
          fetchVocab();
        }
      }
    } catch (err: any) {
      setModalError(err.message || 'Failed to save custom chapter.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteChapterConfirm = async () => {
    if (!deletingChapter) return;
    const chId = deletingChapter._id || deletingChapter.id;
    if (!chId) return;

    setActionLoading(true);
    try {
      const res = await api.admin.customChapters.delete(chId);
      if (res.success) {
        setDeletingChapter(null);
        showToast(`Deleted chapter "${deletingChapter.displayName}". ${res.reassignedCount} words safely reassigned to Extra Vocabulary.`);
        loadCustomChapters();
        fetchVocab();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete custom chapter.');
    } finally {
      setActionLoading(false);
    }
  };

  const getDestinationLabel = (item: MasterVocabItem) => {
    if (item.destinationType === 'custom' || item.customChapterId) {
      const matched = customChapters.find(c => (c._id || c.id) === item.customChapterId);
      return (
        <span className="font-bold px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 text-[10px] border border-sky-200">
          Deck: {matched ? matched.displayName : 'Custom'}
        </span>
      );
    }
    if (item.destinationType === 'extra' || item.source === 'Extra' || !item.chapter || item.chapter <= 0) {
      return (
        <span className="font-bold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700 text-[10px] border border-neutral-200">
          Extra Vocab
        </span>
      );
    }
    return (
      <span className="font-bold px-1.5 py-0.5 rounded bg-red-50 text-[#d93829] text-[10px] border border-red-100">
        Ch. {item.chapter}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-japanese text-[#1a1918]">
            Master Vocabulary Manager
          </h2>
          <p className="text-xs text-[#8c8880] mt-0.5">
            Manage canonical vocabulary decks (Chapters 1–24), custom chapter decks, and extra vocabulary.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Add Custom Chapter Button */}
          <button
            onClick={openNewChapterModal}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white border border-[#eeece6] hover:bg-neutral-50 text-[#1a1918] text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-98"
          >
            <FolderPlus className="w-4 h-4 text-sky-600" />
            <span>+ Add Chapter</span>
          </button>

          {/* Add New Word Button */}
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#d93829] hover:bg-[#b92a1d] text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Word</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-[#eeece6] shadow-xs flex flex-wrap items-center justify-between gap-3">
        
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-[#8c8880] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search word, kana, romaji, or meaning..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#faf9f6] border border-[#eeece6] text-xs focus:outline-none focus:border-[#1a1918]"
          />
        </div>

        {/* JLPT Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#8c8880]">JLPT:</span>
          <div className="flex rounded-xl bg-[#faf9f6] p-1 border border-[#eeece6]">
            {['all', 'N5', 'N4', 'N3'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSelectedJlpt(lvl)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedJlpt === lvl
                    ? 'bg-[#1a1918] text-white'
                    : 'text-[#6e6b66] hover:text-[#1a1918]'
                }`}
              >
                {lvl === 'all' ? 'All' : lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Destination Type Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#8c8880]">Destination:</span>
          <select
            value={destinationFilter}
            onChange={(e) => setDestinationFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#faf9f6] border border-[#eeece6] text-xs font-bold text-[#1a1918] focus:outline-none"
          >
            <option value="all">All Destinations</option>
            <option value="chapter">Standard Chapters (1–24)</option>
            <option value="custom">Custom Chapter Decks</option>
            <option value="extra">Extra Vocabulary</option>
          </select>
        </div>

        {/* Specific Chapter Filter if destination === 'chapter' or 'all' */}
        {destinationFilter !== 'custom' && destinationFilter !== 'extra' && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#8c8880]">Ch:</span>
            <select
              value={selectedChapter}
              onChange={(e) => setSelectedChapter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[#faf9f6] border border-[#eeece6] text-xs font-bold text-[#1a1918] focus:outline-none"
            >
              <option value="all">All Chapters</option>
              {Array.from({ length: 24 }, (_, i) => i + 1).map((ch) => (
                <option key={ch} value={ch}>
                  Chapter {ch}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Custom Chapter dropdown if destination === 'custom' */}
        {destinationFilter === 'custom' && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#8c8880]">Deck:</span>
            <select
              value={selectedCustomChapterId}
              onChange={(e) => setSelectedCustomChapterId(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[#faf9f6] border border-[#eeece6] text-xs font-bold text-[#1a1918] focus:outline-none"
            >
              <option value="all">All Custom Decks</option>
              {customChapters.map((cc) => (
                <option key={cc._id || cc.id} value={cc._id || cc.id}>
                  {cc.displayName || cc.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="text-xs font-mono font-bold text-[#8c8880]">
          Total: {items.length} words
        </div>
      </div>

      {/* Bulk Actions Banner */}
      {selectedIds.size > 0 && (
        <div className="p-3.5 px-4 rounded-2xl bg-rose-50 border border-rose-200 flex flex-wrap items-center justify-between gap-3 shadow-xs animate-pop-in">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-xs">
              {selectedIds.size} Selected
            </span>
            <span className="text-xs font-semibold text-rose-950">
              {selectedIds.size === 1 ? '1 vocabulary word selected' : `${selectedIds.size} vocabulary words selected for batch deletion`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#6e6b66] hover:bg-rose-100/60 transition-colors cursor-pointer"
            >
              Clear Selection
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 active:scale-98"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{actionLoading ? 'Deleting...' : 'Delete Selected'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-[#1a1918] text-white text-xs font-bold shadow-2xl flex items-center gap-2.5 animate-pop-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Vocabulary Table */}
      <div className="bg-white rounded-2xl border border-[#eeece6] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#faf9f6] border-b border-[#eeece6] text-[#6e6b66] font-bold uppercase tracking-wider text-[10px]">
                <th className="p-3.5 pl-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={items.length > 0 && items.every(item => selectedIds.has(item.id || item._id || ''))}
                    ref={el => {
                      if (el) {
                        const count = items.filter(item => selectedIds.has(item.id || item._id || '')).length;
                        el.indeterminate = count > 0 && count < items.length;
                      }
                    }}
                    onChange={handleToggleSelectAll}
                    className="rounded border-[#d1cec7] text-rose-600 focus:ring-rose-500 cursor-pointer w-4 h-4"
                    title="Select all visible vocabulary"
                    aria-label="Select all visible vocabulary"
                  />
                </th>
                <th className="p-3.5 pl-2">Level & Destination</th>
                <th className="p-3.5">Japanese Word</th>
                <th className="p-3.5">Reading (Kana / Romaji)</th>
                <th className="p-3.5">English Meaning</th>
                <th className="p-3.5">Part of Speech</th>
                <th className="p-3.5">Origin</th>
                <th className="p-3.5 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eeece6]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[#8c8880]">
                    Loading vocabulary items...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[#8c8880]">
                    No vocabulary found matching your filters.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const itemId = item.id || item._id || '';
                  return (
                    <tr key={itemId} className={`hover:bg-[#faf9f6]/70 transition-colors ${selectedIds.has(itemId) ? 'bg-rose-50/30' : ''}`}>
                      
                      <td className="p-3.5 pl-4 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(itemId)}
                          onChange={() => handleToggleSelectItem(itemId)}
                          className="rounded border-[#d1cec7] text-rose-600 focus:ring-rose-500 cursor-pointer w-4 h-4"
                          aria-label={`Select ${item.word}`}
                        />
                      </td>

                      <td className="p-3.5 pl-2 font-mono">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700 text-[10px]">
                            {item.jlptLevel || 'N5'}
                          </span>
                          {getDestinationLabel(item)}
                        </div>
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

                      <td className="p-3.5 text-[#8c8880] text-[11px]">
                        {(() => {
                          const val = (item.wordType || item.source || 'standard').toLowerCase();
                          return val === 'textbook' ? 'standard' : val;
                        })()}
                      </td>

                      <td className="p-3.5 pr-5 text-right space-x-1">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 rounded-lg text-[#6e6b66] hover:text-[#1a1918] hover:bg-neutral-100 transition-colors cursor-pointer"
                          title="Edit & Move Destination"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSingle(item)}
                          disabled={actionLoading}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                          title="Delete word immediately"
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

      {/* CUSTOM CHAPTERS MANAGEMENT SECTION */}
      <div className="p-6 rounded-3xl bg-white border border-[#eeece6] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderCog className="w-5 h-5 text-sky-600" />
            <h3 className="text-sm font-bold text-[#1a1918]">
              Custom Chapter Decks ({customChapters.length})
            </h3>
          </div>
          <button
            onClick={openNewChapterModal}
            className="flex items-center gap-1 text-xs font-bold text-sky-700 hover:text-sky-900 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Custom Chapter</span>
          </button>
        </div>

        {customChapters.length === 0 ? (
          <div className="text-xs text-[#8c8880] py-3 text-center bg-[#faf9f6] rounded-2xl border border-dashed border-[#eeece6]">
            No custom chapters created yet. Click "+ Add Chapter" above to create decks like "Days of the Week", "Months", or "Food".
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {customChapters.map((cc) => (
              <div 
                key={cc._id || cc.id}
                className="p-4 rounded-2xl bg-[#faf9f6] border border-[#eeece6] flex items-center justify-between hover:border-sky-300 transition-all"
              >
                <div>
                  <div className="font-bold text-xs text-[#1a1918] flex items-center gap-1.5">
                    <span>{cc.displayName || cc.name}</span>
                    {cc.japaneseName && (
                      <span className="text-[11px] font-japanese text-[#8c8880]">
                        ({cc.japaneseName})
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#8c8880] mt-0.5">
                    {cc.jlptLevel || 'N5'} • {cc.wordCount || 0} words
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditChapterModal(cc)}
                    className="p-1 rounded-lg text-[#6e6b66] hover:text-[#1a1918] hover:bg-white cursor-pointer"
                    title="Edit Chapter"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingChapter(cc)}
                    className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                    title="Delete Chapter"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ADD / EDIT WORD MODAL */}
      {(isAddModalOpen || editingItem) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => { setIsAddModalOpen(false); setEditingItem(null); }}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />

          <div className="relative bg-white rounded-3xl border border-[#eeece6] shadow-2xl max-w-lg w-full p-6 sm:p-7 z-10 animate-pop-in space-y-5">
            
            <div className="flex items-center justify-between pb-3 border-b border-[#eeece6]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-[#d93829] flex items-center justify-center font-bold">
                  日
                </div>
                <h3 className="text-base font-bold text-[#1a1918]">
                  {editingItem ? 'Edit Word & Move Destination' : 'Add New Word'}
                </h3>
              </div>
              <button
                onClick={() => { setIsAddModalOpen(false); setEditingItem(null); }}
                className="p-1.5 rounded-xl text-[#8c8880] hover:text-[#1a1918] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={editingItem ? handleSaveEdit : handleSaveAdd} className="space-y-4 text-xs">
              
              {/* Destination Selector */}
              <div className="p-3 rounded-2xl bg-[#faf9f6] border border-[#eeece6] space-y-2">
                <label className="block font-bold text-[#1a1918]">
                  Word Destination *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, destinationType: 'chapter' })}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                      formData.destinationType === 'chapter'
                        ? 'bg-[#1a1918] text-white border-[#1a1918]'
                        : 'bg-white text-[#6e6b66] border-[#eeece6] hover:bg-neutral-50'
                    }`}
                  >
                    Standard Ch (1–24)
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, destinationType: 'custom' })}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                      formData.destinationType === 'custom'
                        ? 'bg-[#1a1918] text-white border-[#1a1918]'
                        : 'bg-white text-[#6e6b66] border-[#eeece6] hover:bg-neutral-50'
                    }`}
                  >
                    Custom Chapter
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, destinationType: 'extra' })}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                      formData.destinationType === 'extra'
                        ? 'bg-[#1a1918] text-white border-[#1a1918]'
                        : 'bg-white text-[#6e6b66] border-[#eeece6] hover:bg-neutral-50'
                    }`}
                  >
                    Extra Vocab
                  </button>
                </div>

                {formData.destinationType === 'chapter' && (
                  <div className="pt-1 flex items-center gap-2">
                    <span className="text-[#6e6b66] font-bold">Assign to Chapter:</span>
                    <select
                      value={formData.chapter}
                      onChange={(e) => setFormData({ ...formData, chapter: parseInt(e.target.value, 10) })}
                      className="px-2 py-1 rounded-lg bg-white border border-[#eeece6] font-bold focus:outline-none"
                    >
                      {Array.from({ length: 24 }, (_, i) => i + 1).map((ch) => (
                        <option key={ch} value={ch}>
                          Chapter {ch} (第{ch}課)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.destinationType === 'custom' && (
                  <div className="pt-1 flex items-center gap-2">
                    <span className="text-[#6e6b66] font-bold">Select Custom Deck:</span>
                    {customChapters.length > 0 ? (
                      <select
                        value={formData.customChapterId}
                        onChange={(e) => setFormData({ ...formData, customChapterId: e.target.value })}
                        className="px-2 py-1 rounded-lg bg-white border border-[#eeece6] font-bold focus:outline-none"
                      >
                        {customChapters.map((cc) => (
                          <option key={cc._id || cc.id} value={cc._id || cc.id}>
                            {cc.displayName || cc.name} {cc.japaneseName ? `(${cc.japaneseName})` : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-amber-700 text-[11px]">
                        Please create a custom chapter first!
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1a1918] mb-1">
                    Japanese Word *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.word}
                    onChange={(e) => setFormData({ ...formData, word: e.target.value })}
                    placeholder="e.g. わたし"
                    className="w-full px-3 py-2 rounded-xl bg-[#faf9f6] border border-[#eeece6] font-japanese font-bold text-sm focus:outline-none focus:border-[#1a1918]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1a1918] mb-1">
                    Kanji (if applicable)
                  </label>
                  <input
                    type="text"
                    value={formData.kanji}
                    onChange={(e) => setFormData({ ...formData, kanji: e.target.value })}
                    placeholder="e.g. 私"
                    className="w-full px-3 py-2 rounded-xl bg-[#faf9f6] border border-[#eeece6] font-japanese font-bold text-sm focus:outline-none focus:border-[#1a1918]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1a1918] mb-1">
                    Hiragana Reading
                  </label>
                  <input
                    type="text"
                    value={formData.hiragana}
                    onChange={(e) => setFormData({ ...formData, hiragana: e.target.value })}
                    placeholder="e.g. わたし"
                    className="w-full px-3 py-2 rounded-xl bg-[#faf9f6] border border-[#eeece6] font-japanese focus:outline-none focus:border-[#1a1918]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1a1918] mb-1">
                    Romaji
                  </label>
                  <input
                    type="text"
                    value={formData.romaji}
                    onChange={(e) => setFormData({ ...formData, romaji: e.target.value })}
                    placeholder="e.g. watashi"
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
                  value={formData.meaning}
                  onChange={(e) => setFormData({ ...formData, meaning: e.target.value })}
                  placeholder="e.g. I, myself"
                  className="w-full px-3 py-2 rounded-xl bg-[#faf9f6] border border-[#eeece6] font-medium focus:outline-none focus:border-[#1a1918]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1a1918] mb-1">
                    Part of Speech
                  </label>
                  <select
                    value={formData.partOfSpeech}
                    onChange={(e) => setFormData({ ...formData, partOfSpeech: e.target.value })}
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
                    JLPT Level
                  </label>
                  <select
                    value={formData.jlptLevel}
                    onChange={(e) => setFormData({ ...formData, jlptLevel: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl bg-[#faf9f6] border border-[#eeece6] font-bold focus:outline-none"
                  >
                    <option value="N5">JLPT N5</option>
                    <option value="N4">JLPT N4</option>
                    <option value="N3">JLPT N3</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#eeece6]">
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setEditingItem(null); }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6e6b66] hover:bg-[#faf9f6] cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-[#d93829] hover:bg-[#b92a1d] text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : (editingItem ? 'Save & Update Destination' : 'Add New Word')}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* CREATE / EDIT CUSTOM CHAPTER MODAL */}
      {isChapterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => setIsChapterModalOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />

          <div className="relative bg-white rounded-3xl border border-[#eeece6] shadow-2xl max-w-md w-full p-6 z-10 animate-pop-in space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#eeece6]">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-sky-600" />
                <h3 className="text-base font-bold text-[#1a1918]">
                  {editingChapter ? 'Edit Custom Chapter' : 'Add Custom Chapter Deck'}
                </h3>
              </div>
              <button
                onClick={() => setIsChapterModalOpen(false)}
                className="p-1.5 rounded-xl text-[#8c8880] hover:text-[#1a1918] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveChapter} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#1a1918] mb-1">
                  Chapter Title (Display Name) *
                </label>
                <input
                  type="text"
                  required
                  value={chapterFormData.displayName}
                  onChange={(e) => setChapterFormData({ ...chapterFormData, displayName: e.target.value })}
                  placeholder="e.g. Days of the Week"
                  className="w-full px-3 py-2 rounded-xl bg-[#faf9f6] border border-[#eeece6] font-bold focus:outline-none focus:border-[#1a1918]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1a1918] mb-1">
                  Japanese Title (Optional)
                </label>
                <input
                  type="text"
                  value={chapterFormData.japaneseName}
                  onChange={(e) => setChapterFormData({ ...chapterFormData, japaneseName: e.target.value })}
                  placeholder="e.g. 曜日 (ようび)"
                  className="w-full px-3 py-2 rounded-xl bg-[#faf9f6] border border-[#eeece6] font-japanese focus:outline-none focus:border-[#1a1918]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1a1918] mb-1">
                    JLPT Level
                  </label>
                  <select
                    value={chapterFormData.jlptLevel}
                    onChange={(e) => setChapterFormData({ ...chapterFormData, jlptLevel: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl bg-[#faf9f6] border border-[#eeece6] font-bold focus:outline-none"
                  >
                    <option value="N5">JLPT N5</option>
                    <option value="N4">JLPT N4</option>
                    <option value="N3">JLPT N3</option>
                    <option value="All">All Levels</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#1a1918] mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={chapterFormData.order}
                    onChange={(e) => setChapterFormData({ ...chapterFormData, order: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 rounded-xl bg-[#faf9f6] border border-[#eeece6] font-bold text-center focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#1a1918] mb-1">
                  Description / Topic (Optional)
                </label>
                <textarea
                  rows={2}
                  value={chapterFormData.description}
                  onChange={(e) => setChapterFormData({ ...chapterFormData, description: e.target.value })}
                  placeholder="e.g. Monday through Sunday vocabulary and expressions"
                  className="w-full px-3 py-2 rounded-xl bg-[#faf9f6] border border-[#eeece6] focus:outline-none focus:border-[#1a1918]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#eeece6]">
                <button
                  type="button"
                  onClick={() => setIsChapterModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6e6b66] hover:bg-[#faf9f6] cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : (editingChapter ? 'Save Changes' : 'Create Custom Chapter')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CUSTOM CHAPTER MODAL (SAFE DELETION REASSIGNING TO EXTRA) */}
      {deletingChapter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => setDeletingChapter(null)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />

          <div className="relative bg-white rounded-3xl border border-[#eeece6] shadow-2xl max-w-sm w-full p-6 z-10 animate-pop-in space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div>
              <h3 className="text-base font-bold text-[#1a1918]">
                Delete Custom Chapter?
              </h3>
              <p className="text-xs text-[#6e6b66] mt-1.5 leading-relaxed">
                Are you sure you want to delete chapter <strong className="text-[#1a1918]">"{deletingChapter.displayName}"</strong>?
              </p>
              <div className="mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 font-medium">
                <strong>Zero Data Loss Guarantee:</strong> All words currently in this custom chapter will be safely reassigned to <strong>Extra Vocabulary</strong>. No words will be lost.
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#eeece6]">
              <button
                type="button"
                onClick={() => setDeletingChapter(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6e6b66] hover:bg-[#faf9f6] cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={handleDeleteChapterConfirm}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Migrating & Deleting...' : 'Delete & Move Words to Extra'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
