import React, { useState, useMemo } from 'react';
import { StudyNote } from '../types/vocab';
import { 
  Search, 
  Filter, 
  Plus, 
  BookMarked, 
  Edit3, 
  Trash2, 
  Calendar, 
  Eye, 
  ArrowRight, 
  X, 
  FileText 
} from 'lucide-react';
import { MarkdownViewer } from '../utils/markdownRenderer';

interface NotesSectionProps {
  notes: StudyNote[];
  onOpenCreateModal: (preselectedCategory?: string) => void;
  onEditNote: (note: StudyNote) => void;
  onDeleteNote: (id: string) => Promise<void>;
}

const PREDEFINED_NOTE_CATEGORIES = [
  'Adjectives',
  'Verbs',
  'Particles',
  'Grammar',
  'Sentence Patterns',
  'Kanji',
  'Hiragana',
  'Katakana',
  'JLPT N5',
  'JLPT N4',
  'Other'
];

export const NotesSection: React.FC<NotesSectionProps> = ({
  notes,
  onOpenCreateModal,
  onEditNote,
  onDeleteNote
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [readingNote, setReadingNote] = useState<StudyNote | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Combine predefined categories with any custom categories created by user
  const allCategories = useMemo(() => {
    const set = new Set<string>(PREDEFINED_NOTE_CATEGORIES);
    notes.forEach(n => {
      if (n.category) set.add(n.category);
    });
    return Array.from(set);
  }, [notes]);

  // Filtered notes
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      if (selectedCategory !== 'all' && n.category !== selectedCategory) {
        return false;
      }
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase().trim();
      const matchTitle = n.title.toLowerCase().includes(term);
      const matchCategory = n.category?.toLowerCase().includes(term);
      const matchContent = n.content.toLowerCase().includes(term);
      return matchTitle || matchCategory || matchContent;
    });
  }, [notes, selectedCategory, searchTerm]);

  const handleDelete = async (id: string) => {
    await onDeleteNote(id);
    setDeleteConfirmId(null);
    if (readingNote?.id === id) {
      setReadingNote(null);
    }
  };

  const getSnippet = (text: string): string => {
    const clean = text
      .replace(/#+\s+/g, '')
      .replace(/[\*\_\`]/g, '')
      .replace(/---\s*/g, '')
      .trim();
    return clean.slice(0, 140) + (clean.length > 140 ? '...' : '');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pop-in">
      
      {/* Header & New Note CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#eeece6] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1a1918] font-japanese">日本語ノート・Study Notes</h1>
            <span className="text-xs bg-[#fef2f2] text-[#d93829] font-bold px-2.5 py-0.5 rounded-full border border-[#fee2e2]">
              {notes.length} {notes.length === 1 ? 'note' : 'notes'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#6e6b66] mt-1">
            Personal Japanese study notebook. Categorize notes into Adjectives, Verbs, Particles, Grammar, Sentence Patterns, Kanji, and JLPT concepts.
          </p>
        </div>

        <button
          onClick={() => onOpenCreateModal(selectedCategory !== 'all' ? selectedCategory : undefined)}
          className="flex items-center gap-1.5 self-start sm:self-auto bg-[#d93829] hover:bg-[#b92a1d] text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xs shadow-red-200 transition-all cursor-pointer active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>+ New Note</span>
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white rounded-2xl border border-[#eeece6] p-4 shadow-xs space-y-3">
        {/* Search Input */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search study notes by title, topic, Japanese words, or grammar rules..."
            className="w-full pl-9.5 pr-4 py-2 text-xs rounded-xl border border-[#d4d0c8] focus:border-[#d93829] focus:ring-2 focus:ring-red-100 outline-hidden transition-all text-[#1a1918]"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-neutral-700"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
          <span className="text-[11px] font-semibold text-[#8c8880] flex items-center gap-1 shrink-0 mr-1">
            <Filter className="w-3 h-3" /> Category:
          </span>
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-[#1a1918] text-white'
                : 'bg-[#faf9f6] text-[#6e6b66] border border-[#eeece6] hover:border-[#d4d0c8]'
            }`}
          >
            All Notes ({notes.length})
          </button>
          {allCategories.map((cat) => {
            const count = notes.filter(n => n.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#d93829] text-white'
                    : 'bg-[#faf9f6] text-[#6e6b66] border border-[#eeece6] hover:border-[#d4d0c8]'
                }`}
              >
                {cat} {count > 0 ? `(${count})` : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notes Cards Grid */}
      {filteredNotes.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#eeece6] p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-[#faf9f6] border border-[#eeece6] flex items-center justify-center mx-auto mb-4 text-2xl font-serif-jp text-[#8c8880]">
            記
          </div>
          <h3 className="text-base font-bold text-[#1a1918]">No notes found</h3>
          <p className="text-xs text-[#8c8880] mt-1 max-w-sm mx-auto">
            {searchTerm || selectedCategory !== 'all'
              ? `No study notes in "${selectedCategory}". Click below to write a note for this topic!`
              : 'Start your study notebook by creating your first Japanese note.'}
          </p>
          <button
            onClick={() => onOpenCreateModal(selectedCategory !== 'all' ? selectedCategory : undefined)}
            className="mt-4 inline-flex items-center gap-1.5 bg-[#d93829] text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Note {selectedCategory !== 'all' ? `in ${selectedCategory}` : ''}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => {
            const updatedDate = new Date(note.updatedAt || note.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });

            return (
              <div
                key={note.id}
                onClick={() => setReadingNote(note)}
                className="bg-white rounded-2xl border border-[#eeece6] p-5 shadow-xs hover:shadow-md hover:border-[#d4d0c8] transition-all flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  {/* Category & Date */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-[#fef2f2] text-[#d93829] border border-[#fee2e2] px-2 py-0.5 rounded-md">
                      {note.category}
                    </span>

                    <span className="text-[10px] text-[#8c8880] flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-neutral-400" />
                      {updatedDate}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-[#1a1918] group-hover:text-[#d93829] transition-colors leading-snug font-japanese">
                    {note.title}
                  </h3>

                  {/* Snippet Preview */}
                  <p className="text-xs text-[#6e6b66] mt-2 line-clamp-3 leading-relaxed">
                    {getSnippet(note.content)}
                  </p>
                </div>

                {/* Footer Actions */}
                <div className="mt-4 pt-3 border-t border-[#f2f0ea] flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#d93829] group-hover:underline flex items-center gap-1">
                    <span>Read Note</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onEditNote(note)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                      title="Edit note"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(note.id)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Note Reader Modal */}
      {readingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-xs animate-pop-in">
          <div 
            className="bg-white rounded-3xl border border-[#eeece6] shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Reader Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#eeece6]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#d93829] bg-[#fef2f2] px-2 py-0.5 rounded">
                  {readingNote.category}
                </span>
                <h2 className="text-lg sm:text-xl font-bold font-japanese text-[#1a1918] mt-1">
                  {readingNote.title}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const target = readingNote;
                    setReadingNote(null);
                    onEditNote(target);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#d4d0c8] text-xs font-semibold text-[#1a1918] hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button 
                  onClick={() => setReadingNote(null)}
                  className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Reader Content */}
            <div className="p-6 overflow-y-auto flex-1 bg-[#faf9f6]">
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#eeece6] shadow-xs">
                <MarkdownViewer content={readingNote.content} />
              </div>
            </div>

            {/* Reader Footer */}
            <div className="px-6 py-3 border-t border-[#eeece6] bg-[#faf9f6] flex items-center justify-between text-xs text-[#8c8880]">
              <span>
                Last updated: {new Date(readingNote.updatedAt || readingNote.createdAt).toLocaleString()}
              </span>
              <button
                onClick={() => setReadingNote(null)}
                className="px-4 py-1.5 rounded-xl bg-[#1a1918] text-white text-xs font-semibold hover:bg-black transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-pop-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-[#eeece6] shadow-xl">
            <h3 className="text-base font-bold text-[#1a1918]">Delete Study Note?</h3>
            <p className="text-xs text-[#8c8880] mt-2">
              Are you sure you want to delete this study note? This will permanently remove it from your local notebook.
            </p>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl border border-[#d4d0c8] text-xs font-semibold text-[#6e6b66] hover:bg-neutral-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
