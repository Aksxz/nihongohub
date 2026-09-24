import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { 
  FileUp, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  ShieldAlert, 
  ArrowRight, 
  FileText, 
  Image as ImageIcon,
  FileSpreadsheet,
  Loader2,
  Sparkles,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

interface AdminPdfImporterProps {
  onGoToReview: (importId?: string) => void;
}

type ImportSourceTab = 'pdf' | 'images' | 'csv';

export const AdminPdfImporter: React.FC<AdminPdfImporterProps> = ({ onGoToReview }) => {
  const [activeSourceTab, setActiveSourceTab] = useState<ImportSourceTab>('pdf');
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [level, setLevel] = useState<string>('N5');
  const [startChapter, setStartChapter] = useState<number>(1);
  const [endChapter, setEndChapter] = useState<number>(24);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStatusStep, setUploadStatusStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isScannedPdfWarning, setIsScannedPdfWarning] = useState<boolean>(false);
  const [result, setResult] = useState<{
    importId: string;
    fileName: string;
    extractedCount: number;
    message: string;
  } | null>(null);

  // CSV Import States
  const [selectedCsv, setSelectedCsv] = useState<File | null>(null);
  const [csvDestinationType, setCsvDestinationType] = useState<'chapter' | 'custom' | 'extra'>('chapter');
  const [csvChapter, setCsvChapter] = useState<number>(1);
  const [csvCustomChapterId, setCsvCustomChapterId] = useState<string>('');
  const [csvJlptLevel, setCsvJlptLevel] = useState<string>('N5');
  const [customChapters, setCustomChapters] = useState<any[]>([]);
  const [csvPreviewLoading, setCsvPreviewLoading] = useState<boolean>(false);
  const [csvCommitLoading, setCsvCommitLoading] = useState<boolean>(false);
  const [csvPreviewData, setCsvPreviewData] = useState<{
    items: any[];
    totalRows: number;
    validRows: number;
    invalidRows: number;
    errors: any[];
    duplicatesCount: number;
    destination: any;
  } | null>(null);
  const [csvSuccessResult, setCsvSuccessResult] = useState<{
    insertedCount: number;
    message: string;
    destinationDesc: string;
  } | null>(null);

  useEffect(() => {
    loadCustomChapters();
  }, []);

  const loadCustomChapters = async () => {
    try {
      const res = await api.customChapters.getAll();
      if (res.success && res.data) {
        setCustomChapters(res.data);
        if (res.data.length > 0 && !csvCustomChapterId) {
          setCsvCustomChapterId(res.data[0]._id || res.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load custom chapters:', err);
    }
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setError('Please select a valid .pdf document.');
        setSelectedPdf(null);
        return;
      }
      setSelectedPdf(file);
      setError(null);
      setIsScannedPdfWarning(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const validImages = files.filter(f => {
        const ext = f.name.toLowerCase();
        return ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.png') || ext.endsWith('.webp');
      });

      if (validImages.length === 0) {
        setError('Please select valid image files (.jpg, .jpeg, .png, .webp).');
        return;
      }

      setSelectedImages(validImages);
      setError(null);
    }
  };

  const handleCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
        setError('Please select a valid .csv file.');
        setSelectedCsv(null);
        return;
      }
      setSelectedCsv(file);
      setError(null);
      setCsvPreviewData(null);
      setCsvSuccessResult(null);
    }
  };

  const handleLevelChange = (lvl: string) => {
    setLevel(lvl);
    if (lvl === 'N5') {
      setStartChapter(1);
      setEndChapter(24);
    } else if (lvl === 'N4') {
      setStartChapter(25);
      setEndChapter(50);
    } else {
      setStartChapter(1);
      setEndChapter(30);
    }
  };

  // Generate CSV Preview
  const handlePreviewCsv = async () => {
    if (!selectedCsv) {
      setError('Please choose a CSV file first.');
      return;
    }
    if (csvDestinationType === 'custom' && !csvCustomChapterId) {
      setError('Please select a valid custom chapter destination or create one first.');
      return;
    }

    setCsvPreviewLoading(true);
    setError(null);
    try {
      const res = await api.admin.importCsvPreview(selectedCsv, {
        destinationType: csvDestinationType,
        chapter: csvDestinationType === 'chapter' ? csvChapter : undefined,
        customChapterId: csvDestinationType === 'custom' ? csvCustomChapterId : undefined,
        jlptLevel: csvJlptLevel
      });

      if (res.success && res.data) {
        setCsvPreviewData(res.data);
      } else {
        setError('Failed to generate CSV preview.');
      }
    } catch (err: any) {
      console.error('CSV preview error:', err);
      setError(err.message || 'Failed to parse CSV file.');
    } finally {
      setCsvPreviewLoading(false);
    }
  };

  // Commit CSV Import
  const handleCommitCsv = async () => {
    if (!csvPreviewData || !csvPreviewData.items || csvPreviewData.items.length === 0) {
      setError('No items to import. Please preview a valid CSV first.');
      return;
    }

    setCsvCommitLoading(true);
    setError(null);
    try {
      const res = await api.admin.importCsvCommit({
        items: csvPreviewData.items,
        destinationType: csvDestinationType,
        chapter: csvDestinationType === 'chapter' ? csvChapter : undefined,
        customChapterId: csvDestinationType === 'custom' ? csvCustomChapterId : undefined,
        jlptLevel: csvJlptLevel,
        filename: selectedCsv?.name || 'import.csv'
      });

      if (res.success) {
        let destDesc = 'Extra Vocabulary';
        if (csvDestinationType === 'chapter') {
          destDesc = `Standard Chapter ${csvChapter}`;
        } else if (csvDestinationType === 'custom') {
          const matched = customChapters.find(c => (c._id || c.id) === csvCustomChapterId);
          destDesc = matched ? `Custom Chapter "${matched.displayName || matched.name}"` : 'Custom Chapter';
        }

        setCsvSuccessResult({
          insertedCount: res.insertedCount,
          message: res.message,
          destinationDesc: destDesc
        });
        setCsvPreviewData(null);
        setSelectedCsv(null);
      } else {
        setError(res.message || 'Failed to commit CSV vocabulary.');
      }
    } catch (err: any) {
      console.error('CSV commit error:', err);
      setError(err.message || 'Failed to commit vocabulary.');
    } finally {
      setCsvCommitLoading(false);
    }
  };

  const handleStartImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeSourceTab === 'pdf' && !selectedPdf) {
      setError('Please choose a PDF file to upload.');
      return;
    }
    if (activeSourceTab === 'images' && selectedImages.length === 0) {
      setError('Please select at least one page scan image to upload.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setIsScannedPdfWarning(false);
    setResult(null);

    try {
      if (activeSourceTab === 'pdf' && selectedPdf) {
        setUploadStatusStep('Uploading PDF document to server...');
        setTimeout(() => {
          setUploadStatusStep('Extracting Japanese vocabulary text layers...');
        }, 1200);

        const res = await api.admin.uploadPdf(
          selectedPdf,
          level,
          startChapter,
          endChapter
        );

        if (res.success && res.data) {
          setResult({
            importId: res.data.importId,
            fileName: res.data.fileName,
            extractedCount: res.data.extractedCount,
            message: res.message
          });
          setSelectedPdf(null);
        } else {
          setError(res.message || 'Failed to extract vocabulary from PDF.');
        }
      } else if (activeSourceTab === 'images' && selectedImages.length > 0) {
        setUploadStatusStep(`Uploading ${selectedImages.length} images for OCR...`);
        setTimeout(() => {
          setUploadStatusStep('Running Tesseract Optical Character Recognition (Japanese + English)...');
        }, 1200);

        const res = await api.admin.uploadImages(
          selectedImages,
          level,
          startChapter,
          endChapter
        );

        if (res.success && res.data) {
          setResult({
            importId: res.data.importId,
            fileName: res.data.fileName,
            extractedCount: res.data.extractedCount,
            message: res.message
          });
          setSelectedImages([]);
        } else {
          setError(res.message || 'Failed to extract vocabulary from images.');
        }
      }
    } catch (err: any) {
      console.error('Import error:', err);
      const msg = err.message || 'Upload failed. Please check network and server logs.';
      setError(msg);
      if (msg.includes('scanned or image-only') || msg.includes('OCR')) {
        setIsScannedPdfWarning(true);
      }
    } finally {
      setIsUploading(false);
      setUploadStatusStep('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      
      {/* Title */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-widest bg-red-100 text-[#d93829] px-2.5 py-0.5 rounded-full">
            Curriculum Importer
          </span>
          <span className="text-xs text-[#8c8880] font-serif-jp">教材インポート</span>
        </div>
        <h2 className="text-2xl font-bold font-japanese text-[#1a1918]">
          Vocabulary Importer (PDF, OCR & CSV)
        </h2>
        <p className="text-xs text-[#6e6b66] mt-1">
          Import vocabularies from PDF, Scan OCR, or structured CSV files with custom chapter destination routing.
        </p>
      </div>

      {/* Safety Alert */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold">Zero Data Loss & Isolated Destination Routing</div>
          <p className="text-amber-800 leading-relaxed text-[11px]">
            Imports support destination targeting: standard chapters (1–24), custom chapter decks, or extra vocabulary. PDF and OCR imports enter the staging review pipeline, while CSV imports offer instant schema validation and pre-commit preview.
          </p>
        </div>
      </div>

      {/* Upload Success State (PDF / Image OCR) */}
      {result && (
        <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-4 animate-pop-in">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-base font-bold">
                Vocabulary Extraction Complete!
              </h3>
              <p className="text-xs text-emerald-800">
                Successfully parsed <span className="font-bold">{result.extractedCount}</span> candidate words from <span className="font-mono font-bold">"{result.fileName}"</span>. Duplicate detection has flagged existing items.
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onGoToReview(result.importId)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <span>Go to Staging Review Table</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setResult(null)}
              className="px-4 py-2.5 rounded-2xl bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100/50 text-xs font-semibold cursor-pointer"
            >
              Import Another File
            </button>
          </div>
        </div>
      )}

      {/* CSV Commit Success State */}
      {csvSuccessResult && (
        <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-4 animate-pop-in">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-base font-bold">
                CSV Vocabulary Successfully Imported!
              </h3>
              <p className="text-xs text-emerald-800">
                Saved <span className="font-bold">{csvSuccessResult.insertedCount} words</span> into master MongoDB destination: <strong className="text-emerald-900">{csvSuccessResult.destinationDesc}</strong>.
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setCsvSuccessResult(null)}
              className="px-4 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              Import Another CSV File
            </button>
          </div>
        </div>
      )}

      {/* Scanned PDF Suggestion Alert */}
      {isScannedPdfWarning && (
        <div className="p-5 rounded-3xl bg-sky-50 border border-sky-200 text-sky-950 space-y-3 animate-pop-in">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <div className="font-bold text-sky-900">Scanned Document Detected</div>
              <p className="text-sky-800 leading-relaxed">
                The uploaded PDF consists of raw raster page images without a selectable text layer. You can upload pages as high-resolution images (<code className="font-mono">.png</code>, <code className="font-mono">.jpg</code>) directly in the <strong>Image / Scan OCR</strong> tab to run Optical Character Recognition.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveSourceTab('images');
              setIsScannedPdfWarning(false);
              setError(null);
            }}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            Switch to Image / Scan OCR Tab
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && !isScannedPdfWarning && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Source Tab Selector (3 Tabs) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#eeece6] pb-3">
        <button
          type="button"
          onClick={() => {
            setActiveSourceTab('pdf');
            setError(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSourceTab === 'pdf'
              ? 'bg-[#1a1918] text-white shadow-xs'
              : 'bg-white text-neutral-600 border border-[#eeece6] hover:bg-neutral-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>PDF Document Upload</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSourceTab('images');
            setError(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSourceTab === 'images'
              ? 'bg-[#1a1918] text-white shadow-xs'
              : 'bg-white text-neutral-600 border border-[#eeece6] hover:bg-neutral-50'
          }`}
        >
          <ImageIcon className="w-4 h-4 text-emerald-600" />
          <span>Image / Scan OCR (JPG, PNG)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSourceTab('csv');
            setError(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSourceTab === 'csv'
              ? 'bg-[#1a1918] text-white shadow-xs'
              : 'bg-white text-neutral-600 border border-[#eeece6] hover:bg-neutral-50'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-sky-600" />
          <span>CSV File Upload</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 3: CSV IMPORT PANEL */}
      {/* ======================================================== */}
      {activeSourceTab === 'csv' && (
        <div className="bg-white rounded-3xl border border-[#eeece6] shadow-xs p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-base font-bold text-[#1a1918]">
              CSV Vocabulary Importer
            </h3>
            <p className="text-xs text-[#6e6b66] mt-0.5">
              Upload spreadsheets formatted with columns: <code className="bg-neutral-100 px-1 py-0.5 rounded text-[11px] font-mono text-[#d93829]">Japanese, Reading, Meaning, PartOfSpeech, Romaji</code>
            </p>
          </div>

          {/* Destination Selector */}
          <div className="p-4 rounded-2xl bg-[#faf9f6] border border-[#eeece6] space-y-4">
            <label className="block text-xs font-bold text-[#1a1918] uppercase tracking-wider">
              1. Choose Import Destination
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Option 1: Standard Textbook Chapter */}
              <label 
                className={`p-3 rounded-2xl border cursor-pointer flex flex-col justify-between transition-all ${
                  csvDestinationType === 'chapter'
                    ? 'border-[#1a1918] bg-white shadow-xs ring-1 ring-[#1a1918]'
                    : 'border-[#eeece6] bg-white/60 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="radio"
                    name="csvDestination"
                    checked={csvDestinationType === 'chapter'}
                    onChange={() => setCsvDestinationType('chapter')}
                    className="accent-[#d93829]"
                  />
                  <span className="text-xs font-bold text-[#1a1918]">Standard Chapter</span>
                </div>
                <div className="text-[11px] text-[#8c8880]">
                  Adds words to standard curriculum (e.g. Chapter 1)
                </div>
              </label>

              {/* Option 2: Custom Chapter / Category */}
              <label 
                className={`p-3 rounded-2xl border cursor-pointer flex flex-col justify-between transition-all ${
                  csvDestinationType === 'custom'
                    ? 'border-[#1a1918] bg-white shadow-xs ring-1 ring-[#1a1918]'
                    : 'border-[#eeece6] bg-white/60 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="radio"
                    name="csvDestination"
                    checked={csvDestinationType === 'custom'}
                    onChange={() => setCsvDestinationType('custom')}
                    className="accent-[#d93829]"
                  />
                  <span className="text-xs font-bold text-[#1a1918]">Custom Chapter</span>
                </div>
                <div className="text-[11px] text-[#8c8880]">
                  Adds words to custom decks (Months, Days, etc.)
                </div>
              </label>

              {/* Option 3: Extra Vocabulary */}
              <label 
                className={`p-3 rounded-2xl border cursor-pointer flex flex-col justify-between transition-all ${
                  csvDestinationType === 'extra'
                    ? 'border-[#1a1918] bg-white shadow-xs ring-1 ring-[#1a1918]'
                    : 'border-[#eeece6] bg-white/60 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="radio"
                    name="csvDestination"
                    checked={csvDestinationType === 'extra'}
                    onChange={() => setCsvDestinationType('extra')}
                    className="accent-[#d93829]"
                  />
                  <span className="text-xs font-bold text-[#1a1918]">Extra Vocabulary</span>
                </div>
                <div className="text-[11px] text-[#8c8880]">
                  Supplementary deck isolated from standard chapters
                </div>
              </label>
            </div>

            {/* Destination Specific Dropdowns */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              {/* JLPT Level */}
              <div>
                <label className="block text-[11px] font-bold text-[#6e6b66] mb-1">
                  Target JLPT Level:
                </label>
                <select
                  value={csvJlptLevel}
                  onChange={(e) => setCsvJlptLevel(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-[#eeece6] text-xs font-bold text-[#1a1918] focus:outline-none"
                >
                  <option value="N5">JLPT N5</option>
                  <option value="N4">JLPT N4</option>
                  <option value="N3">JLPT N3</option>
                </select>
              </div>

              {/* Chapter Dropdown if destination === 'chapter' */}
              {csvDestinationType === 'chapter' && (
                <div>
                  <label className="block text-[11px] font-bold text-[#6e6b66] mb-1">
                    Select Chapter:
                  </label>
                  <select
                    value={csvChapter}
                    onChange={(e) => setCsvChapter(parseInt(e.target.value, 10))}
                    className="px-3 py-1.5 rounded-xl bg-white border border-[#eeece6] text-xs font-bold text-[#1a1918] focus:outline-none"
                  >
                    {Array.from({ length: 24 }, (_, i) => i + 1).map((ch) => (
                      <option key={ch} value={ch}>
                        Chapter {ch} (第{ch}課)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Custom Chapter Dropdown if destination === 'custom' */}
              {csvDestinationType === 'custom' && (
                <div>
                  <label className="block text-[11px] font-bold text-[#6e6b66] mb-1">
                    Select Custom Chapter Deck:
                  </label>
                  {customChapters.length > 0 ? (
                    <select
                      value={csvCustomChapterId}
                      onChange={(e) => setCsvCustomChapterId(e.target.value)}
                      className="px-3 py-1.5 rounded-xl bg-white border border-[#eeece6] text-xs font-bold text-[#1a1918] focus:outline-none"
                    >
                      {customChapters.map((cc) => (
                        <option key={cc._id || cc.id} value={cc._id || cc.id}>
                          {cc.displayName || cc.name} {cc.japaneseName ? `(${cc.japaneseName})` : ''} — {cc.wordCount || 0} words
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                      No custom chapters exist yet. Create one in the Master Vocabulary tab!
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* CSV File Input */}
          <div>
            <label className="block text-xs font-bold text-[#1a1918] mb-2 uppercase tracking-wider">
              2. Select CSV File
            </label>
            <div
              className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer ${
                selectedCsv
                  ? 'border-sky-400 bg-sky-50/30'
                  : 'border-[#d4d0c8] hover:border-[#1a1918] bg-[#faf9f6]'
              }`}
              onClick={() => document.getElementById('csv-file-input')?.click()}
            >
              <input
                id="csv-file-input"
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvChange}
                className="hidden"
              />

              {selectedCsv ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-[#1a1918]">
                    {selectedCsv.name}
                  </div>
                  <div className="text-[11px] text-[#8c8880] font-mono">
                    {(selectedCsv.size / 1024).toFixed(1)} KB • Ready for preview
                  </div>
                  <span className="text-[11px] text-[#d93829] font-semibold underline mt-1">
                    Click to choose different CSV
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-[#6e6b66] flex items-center justify-center">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-[#1a1918]">
                    Click to browse or drop CSV file here
                  </div>
                  <div className="text-[11px] text-[#8c8880]">
                    Headers supported: Japanese, Reading, Meaning, POS, Romaji
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Preview Trigger Button */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-[#8c8880]">
              {selectedCsv ? 'Preview the CSV before writing to master MongoDB.' : 'Please choose a CSV file.'}
            </div>

            <button
              type="button"
              disabled={!selectedCsv || csvPreviewLoading}
              onClick={handlePreviewCsv}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#1a1918] hover:bg-[#333] text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {csvPreviewLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Parsing CSV...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Preview CSV Table</span>
                </>
              )}
            </button>
          </div>

          {/* PREVIEW RESULTS TABLE */}
          {csvPreviewData && (
            <div className="space-y-4 pt-4 border-t border-[#eeece6] animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-[#1a1918]">
                    Preview Summary:
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-neutral-100 text-neutral-800">
                    Total: {csvPreviewData.totalRows}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                    Valid: {csvPreviewData.validRows}
                  </span>
                  {csvPreviewData.invalidRows > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                      Errors: {csvPreviewData.invalidRows}
                    </span>
                  )}
                  {csvPreviewData.duplicatesCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                      Duplicates in Destination: {csvPreviewData.duplicatesCount}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  disabled={csvCommitLoading || csvPreviewData.validRows === 0}
                  onClick={handleCommitCsv}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-[#d93829] hover:bg-[#b92a1d] text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {csvCommitLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Writing to Database...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Import Vocabulary ({csvPreviewData.validRows} words)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Table */}
              <div className="border border-[#eeece6] rounded-2xl overflow-hidden shadow-xs">
                <div className="max-h-80 overflow-y-auto overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#faf9f6] sticky top-0 border-b border-[#eeece6] text-[#6e6b66] font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Japanese Word</th>
                        <th className="py-2.5 px-3">Reading (Kana)</th>
                        <th className="py-2.5 px-3">Romaji</th>
                        <th className="py-2.5 px-3">English Meaning</th>
                        <th className="py-2.5 px-3">POS</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eeece6]">
                      {csvPreviewData.items.map((item, idx) => (
                        <tr 
                          key={idx}
                          className={`hover:bg-[#faf9f6] ${item.isDuplicate ? 'bg-amber-50/40' : ''}`}
                        >
                          <td className="py-2 px-3 text-[#8c8880] font-mono text-[11px]">
                            {item.rowNumber || idx + 1}
                          </td>
                          <td className="py-2 px-3 font-japanese font-bold text-sm text-[#1a1918]">
                            {item.kanji || item.word}
                          </td>
                          <td className="py-2 px-3 font-japanese text-[#d93829]">
                            {item.hiragana || item.reading || '—'}
                          </td>
                          <td className="py-2 px-3 text-[#8c8880] font-mono text-[11px]">
                            {item.romaji || '—'}
                          </td>
                          <td className="py-2 px-3 text-[#1a1918] font-medium">
                            {item.meaning}
                          </td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-700">
                              {item.partOfSpeech || 'Noun'}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            {item.isDuplicate ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                Duplicate in Dest
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Valid
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Row-level errors if any */}
              {csvPreviewData.errors && csvPreviewData.errors.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Row Validation Warnings / Skipped Rows:</span>
                  </div>
                  <ul className="list-disc pl-5 text-[11px] space-y-0.5">
                    {csvPreviewData.errors.map((err, i) => (
                      <li key={i}>
                        Row {err.row}: {err.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* ======================================================== */}
      {/* TABS 1 & 2: PDF & IMAGE OCR UPLOAD (PRESERVED) */}
      {/* ======================================================== */}
      {activeSourceTab !== 'csv' && (
        <form onSubmit={handleStartImport} className="bg-white rounded-3xl border border-[#eeece6] shadow-xs p-6 sm:p-8 space-y-6">
          
          {/* TAB 1: PDF Upload */}
          {activeSourceTab === 'pdf' && (
            <div>
              <label className="block text-xs font-bold text-[#1a1918] mb-2 uppercase tracking-wider">
                1. Select PDF Document
              </label>
              <div
                className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer ${
                  selectedPdf
                    ? 'border-emerald-400 bg-emerald-50/30'
                    : 'border-[#d4d0c8] hover:border-[#1a1918] bg-[#faf9f6]'
                }`}
                onClick={() => document.getElementById('pdf-file-input')?.click()}
              >
                <input
                  id="pdf-file-input"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handlePdfChange}
                  className="hidden"
                />

                {selectedPdf ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-bold text-[#1a1918]">
                      {selectedPdf.name}
                    </div>
                    <div className="text-[11px] text-[#8c8880] font-mono">
                      {(selectedPdf.size / (1024 * 1024)).toFixed(2)} MB • Ready for processing
                    </div>
                    <span className="text-[11px] text-[#d93829] font-semibold underline mt-1">
                      Click to change file
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-[#6e6b66] flex items-center justify-center">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-bold text-[#1a1918]">
                      Click to browse or drop PDF here
                    </div>
                    <div className="text-[11px] text-[#8c8880]">
                      Supports Japanese learning vocabulary PDFs (up to 30MB)
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Image OCR Upload */}
          {activeSourceTab === 'images' && (
            <div>
              <label className="block text-xs font-bold text-[#1a1918] mb-2 uppercase tracking-wider">
                1. Select Page Scan Images (JPG, PNG, WebP)
              </label>
              <div
                className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer ${
                  selectedImages.length > 0
                    ? 'border-emerald-400 bg-emerald-50/30'
                    : 'border-[#d4d0c8] hover:border-[#1a1918] bg-[#faf9f6]'
                }`}
                onClick={() => document.getElementById('image-file-input')?.click()}
              >
                <input
                  id="image-file-input"
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />

                {selectedImages.length > 0 ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-bold text-[#1a1918]">
                      {selectedImages.length} image page(s) selected
                    </div>
                    <div className="text-[11px] text-[#8c8880]">
                      {selectedImages.map(f => f.name).join(', ').slice(0, 80)}...
                    </div>
                    <span className="text-[11px] text-[#d93829] font-semibold underline mt-1">
                      Click to select different images
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-[#6e6b66] flex items-center justify-center">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-bold text-[#1a1918]">
                      Click to select page photos or scans
                    </div>
                    <div className="text-[11px] text-[#8c8880]">
                      Tesseract OCR will automatically detect Japanese Kanji, Hiragana, Romaji, and English
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Configuration Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            
            {/* Target JLPT Level */}
            <div>
              <label className="block text-xs font-bold text-[#1a1918] mb-1.5 uppercase tracking-wider">
                2. JLPT Target Level
              </label>
              <select
                value={level}
                onChange={(e) => handleLevelChange(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl bg-[#faf9f6] border border-[#eeece6] text-xs font-bold text-[#1a1918] focus:outline-none focus:border-[#1a1918]"
              >
                <option value="N5">JLPT N5 (Chapters 1–24)</option>
                <option value="N4">JLPT N4 (Chapters 25–50)</option>
                <option value="N3">JLPT N3 (Intermediate)</option>
              </select>
            </div>

            {/* Chapter Start */}
            <div>
              <label className="block text-xs font-bold text-[#1a1918] mb-1.5 uppercase tracking-wider">
                Start Chapter
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={startChapter}
                onChange={(e) => setStartChapter(parseInt(e.target.value || '1', 10))}
                className="w-full px-3 py-2.5 rounded-2xl bg-[#faf9f6] border border-[#eeece6] text-xs font-bold text-center focus:outline-none focus:border-[#1a1918]"
              />
            </div>

            {/* Chapter End */}
            <div>
              <label className="block text-xs font-bold text-[#1a1918] mb-1.5 uppercase tracking-wider">
                End Chapter
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={endChapter}
                onChange={(e) => setEndChapter(parseInt(e.target.value || '24', 10))}
                className="w-full px-3 py-2.5 rounded-2xl bg-[#faf9f6] border border-[#eeece6] text-xs font-bold text-center focus:outline-none focus:border-[#1a1918]"
              />
            </div>

          </div>

          {/* Process Status message when active */}
          {isUploading && (
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 text-xs flex items-center gap-3">
              <Loader2 className="w-4 h-4 text-[#d93829] animate-spin shrink-0" />
              <span className="font-semibold text-[#1a1918]">{uploadStatusStep}</span>
            </div>
          )}

          {/* Submit button */}
          <div className="pt-4 border-t border-[#eeece6] flex items-center justify-end">
            <button
              type="submit"
              disabled={(activeSourceTab === 'pdf' ? !selectedPdf : selectedImages.length === 0) || isUploading}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#d93829] hover:bg-[#b92a1d] text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Extraction Pipeline...</span>
                </>
              ) : (
                <>
                  <FileUp className="w-4 h-4" />
                  <span>Upload & Extract Vocabulary</span>
                </>
              )}
            </button>
          </div>

        </form>
      )}

    </div>
  );
};
