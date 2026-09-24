import React, { useState, useEffect, useRef } from 'react';
import { StudyNote, NoteCategory } from '../types/vocab';
import { 
  X, 
  Check, 
  Heading1, 
  Heading2, 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Eye, 
  Edit3, 
  BookMarked,
  Tag,
  Plus
} from 'lucide-react';
import { MarkdownViewer } from '../utils/markdownRenderer';

interface NoteEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (noteData: Omit<StudyNote, 'id' | 'createdAt' | 'updatedAt'>, existingId?: string) => Promise<void>;
  editNote?: StudyNote | null;
}

const DEFAULT_CATEGORIES: NoteCategory[] = [
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

export const NoteEditorModal: React.FC<NoteEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editNote
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('Grammar');
  const [customCategory, setCustomCategory] = useState('');
  const [isAddingCustomCategory, setIsAddingCustomCategory] = useState(false);
  const [content, setContent] = useState('');
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editNote) {
      setTitle(editNote.title || '');
      setCategory(editNote.category || 'Grammar');
      setContent(editNote.content || '');
      setError('');
    } else {
      resetForm();
    }
  }, [editNote, isOpen]);

  const resetForm = () => {
    setTitle('');
    setCategory('Grammar');
    setCustomCategory('');
    setIsAddingCustomCategory(false);
    setContent('');
    setActiveTab('edit');
    setError('');
  };

  if (!isOpen) return null;

  const insertFormatting = (prefix: string, suffix: string = '', defaultPlaceholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end) || defaultPlaceholder;

    const replacement = `${prefix}${selectedText}${suffix}`;
    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);

    // Reposition cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 10);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Please enter a note title.');
      return;
    }
    if (!content.trim()) {
      setError('Note content cannot be empty.');
      return;
    }

    const finalCategory = isAddingCustomCategory && customCategory.trim() 
      ? customCategory.trim() 
      : category;

    setError('');
    setIsSubmitting(true);

    try {
      await onSave(
        {
          title: title.trim(),
          category: finalCategory,
          content: content.trim()
        },
        editNote?.id ? editNote.id : undefined
      );
      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save note.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-pop-in">
      <div 
        className="bg-white rounded-3xl border border-[#eeece6] shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#eeece6]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#fef2f2] text-[#d93829] flex items-center justify-center font-bold">
              <BookMarked className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#1a1918]">
                {editNote?.id ? 'Edit Study Note' : 'Create Japanese Study Note'}
              </h2>
              <p className="text-[11px] text-[#8c8880]">
                Saved permanently in your local IndexedDB notebook
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Edit / Preview Toggle */}
            <div className="flex items-center bg-[#f7f6f2] p-1 rounded-xl border border-[#eeece6]">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'edit' ? 'bg-white text-[#1a1918] shadow-xs' : 'text-[#8c8880]'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editor</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'preview' ? 'bg-white text-[#1a1918] shadow-xs' : 'text-[#8c8880]'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>
            </div>

            <button 
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Title & Category Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1a1918] mb-1">
                Note Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Essential Japanese Particles, Minna no Nihongo Verbs..."
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#d4d0c8] focus:border-[#d93829] focus:ring-2 focus:ring-red-100 outline-hidden text-sm font-semibold text-[#1a1918] placeholder:text-neutral-300"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1a1918] mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              {!isAddingCustomCategory ? (
                <div className="flex gap-1.5">
                  <select
                    value={category}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setIsAddingCustomCategory(true);
                      } else {
                        setCategory(e.target.value);
                      }
                    }}
                    className="flex-1 px-3 py-2.5 rounded-xl border border-[#d4d0c8] bg-white text-xs font-medium text-[#1a1918] focus:border-[#d93829] outline-hidden cursor-pointer"
                  >
                    {DEFAULT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="__custom__">+ Custom Category...</option>
                  </select>
                </div>
              ) : (
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Category name..."
                    className="flex-1 px-3 py-2 rounded-xl border border-[#d4d0c8] text-xs focus:border-[#d93829] outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setIsAddingCustomCategory(false)}
                    className="px-2 py-1 text-xs text-neutral-500 hover:text-neutral-800"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Editor Mode vs Preview Mode */}
          {activeTab === 'edit' ? (
            <div className="space-y-2">
              {/* Formatting Toolbar */}
              <div className="flex flex-wrap items-center gap-1 p-1.5 bg-[#faf9f6] rounded-xl border border-[#eeece6] text-xs">
                <button
                  type="button"
                  onClick={() => insertFormatting('## ', '', 'Section Heading')}
                  className="p-1.5 rounded-lg hover:bg-white text-[#6e6b66] hover:text-[#1a1918] transition-colors cursor-pointer"
                  title="Heading 2"
                >
                  <Heading1 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('### ', '', 'Subheading')}
                  className="p-1.5 rounded-lg hover:bg-white text-[#6e6b66] hover:text-[#1a1918] transition-colors cursor-pointer"
                  title="Heading 3"
                >
                  <Heading2 className="w-4 h-4" />
                </button>
                <span className="text-neutral-300">|</span>
                <button
                  type="button"
                  onClick={() => insertFormatting('**', '**', 'bold text')}
                  className="p-1.5 rounded-lg hover:bg-white text-[#6e6b66] hover:text-[#1a1918] transition-colors cursor-pointer"
                  title="Bold"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('*', '*', 'italic text')}
                  className="p-1.5 rounded-lg hover:bg-white text-[#6e6b66] hover:text-[#1a1918] transition-colors cursor-pointer"
                  title="Italic"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <span className="text-neutral-300">|</span>
                <button
                  type="button"
                  onClick={() => insertFormatting('* ', '', 'bullet item')}
                  className="p-1.5 rounded-lg hover:bg-white text-[#6e6b66] hover:text-[#1a1918] transition-colors cursor-pointer"
                  title="Bullet List"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('1. ', '', 'numbered item')}
                  className="p-1.5 rounded-lg hover:bg-white text-[#6e6b66] hover:text-[#1a1918] transition-colors cursor-pointer"
                  title="Numbered List"
                >
                  <ListOrdered className="w-4 h-4" />
                </button>
                <span className="text-neutral-300">|</span>
                <button
                  type="button"
                  onClick={() => insertFormatting('「', '」', '例文')}
                  className="px-2 py-1 rounded-lg hover:bg-white text-[#6e6b66] hover:text-[#d93829] font-japanese font-bold transition-colors cursor-pointer"
                  title="Japanese Quotes"
                >
                  「」
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('\n---\n')}
                  className="px-2 py-1 rounded-lg hover:bg-white text-[#6e6b66] hover:text-[#1a1918] font-mono transition-colors cursor-pointer"
                  title="Horizontal Divider"
                >
                  ---
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('* **単語 (reading)** — meaning\n')}
                  className="px-2 py-1 rounded-lg hover:bg-white text-[#d93829] bg-[#fef2f2] font-semibold text-[11px] transition-colors cursor-pointer ml-auto"
                  title="Insert Japanese Vocab Entry"
                >
                  + Vocab Row
                </button>
              </div>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                rows={14}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your study notes here... Supports Headings (#), Bullet points (*), Bold (**word**), Japanese quotes (「」), and romaji."
                className="w-full p-4 rounded-2xl border border-[#d4d0c8] focus:border-[#d93829] focus:ring-2 focus:ring-red-100 outline-hidden font-japanese text-sm text-[#1a1918] placeholder:text-neutral-300 transition-all resize-y leading-relaxed font-mono"
              />
            </div>
          ) : (
            /* Live Preview Screen */
            <div className="bg-[#faf9f6] p-6 rounded-2xl border border-[#eeece6] min-h-[350px]">
              <div className="border-b border-[#eeece6] pb-3 mb-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#d93829] bg-[#fef2f2] px-2 py-0.5 rounded">
                  {isAddingCustomCategory && customCategory ? customCategory : category}
                </span>
                <h1 className="text-2xl font-bold font-japanese text-[#1a1918] mt-1.5">
                  {title || 'Untitled Study Note'}
                </h1>
              </div>
              <MarkdownViewer content={content || '*No content written yet.*'} />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-6 border-t border-[#eeece6] bg-[#faf9f6] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#d4d0c8] text-xs font-semibold text-[#6e6b66] hover:bg-white transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSave}
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#d93829] hover:bg-[#b92a1d] text-white text-xs font-semibold shadow-xs shadow-red-200 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <span>Saving...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{editNote?.id ? 'Update Note' : 'Save Note'}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
