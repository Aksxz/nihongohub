import React, { useState, useEffect, useCallback } from 'react';
import { 
  ClipboardList, 
  Search, 
  Trash2, 
  Eye, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User, 
  Mail, 
  Award, 
  AlertCircle, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  Check,
  HelpCircle
} from 'lucide-react';
import { api } from '../../services/api';
import { TestAttemptItem, TestItem } from '../../types/test';

export const AdminTestAttempts: React.FC = () => {
  const [attempts, setAttempts] = useState<TestAttemptItem[]>([]);
  const [tests, setTests] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [testFilter, setTestFilter] = useState<string>('');

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(15);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // View Modal state
  const [selectedAttempt, setSelectedAttempt] = useState<TestAttemptItem | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);

  // Delete Confirm Modal state
  const [attemptToDelete, setAttemptToDelete] = useState<TestAttemptItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Load available tests for filter dropdown
  useEffect(() => {
    api.tests.adminGetAll()
      .then(res => {
        if (res && res.data) {
          setTests(res.data);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch attempts with current search and filters
  const fetchAttempts = useCallback(async (targetPage = page) => {
    try {
      setLoading(true);
      setError(null);

      const res = await api.tests.adminGetAttempts({
        page: targetPage,
        limit,
        q: searchTerm.trim() || undefined,
        status: statusFilter || undefined,
        testId: testFilter || undefined
      });

      if (res && res.success) {
        setAttempts(res.data || res.attempts || []);
        setTotalCount(res.total || 0);
        setTotalPages(res.totalPages || 1);
        setPage(res.page || targetPage);
      }
    } catch (err: any) {
      console.error('Failed to load test attempts:', err);
      setError(err?.message || 'Failed to load test attempts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, statusFilter, testFilter]);

  // Debounced search / trigger on filter change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAttempts(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter, testFilter]);

  const handleRefresh = () => {
    fetchAttempts(page);
  };

  // Open Attempt Detail Modal
  const handleViewAttempt = async (attempt: TestAttemptItem) => {
    setIsViewModalOpen(true);
    setIsDetailLoading(true);
    try {
      const res = await api.tests.adminGetAttemptById(attempt.id || attempt._id);
      if (res && res.success && res.data) {
        setSelectedAttempt(res.data);
      } else {
        setSelectedAttempt(attempt);
      }
    } catch (err: any) {
      console.error('Failed to load attempt details:', err);
      setSelectedAttempt(attempt);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Confirm and Execute Deletion
  const handleDeleteAttempt = async () => {
    if (!attemptToDelete) return;
    try {
      setIsDeleting(true);
      setError(null);
      const res = await api.tests.adminDeleteAttempt(attemptToDelete.id || attemptToDelete._id);
      if (res && res.success) {
        setSuccessMsg('Test attempt deleted successfully.');
        setTimeout(() => setSuccessMsg(null), 3500);
        setAttemptToDelete(null);
        fetchAttempts(page);
      }
    } catch (err: any) {
      console.error('Failed to delete test attempt:', err);
      setError(err?.message || 'Could not delete test attempt.');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'Not submitted';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDuration = (seconds?: number | null) => {
    if (seconds === undefined || seconds === null) return 'N/A';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#eeece6] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase tracking-wider">
              Student Records
            </span>
            <span className="text-xs text-[#8c8880] font-mono">
              Total: {totalCount} attempts
            </span>
          </div>
          <h1 className="text-2xl font-bold font-japanese text-[#1a1918] flex items-center gap-2.5">
            <ClipboardList className="w-6 h-6 text-amber-600" />
            <span>Test Attempts & Results</span>
          </h1>
          <p className="text-xs text-[#8c8880] max-w-2xl leading-relaxed">
            Live inspection of all student test attempts. Review start and submit timestamps, answer breakdowns, scores, and manage attempt histories.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#faf9f6] hover:bg-[#f2f0ea] border border-[#eeece6] text-xs font-bold text-[#1a1918] transition-all cursor-pointer shadow-xs disabled:opacity-50"
            title="Refresh attempts list"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-600' : 'text-[#8c8880]'}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span className="flex-1 font-medium">{error}</span>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="flex-1 font-medium">{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#eeece6] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#8c8880] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by User Name, Email, or Test Name..."
            className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-[#faf9f6] border border-[#eeece6] text-xs font-medium text-[#1a1918] placeholder:text-[#8c8880] focus:outline-none focus:border-[#1a1918] transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8c8880] hover:text-[#1a1918]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#faf9f6] border border-[#eeece6] text-xs">
            <Filter className="w-3.5 h-3.5 text-[#8c8880]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-[#1a1918] focus:outline-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="started">Started</option>
            </select>
          </div>

          {/* Test Filter */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#faf9f6] border border-[#eeece6] text-xs max-w-[200px] sm:max-w-[260px]">
            <select
              value={testFilter}
              onChange={(e) => setTestFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-[#1a1918] focus:outline-none cursor-pointer truncate w-full"
            >
              <option value="">All Tests ({tests.length})</option>
              {tests.map(t => (
                <option key={t.id || t._id} value={t.id || t._id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          {(searchTerm || statusFilter || testFilter) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setTestFilter('');
              }}
              className="px-3 py-2 rounded-2xl text-xs font-bold text-[#8c8880] hover:text-[#1a1918] hover:bg-[#f2f0ea] transition-all cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Attempts Table */}
      <div className="bg-white rounded-3xl border border-[#eeece6] shadow-xs overflow-hidden">
        {loading && attempts.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-9 h-9 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs text-[#8c8880] font-medium">Loading test attempts...</p>
          </div>
        ) : attempts.length === 0 ? (
          <div className="py-20 px-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-100">
              <ClipboardList className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#1a1918]">No test attempts found</h3>
            <p className="text-xs text-[#8c8880] max-w-sm mx-auto">
              {searchTerm || statusFilter || testFilter
                ? 'No attempts matched your search or filter criteria. Try clearing filters.'
                : 'No students have started or submitted tests yet. Once a student takes a test, records will appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#eeece6] bg-[#faf9f6] text-[#8c8880] uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-3.5 px-4">User Name</th>
                  <th className="py-3.5 px-4">User Email</th>
                  <th className="py-3.5 px-4">Test Name</th>
                  <th className="py-3.5 px-4">Opened At</th>
                  <th className="py-3.5 px-4">Closed At</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-center">Score</th>
                  <th className="py-3.5 px-4 text-center">Total Marks</th>
                  <th className="py-3.5 px-4 text-center">Percentage</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eeece6]">
                {attempts.map((attempt) => {
                  const isSubmitted = attempt.status === 'submitted';
                  return (
                    <tr 
                      key={attempt.id || attempt._id}
                      className="hover:bg-[#faf9f6]/70 transition-colors group"
                    >
                      {/* User Name */}
                      <td className="py-3.5 px-4 font-semibold text-[#1a1918] whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {(attempt.userName || 'U').charAt(0).toUpperCase()}
                          </div>
                          <span>{attempt.userName || 'Anonymous'}</span>
                        </div>
                      </td>

                      {/* User Email */}
                      <td className="py-3.5 px-4 text-[#6e6b66] font-mono text-[11px] whitespace-nowrap">
                        {attempt.userEmail || '—'}
                      </td>

                      {/* Test Name */}
                      <td className="py-3.5 px-4 font-medium text-[#1a1918] max-w-[200px] truncate" title={attempt.testTitle}>
                        {attempt.testTitle}
                      </td>

                      {/* Opened At */}
                      <td className="py-3.5 px-4 text-[#6e6b66] whitespace-nowrap text-[11px]">
                        {formatDate(attempt.startedAt)}
                      </td>

                      {/* Closed At */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-[11px]">
                        {isSubmitted ? (
                          <span className="text-[#6e6b66]">{formatDate(attempt.submittedAt)}</span>
                        ) : (
                          <span className="text-[#a8a29e] italic">Not submitted</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isSubmitted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Submitted</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            <span>Started</span>
                          </span>
                        )}
                      </td>

                      {/* Score */}
                      <td className="py-3.5 px-4 text-center font-bold text-[#1a1918] whitespace-nowrap">
                        {isSubmitted ? `${attempt.score}/${attempt.totalMarks}` : '—'}
                      </td>

                      {/* Total Marks */}
                      <td className="py-3.5 px-4 text-center text-[#6e6b66] font-medium whitespace-nowrap">
                        {attempt.totalMarks || '—'}
                      </td>

                      {/* Percentage */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {isSubmitted ? (
                          <span className={`inline-block px-2 py-0.5 rounded-md font-mono font-bold text-[11px] ${
                            attempt.percentage >= 80 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : attempt.percentage >= 60 
                                ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {attempt.percentage}%
                          </span>
                        ) : (
                          <span className="text-[#a8a29e] font-mono">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewAttempt(attempt)}
                            className="p-1.5 rounded-xl text-[#6e6b66] hover:text-[#1a1918] hover:bg-[#eeece6] transition-colors cursor-pointer"
                            title="View Attempt Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setAttemptToDelete(attempt)}
                            className="p-1.5 rounded-xl text-[#8c8880] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Attempt"
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

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-[#eeece6] flex items-center justify-between gap-4 flex-wrap bg-[#faf9f6]/40">
            <div className="text-xs text-[#8c8880] font-medium">
              Showing {(page - 1) * limit + 1} - {Math.min(page * limit, totalCount)} of {totalCount} attempts
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => fetchAttempts(page - 1)}
                disabled={page <= 1 || loading}
                className="p-2 rounded-xl border border-[#eeece6] bg-white text-[#1a1918] hover:bg-[#faf9f6] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1.5 text-xs font-bold text-[#1a1918] bg-white border border-[#eeece6] rounded-xl font-mono">
                {page} / {totalPages}
              </span>

              <button
                onClick={() => fetchAttempts(page + 1)}
                disabled={page >= totalPages || loading}
                className="p-2 rounded-xl border border-[#eeece6] bg-white text-[#1a1918] hover:bg-[#faf9f6] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: VIEW ATTEMPT DETAILS & QUESTION-BY-QUESTION BREAKDOWN              */}
      {/* ========================================================================= */}
      {isViewModalOpen && selectedAttempt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-[#eeece6] shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-pop-in">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-[#eeece6] flex items-start justify-between gap-4 bg-[#faf9f6]/60">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] uppercase tracking-wider">
                    Attempt Breakdown
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedAttempt.status === 'submitted'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {selectedAttempt.status === 'submitted' ? 'Submitted' : 'Started'}
                  </span>
                </div>
                <h2 className="text-xl font-bold font-japanese text-[#1a1918]">
                  {selectedAttempt.testTitle}
                </h2>
                <p className="text-xs text-[#8c8880] font-mono">
                  Attempt ID: {selectedAttempt.id || selectedAttempt._id}
                </p>
              </div>

              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedAttempt(null);
                }}
                className="p-2 rounded-xl text-[#8c8880] hover:text-[#1a1918] hover:bg-[#eeece6] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isDetailLoading ? (
                <div className="py-12 flex flex-col items-center justify-center">
                  <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-xs text-[#8c8880]">Loading full breakdown...</p>
                </div>
              ) : (
                <>
                  {/* Metadata Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* User Info */}
                    <div className="p-4 rounded-2xl bg-[#faf9f6] border border-[#eeece6] space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#1a1918]">
                        <User className="w-3.5 h-3.5 text-amber-600" />
                        <span>User Information</span>
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="font-semibold text-[#1a1918]">{selectedAttempt.userName || 'Anonymous'}</div>
                        <div className="text-[11px] text-[#6e6b66] font-mono break-all">{selectedAttempt.userEmail || 'No email'}</div>
                        <div className="text-[10px] text-[#8c8880] font-mono pt-1">User ID: {selectedAttempt.userId}</div>
                      </div>
                    </div>

                    {/* Timing */}
                    <div className="p-4 rounded-2xl bg-[#faf9f6] border border-[#eeece6] space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#1a1918]">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Timing</span>
                      </div>
                      <div className="text-xs space-y-1">
                        <div>
                          <span className="text-[#8c8880]">Opened: </span>
                          <span className="font-medium text-[#1a1918]">{formatDate(selectedAttempt.startedAt)}</span>
                        </div>
                        <div>
                          <span className="text-[#8c8880]">Closed: </span>
                          <span className="font-medium text-[#1a1918]">{formatDate(selectedAttempt.submittedAt)}</span>
                        </div>
                        <div>
                          <span className="text-[#8c8880]">Duration: </span>
                          <span className="font-bold font-mono text-[#1a1918]">{formatDuration(selectedAttempt.durationSeconds)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Result Summary */}
                    <div className="p-4 rounded-2xl bg-[#faf9f6] border border-[#eeece6] space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#1a1918]">
                        <Award className="w-3.5 h-3.5 text-amber-600" />
                        <span>Score Summary</span>
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[#8c8880]">Score:</span>
                          <span className="font-bold text-base text-[#1a1918]">
                            {selectedAttempt.score} / {selectedAttempt.totalMarks}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#8c8880]">Percentage:</span>
                          <span className="font-bold text-sm text-amber-700">
                            {selectedAttempt.percentage}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#8c8880]">Status:</span>
                          <span className="font-semibold text-xs text-[#1a1918] capitalize">
                            {selectedAttempt.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Question-by-Question Result */}
                  <div className="space-y-4 pt-2">
                    <h3 className="text-sm font-bold text-[#1a1918] flex items-center justify-between">
                      <span>Question Breakdown ({selectedAttempt.answers ? selectedAttempt.answers.length : 0})</span>
                      <span className="text-xs font-normal text-[#8c8880]">
                        Admin-only detailed view
                      </span>
                    </h3>

                    {!selectedAttempt.answers || selectedAttempt.answers.length === 0 ? (
                      <div className="p-6 rounded-2xl bg-[#faf9f6] text-center text-xs text-[#8c8880]">
                        No question-by-question breakdown available for this attempt. (The test may have been opened but not submitted yet).
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedAttempt.answers.map((ans, idx) => {
                          const isCorrect = !!ans.isCorrect;
                          return (
                            <div 
                              key={ans.questionId || idx}
                              className={`p-4 rounded-2xl border transition-all ${
                                isCorrect 
                                  ? 'bg-emerald-50/40 border-emerald-200' 
                                  : 'bg-rose-50/40 border-rose-200'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex items-center gap-2">
                                  <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                    isCorrect ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                                  }`}>
                                    {idx + 1}
                                  </span>
                                  <span className="text-xs font-bold text-[#1a1918]">
                                    {ans.questionText || `Question ${idx + 1}`}
                                  </span>
                                </div>

                                <div className="shrink-0 flex items-center gap-1.5">
                                  <span className="px-2 py-0.5 rounded-md bg-white border border-[#eeece6] text-[10px] font-mono text-[#6e6b66] uppercase">
                                    {ans.questionType?.replace('_', ' ') || 'Question'}
                                  </span>
                                  {isCorrect ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Correct</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700">
                                      <XCircle className="w-3.5 h-3.5" />
                                      <span>Incorrect</span>
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Options if MCQ */}
                              {ans.options && ans.options.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 my-2.5">
                                  {ans.options.map((opt) => {
                                    const isChosen = (ans.userAnswer || '').trim().toUpperCase() === opt.label.toUpperCase();
                                    const isAnswerKey = (ans.correctAnswer || '').trim().toUpperCase() === opt.label.toUpperCase();
                                    return (
                                      <div
                                        key={opt.label}
                                        className={`px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 border ${
                                          isAnswerKey
                                            ? 'bg-emerald-100/70 border-emerald-300 text-emerald-900 font-semibold'
                                            : isChosen
                                              ? 'bg-rose-100/70 border-rose-300 text-rose-900 font-semibold'
                                              : 'bg-white/80 border-[#eeece6] text-[#6e6b66]'
                                        }`}
                                      >
                                        <span className="w-5 h-5 rounded-md bg-white/90 border border-current text-[10px] font-bold flex items-center justify-center shrink-0">
                                          {opt.label}
                                        </span>
                                        <span className="flex-1 truncate">{opt.text}</span>
                                        {isAnswerKey && (
                                          <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Answer comparison */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                                <div className="p-2.5 rounded-xl bg-white/80 border border-[#eeece6]">
                                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#8c8880] mb-0.5">
                                    Student Answer:
                                  </div>
                                  <div className={`font-mono font-medium ${isCorrect ? 'text-emerald-800' : 'text-rose-800'}`}>
                                    {ans.userAnswer || <span className="text-[#a8a29e] italic font-sans">No answer submitted</span>}
                                  </div>
                                </div>

                                <div className="p-2.5 rounded-xl bg-white/80 border border-[#eeece6]">
                                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#8c8880] mb-0.5">
                                    Correct Answer:
                                  </div>
                                  <div className="font-mono font-semibold text-emerald-800">
                                    {ans.correctAnswer}
                                  </div>
                                </div>
                              </div>

                              {/* Explanation */}
                              {ans.explanation && (
                                <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/70 text-xs text-amber-900 flex items-start gap-2">
                                  <HelpCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                  <div>
                                    <span className="font-bold">Explanation: </span>
                                    <span>{ans.explanation}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#eeece6] bg-[#faf9f6] flex items-center justify-between">
              <button
                onClick={() => {
                  const toDel = selectedAttempt;
                  setIsViewModalOpen(false);
                  setSelectedAttempt(null);
                  setAttemptToDelete(toDel);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Attempt</span>
              </button>

              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedAttempt(null);
                }}
                className="px-5 py-2 rounded-xl bg-[#1a1918] hover:bg-neutral-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE ATTEMPT CONFIRMATION                                        */}
      {/* ========================================================================= */}
      {attemptToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-[#eeece6] shadow-2xl max-w-md w-full p-6 space-y-4 animate-pop-in">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-[#1a1918]">Delete Test Attempt?</h3>
              <p className="text-xs text-[#8c8880] leading-relaxed">
                Are you sure you want to delete this test attempt record for{' '}
                <span className="font-semibold text-[#1a1918]">{attemptToDelete.userName}</span> ({attemptToDelete.testTitle})?
              </p>
              <p className="text-[11px] text-amber-700 bg-amber-50 rounded-xl p-2.5 border border-amber-200 mt-2">
                This will only delete this single attempt record. The user account, test, and learning progress remain untouched.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setAttemptToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl border border-[#eeece6] hover:bg-[#faf9f6] text-xs font-bold text-[#6e6b66] transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAttempt}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
