import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  VocabularyItem, 
  PracticeSession, 
  AppSettings, 
  AppView, 
  PracticeModeType,
  StudyNote 
} from './types/vocab';
import { 
  KanjiItem, 
  KanjiPracticeSession, 
  KanjiPracticeModeType,
  JLPTLevel
} from './types/kanji';
import { ChapterItem } from './types/chapter';
import { 
  UserSession, 
  UserVocabData, 
  UserKanjiData, 
  DisplayVocabularyItem, 
  DisplayKanjiItem 
} from './types/user';
import { idb, DEFAULT_SETTINGS } from './db/idb';
import { soundEffects } from './utils/audio';
import { authService } from './services/authService';
import { userService } from './services/userService';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { AuthView } from './components/AuthView';
import { UserProfileModal } from './components/UserProfileModal';
import { PersonalCustomizationModal } from './components/PersonalCustomizationModal';
import { FavoritesView } from './components/FavoritesView';
import { DifficultView } from './components/DifficultView';
import { Dashboard } from './components/Dashboard';
import { ChapterDashboard } from './components/ChapterDashboard';
import { ChapterVocabView } from './components/ChapterVocabView';
import { KanjiDashboard } from './components/KanjiDashboard';
import { KanjiChapterView } from './components/KanjiChapterView';
import { PracticeHub } from './components/PracticeHub';
import { Statistics } from './components/Statistics';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NotesSection } from './components/NotesSection';
import { AddVocabModal } from './components/AddVocabModal';
import { AddKanjiModal } from './components/AddKanjiModal';
import { NoteEditorModal } from './components/NoteEditorModal';
import { SettingsModal } from './components/SettingsModal';
import { ChapterModal } from './components/ChapterModal';
import { ManageChaptersModal } from './components/ManageChaptersModal';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminAuthView } from './components/admin/AdminAuthView';
import { PatternsView } from './components/PatternsView';
import { ReadingView } from './components/ReadingView';
import { ListeningView } from './components/ListeningView';
import { TestsView } from './components/TestsView';
import { CheckCircle2, Info, AlertCircle, Clock } from 'lucide-react';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  
  // URL Routing: /admin detection
  const [isAdminPath, setIsAdminPath] = useState<boolean>(() => {
    return typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
  });

  useEffect(() => {
    const handlePopState = () => {
      setIsAdminPath(window.location.pathname.startsWith('/admin'));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToAdmin = () => {
    if (typeof window !== 'undefined' && window.history) {
      window.history.pushState({}, '', '/admin');
    }
    setIsAdminPath(true);
  };

  const navigateToStudentApp = () => {
    if (typeof window !== 'undefined' && window.history) {
      window.history.pushState({}, '', '/');
    }
    setIsAdminPath(false);
    setCurrentView('dashboard');
  };

  // Auth & Session
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => authService.getCurrentSession());
  const [currentLevel, setCurrentLevel] = useState<JLPTLevel>(() => {
    const session = authService.getCurrentSession();
    return session?.selectedLevel || 'N5';
  });
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // User Overlays (Zero Master Overwrite)
  const [userVocabOverlays, setUserVocabOverlays] = useState<Record<string, UserVocabData>>({});
  const [userKanjiOverlays, setUserKanjiOverlays] = useState<Record<string, UserKanjiData>>({});
  const [personalizeModalItem, setPersonalizeModalItem] = useState<{
    type: 'vocab';
    data: DisplayVocabularyItem;
  } | {
    type: 'kanji';
    data: DisplayKanjiItem;
  } | null>(null);

  // Independent Chapter Navigation for Vocabulary and Kanji
  const [activeChapter, setActiveChapter] = useState<number | 'extra' | null>(null);
  const [activeCustomChapter, setActiveCustomChapter] = useState<any | null>(null);
  const [activeKanjiChapter, setActiveKanjiChapter] = useState<number | 'extra' | null>(null);

  // Separate Data Stores
  const [vocabularies, setVocabularies] = useState<VocabularyItem[]>([]);
  const [customChapters, setCustomChapters] = useState<any[]>([]);
  const [kanjis, setKanjis] = useState<KanjiItem[]>([]);
  const [vocabChapters, setVocabChapters] = useState<ChapterItem[]>([]);
  const [kanjiChapters, setKanjiChapters] = useState<ChapterItem[]>([]);
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [kanjiSessions, setKanjiSessions] = useState<KanjiPracticeSession[]>([]);
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Vocabulary Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [addModalDefaultChapter, setAddModalDefaultChapter] = useState<number | undefined>(undefined);
  const [editingItem, setEditingItem] = useState<VocabularyItem | null>(null);

  // Vocabulary Chapter Management Modals
  const [isVocabChapterModalOpen, setIsVocabChapterModalOpen] = useState<boolean>(false);
  const [editingVocabChapter, setEditingVocabChapter] = useState<ChapterItem | null>(null);
  const [isManageVocabChaptersOpen, setIsManageVocabChaptersOpen] = useState<boolean>(false);

  // Kanji Modals
  const [isAddKanjiModalOpen, setIsAddKanjiModalOpen] = useState<boolean>(false);
  const [addKanjiDefaultChapter, setAddKanjiDefaultChapter] = useState<number | undefined>(undefined);
  const [editingKanji, setEditingKanji] = useState<KanjiItem | null>(null);

  // Kanji Chapter Management Modals
  const [isKanjiChapterModalOpen, setIsKanjiChapterModalOpen] = useState<boolean>(false);
  const [editingKanjiChapter, setEditingKanjiChapter] = useState<ChapterItem | null>(null);
  const [isManageKanjiChaptersOpen, setIsManageKanjiChaptersOpen] = useState<boolean>(false);

  // Notes Modals
  const [isNoteEditorOpen, setIsNoteEditorOpen] = useState<boolean>(false);
  const [editingNote, setEditingNote] = useState<StudyNote | null>(null);

  // Settings Modal
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Practice Configuration Passes
  const [practiceInitialType, setPracticeInitialType] = useState<'vocab' | 'kanji'>('vocab');
  
  // Vocab Practice Config
  const [practiceInitialMode, setPracticeInitialMode] = useState<PracticeModeType>('all');
  const [practiceInitialWords, setPracticeInitialWords] = useState<VocabularyItem[] | undefined>(undefined);
  const [practiceInitialTitle, setPracticeInitialTitle] = useState<string | undefined>(undefined);
  const [practiceSelectedChapters, setPracticeSelectedChapters] = useState<number[]>([]);
  const [practiceInitialScope, setPracticeInitialScope] = useState<any | undefined>(undefined);

  // Kanji Practice Config
  const [practiceInitialKanjiMode, setPracticeInitialKanjiMode] = useState<KanjiPracticeModeType>('all');
  const [practiceInitialKanjiItems, setPracticeInitialKanjiItems] = useState<KanjiItem[] | undefined>(undefined);
  const [practiceInitialKanjiTitle, setPracticeInitialKanjiTitle] = useState<string | undefined>(undefined);

  // Notification navigation target
  const [selectedReadingId, setSelectedReadingId] = useState<string | undefined>(undefined);
  const [selectedListeningId, setSelectedListeningId] = useState<string | undefined>(undefined);

  // In-app Toast notifications
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);

  // Inactivity tracking & Auto-logout
  const [showIdleWarning, setShowIdleWarning] = useState<boolean>(false);
  const [sessionExpiredMsg, setSessionExpiredMsg] = useState<string | null>(null);
  const lastActiveRef = React.useRef<number>(Date.now());

  // Track user activity and auto-logout after 60 minutes of inactivity
  useEffect(() => {
    if (!currentUser) return;

    const handleUserActivity = () => {
      lastActiveRef.current = Date.now();
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(e => window.addEventListener(e, handleUserActivity, { passive: true }));

    // Check inactivity every 10 seconds
    const interval = setInterval(() => {
      if (!currentUser) return;
      const idleTimeMs = Date.now() - lastActiveRef.current;
      
      // Warning at 50 minutes (3,000,000 ms)
      const warningThresholdMs = 50 * 60 * 1000;
      // Logout threshold at 60 minutes (3,600,000 ms)
      const logoutThresholdMs = 60 * 60 * 1000;

      if (idleTimeMs >= logoutThresholdMs) {
        authService.logout();
        setCurrentUser(null);
        setShowIdleWarning(false);
        setSessionExpiredMsg('Your session expired due to inactivity. Please log in again.');
      } else if (idleTimeMs >= warningThresholdMs && !showIdleWarning) {
        setShowIdleWarning(true);
      }
    }, 10000);

    return () => {
      events.forEach(e => window.removeEventListener(e, handleUserActivity));
      clearInterval(interval);
    };
  }, [currentUser, showIdleWarning]);

  // Server session-expired listener
  useEffect(() => {
    const handleServerSessionExpired = (e: any) => {
      const msg = e.detail?.message || 'Your session expired due to inactivity. Please log in again.';
      authService.logout();
      setCurrentUser(null);
      setShowIdleWarning(false);
      setSessionExpiredMsg(msg);
    };

    window.addEventListener('nihongohub:session-expired', handleServerSessionExpired);
    return () => window.removeEventListener('nihongohub:session-expired', handleServerSessionExpired);
  }, []);

  const handleContinueSession = async () => {
    try {
      await api.auth.continueSession();
      lastActiveRef.current = Date.now();
      setShowIdleWarning(false);
      showToast('Session continued successfully.');
    } catch (_) {}
  };

  // Load all data (MongoDB Atlas primary source of truth, graceful fallback)
  const refreshData = useCallback(async () => {
    try {
      let finalVocab: VocabularyItem[] = [];
      let finalKanjis: KanjiItem[] = [];
      let finalSessions: PracticeSession[] = [];
      let finalKanjiSessions: KanjiPracticeSession[] = [];
      let finalNotes: StudyNote[] = [];
      let finalVocabChapters: ChapterItem[] = [];
      let finalKanjiChapters: ChapterItem[] = [];
      let appSettings: AppSettings = DEFAULT_SETTINGS;

      let atlasSucceeded = false;

      // 1. Direct attempt: fetch from MongoDB Atlas backend with 4-second timeout
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Atlas query timeout')), 4000)
        );

        const [mongoVocabRes, mongoKanjiRes, chaptersRes, customChaptersRes] = await Promise.race([
          Promise.all([
            api.vocabulary.getAll(),
            api.kanji.getAll(),
            api.vocabulary.getChapters('N5'),
            api.customChapters.getAll('N5')
          ]),
          timeoutPromise
        ]);

        atlasSucceeded = true;

        if (customChaptersRes.success && customChaptersRes.data) {
          setCustomChapters(customChaptersRes.data);
        }

        if (mongoVocabRes.success && mongoVocabRes.data && mongoVocabRes.data.length > 0) {
          finalVocab = mongoVocabRes.data.map((m: any): VocabularyItem => {
            const isCustom = m.destinationType === 'custom' || Boolean(m.customChapterId);
            const isExtra = m.destinationType === 'extra' || (!isCustom && (m.source === 'Extra' || !m.chapter && m.chapter !== 0));
            return {
              id: m.id || m._id,
              japanese: m.word,
              reading: m.hiragana || m.katakana || m.word,
              romaji: m.romaji || '',
              english: m.meaning,
              type: (m.partOfSpeech || 'Noun') as any,
              source: isExtra ? 'Extra' : (isCustom ? 'Extra' : 'Textbook'),
              destinationType: m.destinationType,
              customChapterId: m.customChapterId,
              wordType: m.wordType,
              chapter: (isExtra || isCustom) ? undefined : (typeof m.chapter === 'number' ? m.chapter : 1),
              jlpt: m.jlptLevel || 'N5',
              categories: [m.partOfSpeech || 'General'],
              acceptedMeanings: [m.meaning.toLowerCase().trim()],
              notes: m.exampleSentence || '',
              createdAt: m.createdAt ? new Date(m.createdAt).getTime() : Date.now(),
              practiceCount: 0,
              correctCount: 0,
              wrongCount: 0,
              consecutiveCorrect: 0,
              difficulty: 'medium',
              learningStatus: 'New'
            };
          });
        }

        if (mongoKanjiRes.success && Array.isArray(mongoKanjiRes.data)) {
          finalKanjis = mongoKanjiRes.data.map((k: any): KanjiItem => {
            const isExtra = k.source === 'Extra' || (!k.chapter && k.chapter !== 0);
            return {
              id: k.id || k._id,
              kanji: k.character || k.kanji || '',
              character: k.character || k.kanji || '',
              meaning: k.meaning,
              meanings: k.meanings || [k.meaning],
              onyomi: k.onyomi || '',
              kunyomi: k.kunyomi || '',
              readings: k.readings || [],
              exampleWords: k.exampleWords || [],
              strokeCount: k.strokeCount || 4,
              jlpt: k.jlptLevel || 'N5',
              chapter: isExtra ? undefined : (typeof k.chapter === 'number' ? k.chapter : 1),
              source: isExtra ? 'Extra' : 'Textbook',
              notes: '',
              createdAt: k.createdAt ? new Date(k.createdAt).getTime() : Date.now(),
              practiceCount: 0,
              correctCount: 0,
              wrongCount: 0,
              consecutiveCorrect: 0,
              difficulty: 'medium',
              learningStatus: 'New'
            };
          });
          // Background sync to local IDB (non-blocking)
          idb.syncKanjisFromBackend(finalKanjis).catch(() => {});
        }

        if (chaptersRes.success && Array.isArray(chaptersRes.data) && chaptersRes.data.length > 0) {
          finalVocabChapters = chaptersRes.data.map(c => ({
            id: `vocab_${c.jlpt.toLowerCase()}_ch_${c.chapter}`,
            chapterNumber: c.chapter,
            title: c.title || `Chapter ${c.chapter}`,
            japaneseTitle: c.chapterName || `第${c.chapter}課`,
            description: `Chapter ${c.chapter}`,
            jlpt: (c.jlpt || 'N5') as any,
            createdAt: Date.now() - (30 - c.chapter) * 86400000
          }));
        }
      } catch (atlasErr) {
        console.warn('MongoDB Atlas query failed or timed out, falling back to local storage:', atlasErr);
      }

      // 2. Fallback to local IndexedDB if Atlas was not reachable
      if (!atlasSucceeded) {
        try {
          const [allVocab, allKanjis, allSessions, allKanjiSessions, allNotes, allVocabChapters, allKanjiChapters] = await Promise.all([
            idb.getAllVocabularies(),
            idb.getAllKanjis(),
            idb.getAllPracticeSessions(),
            idb.getAllKanjiPracticeSessions(),
            idb.getAllNotes(),
            idb.getAllVocabChapters(),
            idb.getAllKanjiChapters()
          ]);
          finalVocab = allVocab;
          finalKanjis = allKanjis;
          finalSessions = allSessions;
          finalKanjiSessions = allKanjiSessions;
          finalNotes = allNotes;
          finalVocabChapters = allVocabChapters;
          finalKanjiChapters = allKanjiChapters;
        } catch (idbErr) {
          console.warn('Local storage fallback error:', idbErr);
        }
      }

      // Safe non-blocking load of app settings
      try {
        appSettings = await idb.getSettings();
      } catch (_) {
        appSettings = DEFAULT_SETTINGS;
      }

      // Guarantee standard 24 chapters for N5 (Chapters 1 to 24)
      const existingN5 = finalVocabChapters.filter(c => (c.jlpt || 'N5') === 'N5');
      const existingMap = new Map(existingN5.map(c => [c.chapterNumber, c]));
      const n5Chapters: ChapterItem[] = [];
      for (let ch = 1; ch <= 24; ch++) {
        if (existingMap.has(ch)) {
          n5Chapters.push(existingMap.get(ch)!);
        } else {
          n5Chapters.push({
            id: `vocab_ch_${ch}`,
            chapterNumber: ch,
            title: `Chapter ${ch}`,
            japaneseTitle: `第${ch}課`,
            description: `Chapter ${ch}`,
            jlpt: 'N5',
            createdAt: Date.now() - (24 - ch) * 86400000
          });
        }
      }
      const otherVocabChapters = finalVocabChapters.filter(c => (c.jlpt || 'N5') !== 'N5');
      finalVocabChapters = [...n5Chapters, ...otherVocabChapters];

      // Load user-isolated personal data from MongoDB Atlas if logged in
      const session = authService.getCurrentSession();
      if (session) {
        try {
          const [notesRes, quizRes, vOverlays, kOverlays] = await Promise.all([
            api.notes.getAll(),
            api.quizResults.getAll(),
            userService.getUserVocabOverlays(session.userId),
            userService.getUserKanjiOverlays(session.userId)
          ]);

          if (notesRes.success && Array.isArray(notesRes.data)) {
            finalNotes = notesRes.data.map((n: any): StudyNote => ({
              id: n.id || n._id,
              title: n.title,
              content: n.content || '',
              category: n.category || 'General',
              jlptLevel: n.jlptLevel,
              chapter: n.chapter,
              createdAt: n.createdAt ? new Date(n.createdAt).getTime() : Date.now(),
              updatedAt: n.updatedAt ? new Date(n.updatedAt).getTime() : Date.now()
            }));
          }

          if (quizRes.success && Array.isArray(quizRes.data)) {
            const vocabQuizList: PracticeSession[] = [];
            const kanjiQuizList: KanjiPracticeSession[] = [];

            for (const q of quizRes.data) {
              if (q.quizType === 'kanji') {
                kanjiQuizList.push({
                  id: q.id || q._id,
                  mode: 'all',
                  kanjiIds: (q.details || []).map((d: any) => d.itemId),
                  score: q.score,
                  totalQuestions: q.totalQuestions,
                  correctCount: q.score,
                  wrongCount: q.totalQuestions - q.score,
                  accuracy: q.percentage || 0,
                  timestamp: q.createdAt ? new Date(q.createdAt).getTime() : Date.now(),
                  duration: 60,
                  results: (q.details || []).map((d: any) => ({
                    kanjiId: d.itemId,
                    isCorrect: d.isCorrect,
                    userAnswer: ''
                  }))
                });
              } else {
                vocabQuizList.push({
                  id: q.id || q._id,
                  mode: 'all',
                  vocabIds: (q.details || []).map((d: any) => d.itemId),
                  score: q.score,
                  totalQuestions: q.totalQuestions,
                  correctCount: q.score,
                  wrongCount: q.totalQuestions - q.score,
                  accuracy: q.percentage || 0,
                  timestamp: q.createdAt ? new Date(q.createdAt).getTime() : Date.now(),
                  duration: 60,
                  results: (q.details || []).map((d: any) => ({
                    vocabId: d.itemId,
                    isCorrect: d.isCorrect,
                    userAnswer: ''
                  }))
                });
              }
            }

            if (vocabQuizList.length > 0) finalSessions = vocabQuizList;
            if (kanjiQuizList.length > 0) finalKanjiSessions = kanjiQuizList;
          }

          setUserVocabOverlays(vOverlays);
          setUserKanjiOverlays(kOverlays);
        } catch (userDataErr) {
          console.warn('Could not load user data from Atlas:', userDataErr);
        }
      } else {
        // Complete isolation: clear all user data when unauthenticated
        finalNotes = [];
        finalSessions = [];
        finalKanjiSessions = [];
        setUserVocabOverlays({});
        setUserKanjiOverlays({});
      }

      setVocabularies(finalVocab);
      setKanjis(finalKanjis);
      setSessions(finalSessions);
      setKanjiSessions(finalKanjiSessions);
      setNotes(finalNotes);
      setSettings(appSettings);
      setVocabChapters(finalVocabChapters);
      setKanjiChapters(finalKanjiChapters);
      soundEffects.setMuted(!appSettings.soundEnabled);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
    // Safety timeout: ensure loading state never hangs indefinitely
    const safetyTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 4500);

    // Synchronize session and role with backend if token exists
    if (currentUser) {
      authService.refreshCurrentUser().then((refreshed) => {
        if (refreshed) {
          setCurrentUser(refreshed);
        }
      }).catch(() => {});
    }

    return () => clearTimeout(safetyTimeout);
  }, [refreshData]);

  // Load user overlays whenever currentUser changes
  useEffect(() => {
    if (currentUser?.userId) {
      Promise.all([
        userService.getUserVocabOverlays(currentUser.userId),
        userService.getUserKanjiOverlays(currentUser.userId)
      ]).then(([vOverlays, kOverlays]) => {
        setUserVocabOverlays(vOverlays);
        setUserKanjiOverlays(kOverlays);
      }).catch(err => {
        console.error('Failed to load user overlays:', err);
      });
    } else {
      setUserVocabOverlays({});
      setUserKanjiOverlays({});
    }
  }, [currentUser?.userId]);

  // Runtime merged display items (Global Master + User Customization Overlays)
  const displayVocabularies: DisplayVocabularyItem[] = useMemo(() => {
    return userService.mergeVocabList(vocabularies, userVocabOverlays);
  }, [vocabularies, userVocabOverlays]);

  const displayKanjis: DisplayKanjiItem[] = useMemo(() => {
    return userService.mergeKanjiList(kanjis, userKanjiOverlays);
  }, [kanjis, userKanjiOverlays]);

  // Level-filtered chapters
  const levelVocabChapters = useMemo(() => {
    return vocabChapters.filter(c => (c.jlpt || 'N5') === currentLevel);
  }, [vocabChapters, currentLevel]);

  const levelKanjiChapters = useMemo(() => {
    return kanjiChapters.filter(c => (c.jlpt || 'N5') === currentLevel);
  }, [kanjiChapters, currentLevel]);

  // Level-filtered vocabulary and kanji
  const levelVocabs = useMemo(() => {
    return displayVocabularies.filter(v => (v.jlpt || 'N5') === currentLevel);
  }, [displayVocabularies, currentLevel]);

  const levelKanjis = useMemo(() => {
    return displayKanjis.filter(k => (k.jlpt || 'N5') === currentLevel);
  }, [displayKanjis, currentLevel]);

  // Favorites and Difficult counts across all decks
  const favoriteCount = useMemo(() => {
    const vCount = displayVocabularies.filter(v => v.isFavorite).length;
    const kCount = displayKanjis.filter(k => k.isFavorite).length;
    return vCount + kCount;
  }, [displayVocabularies, displayKanjis]);

  const difficultCount = useMemo(() => {
    const vCount = displayVocabularies.filter(v => v.isDifficult).length;
    const kCount = displayKanjis.filter(k => k.isDifficult).length;
    return vCount + kCount;
  }, [displayVocabularies, displayKanjis]);

  // Compute chapter word/kanji counts for management modals (scoped to current level)
  const vocabChapterCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    levelVocabChapters.forEach(c => { counts[c.chapterNumber] = 0; });
    levelVocabs.forEach(v => {
      if (v.source !== 'Extra' && typeof v.chapter === 'number') {
        counts[v.chapter] = (counts[v.chapter] || 0) + 1;
      }
    });
    return counts;
  }, [levelVocabChapters, levelVocabs]);

  const kanjiChapterCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    levelKanjiChapters.forEach(c => { counts[c.chapterNumber] = 0; });
    levelKanjis.forEach(k => {
      if (k.source !== 'Extra' && typeof k.chapter === 'number') {
        counts[k.chapter] = (counts[k.chapter] || 0) + 1;
      }
    });
    return counts;
  }, [levelKanjiChapters, levelKanjis]);

  // ==========================================
  // VOCABULARY CRUD HANDLERS
  // ==========================================
  const handleSaveVocabulary = async (
    itemData: Omit<VocabularyItem, 'id' | 'createdAt' | 'practiceCount' | 'correctCount' | 'wrongCount' | 'consecutiveCorrect' | 'difficulty' | 'learningStatus'>,
    existingId?: string
  ) => {
    const dataWithJlpt = {
      ...itemData,
      jlpt: itemData.jlpt || currentLevel
    };
    if (existingId) {
      const existing = vocabularies.find(v => v.id === existingId);
      if (existing) {
        const updated: VocabularyItem = {
          ...existing,
          ...dataWithJlpt
        };
        await idb.updateVocabulary(updated);
        showToast(`Updated "${updated.japanese}" successfully!`);
      }
    } else {
      const created = await idb.addVocabulary(dataWithJlpt);
      showToast(`Added "${created.japanese}" to ${created.chapter ? `Chapter ${created.chapter}` : 'Extra Deck'}!`);
    }
    await refreshData();
  };

  const handleDeleteVocabulary = async (id: string) => {
    if (currentUser) {
      try {
        const updated = await userService.hideUserVocab(currentUser.userId, id);
        setUserVocabOverlays(prev => ({ ...prev, [id]: updated }));
        showToast('Vocabulary removed from your list.');
      } catch (err: any) {
        console.error('Failed to remove vocabulary for user:', err);
        showToast('Unable to remove vocabulary. Please try again.', 'error');
      }
    } else {
      const item = vocabularies.find(v => v.id === id);
      await idb.deleteVocabulary(id);
      showToast(`Deleted "${item?.japanese || 'word'}"`, 'info');
      await refreshData();
    }
  };

  const handleSavePracticeSession = async (
    sessionData: Omit<PracticeSession, 'id' | 'timestamp'>,
    results: { vocabId: string; isCorrect: boolean }[]
  ) => {
    try {
      await idb.savePracticeSession(sessionData);
      await idb.recordPracticeResults(results);
      if (currentUser) {
        await api.quizResults.save({
          quizType: 'vocabulary',
          level: currentLevel,
          score: sessionData.correctCount,
          totalQuestions: sessionData.totalQuestions,
          percentage: sessionData.totalQuestions > 0 ? Math.round((sessionData.correctCount / sessionData.totalQuestions) * 100) : 0,
          details: results.map(r => ({
            itemId: r.vocabId,
            itemType: 'Vocabulary',
            isCorrect: r.isCorrect
          }))
        }).catch((err) => console.warn('Could not sync vocab quiz result to Atlas:', err.message));
      }
      await refreshData();
    } catch (err) {
      console.error('Failed to save vocabulary practice session:', err);
    }
  };

  // ==========================================
  // VOCABULARY CHAPTER HANDLERS
  // ==========================================
  const handleOpenAddVocabChapter = () => {
    setEditingVocabChapter(null);
    setIsVocabChapterModalOpen(true);
  };

  const handleOpenEditVocabChapter = (chapter: ChapterItem) => {
    setEditingVocabChapter(chapter);
    setIsVocabChapterModalOpen(true);
  };

  const handleSaveVocabChapter = async (
    chapterData: Omit<ChapterItem, 'id' | 'createdAt'>,
    existingId?: string,
    oldChapterNumber?: number
  ) => {
    const dataWithJlpt = {
      ...chapterData,
      jlpt: chapterData.jlpt || currentLevel
    };
    if (existingId) {
      const existing = vocabChapters.find(c => c.id === existingId);
      if (existing) {
        const updated: ChapterItem = {
          ...existing,
          ...dataWithJlpt
        };
        await idb.updateVocabChapter(updated, oldChapterNumber);
        showToast(`Updated Chapter ${updated.chapterNumber}!`);
      }
    } else {
      const created = await idb.addVocabChapter(dataWithJlpt);
      showToast(`Created Chapter ${created.chapterNumber}: ${created.title || 'Untitled'}!`);
    }
    await refreshData();
  };

  const handleDeleteVocabChapter = async (chapterId: string, chapterNumber: number) => {
    const res = await idb.deleteVocabChapter(chapterId, chapterNumber);
    if (activeChapter === chapterNumber) {
      setActiveChapter(null);
    }
    showToast(
      res.movedVocabCount > 0
        ? `Deleted Chapter ${chapterNumber}. Moved ${res.movedVocabCount} words to Extra Deck.`
        : `Deleted Chapter ${chapterNumber}.`,
      'info'
    );
    await refreshData();
  };

  // ==========================================
  // KANJI CRUD HANDLERS (SEPARATE DATA STORE)
  // ==========================================
  const handleSaveKanji = async (
    kanjiData: Omit<KanjiItem, 'id' | 'createdAt' | 'practiceCount' | 'correctCount' | 'wrongCount' | 'consecutiveCorrect' | 'difficulty' | 'learningStatus'>,
    existingId?: string
  ) => {
    const dataWithJlpt = {
      ...kanjiData,
      jlpt: kanjiData.jlpt || currentLevel
    };
    const payload = {
      character: kanjiData.character || kanjiData.kanji,
      meaning: kanjiData.meaning,
      meanings: kanjiData.meanings || [kanjiData.meaning],
      onyomi: kanjiData.onyomi || '',
      kunyomi: kanjiData.kunyomi || '',
      readings: kanjiData.readings || [],
      exampleWords: kanjiData.exampleWords || [],
      strokeCount: kanjiData.strokeCount || 4,
      jlptLevel: kanjiData.jlpt || currentLevel,
      chapter: kanjiData.source === 'Extra' ? undefined : (kanjiData.chapter || 1),
      source: kanjiData.source || (kanjiData.chapter ? 'Textbook' : 'Extra')
    };

    try {
      if (existingId) {
        const res = await api.kanji.update(existingId, payload);
        if (res.success) {
          showToast(`Updated Kanji "${payload.character}" successfully!`);
        } else {
          throw new Error('Failed to update Kanji');
        }
      } else {
        const res = await api.kanji.create(payload);
        if (res.success) {
          showToast(`Added Kanji "${payload.character}" to ${payload.chapter ? `Chapter ${payload.chapter}` : 'Extra Deck'}!`);
        } else {
          throw new Error('Failed to add Kanji');
        }
      }
    } catch (err: any) {
      console.warn('Backend kanji save failed, fallback to local store:', err);
      if (existingId) {
        const existing = kanjis.find(k => k.id === existingId);
        if (existing) {
          await idb.updateKanji({ ...existing, ...dataWithJlpt });
          showToast(`Updated Kanji "${existing.kanji}" locally`);
        }
      } else {
        const created = await idb.addKanji(dataWithJlpt);
        showToast(`Added Kanji "${created.kanji}" locally`);
      }
    }
    await refreshData();
  };

  const handleDeleteKanji = async (id: string) => {
    const item = kanjis.find(k => k.id === id);
    try {
      await api.kanji.delete(id);
    } catch (err) {
      console.warn('Backend kanji delete failed, falling back to local IDB:', err);
    }
    await idb.deleteKanji(id);
    showToast(`Deleted Kanji "${item?.kanji || 'character'}"`, 'info');
    await refreshData();
  };

  const handleSaveKanjiPracticeSession = async (
    sessionData: Omit<KanjiPracticeSession, 'id' | 'timestamp'>,
    results: { kanjiId: string; isCorrect: boolean }[]
  ) => {
    try {
      await idb.saveKanjiPracticeSession(sessionData);
      await idb.recordKanjiPracticeResults(results);
      if (currentUser) {
        await api.quizResults.save({
          quizType: 'kanji',
          level: currentLevel,
          score: sessionData.correctCount,
          totalQuestions: sessionData.totalQuestions,
          percentage: sessionData.totalQuestions > 0 ? Math.round((sessionData.correctCount / sessionData.totalQuestions) * 100) : 0,
          details: results.map(r => ({
            itemId: r.kanjiId,
            itemType: 'Kanji',
            isCorrect: r.isCorrect
          }))
        }).catch((err) => console.warn('Could not sync kanji quiz result to Atlas:', err.message));
      }
      await refreshData();
    } catch (err) {
      console.error('Failed to save kanji practice session:', err);
    }
  };

  // ==========================================
  // KANJI CHAPTER HANDLERS
  // ==========================================
  const handleOpenAddKanjiChapter = () => {
    setEditingKanjiChapter(null);
    setIsKanjiChapterModalOpen(true);
  };

  const handleOpenEditKanjiChapter = (chapter: ChapterItem) => {
    setEditingKanjiChapter(chapter);
    setIsKanjiChapterModalOpen(true);
  };

  const handleSaveKanjiChapter = async (
    chapterData: Omit<ChapterItem, 'id' | 'createdAt'>,
    existingId?: string,
    oldChapterNumber?: number
  ) => {
    const dataWithJlpt = {
      ...chapterData,
      jlpt: chapterData.jlpt || currentLevel
    };
    if (existingId) {
      const existing = kanjiChapters.find(c => c.id === existingId);
      if (existing) {
        const updated: ChapterItem = {
          ...existing,
          ...dataWithJlpt
        };
        await idb.updateKanjiChapter(updated, oldChapterNumber);
        showToast(`Updated Kanji Chapter ${updated.chapterNumber}!`);
      }
    } else {
      const created = await idb.addKanjiChapter(dataWithJlpt);
      showToast(`Created Kanji Chapter ${created.chapterNumber}: ${created.title || 'Untitled'}!`);
    }
    await refreshData();
  };

  const handleDeleteKanjiChapter = async (chapterId: string, chapterNumber: number) => {
    const res = await idb.deleteKanjiChapter(chapterId, chapterNumber);
    if (activeKanjiChapter === chapterNumber) {
      setActiveKanjiChapter(null);
    }
    showToast(
      res.movedKanjiCount > 0
        ? `Deleted Kanji Chapter ${chapterNumber}. Moved ${res.movedKanjiCount} characters to Extra Deck.`
        : `Deleted Kanji Chapter ${chapterNumber}.`,
      'info'
    );
    await refreshData();
  };

  // ==========================================
  // NOTE CRUD HANDLERS (MongoDB Atlas + IDB)
  // ==========================================
  const handleSaveNote = async (
    noteData: Omit<StudyNote, 'id' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => {
    try {
      if (existingId) {
        if (currentUser) {
          await api.notes.update(existingId, {
            title: noteData.title,
            content: noteData.content,
            category: noteData.category,
            jlptLevel: noteData.jlptLevel,
            chapter: noteData.chapter
          }).catch(e => console.warn('Could not update note on Atlas:', e.message));
        }
        const existing = notes.find(n => n.id === existingId);
        if (existing) {
          const updated: StudyNote = {
            ...existing,
            ...noteData,
            updatedAt: Date.now()
          };
          await idb.updateNote(updated);
          showToast(`Updated note "${updated.title}"!`);
        }
      } else {
        if (currentUser) {
          await api.notes.create({
            title: noteData.title,
            content: noteData.content,
            category: noteData.category,
            jlptLevel: noteData.jlptLevel,
            chapter: noteData.chapter
          }).catch(e => console.warn('Could not save note to Atlas:', e.message));
          showToast(`Saved note "${noteData.title}"!`);
        }
        await idb.addNote(noteData);
      }
    } catch (err: any) {
      console.error('Failed to save study note:', err);
    }
    await refreshData();
  };

  const handleDeleteNote = async (id: string) => {
    const item = notes.find(n => n.id === id);
    if (currentUser) {
      await api.notes.delete(id).catch(e => console.warn('Could not delete note from Atlas:', e.message));
    }
    await idb.deleteNote(id);
    showToast(`Deleted note "${item?.title || 'note'}"`, 'info');
    await refreshData();
  };

  // Settings
  const handleUpdateSettings = async (newSettings: Partial<AppSettings>) => {
    const updated = await idb.updateSettings(newSettings);
    setSettings(updated);
    soundEffects.setMuted(!updated.soundEnabled);
  };

  // ==========================================
  // AUTH & LEVEL HANDLERS
  // ==========================================
  const handleSelectLevel = async (level: JLPTLevel) => {
    setCurrentLevel(level);
    setActiveChapter(null);
    setActiveKanjiChapter(null);
    if (currentUser) {
      await authService.updateSelectedLevel(level);
      const updatedSession = authService.getCurrentSession();
      if (updatedSession) setCurrentUser(updatedSession);
    }
  };

  const handleAuthSuccess = async (session: UserSession) => {
    setCurrentUser(session);
    const lvl = session.selectedLevel || 'N5';
    setCurrentLevel(lvl);
    await refreshData();
    setCurrentView('dashboard');
    showToast(`Welcome back, ${session.fullName}!`);
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setUserVocabOverlays({});
    setUserKanjiOverlays({});
    setNotes([]);
    setSessions([]);
    setKanjiSessions([]);
    setIsProfileOpen(false);
    showToast('Logged out successfully.', 'info');
  };

  // ==========================================
  // PERSONAL USER CUSTOMIZATION HANDLERS (Zero Master Overwrite)
  // ==========================================
  const handleToggleVocabFavorite = async (vocabId: string) => {
    if (!currentUser) return;
    const current = userVocabOverlays[vocabId]?.isFavorite ?? false;
    const updated = await userService.toggleVocabFlag(currentUser.userId, vocabId, 'isFavorite', !current);
    setUserVocabOverlays(prev => ({ ...prev, [vocabId]: updated }));
    showToast(!current ? 'Added to Favorites ⭐' : 'Removed from Favorites', 'info');
  };

  const handleToggleVocabLearned = async (vocabId: string) => {
    if (!currentUser) return;
    const current = userVocabOverlays[vocabId]?.isLearned ?? false;
    const updated = await userService.toggleVocabFlag(currentUser.userId, vocabId, 'isLearned', !current);
    setUserVocabOverlays(prev => ({ ...prev, [vocabId]: updated }));
    showToast(!current ? 'Marked as Learned ✓' : 'Unmarked Learned', 'info');
  };

  const handleToggleVocabDifficult = async (vocabId: string) => {
    if (!currentUser) return;
    const current = userVocabOverlays[vocabId]?.isDifficult ?? false;
    const updated = await userService.toggleVocabFlag(currentUser.userId, vocabId, 'isDifficult', !current);
    setUserVocabOverlays(prev => ({ ...prev, [vocabId]: updated }));
    showToast(!current ? 'Flagged as Difficult ⚠' : 'Unflagged Difficult', 'info');
  };

  const handleToggleKanjiFavorite = async (kanjiId: string) => {
    if (!currentUser) return;
    const current = userKanjiOverlays[kanjiId]?.isFavorite ?? false;
    const updated = await userService.toggleKanjiFlag(currentUser.userId, kanjiId, 'isFavorite', !current);
    setUserKanjiOverlays(prev => ({ ...prev, [kanjiId]: updated }));
    showToast(!current ? 'Kanji added to Favorites ⭐' : 'Removed from Favorites', 'info');
  };

  const handleToggleKanjiMastered = async (kanjiId: string) => {
    if (!currentUser) return;
    const current = userKanjiOverlays[kanjiId]?.isMastered ?? false;
    const updated = await userService.toggleKanjiFlag(currentUser.userId, kanjiId, 'isMastered', !current);
    setUserKanjiOverlays(prev => ({ ...prev, [kanjiId]: updated }));
    showToast(!current ? 'Kanji marked as Mastered ✓' : 'Unmarked Mastered', 'info');
  };

  const handleToggleKanjiDifficult = async (kanjiId: string) => {
    if (!currentUser) return;
    const current = userKanjiOverlays[kanjiId]?.isDifficult ?? false;
    const updated = await userService.toggleKanjiFlag(currentUser.userId, kanjiId, 'isDifficult', !current);
    setUserKanjiOverlays(prev => ({ ...prev, [kanjiId]: updated }));
    showToast(!current ? 'Kanji flagged as Difficult ⚠' : 'Unflagged Difficult', 'info');
  };

  const handleSaveVocabCustomization = async (vocabId: string, updates: Partial<UserVocabData>) => {
    if (!currentUser) return;
    try {
      const updated = await userService.saveVocabCustomization(currentUser.userId, vocabId, updates);
      setUserVocabOverlays(prev => ({ ...prev, [vocabId]: updated }));
      showToast('Customization saved successfully.');
    } catch (err: any) {
      showToast('Unable to save customization. Please try again.', 'error');
      throw err;
    }
  };

  const handleResetVocabCustomization = async (vocabId: string) => {
    if (!currentUser) return;
    await userService.resetVocabCustomization(currentUser.userId, vocabId);
    setUserVocabOverlays(prev => {
      const next = { ...prev };
      delete next[vocabId];
      return next;
    });
    showToast('Reset to global master vocabulary.', 'info');
  };

  const handleSaveKanjiCustomization = async (kanjiId: string, updates: Partial<UserKanjiData>) => {
    if (!currentUser) return;
    const updated = await userService.saveKanjiCustomization(currentUser.userId, kanjiId, updates);
    setUserKanjiOverlays(prev => ({ ...prev, [kanjiId]: updated }));
    showToast('Personal kanji notes & custom meaning saved!');
  };

  const handleResetKanjiCustomization = async (kanjiId: string) => {
    if (!currentUser) return;
    await userService.resetKanjiCustomization(currentUser.userId, kanjiId);
    setUserKanjiOverlays(prev => {
      const next = { ...prev };
      delete next[kanjiId];
      return next;
    });
    showToast('Reset to global master kanji.', 'info');
  };

  // ==========================================
  // NAVIGATION HELPERS: VOCABULARY
  // ==========================================
  const handleOpenChapter = (ch: number) => {
    setActiveCustomChapter(null);
    setActiveChapter(ch);
    setCurrentView('vocab-list');
  };

  const handleOpenExtraVocab = () => {
    setActiveCustomChapter(null);
    setActiveChapter('extra');
    setCurrentView('vocab-list');
  };

  const handleOpenCustomChapter = (chapter: any) => {
    setActiveChapter(null);
    setActiveCustomChapter(chapter);
    setCurrentView('vocab-list');
  };

  const handleOpenAdd = (chapterNum?: number) => {
    setEditingItem(null);
    setAddModalDefaultChapter(chapterNum);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (item: VocabularyItem) => {
    setEditingItem(item);
    setAddModalDefaultChapter(item.chapter);
    setIsAddModalOpen(true);
  };

  const handlePracticeWords = (words: VocabularyItem[], title: string, scope?: any) => {
    setPracticeInitialType('vocab');
    setPracticeInitialMode(scope?.mode || 'custom');
    setPracticeInitialWords(words);
    setPracticeInitialTitle(title);
    setPracticeInitialScope(scope || { mode: 'custom', initialWords: words });
    setCurrentView('practice');
  };

  const handleStartMultiChapterPractice = () => {
    setPracticeInitialType('vocab');
    setPracticeInitialMode('multi-chapter');
    setPracticeInitialWords(undefined);
    setPracticeSelectedChapters([1, 2]);
    setPracticeInitialScope({ mode: 'multi-chapter', multiChapters: [1, 2] });
    setCurrentView('practice');
  };

  const handleStartPracticeWithFilter = (mode: 'chapter' | 'multi-chapter' | 'weak' | 'hard' | 'new' | 'smart') => {
    setPracticeInitialType('vocab');
    setPracticeInitialMode(mode);
    setPracticeInitialWords(undefined);
    setPracticeInitialScope({ mode });
    setCurrentView('practice');
  };

  // ==========================================
  // NAVIGATION HELPERS: KANJI
  // ==========================================
  const handleOpenKanjiChapter = (ch: number) => {
    setActiveKanjiChapter(ch);
    setCurrentView('kanji-list');
  };

  const handleOpenExtraKanji = () => {
    setActiveKanjiChapter('extra');
    setCurrentView('kanji-list');
  };

  const handleOpenAddKanji = (chapterNum?: number) => {
    setEditingKanji(null);
    setAddKanjiDefaultChapter(chapterNum);
    setIsAddKanjiModalOpen(true);
  };

  const handleOpenEditKanji = (item: KanjiItem) => {
    setEditingKanji(item);
    setAddKanjiDefaultChapter(item.chapter);
    setIsAddKanjiModalOpen(true);
  };

  const handlePracticeKanjis = (kanjiList: KanjiItem[], title: string) => {
    setPracticeInitialType('kanji');
    setPracticeInitialKanjiMode('all');
    setPracticeInitialKanjiItems(kanjiList);
    setPracticeInitialKanjiTitle(title);
    setCurrentView('practice');
  };

  const handleStartKanjiPractice = (mode: KanjiPracticeModeType = 'all') => {
    setPracticeInitialType('kanji');
    setPracticeInitialKanjiMode(mode);
    setPracticeInitialKanjiItems(undefined);
    setCurrentView('practice');
  };

  // ==========================================
  // TOP NAV SWITCHER
  // ==========================================
  const handleNavClick = (view: AppView) => {
    if (view === 'admin') {
      navigateToAdmin();
      return;
    }
    if (view === 'vocab-list') {
      setActiveChapter(null); // Reset to chapter dashboard
      setActiveCustomChapter(null);
    }
    if (view === 'kanji-list') {
      setActiveKanjiChapter(null); // Reset to kanji dashboard
    }
    if (isAdminPath) {
      navigateToStudentApp();
    }
    setCurrentView(view);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fcfbf9] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-[#d93829] flex items-center justify-center text-white text-xl font-serif-jp shadow-lg animate-pulse mb-3">
          日
        </div>
        <p className="text-sm font-japanese font-bold text-[#1a1918]">NihongoHubを読み込み中...</p>
        <p className="text-xs text-[#8c8880] mt-1">Loading study resources...</p>
      </div>
    );
  }

  // 1. Dedicated Admin Route (/admin)
  if (isAdminPath) {
    if (!currentUser) {
      return (
        <AdminAuthView
          onSuccess={async (session) => {
            setCurrentUser(session);
            await refreshData();
            showToast(`Welcome Administrator, ${session.fullName}!`);
          }}
          onReturnToApp={navigateToStudentApp}
        />
      );
    }
    return (
      <AdminLayout
        user={currentUser}
        onReturnToApp={navigateToStudentApp}
        onUserPromoted={async (updated) => {
          setCurrentUser(updated);
          await refreshData();
          showToast(`Welcome Administrator, ${updated.fullName}!`);
        }}
      />
    );
  }

  // 2. Student Authentication Protection: If unauthenticated, show AuthView
  if (!currentUser) {
    return <AuthView onAuthSuccess={handleAuthSuccess} initialErrorMessage={sessionExpiredMsg} />;
  }

  // 3. Admin Panel Layout (Dedicated full-screen management view from in-app navigation)
  if (currentView === 'admin') {
    return (
      <AdminLayout
        user={currentUser}
        onReturnToApp={navigateToStudentApp}
        onUserPromoted={async (updated) => {
          setCurrentUser(updated);
          await refreshData();
          showToast(`Welcome Administrator, ${updated.fullName}!`);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfbf9] text-[#1a1918] flex font-sans antialiased selection:bg-[#d93829] selection:text-white">
      
      {/* Left Sidebar */}
      <Sidebar
        currentView={currentView}
        currentLevel={currentLevel}
        user={currentUser}
        onNavigate={handleNavClick}
        onSelectLevel={handleSelectLevel}
        onOpenProfile={() => setIsProfileOpen(true)}
        onLogout={handleLogout}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        favoriteCount={favoriteCount}
        difficultCount={difficultCount}
        notesCount={notes.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen lg:pl-64 w-full">
        {/* Sticky Top Navbar */}
        <Navbar
          currentView={currentView}
          currentLevel={currentLevel}
          userRole={currentUser.role}
          onNavigate={handleNavClick}
          onOpenAddModal={() => handleOpenAdd(typeof activeChapter === 'number' ? activeChapter : undefined)}
          onOpenAddKanjiModal={() => handleOpenAddKanji(typeof activeKanjiChapter === 'number' ? activeKanjiChapter : undefined)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
          userName={currentUser.fullName}
          totalVocabCount={levelVocabs.length}
          totalKanjiCount={levelKanjis.length}
          totalNotesCount={notes.length}
          soundEnabled={settings.soundEnabled}
          onToggleSound={() => handleUpdateSettings({ soundEnabled: !settings.soundEnabled })}
          onOpenNotificationContent={(type, contentId) => {
            if (type === 'reading') {
              setSelectedReadingId(contentId);
              setCurrentView('reading');
            } else if (type === 'listening') {
              setSelectedListeningId(contentId);
              setCurrentView('listening');
            }
          }}
        />

        {/* Main View Area */}
        <main className="flex-1 pb-16">
          
          {/* 1. Dashboard View */}
          {currentView === 'dashboard' && (
            <Dashboard
              vocabularies={levelVocabs}
              kanjis={levelKanjis}
              sessions={sessions}
              kanjiSessions={kanjiSessions}
              notes={notes}
              chapters={levelVocabChapters}
              kanjiChapters={levelKanjiChapters}
              currentLevel={currentLevel}
              userName={currentUser.fullName}
              onNavigate={handleNavClick}
              onOpenAddVocabModal={() => handleOpenAdd()}
              onOpenAddKanjiModal={() => handleOpenAddKanji()}
              onStartPracticeWithFilter={handleStartPracticeWithFilter}
              onStartKanjiPractice={() => handleStartKanjiPractice('all')}
              onOpenChapter={handleOpenChapter}
              onOpenKanjiChapter={handleOpenKanjiChapter}
            />
          )}

          {/* 2. Vocabulary Section (Chapter Overview vs Chapter Vocabulary Cards) */}
          {currentView === 'vocab-list' && (
            (activeChapter === null && activeCustomChapter === null) ? (
              <ChapterDashboard
                vocabularies={levelVocabs}
                chapters={levelVocabChapters}
                customChapters={customChapters}
                currentLevel={currentLevel}
                onOpenChapter={handleOpenChapter}
                onOpenCustomChapter={handleOpenCustomChapter}
                onOpenExtraVocab={handleOpenExtraVocab}
                onOpenAddModal={handleOpenAdd}
                onOpenAddChapterModal={handleOpenAddVocabChapter}
                onOpenManageChaptersModal={() => setIsManageVocabChaptersOpen(true)}
                onEditChapter={handleOpenEditVocabChapter}
                onDeleteChapter={handleDeleteVocabChapter}
                onOpenMultiChapterPractice={handleStartMultiChapterPractice}
                onOpenWeakWordsPractice={() => handleStartPracticeWithFilter('weak')}
              />
            ) : activeCustomChapter !== null ? (
              <ChapterVocabView
                customChapter={activeCustomChapter}
                vocabularies={levelVocabs}
                onBackToChapters={() => setActiveCustomChapter(null)}
                onOpenAddModal={(ch) => handleOpenAdd(ch)}
                onEditItem={handleOpenEdit}
                onDeleteItem={handleDeleteVocabulary}
                onPracticeWords={handlePracticeWords}
                onToggleFavorite={handleToggleVocabFavorite}
                onToggleLearned={handleToggleVocabLearned}
                onToggleDifficult={handleToggleVocabDifficult}
                onPersonalizeItem={(item) => setPersonalizeModalItem({ type: 'vocab', data: item })}
              />
            ) : (
              <ChapterVocabView
                chapterNum={activeChapter === 'extra' ? undefined : activeChapter}
                vocabularies={levelVocabs}
                onBackToChapters={() => setActiveChapter(null)}
                onOpenAddModal={(ch) => handleOpenAdd(ch)}
                onEditItem={handleOpenEdit}
                onDeleteItem={handleDeleteVocabulary}
                onPracticeWords={handlePracticeWords}
                onToggleFavorite={handleToggleVocabFavorite}
                onToggleLearned={handleToggleVocabLearned}
                onToggleDifficult={handleToggleVocabDifficult}
                onPersonalizeItem={(item) => setPersonalizeModalItem({ type: 'vocab', data: item })}
              />
            )
          )}

          {/* 3. Kanji Section (Dedicated Kanji Dashboard vs Kanji Chapter Cards) */}
          {currentView === 'kanji-list' && (
            activeKanjiChapter === null ? (
              <KanjiDashboard
                kanjis={levelKanjis}
                kanjiChapters={levelKanjiChapters}
                currentLevel={currentLevel}
                onOpenChapter={handleOpenKanjiChapter}
                onOpenExtraKanji={handleOpenExtraKanji}
                onOpenAddModal={handleOpenAddKanji}
                onOpenAddChapterModal={handleOpenAddKanjiChapter}
                onOpenManageChaptersModal={() => setIsManageKanjiChaptersOpen(true)}
                onEditChapter={handleOpenEditKanjiChapter}
                onDeleteChapter={handleDeleteKanjiChapter}
                onOpenPractice={() => handleStartKanjiPractice('all')}
                onOpenWeakKanjiPractice={() => handleStartKanjiPractice('weak')}
                onBackToDashboard={() => setCurrentView('dashboard')}
              />
            ) : (
              <KanjiChapterView
                chapterNum={activeKanjiChapter === 'extra' ? undefined : activeKanjiChapter}
                kanjis={levelKanjis}
                onBackToChapters={() => setActiveKanjiChapter(null)}
                onOpenAddModal={(ch) => handleOpenAddKanji(ch)}
                onEditItem={handleOpenEditKanji}
                onDeleteItem={handleDeleteKanji}
                onPracticeChapter={handlePracticeKanjis}
                onToggleFavorite={handleToggleKanjiFavorite}
                onToggleMastered={handleToggleKanjiMastered}
                onToggleDifficult={handleToggleKanjiDifficult}
                onPersonalizeItem={(item) => setPersonalizeModalItem({ type: 'kanji', data: item })}
              />
            )
          )}

          {/* 4. Dedicated Dual Practice Hub (Vocabulary vs Kanji Practice) */}
          {currentView === 'practice' && (
            <PracticeHub
              key={`hub-${practiceInitialType}-${practiceInitialMode}-${practiceInitialWords?.length || 0}-${practiceInitialKanjiMode}-${practiceInitialKanjiItems?.length || 0}`}
              initialType={practiceInitialType}
              vocabularies={levelVocabs}
              kanjis={levelKanjis}
              chapters={levelVocabChapters}
              customChapters={customChapters}
              kanjiChapters={levelKanjiChapters}
              onSaveVocabSession={handleSavePracticeSession}
              onSaveKanjiSession={handleSaveKanjiPracticeSession}
              onBackToDashboard={() => setCurrentView('dashboard')}
              initialVocabMode={practiceInitialMode}
              initialVocabWords={practiceInitialWords}
              initialVocabTitle={practiceInitialTitle}
              initialVocabSelectedChapters={practiceSelectedChapters}
              initialVocabScope={practiceInitialScope}
              initialKanjiMode={practiceInitialKanjiMode}
              initialKanjiItems={practiceInitialKanjiItems}
              initialKanjiTitle={practiceInitialKanjiTitle}
            />
          )}

          {/* 5. Favorites View (User Personal) */}
          {currentView === 'favorites' && (
            <FavoritesView
              vocabularies={displayVocabularies}
              kanjis={displayKanjis}
              onToggleVocabFavorite={handleToggleVocabFavorite}
              onToggleKanjiFavorite={handleToggleKanjiFavorite}
              onOpenCustomModal={(item) => setPersonalizeModalItem(item)}
              onPracticeVocab={handlePracticeWords}
              onPracticeKanji={handlePracticeKanjis}
            />
          )}

          {/* 6. Difficult Words View (User Personal) */}
          {currentView === 'difficult' && (
            <DifficultView
              vocabularies={displayVocabularies}
              kanjis={displayKanjis}
              onToggleVocabDifficult={handleToggleVocabDifficult}
              onToggleKanjiDifficult={handleToggleKanjiDifficult}
              onOpenCustomModal={(item) => setPersonalizeModalItem(item)}
              onPracticeVocab={handlePracticeWords}
              onPracticeKanji={handlePracticeKanjis}
            />
          )}

          {/* 7. Notes Section */}
          {currentView === 'notes' && (
            <NotesSection
              notes={notes}
              onOpenCreateModal={(preselectedCategory) => {
                setEditingNote(preselectedCategory ? { id: '', title: '', category: preselectedCategory, content: '', createdAt: 0, updatedAt: 0 } : null);
                setIsNoteEditorOpen(true);
              }}
              onEditNote={(note) => {
                setEditingNote(note);
                setIsNoteEditorOpen(true);
              }}
              onDeleteNote={handleDeleteNote}
            />
          )}

          {/* 8. Progress / Statistics Section (Section 13) */}
          {currentView === 'statistics' && (
            <ErrorBoundary fallbackTitle="Unable to display Progress & Statistics">
              <Statistics
                vocabularies={levelVocabs}
                sessions={sessions}
                kanjis={levelKanjis}
                kanjiSessions={kanjiSessions}
                vocabChapters={levelVocabChapters}
                kanjiChapters={levelKanjiChapters}
                customChapters={customChapters}
                currentLevel={currentLevel}
                favoriteCount={favoriteCount}
                difficultCount={difficultCount}
                onNavigate={handleNavClick}
                onPracticeDifficultWords={(words) => handlePracticeWords(words, 'Weak Words Drill', { mode: 'weak' })}
                onPracticeHardWords={(words) => handlePracticeWords(words, 'Hard Words Drill', { mode: 'hard' })}
                onPracticeWeakKanjis={(weakItems) => handlePracticeKanjis(weakItems, 'Weak Kanji Drill')}
                onSelectKanjiChapter={(ch) => {
                  if (ch === 'extra') {
                    handleOpenExtraKanji();
                  } else {
                    handleOpenKanjiChapter(ch);
                  }
                }}
                onSelectLevel={handleSelectLevel}
              />
            </ErrorBoundary>
          )}

          {/* 9. Grammar Patterns Section (Chapter-wise) */}
          {currentView === 'patterns' && (
            <ErrorBoundary fallbackTitle="Unable to display Grammar Patterns">
              <PatternsView />
            </ErrorBoundary>
          )}

          {/* 10. Reading Comprehension Section (Paragraph-wise) */}
          {currentView === 'reading' && (
            <ErrorBoundary fallbackTitle="Unable to display Reading Comprehension">
              <ReadingView initialReadingId={selectedReadingId} />
            </ErrorBoundary>
          )}

          {/* 11. Listening Practice Section (Exercise-wise) */}
          {currentView === 'listening' && (
            <ErrorBoundary fallbackTitle="Unable to display Listening Practice">
              <ListeningView initialListeningId={selectedListeningId} />
            </ErrorBoundary>
          )}

          {/* 12. Assessment Tests Section */}
          {currentView === 'tests' && (
            <ErrorBoundary fallbackTitle="Unable to display Assessment Tests">
              <TestsView />
            </ErrorBoundary>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-[#eeece6] bg-white/70 py-6 text-center text-xs text-[#8c8880]">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
              <span className="font-serif-jp text-sm text-[#d93829] font-bold whitespace-nowrap">日本語ハブ</span>
              <span className="whitespace-nowrap">• NihongoHub — Japanese Learning Studio</span>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="font-medium text-[#1a1918]">Logged in as {currentUser.fullName} ({currentLevel})</span>
              <span>•</span>
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="hover:text-[#1a1918] underline cursor-pointer"
              >
                Export / Import Backup
              </button>
            </div>
          </div>
        </footer>
      </div>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={currentUser}
        currentLevel={currentLevel}
        onSelectLevel={handleSelectLevel}
        onLogout={handleLogout}
        onNavigateAdmin={() => setCurrentView('admin')}
        onUserUpdated={(updated) => {
          setCurrentUser(updated);
          showToast(`Admin privileges activated for ${updated.fullName}!`);
        }}
        totalVocabCount={displayVocabularies.length}
        totalKanjiCount={displayKanjis.length}
        totalSessionsCount={sessions.length + kanjiSessions.length}
      />

      {/* Personal Customization Modal (Zero Master Overwrite) */}
      <PersonalCustomizationModal
        isOpen={personalizeModalItem !== null}
        onClose={() => setPersonalizeModalItem(null)}
        item={personalizeModalItem}
        onSaveVocab={handleSaveVocabCustomization}
        onSaveKanji={handleSaveKanjiCustomization}
        onResetVocab={handleResetVocabCustomization}
        onResetKanji={handleResetKanjiCustomization}
      />

      {/* Add / Edit Vocabulary Modal */}
      <AddVocabModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveVocabulary}
        editItem={editingItem}
        defaultChapter={addModalDefaultChapter}
        chapters={levelVocabChapters}
      />

      {/* Add / Edit Kanji Modal */}
      <AddKanjiModal
        isOpen={isAddKanjiModalOpen}
        onClose={() => {
          setIsAddKanjiModalOpen(false);
          setEditingKanji(null);
        }}
        onSave={handleSaveKanji}
        editItem={editingKanji}
        defaultChapter={addKanjiDefaultChapter}
        kanjiChapters={levelKanjiChapters}
      />

      {/* Chapter Add/Edit Modal (Vocab) */}
      <ChapterModal
        isOpen={isVocabChapterModalOpen}
        onClose={() => {
          setIsVocabChapterModalOpen(false);
          setEditingVocabChapter(null);
        }}
        onSave={handleSaveVocabChapter}
        editChapter={editingVocabChapter}
        existingChapters={levelVocabChapters}
        type="vocab"
      />

      {/* Manage Chapters Modal (Vocab) */}
      <ManageChaptersModal
        isOpen={isManageVocabChaptersOpen}
        onClose={() => setIsManageVocabChaptersOpen(false)}
        chapters={levelVocabChapters}
        itemCounts={vocabChapterCounts}
        onOpenAddModal={() => {
          setIsManageVocabChaptersOpen(false);
          handleOpenAddVocabChapter();
        }}
        onOpenEditModal={(ch) => {
          setIsManageVocabChaptersOpen(false);
          handleOpenEditVocabChapter(ch);
        }}
        onDeleteChapter={handleDeleteVocabChapter}
        onSelectChapter={(ch) => {
          setIsManageVocabChaptersOpen(false);
          handleOpenChapter(ch);
        }}
        type="vocab"
      />

      {/* Chapter Add/Edit Modal (Kanji) */}
      <ChapterModal
        isOpen={isKanjiChapterModalOpen}
        onClose={() => {
          setIsKanjiChapterModalOpen(false);
          setEditingKanjiChapter(null);
        }}
        onSave={handleSaveKanjiChapter}
        editChapter={editingKanjiChapter}
        existingChapters={levelKanjiChapters}
        type="kanji"
      />

      {/* Manage Chapters Modal (Kanji) */}
      <ManageChaptersModal
        isOpen={isManageKanjiChaptersOpen}
        onClose={() => setIsManageKanjiChaptersOpen(false)}
        chapters={levelKanjiChapters}
        itemCounts={kanjiChapterCounts}
        onOpenAddModal={() => {
          setIsManageKanjiChaptersOpen(false);
          handleOpenAddKanjiChapter();
        }}
        onOpenEditModal={(ch) => {
          setIsManageKanjiChaptersOpen(false);
          handleOpenEditKanjiChapter(ch);
        }}
        onDeleteChapter={handleDeleteKanjiChapter}
        onSelectChapter={(ch) => {
          setIsManageKanjiChaptersOpen(false);
          handleOpenKanjiChapter(ch);
        }}
        type="kanji"
      />

      {/* Note Editor Modal */}
      <NoteEditorModal
        isOpen={isNoteEditorOpen}
        onClose={() => {
          setIsNoteEditorOpen(false);
          setEditingNote(null);
        }}
        onSave={handleSaveNote}
        editNote={editingNote}
      />

      {/* Settings & Backup Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onDataRestored={refreshData}
        totalVocabCount={displayVocabularies.length}
        totalKanjiCount={displayKanjis.length}
        totalNotesCount={notes.length}
      />

      {/* Idle Inactivity Warning Modal (Appears after 50 minutes of inactivity) */}
      {showIdleWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-amber-200">
            <div className="flex items-center gap-3 mb-4 text-amber-600">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1a1918]">Inactivity Warning</h3>
                <p className="text-xs text-[#8c8880]">Your session is about to expire</p>
              </div>
            </div>
            <p className="text-sm text-[#4a4740] mb-6 leading-relaxed">
              You have been inactive for over 50 minutes. For your security, your session will automatically end in 10 minutes. Click below to continue learning.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2 text-xs font-semibold text-[#8c8880] hover:text-[#1a1918] transition-colors cursor-pointer"
              >
                Log Out Now
              </button>
              <button
                type="button"
                onClick={handleContinueSession}
                className="px-5 py-2.5 bg-[#d93829] text-white rounded-xl text-xs font-semibold hover:bg-[#c22f21] shadow-md shadow-red-500/20 transition-all cursor-pointer"
              >
                Continue Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-pop-in">
          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-white text-xs font-medium shadow-xl border ${
            toast.type === 'error'
              ? 'bg-[#2b1111] border-rose-800'
              : 'bg-[#1a1918] border-neutral-700'
          }`}>
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : toast.type === 'info' ? (
              <Info className="w-4 h-4 text-blue-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
