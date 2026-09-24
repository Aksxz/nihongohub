import React from 'react';
import { ChapterItem } from '../types/chapter';
import { X, Plus, Edit3, Trash2, BookOpen, Layers, ShieldCheck, ArrowRight } from 'lucide-react';

interface ManageChaptersModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapters: ChapterItem[];
  itemCounts: Record<number, number>;
  onOpenAddModal: () => void;
  onOpenEditModal: (chapter: ChapterItem) => void;
  onDeleteChapter: (chapterId: string, chapterNumber: number) => Promise<void>;
  onSelectChapter?: (chapterNumber: number) => void;
  type?: 'vocab' | 'kanji';
}

export const ManageChaptersModal: React.FC<ManageChaptersModalProps> = ({
  isOpen,
  onClose,
  chapters,
  itemCounts,
  onOpenAddModal,
  onOpenEditModal,
  onDeleteChapter,
  onSelectChapter,
  type = 'vocab'
}) => {
  if (!isOpen) return null;

  const isKanji = type === 'kanji';
  const itemLabel = isKanji ? 'Kanji' : 'words';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-pop-in">
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-[#eeece6] relative max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#eeece6] pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isKanji ? 'bg-orange-50 text-[#ea580c]' : 'bg-red-50 text-[#d93829]'
            }`}>
              {isKanji ? (
                <span className="font-japanese font-bold text-base">漢</span>
              ) : (
                <BookOpen className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1a1918]">
                Manage {isKanji ? 'Kanji' : 'Standard'} Chapters
              </h2>
              <p className="text-xs text-[#8c8880]">
                Add, rename, or delete chapters. Total {chapters.length} chapters configured.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#8c8880] hover:text-[#1a1918] hover:bg-[#f7f6f2] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Safe Deletion Banner */}
        <div className="mb-4 p-3.5 rounded-2xl bg-[#faf9f6] border border-[#eeece6] flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-xs text-[#6e6b66] leading-relaxed">
            <span className="font-semibold text-[#1a1918]">Safe Chapter Deletion:</span> Deleting a chapter immediately moves all its {itemLabel} into <strong>Extra / Unassigned</strong>. Your learning history and items are never lost.
          </p>
        </div>

        {/* Add Chapter Action Bar */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-xs font-bold text-[#1a1918]">
            Configured Chapters ({chapters.length})
          </span>
          <button
            onClick={() => {
              onClose();
              onOpenAddModal();
            }}
            className={`flex items-center gap-1.5 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer ${
              isKanji 
                ? 'bg-[#ea580c] hover:bg-[#c2410c]' 
                : 'bg-[#d93829] hover:bg-[#b92a1d]'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Chapter</span>
          </button>
        </div>

        {/* Chapters Table / List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#eeece6] border border-[#eeece6] rounded-2xl bg-white">
          {chapters.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#8c8880]">
              No chapters found. Click "+ Add Chapter" above to create one.
            </div>
          ) : (
            chapters.map((ch) => {
              const count = itemCounts[ch.chapterNumber] || 0;

              return (
                <div 
                  key={ch.id}
                  className="p-3.5 flex items-center justify-between hover:bg-[#faf9f6] transition-colors group"
                >
                  <div 
                    className="flex items-center gap-3 cursor-pointer flex-1"
                    onClick={() => {
                      if (onSelectChapter) {
                        onClose();
                        onSelectChapter(ch.chapterNumber);
                      }
                    }}
                  >
                    <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md ${
                      isKanji ? 'bg-orange-50 text-[#ea580c]' : 'bg-red-50 text-[#d93829]'
                    }`}>
                      CH {ch.chapterNumber}
                    </span>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-japanese font-bold text-sm text-[#1a1918]">
                          {ch.japaneseTitle || `第${ch.chapterNumber}課`}
                        </span>
                        <span className="text-xs font-medium text-[#6e6b66]">
                          {ch.title}
                        </span>
                      </div>
                      {ch.description && (
                        <p className="text-[11px] text-[#8c8880] truncate max-w-xs">{ch.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-xs font-medium font-mono text-[#8c8880] min-w-[70px] text-right">
                      {count} {itemLabel}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          onClose();
                          onOpenEditModal(ch);
                        }}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                        title="Edit / Rename Chapter"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteChapter(ch.id, ch.chapterNumber);
                        }}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Chapter (one-click)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-[#eeece6] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#1a1918] hover:bg-neutral-800 text-white text-xs font-semibold shadow-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
