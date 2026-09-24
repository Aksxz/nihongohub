import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  AlertTriangle, 
  Layers, 
  Volume2, 
  Sparkles
} from 'lucide-react';
import { soundEffects } from '../../utils/audio';

interface MasterKanjiItem {
  id?: string;
  _id?: string;
  character: string;
  meaning: string;
  meanings?: string[];
  onyomi?: string;
  kunyomi?: string;
  strokeCount?: number;
  jlptLevel: string;
  chapter?: number;
  source?: string;
}

export const AdminKanjiManager: React.FC = () => {
  const [items, setItems] = useState<MasterKanjiItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedJlpt, setSelectedJlpt] = useState<string>('N5');
  
  // Modal & Selection states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<MasterKanjiItem | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form inputs
  const [formData, setFormData] = useState<{
    character: string;
    meaning: string;
    onyomi: string;
    kunyomi: string;
    strokeCount: number;
    jlptLevel: string;
    chapter: number;
  }>({
    character: '',
    meaning: '',
    onyomi: '',
    kunyomi: '',
    strokeCount: 4,
    jlptLevel: 'N5',
    chapter: 1
  });

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const fetchKanji = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 1000 };
      if (selectedJlpt && selectedJlpt !== 'all') params.jlpt = selectedJlpt;
      if (search.trim()) params.search = search.trim();

      const res = await api.kanji.getAll(params);
      if (res.success) {
        setItems(res.data);
      }
    } catch (err: any) {
      console.error('Error fetching Kanji:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKanji();
  }, [selectedJlpt]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchKanji();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const openAddModal = () => {
    setFormData({
      character: '',
      meaning: '',
      onyomi: '',
      kunyomi: '',
      strokeCount: 4,
      jlptLevel: selectedJlpt !== 'all' ? selectedJlpt : 'N5',
      chapter: 1
    });
    setModalError(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (item: MasterKanjiItem) => {
    setEditingItem(item);
    setFormData({
      character: item.character || '',
      meaning: item.meaning || '',
      onyomi: item.onyomi || '',
      kunyomi: item.kunyomi || '',
      strokeCount: item.strokeCount || 4,
      jlptLevel: item.jlptLevel || 'N5',
      chapter: item.chapter || 1
    });
    setModalError(null);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.character.trim() || !formData.meaning.trim()) {
      setModalError('Kanji character and English meaning are required.');
      return;
    }

    setActionLoading(true);
    setModalError(null);
    try {
      const res = await api.admin.createKanji({
        ...formData,
        meanings: [formData.meaning.trim()]
      });
      if (res.success) {
        setIsAddModalOpen(false);
        showToast(`Added Kanji "${formData.character}" to Master Database!`);
        fetchKanji();
      }
    } catch (err: any) {
      setModalError(err.message || 'Failed to save Kanji.');
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
      const res = await api.admin.updateKanji(itemId, {
        ...formData,
        meanings: [formData.meaning.trim()]
      });
      if (res.success) {
        setEditingItem(null);
        showToast(`Updated Kanji "${formData.character}".`);
        fetchKanji();
      }
    } catch (err: any) {
      setModalError(err.message || 'Failed to update Kanji.');
    } finally {
      setActionLoading(false);
    }
  };

  // Single Kanji deletion: deletes immediately without second confirmation modal
  const handleDeleteSingle = async (item: MasterKanjiItem) => {
    const itemId = item.id || item._id;
    if (!itemId) return;

    setActionLoading(true);
    try {
      const res = await api.admin.deleteKanji(itemId);
      if (res.success) {
        showToast(res.message || `Deleted "${item.character}" from master database.`);
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });
        fetchKanji();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete Kanji character.');
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk Kanji deletion: deletes all selected items in one batch operation without individual confirmations
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const idsToDelete = Array.from(selectedIds);

    setActionLoading(true);
    try {
      const res = await api.admin.bulkDeleteKanji(idsToDelete);
      if (res.success) {
        showToast(res.message || `Successfully deleted ${res.count} Kanji characters.`);
        setSelectedIds(new Set());
        fetchKanji();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to bulk delete Kanji characters.');
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

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-japanese text-[#1a1918]">
            Master Kanji Bank
          </h2>
          <p className="text-xs text-[#8c8880] mt-0.5">
            Manage canonical Kanji characters, Onyomi/Kunyomi readings, and stroke counts.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>Add Master Kanji</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-[#eeece6] shadow-xs flex flex-wrap items-center justify-between gap-3">
        
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-[#8c8880] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Kanji character, reading, or meaning..."
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

        <div className="text-xs font-mono font-bold text-[#8c8880]">
          Total: {items.length} characters
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
              {selectedIds.size === 1 ? '1 Kanji character selected' : `${selectedIds.size} Kanji characters selected for batch deletion`}
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

      {/* Kanji Table */}
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
                    title="Select all visible Kanji"
                    aria-label="Select all visible Kanji"
                  />
                </th>
                <th className="p-3.5 pl-2">Level & Ch</th>
                <th className="p-3.5">Kanji</th>
                <th className="p-3.5">Meaning</th>
                <th className="p-3.5">Onyomi (音読み)</th>
                <th className="p-3.5">Kunyomi (訓読み)</th>
                <th className="p-3.5">Strokes</th>
                <th className="p-3.5 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eeece6]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[#8c8880]">
                    Loading Kanji records...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[#8c8880]">
                    No Kanji characters found matching your filters.
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
                          aria-label={`Select ${item.character}`}
                        />
                      </td>

                      <td className="p-3.5 pl-2 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold px-1.5 py-0.5 rounded bg-orange-50 text-[#ea580c] text-[10px] border border-orange-100">
                            {item.jlptLevel || 'N5'}
                          </span>
                          <span className="text-[#8c8880] text-[11px]">
                            Ch.{item.chapter || 1}
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-japanese font-bold text-[#1a1918]">
                            {item.character}
                          </span>
                          <button
                            onClick={() => soundEffects.speak(item.kunyomi || item.onyomi || item.character)}
                            className="p-1 text-[#8c8880] hover:text-[#1a1918] cursor-pointer"
                            title="Pronounce reading"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      <td className="p-3.5 font-semibold text-[#1a1918]">
                        {item.meaning}
                      </td>

                      <td className="p-3.5 font-japanese text-xs text-[#1a1918]">
                        {item.onyomi || '—'}
                      </td>

                      <td className="p-3.5 font-japanese text-xs text-[#1a1918]">
                        {item.kunyomi || '—'}
                      </td>

                      <td className="p-3.5 font-mono text-[#8c8880]">
                        {item.strokeCount ?? '—'} 画
                      </td>

                      <td className="p-3.5 pr-5 text-right space-x-1">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 rounded-lg text-[#6e6b66] hover:text-[#1a1918] hover:bg-neutral-100 transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSingle(item)}
                          disabled={actionLoading}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                          title="Delete Kanji immediately"
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

      {/* ADD / EDIT MODAL */}
      {(isAddModalOpen || editingItem) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => { setIsAddModalOpen(false); setEditingItem(null); }}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />

          <div className="relative bg-white rounded-3xl border border-[#eeece6] shadow-2xl max-w-lg w-full p-6 sm:p-7 z-10 animate-pop-in space-y-5">
            
            <div className="flex items-center justify-between pb-3 border-b border-[#eeece6]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#ea580c] flex items-center justify-center font-bold font-japanese text-lg">
                  漢
                </div>
                <h3 className="text-base font-bold text-[#1a1918]">
                  {editingItem ? 'Edit Master Kanji' : 'Add Master Kanji'}
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
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1a1918] mb-1">
                    Kanji Character *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={formData.character}
                    onChange={(e) => setFormData({ ...formData, character: e.target.value })}
                    placeholder="e.g. 日"
                    className="w-full px-3 py-2 rounded-xl bg-[#faf9f6] border border-[#eeece6] font-japanese font-bold text-xl text-center focus:outline-none focus:border-[#1a1918]"
                  />
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
                    placeholder="e.g. Day, Sun"
                    className="w-full px-3 py-2 rounded-xl bg-[#faf9f6] border border-[#eeece6] font-semibold focus:outline-none focus:border-[#1a1918]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1a1918] mb-1">
                    Onyomi (音読み - Katakana)
                  </label>
                  <input
                    type="text"
                    value={formData.onyomi}
                    onChange={(e) => setFormData({ ...formData, onyomi: e.target.value })}
                    placeholder="e.g. ニチ, ジツ"
                    className="w-full px-3 py-2 rounded-xl bg-[#faf9f6] border border-[#eeece6] font-japanese focus:outline-none focus:border-[#1a1918]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1a1918] mb-1">
                    Kunyomi (訓読み - Hiragana)
                  </label>
                  <input
                    type="text"
                    value={formData.kunyomi}
                    onChange={(e) => setFormData({ ...formData, kunyomi: e.target.value })}
                    placeholder="e.g. ひ, -び, -か"
                    className="w-full px-3 py-2 rounded-xl bg-[#faf9f6] border border-[#eeece6] font-japanese focus:outline-none focus:border-[#1a1918]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-[#1a1918] mb-1">
                    Stroke Count
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={64}
                    value={formData.strokeCount}
                    onChange={(e) => setFormData({ ...formData, strokeCount: parseInt(e.target.value || '1', 10) })}
                    className="w-full px-3 py-2 rounded-xl bg-[#faf9f6] border border-[#eeece6] font-bold text-center focus:outline-none"
                  />
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

                <div>
                  <label className="block font-bold text-[#1a1918] mb-1">
                    Chapter
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={formData.chapter}
                    onChange={(e) => setFormData({ ...formData, chapter: parseInt(e.target.value || '1', 10) })}
                    className="w-full px-3 py-2 rounded-xl bg-[#faf9f6] border border-[#eeece6] font-bold text-center focus:outline-none"
                  />
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
                  className="px-5 py-2 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : (editingItem ? 'Save Changes' : 'Create Master Kanji')}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
