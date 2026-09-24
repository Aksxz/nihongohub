import { NotificationsResponse } from '../types/notification';
import { 
  TestItem, 
  TestSubmissionResponse, 
  TestProgressItem,
  TestAttemptItem,
  TestAttemptsResponse
} from '../types/test';

/**
 * Central API Client for NihongoHub
 * Connects React frontend with Express/MongoDB Atlas backend.
 */

// Dynamic API base URL supporting production backend (Render) and local dev proxy (Vite)
const RAW_API_URL = (import.meta.env.VITE_API_URL || '').trim();
const CLEAN_URL = RAW_API_URL.replace(/\/+$/, '');
const API_BASE = CLEAN_URL
  ? (CLEAN_URL.endsWith('/api') ? CLEAN_URL : `${CLEAN_URL}/api`)
  : '/api';

function getAuthHeaders(isFormData = false): HeadersInit {
  const headers: Record<string, string> = {};
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  const token = localStorage.getItem('nihongohub_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...getAuthHeaders(isFormData),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const contentType = response.headers.get('content-type') || '';
  let data: any;

  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = { success: false, message: `Invalid JSON response from server (HTTP ${response.status})` };
    }
  } else {
    // Non-JSON response (e.g. proxy HTML error, 502 Bad Gateway, 504 Gateway Timeout)
    const rawText = await response.text().catch(() => '');
    let cleanMessage = `Server returned status ${response.status}`;
    if (rawText.includes('ECONNREFUSED')) {
      cleanMessage = 'Backend server is not running on port 5001. Please start the backend.';
    } else if (response.status === 504 || response.status === 502) {
      cleanMessage = 'Backend server timeout or connection unreachable.';
    } else if (rawText) {
      const stripped = rawText.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
      cleanMessage = stripped.slice(0, 160) || cleanMessage;
    }
    data = { success: false, message: cleanMessage };
  }

  if (!response.ok) {
    if (response.status === 401 && (data?.code === 'SESSION_EXPIRED' || data?.code === 'SESSION_INVALID')) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('nihongohub:session-expired', {
            detail: { message: data.message, code: data.code }
          })
        );
      }
    }
    const errorMsg = data && data.message ? data.message : `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Authentication
  auth: {
    getConfig: () =>
      request<{ success: boolean; authMode: 'password' | 'otp' }>('/auth/config'),

    signup: (userData: { name?: string; email: string; password: string; confirmPassword?: string; selectedLevel?: string }) =>
      request<{ success: boolean; otpPending?: boolean; token?: string; user?: any; message: string }>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(userData)
      }),

    verifySignupOtp: (data: { email: string; otp: string }) =>
      request<{ success: boolean; message: string; redirect?: string }>('/auth/signup/verify-otp', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    // Legacy register alias
    register: (userData: { name?: string; email: string; password: string; selectedLevel?: string }) =>
      request<{ success: boolean; otpPending?: boolean; token?: string; user?: any; message: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      }),

    login: (credentials: { email: string; password: string }) =>
      request<{ success: boolean; otpPending?: boolean; token?: string; user?: any; message?: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      }),

    verifyLoginOtp: (data: { email: string; otp: string }) =>
      request<{ success: boolean; token: string; user: any; message?: string }>('/auth/login/verify-otp', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    resendOtp: (data: { email: string; purpose: 'signup' | 'login' }) =>
      request<{ success: boolean; message: string; waitSeconds?: number }>('/auth/resend-otp', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    logout: (data?: { userId?: string; email?: string }) =>
      request<{ success: boolean; message: string }>('/auth/logout', {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined
      }),

    getMe: () =>
      request<{ success: boolean; user: any }>('/auth/me'),

    promoteAdmin: (email: string, secretKey: string) =>
      request<{ success: boolean; message: string; user: any }>('/auth/promote-admin', {
        method: 'POST',
        body: JSON.stringify({ email, secretKey })
      }),

    continueSession: () =>
      request<{ success: boolean; message: string; lastActivityAt?: string }>('/auth/continue-session', {
        method: 'POST'
      }),

    heartbeat: () =>
      request<{ success: boolean; message: string; lastActivityAt?: string }>('/auth/heartbeat', {
        method: 'POST'
      })
  },

  // Master Vocabulary
  vocabulary: {
    getAll: (params?: { jlpt?: string; chapter?: number | string; customChapterId?: string; destinationType?: string; search?: string; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.jlpt) query.append('jlpt', params.jlpt);
      if (params?.chapter !== undefined) query.append('chapter', params.chapter.toString());
      if (params?.customChapterId) query.append('customChapterId', params.customChapterId);
      if (params?.destinationType) query.append('destinationType', params.destinationType);
      if (params?.search) query.append('search', params.search);
      if (params?.limit !== undefined && params.limit > 0) query.append('limit', params.limit.toString());
      return request<{ success: boolean; count: number; total: number; data: any[] }>(`/vocabulary?${query.toString()}`);
    },

    getChapters: (jlpt?: string) => {
      const query = jlpt ? `?jlpt=${jlpt}` : '';
      return request<{ success: boolean; data: { jlpt: string; chapter: number; count: number; chapterName?: string; title?: string }[] }>(`/vocabulary/chapters${query}`);
    },

    getStructure: (jlpt?: string) => {
      const query = jlpt ? `?jlpt=${jlpt}` : '';
      return request<{
        success: boolean;
        jlpt: string;
        chapters: {
          chapterNumber: number;
          chapterName: string;
          title: string;
          wordCount: number;
          vocabularies: any[];
        }[];
        customChapters?: {
          id: string;
          _id?: string;
          name: string;
          displayName: string;
          japaneseName?: string;
          description?: string;
          jlptLevel: string;
          order: number;
          wordCount: number;
          vocabularies: any[];
        }[];
        extraVocabulary: any[];
        extraVocabularyCount: number;
        totalMasterCount: number;
      }>(`/vocabulary/structure${query}`);
    },

    getById: (id: string) =>
      request<{ success: boolean; data: any }>(`/vocabulary/${id}`)
  },

  // Public Custom Chapters
  customChapters: {
    getAll: (jlpt?: string) => {
      const query = jlpt ? `?jlpt=${jlpt}` : '';
      return request<{ success: boolean; count: number; data: any[] }>(`/custom-chapters${query}`);
    }
  },

  // Master Kanji
  kanji: {
    getAll: (params?: { jlpt?: string; chapter?: number | string; search?: string; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.jlpt) query.append('jlpt', params.jlpt);
      if (params?.chapter !== undefined) query.append('chapter', params.chapter.toString());
      if (params?.search) query.append('search', params.search);
      if (params?.limit !== undefined && params.limit > 0) query.append('limit', params.limit.toString());
      return request<{ success: boolean; count: number; total: number; data: any[] }>(`/kanji?${query.toString()}`);
    },

    getById: (id: string) =>
      request<{ success: boolean; data: any }>(`/kanji/${id}`),

    create: (data: any) =>
      request<{ success: boolean; data: any }>('/kanji', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    update: (id: string, data: any) =>
      request<{ success: boolean; data: any }>(`/kanji/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),

    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/kanji/${id}`, {
        method: 'DELETE'
      })
  },

  // User Vocabulary Customizations (Zero Master Overwrite)
  userVocabulary: {
    getAll: () =>
      request<{ success: boolean; count: number; data: Record<string, any> }>('/user-vocabulary'),

    update: (vocabularyId: string, updates: any) =>
      request<{ success: boolean; message: string; data: any }>(`/user-vocabulary/${vocabularyId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      }),

    hide: (vocabularyId: string) =>
      request<{ success: boolean; message: string; data?: any }>(`/user-vocabulary/${vocabularyId}/hide`, {
        method: 'PUT'
      }),

    unhide: (vocabularyId: string) =>
      request<{ success: boolean; message: string; data?: any }>(`/user-vocabulary/${vocabularyId}/unhide`, {
        method: 'PUT'
      }),

    reset: (vocabularyId: string) =>
      request<{ success: boolean; message: string }>(`/user-vocabulary/${vocabularyId}`, {
        method: 'DELETE'
      })
  },

  // User Kanji Customizations (Zero Master Overwrite)
  userKanji: {
    getAll: () =>
      request<{ success: boolean; count: number; data: Record<string, any> }>('/user-kanji'),

    update: (kanjiId: string, updates: any) =>
      request<{ success: boolean; message: string; data: any }>(`/user-kanji/${kanjiId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      }),

    reset: (kanjiId: string) =>
      request<{ success: boolean; message: string }>(`/user-kanji/${kanjiId}`, {
        method: 'DELETE'
      })
  },

  // Study Progress
  progress: {
    get: () =>
      request<{ success: boolean; data: any }>('/progress'),

    update: (progressData: any) =>
      request<{ success: boolean; message: string; data: any }>('/progress', {
        method: 'PUT',
        body: JSON.stringify(progressData)
      })
  },

  // Private Study Notes
  notes: {
    getAll: () =>
      request<{ success: boolean; count: number; data: any[] }>('/notes'),

    create: (noteData: { title: string; content?: string; category?: string; jlptLevel?: string; chapter?: number | null }) =>
      request<{ success: boolean; data: any }>('/notes', {
        method: 'POST',
        body: JSON.stringify(noteData)
      }),

    update: (id: string, noteData: any) =>
      request<{ success: boolean; data: any }>(`/notes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(noteData)
      }),

    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/notes/${id}`, {
        method: 'DELETE'
      })
  },

  // Quiz Results (User-scoped history & scores)
  quizResults: {
    getAll: () =>
      request<{ success: boolean; count: number; data: any[] }>('/quiz-results'),

    save: (resultData: {
      quizType: string;
      level?: string;
      chapter?: number;
      score: number;
      totalQuestions: number;
      percentage: number;
      details?: any[];
    }) =>
      request<{ success: boolean; message: string; data: any }>('/quiz-results', {
        method: 'POST',
        body: JSON.stringify(resultData)
      })
  },

  // Admin APIs (requires role === 'admin')
  admin: {
    auth: {
      login: (credentials: { email: string; password: string }) =>
        request<{ success: boolean; token: string; user: any }>('/admin/auth/login', {
          method: 'POST',
          body: JSON.stringify(credentials)
        }),

      logout: () =>
        request<{ success: boolean; message: string }>('/admin/auth/logout', {
          method: 'POST'
        }),

      getMe: () =>
        request<{ success: boolean; user: any }>('/admin/auth/me')
    },

    getStatistics: () =>
      request<{ success: boolean; data: any }>('/admin/statistics'),

    getUsers: () =>
      request<{ success: boolean; count: number; data: any[] }>('/admin/users'),

    updateUserRole: (id: string, role: 'user' | 'admin') =>
      request<{ success: boolean; message: string; data: any }>(`/admin/users/${id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role })
      }),

    // Vocabulary CRUD
    createVocabulary: (data: any) =>
      request<{ success: boolean; data: any }>('/admin/vocabulary', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    updateVocabulary: (id: string, data: any) =>
      request<{ success: boolean; data: any }>(`/admin/vocabulary/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),

    deleteVocabulary: (id: string) =>
      request<{ success: boolean; message: string }>(`/admin/vocabulary/${id}`, {
        method: 'DELETE'
      }),

    bulkDeleteVocabulary: (ids: string[]) =>
      request<{ success: boolean; count: number; message: string }>('/admin/vocabulary/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids })
      }),

    // Kanji CRUD
    createKanji: (data: any) =>
      request<{ success: boolean; data: any }>('/admin/kanji', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    updateKanji: (id: string, data: any) =>
      request<{ success: boolean; data: any }>(`/admin/kanji/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),

    deleteKanji: (id: string) =>
      request<{ success: boolean; message: string }>(`/admin/kanji/${id}`, {
        method: 'DELETE'
      }),

    bulkDeleteKanji: (ids: string[]) =>
      request<{ success: boolean; count: number; message: string }>('/admin/kanji/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids })
      }),

    // PDF Import Pipeline
    uploadPdf: (file: File, level: string, startChapter: number, endChapter: number) => {
      const formData = new FormData();
      formData.append('pdfFile', file);
      formData.append('level', level);
      formData.append('startChapter', startChapter.toString());
      formData.append('endChapter', endChapter.toString());

      return request<{ success: boolean; message: string; data: any }>('/admin/import/pdf', {
        method: 'POST',
        body: formData
      });
    },

    // Scan / Photo Image OCR Import Pipeline
    uploadImages: (files: File[], level: string, startChapter: number, endChapter: number) => {
      const formData = new FormData();
      files.forEach(f => formData.append('imageFiles', f));
      formData.append('level', level);
      formData.append('startChapter', startChapter.toString());
      formData.append('endChapter', endChapter.toString());

      return request<{ success: boolean; message: string; data: any }>('/admin/import/images', {
        method: 'POST',
        body: formData
      });
    },

    getImports: () =>
      request<{ success: boolean; count: number; data: any[] }>('/admin/imports'),

    getImportById: (id: string) =>
      request<{ success: boolean; data: any }>(`/admin/imports/${id}`),

    updateImportItem: (importId: string, itemId: string, itemData: any) =>
      request<{ success: boolean; message: string; data: any }>(`/admin/imports/${importId}/item/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(itemData)
      }),

    deleteImportItem: (importId: string, itemId: string) =>
      request<{ success: boolean; message: string }>(`/admin/imports/${importId}/item/${itemId}`, {
        method: 'DELETE'
      }),

    approveImport: (importId: string, options?: { itemIds?: string[]; replaceDuplicates?: boolean }) =>
      request<{ success: boolean; message: string; data: any }>(`/admin/imports/${importId}/approve`, {
        method: 'POST',
        body: JSON.stringify(options || {})
      }),

    rejectImport: (importId: string, itemIds?: string[]) =>
      request<{ success: boolean; message: string }>(`/admin/imports/${importId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ itemIds })
      }),

    // Admin Custom Chapters CRUD
    customChapters: {
      create: (data: { name: string; displayName?: string; japaneseName?: string; description?: string; jlptLevel?: string; order?: number }) =>
        request<{ success: boolean; data: any }>('/admin/custom-chapters', {
          method: 'POST',
          body: JSON.stringify(data)
        }),

      update: (id: string, data: any) =>
        request<{ success: boolean; data: any }>(`/admin/custom-chapters/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        }),

      delete: (id: string) =>
        request<{ success: boolean; message: string; reassignedCount: number }>(`/admin/custom-chapters/${id}`, {
          method: 'DELETE'
        })
    },

    // CSV Import Pipeline
    importCsvPreview: (file: File, destinationConfig: { destinationType: string; chapter?: number; customChapterId?: string; jlptLevel?: string }) => {
      const formData = new FormData();
      formData.append('csvFile', file);
      formData.append('destinationType', destinationConfig.destinationType);
      if (destinationConfig.chapter !== undefined) formData.append('chapter', destinationConfig.chapter.toString());
      if (destinationConfig.customChapterId) formData.append('customChapterId', destinationConfig.customChapterId);
      if (destinationConfig.jlptLevel) formData.append('jlptLevel', destinationConfig.jlptLevel);

      return request<{
        success: boolean;
        data: {
          items: any[];
          totalRows: number;
          validRows: number;
          invalidRows: number;
          errors: any[];
          duplicatesCount: number;
          destination: any;
        };
      }>('/admin/import/csv-preview', {
        method: 'POST',
        body: formData
      });
    },

    importCsvCommit: (data: {
      items: any[];
      destinationType: string;
      chapter?: number;
      customChapterId?: string;
      jlptLevel?: string;
      filename?: string;
    }) =>
      request<{ success: boolean; message: string; insertedCount: number; importId: string }>('/admin/import/csv-commit', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    // Test Attempts & Test Results (Admin)
    getTestAttempts: (params?: { page?: number; limit?: number; q?: string; status?: string; testId?: string; userId?: string }) =>
      api.tests.adminGetAttempts(params),

    getTestAttemptById: (id: string) =>
      api.tests.adminGetAttemptById(id),

    deleteTestAttempt: (id: string) =>
      api.tests.adminDeleteAttempt(id)
  },

  // Grammar Patterns
  patterns: {
    getAll: (params?: { jlpt?: string; chapter?: number | string; customChapterId?: string; destinationType?: string; search?: string }) => {
      const query = new URLSearchParams();
      if (params?.jlpt) query.append('jlpt', params.jlpt);
      if (params?.chapter !== undefined) query.append('chapter', params.chapter.toString());
      if (params?.customChapterId) query.append('customChapterId', params.customChapterId);
      if (params?.destinationType) query.append('destinationType', params.destinationType);
      if (params?.search) query.append('search', params.search);
      return request<{ success: boolean; count: number; total: number; data: any[] }>(`/patterns?${query.toString()}`);
    },

    list: (params?: { jlpt?: string; chapter?: number | string; customChapterId?: string; destinationType?: string; search?: string }) =>
      api.patterns.getAll(params),

    getChapters: (jlpt?: string) => {
      const query = jlpt ? `?jlpt=${jlpt}` : '';
      return request<{ success: boolean; data: { jlpt: string; chapter: number; count: number; chapterName: string; title: string; type?: string; customChapterId?: string }[] }>(`/patterns/chapters${query}`);
    },

    getById: (id: string) =>
      request<{ success: boolean; data: any }>(`/patterns/${id}`),

    get: (id: string) =>
      api.patterns.getById(id),

    create: (data: any) =>
      request<{ success: boolean; message: string; data: any }>('/patterns', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    update: (id: string, data: any) =>
      request<{ success: boolean; message: string; data: any }>(`/patterns/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),

    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/patterns/${id}`, {
        method: 'DELETE'
      }),

    previewCsv: (data: FormData | { csvText: string; destinationType?: string; chapter?: number; customChapterId?: string; jlptLevel?: string }) => {
      const isFormData = data instanceof FormData;
      return request<{
        success: boolean;
        message?: string;
        totalRows: number;
        validRows: any[];
        duplicateCount: number;
        newCount: number;
        previewRows: any[];
      }>('/patterns/csv/preview', {
        method: 'POST',
        body: isFormData ? data : JSON.stringify(data)
      });
    },

    commitCsv: (data: { rows: any[]; mode: 'skip' | 'update'; destinationType: string; chapter?: number; customChapterId?: string }) =>
      request<{
        success: boolean;
        message: string;
        inserted: number;
        updated: number;
        skipped: number;
        total: number;
      }>('/patterns/csv/commit', {
        method: 'POST',
        body: JSON.stringify(data)
      })
  },

  // Reading Passages & Exercises
  readings: {
    getAll: (params?: { jlpt?: string; search?: string }) => {
      const query = new URLSearchParams();
      if (params?.jlpt) query.append('jlpt', params.jlpt);
      if (params?.search) query.append('search', params.search);
      return request<{ success: boolean; count: number; data: any[] }>(`/readings?${query.toString()}`);
    },

    list: (params?: { jlpt?: string; search?: string }) =>
      api.readings.getAll(params),

    getById: (id: string) =>
      request<{ success: boolean; data: any }>(`/readings/${id}`),

    get: (id: string) =>
      api.readings.getById(id),

    getAdminAll: (params?: { jlpt?: string; search?: string }) => {
      const query = new URLSearchParams();
      if (params?.jlpt) query.append('jlpt', params.jlpt);
      if (params?.search) query.append('search', params.search);
      return request<{ success: boolean; count: number; data: any[] }>(`/readings/admin/all?${query.toString()}`);
    },

    adminGetAll: (params?: { jlpt?: string; search?: string }) =>
      api.readings.getAdminAll(params),

    getAdminById: (id: string) =>
      request<{ success: boolean; data: any }>(`/readings/admin/${id}`),

    adminGetById: (id: string) =>
      api.readings.getAdminById(id),

    create: (data: any) =>
      request<{ success: boolean; message: string; data: any }>('/readings', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    update: (id: string, data: any) =>
      request<{ success: boolean; message: string; data: any }>(`/readings/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),

    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/readings/${id}`, {
        method: 'DELETE'
      }),

    submit: (id: string, answersOrPayload: any) => {
      const answers = (answersOrPayload && typeof answersOrPayload === 'object' && answersOrPayload.answers)
        ? answersOrPayload.answers
        : answersOrPayload;
      return request<{
        success: boolean;
        readingId: string;
        readingTitle: string;
        paragraphNumber: number;
        score: number;
        totalQuestions: number;
        percentage: number;
        progressId?: string | null;
        results: any[];
        data?: any;
      }>(`/readings/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers })
      });
    },

    submitAnswers: (id: string, answersOrPayload: any) =>
      api.readings.submit(id, answersOrPayload),

    previewCsv: (data: FormData | { csvText: string; jlptLevel?: string }) => {
      const isFormData = data instanceof FormData;
      return request<{
        success: boolean;
        message?: string;
        totalRows: number;
        validReadings: any[];
        duplicateCount: number;
        newCount: number;
        previewReadings: any[];
      }>('/readings/csv/preview', {
        method: 'POST',
        body: isFormData ? data : JSON.stringify(data)
      });
    },

    commitCsv: (data: { readings: any[]; mode: 'skip' | 'update' }) =>
      request<{
        success: boolean;
        message: string;
        inserted: number;
        updated: number;
        skipped: number;
        total: number;
      }>('/readings/csv/commit', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getMyProgress: () =>
      request<{ success: boolean; count: number; data: any[] }>('/readings/progress/me')
  },

  // Listening Exercises & Audio Speech
  listening: {
    getAll: (params?: { jlpt?: string; search?: string }) => {
      const query = new URLSearchParams();
      if (params?.jlpt) query.append('jlpt', params.jlpt);
      if (params?.search) query.append('search', params.search);
      return request<{ success: boolean; count: number; data: any[] }>(`/listening?${query.toString()}`);
    },

    list: (params?: { jlpt?: string; search?: string }) =>
      api.listening.getAll(params),

    getById: (id: string) =>
      request<{ success: boolean; data: any }>(`/listening/${id}`),

    get: (id: string) =>
      api.listening.getById(id),

    getAudioText: (id: string) =>
      request<{ success: boolean; audioText: string; title: string; listeningNumber: number }>(`/listening/${id}/audio-text`),

    getAdminAll: (params?: { jlpt?: string; search?: string }) => {
      const query = new URLSearchParams();
      if (params?.jlpt) query.append('jlpt', params.jlpt);
      if (params?.search) query.append('search', params.search);
      return request<{ success: boolean; count: number; data: any[] }>(`/listening/admin/all?${query.toString()}`);
    },

    adminGetAll: (params?: { jlpt?: string; search?: string }) =>
      api.listening.getAdminAll(params),

    getAdminById: (id: string) =>
      request<{ success: boolean; data: any }>(`/listening/admin/${id}`),

    adminGetById: (id: string) =>
      api.listening.getAdminById(id),

    create: (data: any) =>
      request<{ success: boolean; message: string; data: any }>('/listening', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    update: (id: string, data: any) =>
      request<{ success: boolean; message: string; data: any }>(`/listening/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),

    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/listening/${id}`, {
        method: 'DELETE'
      }),

    submit: (id: string, answersOrPayload: any) => {
      const answers = (answersOrPayload && typeof answersOrPayload === 'object' && answersOrPayload.answers)
        ? answersOrPayload.answers
        : answersOrPayload;
      return request<{
        success: boolean;
        listeningId: string;
        listeningTitle: string;
        listeningNumber: number;
        score: number;
        totalQuestions: number;
        percentage: number;
        progressId?: string | null;
        results: any[];
        data?: any;
      }>(`/listening/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers })
      });
    },

    submitAnswers: (id: string, answersOrPayload: any) =>
      api.listening.submit(id, answersOrPayload),

    previewCsv: (data: FormData | { csvText: string; jlptLevel?: string }) => {
      const isFormData = data instanceof FormData;
      return request<{
        success: boolean;
        message?: string;
        totalRows: number;
        validListenings: any[];
        duplicateCount: number;
        newCount: number;
        previewListenings: any[];
      }>('/listening/csv/preview', {
        method: 'POST',
        body: isFormData ? data : JSON.stringify(data)
      });
    },

    commitCsv: (data: { listenings?: any[]; rows?: any[]; mode?: 'skip' | 'update'; duplicateMode?: 'skip' | 'update' }) =>
      request<{
        success: boolean;
        message: string;
        inserted: number;
        updated: number;
        skipped: number;
        total: number;
      }>('/listening/csv/commit', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getMyProgress: () =>
      request<{ success: boolean; count: number; data: any[] }>('/listening/progress/me')
  },

  // Notifications
  notifications: {
    getAll: () =>
      request<NotificationsResponse>('/notifications'),

    list: () =>
      api.notifications.getAll(),

    markAsRead: (id: string) =>
      request<{ success: boolean; message: string }>(`/notifications/${id}/read`, {
        method: 'PATCH'
      }),

    markAllAsRead: () =>
      request<{ success: boolean; message: string }>('/notifications/read-all', {
        method: 'PATCH'
      })
  },

  // Tests Module
  tests: {
    getAll: () =>
      request<{ success: boolean; count: number; data: TestItem[] }>('/tests'),

    list: () =>
      api.tests.getAll(),

    getById: (id: string) =>
      request<{ success: boolean; data: TestItem }>(`/tests/${id}`),

    get: (id: string) =>
      api.tests.getById(id),

    startAttempt: (id: string) =>
      request<{ success: boolean; message: string; attemptId: string; startedAt: string }>(`/tests/${id}/start`, {
        method: 'POST'
      }),

    submit: (id: string, answersOrPayload: any, attemptId?: string) => {
      let answers = answersOrPayload;
      let finalAttemptId = attemptId;
      if (answersOrPayload && typeof answersOrPayload === 'object' && answersOrPayload.answers) {
        answers = answersOrPayload.answers;
        if (!finalAttemptId && answersOrPayload.attemptId) {
          finalAttemptId = answersOrPayload.attemptId;
        }
      }
      return request<TestSubmissionResponse>(`/tests/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers, attemptId: finalAttemptId })
      });
    },

    submitAnswers: (id: string, answersOrPayload: any, attemptId?: string) =>
      api.tests.submit(id, answersOrPayload, attemptId),

    getMyProgress: () =>
      request<{ success: boolean; data: TestProgressItem[] }>('/tests/progress/me'),

    adminGetAll: () =>
      request<{ success: boolean; count: number; data: TestItem[] }>('/tests/admin/all'),

    getAdminAll: () =>
      api.tests.adminGetAll(),

    adminGetAttempts: (params?: { page?: number; limit?: number; q?: string; status?: string; testId?: string; userId?: string }) => {
      const query = new URLSearchParams();
      if (params?.page) query.append('page', params.page.toString());
      if (params?.limit) query.append('limit', params.limit.toString());
      if (params?.q) query.append('q', params.q);
      if (params?.status) query.append('status', params.status);
      if (params?.testId) query.append('testId', params.testId);
      if (params?.userId) query.append('userId', params.userId);
      return request<TestAttemptsResponse>(`/tests/admin/attempts?${query.toString()}`);
    },

    adminGetAttemptById: (id: string) =>
      request<{ success: boolean; data: TestAttemptItem }>(`/tests/admin/attempts/${id}`),

    adminDeleteAttempt: (id: string) =>
      request<{ success: boolean; message: string }>(`/tests/admin/attempts/${id}`, {
        method: 'DELETE'
      }),

    adminGetById: (id: string) =>
      request<{ success: boolean; data: TestItem }>(`/tests/admin/${id}`),

    create: (testData: Partial<TestItem>) =>
      request<{ success: boolean; data: TestItem; message: string }>('/tests', {
        method: 'POST',
        body: JSON.stringify(testData)
      }),

    update: (id: string, testData: Partial<TestItem>) =>
      request<{ success: boolean; data: TestItem; message: string }>(`/tests/${id}`, {
        method: 'PUT',
        body: JSON.stringify(testData)
      }),

    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/tests/${id}`, {
        method: 'DELETE'
      }),

    toggle: (id: string) =>
      request<{ success: boolean; isActive: boolean; message: string }>(`/tests/${id}/toggle`, {
        method: 'PATCH'
      }),

    previewCsv: (data: FormData | { csvText: string }) => {
      const isFormData = data instanceof FormData;
      return request<{
        success: boolean;
        message?: string;
        totalTests: number;
        totalQuestions: number;
        duplicateCount: number;
        newCount: number;
        previewTests: any[];
      }>('/tests/csv/preview', {
        method: 'POST',
        body: isFormData ? data : JSON.stringify(data)
      });
    },

    commitCsv: (data: { tests: any[]; mode?: 'skip' | 'update'; duplicateMode?: 'skip' | 'update' }) =>
      request<{
        success: boolean;
        message: string;
        inserted: number;
        updated: number;
        skipped: number;
        total: number;
      }>('/tests/csv/commit', {
        method: 'POST',
        body: JSON.stringify(data)
      })
  }
};
