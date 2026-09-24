import React, { useState } from 'react';
import { AppSettings } from '../types/vocab';
import { 
  X, 
  Download, 
  Upload, 
  Database, 
  Volume2, 
  AlertTriangle, 
  Check, 
  FileJson,
  ShieldCheck,
  BookMarked
} from 'lucide-react';
import { downloadBackup, readJsonFile } from '../utils/exportImport';
import { idb } from '../db/idb';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  onDataRestored: () => Promise<void>;
  totalVocabCount: number;
  totalKanjiCount?: number;
  totalNotesCount: number;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onDataRestored,
  totalVocabCount,
  totalKanjiCount = 0,
  totalNotesCount
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string>('');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [pendingImportData, setPendingImportData] = useState<string | null>(null);
  const [pendingCounts, setPendingCounts] = useState<{ vocab: number; kanji: number; sessions: number; notes: number } | null>(null);

  // Dev reset state
  const [showDevReset, setShowDevReset] = useState(false);
  const [devResetConfirmationText, setDevResetConfirmationText] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await downloadBackup();
      setIsExporting(false);
    } catch (err: any) {
      alert('Export failed: ' + err.message);
      setIsExporting(false);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportStatus('Inspecting backup file...');
      const text = await readJsonFile(file);
      const parsed = JSON.parse(text);

      if (!parsed.data || !Array.isArray(parsed.data.vocabularies)) {
        throw new Error('File does not appear to be a valid NihongoHub backup.');
      }

      setPendingImportData(text);
      setPendingCounts({
        vocab: parsed.data.vocabularies.length,
        kanji: Array.isArray(parsed.data.kanjis) ? parsed.data.kanjis.length : 0,
        sessions: Array.isArray(parsed.data.practiceSessions) ? parsed.data.practiceSessions.length : 0,
        notes: Array.isArray(parsed.data.notes) ? parsed.data.notes.length : 0
      });
      setImportStatus('');
    } catch (err: any) {
      setImportStatus(`Error: ${err.message}`);
      setPendingImportData(null);
    }
  };

  const handleExecuteImport = async () => {
    if (!pendingImportData) return;

    try {
      setImportStatus('Restoring data to IndexedDB...');
      const result = await idb.importAllData(pendingImportData, importMode);
      await onDataRestored();
      setImportStatus(`Success! Restored ${result.importedVocabs} vocabulary words, ${result.importedKanjis} kanji characters, ${result.importedNotes} notes, and ${result.importedSessions} sessions.`);
      setPendingImportData(null);
      setPendingCounts(null);
    } catch (err: any) {
      setImportStatus(`Import failed: ${err.message}`);
    }
  };

  const handleExecuteDevReset = async () => {
    if (devResetConfirmationText.trim() !== 'DELETE ALL') {
      alert('Please type DELETE ALL exactly to confirm.');
      return;
    }

    try {
      setIsResetting(true);
      await idb.clearAllDataDevOnly();
      await onDataRestored();
      setIsResetting(false);
      setShowDevReset(false);
      alert('Database reset successfully.');
    } catch (err: any) {
      alert('Reset failed: ' + err.message);
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-pop-in">
      <div 
        className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-[#eeece6] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#eeece6] pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#faf9f6] border border-[#eeece6] flex items-center justify-center text-[#1a1918]">
              <Database className="w-5 h-5 text-[#d93829]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1a1918]">Settings & Local Storage</h2>
              <p className="text-xs text-[#8c8880]">NihongoHub Configuration & IndexedDB Backups</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#8c8880] hover:text-[#1a1918] hover:bg-[#f7f6f2] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          
          {/* Storage Status Banner */}
          <div className="p-4 rounded-2xl bg-[#faf9f6] border border-[#eeece6] flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-[#6e6b66] leading-relaxed">
              <span className="font-bold text-[#1a1918] block mb-0.5">100% Local-Only Storage (IndexedDB)</span>
              All your {totalVocabCount} vocabulary words (across 24 chapters & extra deck), {totalKanjiCount} Kanji characters, {totalNotesCount} study notes, scores, and spaced repetition intervals are stored permanently in your browser's local IndexedDB. Your data survives browser closures and computer restarts.
            </div>
          </div>

          {/* Backup & Restore */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1a1918] flex items-center gap-1.5">
              <FileJson className="w-4 h-4 text-[#d93829]" />
              <span>Backup & Restore (Chapters, Kanji, Notes & Vocabulary)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Export Button */}
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting}
                className="p-4 rounded-2xl border border-[#eeece6] hover:border-[#d4d0c8] bg-white hover:bg-[#faf9f6] text-left transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                    <Download className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-sm text-[#1a1918] block">Export Backup (.json)</span>
                  <p className="text-[11px] text-[#8c8880] mt-1">Download full JSON backup of chapters, kanji, notes, weak items, and scores.</p>
                </div>
                <div className="mt-3 text-xs font-semibold text-blue-600">
                  {isExporting ? 'Exporting...' : 'Download JSON →'}
                </div>
              </button>

              {/* Import Button */}
              <label className="p-4 rounded-2xl border border-[#eeece6] hover:border-[#d4d0c8] bg-white hover:bg-[#faf9f6] text-left transition-all cursor-pointer flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-sm text-[#1a1918] block">Import Backup</span>
                  <p className="text-[11px] text-[#8c8880] mt-1">Restore or merge previous JSON backup file into your database.</p>
                </div>
                <div className="mt-3 text-xs font-semibold text-emerald-600">
                  Choose File →
                </div>
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleFileSelected} 
                  className="hidden" 
                />
              </label>
            </div>

            {/* Pending Import Modal */}
            {pendingImportData && pendingCounts && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-3 animate-pop-in">
                <div className="font-bold text-sm">File Ready for Import:</div>
                <p>
                  Contains <strong>{pendingCounts.vocab}</strong> vocabulary words, <strong>{pendingCounts.kanji}</strong> Kanji characters, <strong>{pendingCounts.notes}</strong> study notes, and <strong>{pendingCounts.sessions}</strong> practice sessions.
                </p>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input 
                      type="radio" 
                      name="importMode" 
                      checked={importMode === 'merge'} 
                      onChange={() => setImportMode('merge')} 
                    />
                    <span>Merge (keep existing, add new)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-rose-800">
                    <input 
                      type="radio" 
                      name="importMode" 
                      checked={importMode === 'replace'} 
                      onChange={() => setImportMode('replace')} 
                    />
                    <span>Overwrite (wipe & replace)</span>
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleExecuteImport}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-4 py-2 rounded-xl text-xs shadow-xs cursor-pointer"
                  >
                    Confirm & Restore Data
                  </button>
                  <button
                    onClick={() => {
                      setPendingImportData(null);
                      setPendingCounts(null);
                      setImportStatus('');
                    }}
                    className="text-[#6e6b66] hover:text-[#1a1918] px-3 py-2 text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {importStatus && (
              <p className="text-xs font-mono text-[#6e6b66] bg-[#f7f6f2] p-2.5 rounded-xl border border-[#eeece6]">
                {importStatus}
              </p>
            )}
          </div>

          {/* Sound Settings */}
          <div className="space-y-3 pt-2 border-t border-[#eeece6]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1a1918]">Audio & Sound Effects</h3>
            
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#faf9f6] border border-[#eeece6]">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-[#6e6b66]" />
                <div>
                  <div className="text-sm font-semibold text-[#1a1918]">Practice Audio Chimes</div>
                  <div className="text-[11px] text-[#8c8880]">Chimes on correct/wrong answers & Japanese speech synthesis</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => onUpdateSettings({ soundEnabled: e.target.checked })}
                className="w-5 h-5 rounded text-[#d93829] cursor-pointer"
              />
            </div>
          </div>

          {/* Danger Zone: Reset Database */}
          <div className="space-y-3 pt-2 border-t border-[#eeece6]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Reset Database</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowDevReset(!showDevReset)}
                className="text-xs text-rose-600 underline cursor-pointer"
              >
                {showDevReset ? 'Hide' : 'Show Reset Options'}
              </button>
            </div>

            {showDevReset && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-3 animate-pop-in">
                <p>
                  This action will completely wipe all local IndexedDB stores (vocabulary, kanji, notes, and session history) and reload default starter seed data.
                </p>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-rose-800">
                    Type <strong>DELETE ALL</strong> to confirm:
                  </label>
                  <input
                    type="text"
                    value={devResetConfirmationText}
                    onChange={(e) => setDevResetConfirmationText(e.target.value)}
                    placeholder="DELETE ALL"
                    className="w-full px-3 py-1.5 rounded-lg border border-rose-300 bg-white text-xs font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleExecuteDevReset}
                  disabled={devResetConfirmationText.trim() !== 'DELETE ALL' || isResetting}
                  className="bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-semibold px-4 py-2 rounded-xl text-xs shadow-xs cursor-pointer"
                >
                  {isResetting ? 'Resetting...' : 'Permanently Wipe and Re-seed'}
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-[#eeece6] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#1a1918] hover:bg-neutral-800 text-white text-xs font-semibold shadow-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
