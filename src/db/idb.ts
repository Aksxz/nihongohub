import { VocabularyItem, PracticeSession, AppSettings, StudyNote } from '../types/vocab';
import { KanjiItem, KanjiPracticeSession } from '../types/kanji';
import { ChapterItem } from '../types/chapter';
import { User, UserVocabData, UserKanjiData } from '../types/user';
import { INITIAL_VOCABULARY } from './seedData';
import { INITIAL_NOTES } from './seedNotes';
import { 
  INITIAL_N4_VOCAB_CHAPTERS, 
  INITIAL_N3_VOCAB_CHAPTERS, 
  INITIAL_N4_VOCABULARY, 
  INITIAL_N3_VOCABULARY 
} from './seedN4N3';
import { calculateSRSUpdate } from '../utils/srs';
import { calculateKanjiSRSUpdate } from '../utils/kanjiSrs';

const DB_NAME = 'KotobaFlowDB';
const DB_VERSION = 5;

export const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  speechEnabled: true,
  speechRate: 0.9,
  showRomajiHintDefault: false,
  targetDailyWords: 10
};

function generateId(prefix: string = 'id'): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${prefix}_` + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
}

// Normalizes any legacy items in case they lack new schema fields
function normalizeVocabItem(item: any): VocabularyItem {
  return {
    ...item,
    romaji: item.romaji || (item.reading?.includes('(') ? item.reading.split('(')[1]?.replace(')', '') : ''),
    type: item.type || 'Noun',
    source: item.source || (item.chapter ? 'Textbook' : 'Extra'),
    chapter: item.chapter || (item.source === 'Textbook' ? 1 : undefined),
    practiceCount: item.practiceCount || item.timesPracticed || 0,
    correctCount: item.correctCount || item.timesCorrect || 0,
    wrongCount: item.wrongCount || item.timesWrong || 0,
    consecutiveCorrect: item.consecutiveCorrect || 0,
    difficulty: item.difficulty || 'medium',
    learningStatus: item.learningStatus || (item.practiceCount > 0 ? 'Learning' : 'New'),
    acceptedMeanings: item.acceptedMeanings || [item.english],
    categories: item.categories || ['General'],
    jlpt: item.jlpt || 'N5'
  };
}

function normalizeKanjiItem(item: any): KanjiItem {
  return {
    ...item,
    kanji: item.kanji || '',
    meaning: item.meaning || '',
    acceptedMeanings: item.acceptedMeanings || (item.meaning ? [item.meaning] : []),
    onyomi: item.onyomi || '',
    kunyomi: item.kunyomi || '',
    romaji: item.romaji || '',
    exampleWords: item.exampleWords || [],
    exampleSentence: item.exampleSentence || '',
    jlpt: item.jlpt || 'N5',
    source: item.source || (item.chapter ? 'Textbook' : 'Extra'),
    chapter: item.chapter,
    category: item.category,
    practiceCount: item.practiceCount || 0,
    correctCount: item.correctCount || 0,
    wrongCount: item.wrongCount || 0,
    consecutiveCorrect: item.consecutiveCorrect || 0,
    difficulty: item.difficulty || 'medium',
    learningStatus: item.learningStatus || (item.practiceCount > 0 ? 'Learning' : 'New')
  };
}

function getInitialVocabChapters(): ChapterItem[] {
  return Array.from({ length: 24 }, (_, i) => {
    const ch = i + 1;
    return {
      id: `vocab_ch_${ch}`,
      chapterNumber: ch,
      title: `Chapter ${ch}`,
      japaneseTitle: `第${ch}課`,
      description: `Textbook Chapter ${ch}`,
      jlpt: 'N5',
      createdAt: Date.now() - (24 - ch) * 86400000
    };
  });
}

function getInitialKanjiChapters(): ChapterItem[] {
  return Array.from({ length: 24 }, (_, i) => {
    const ch = i + 1;
    return {
      id: `kanji_ch_${ch}`,
      chapterNumber: ch,
      title: `Chapter ${ch}`,
      japaneseTitle: `第${ch}課`,
      description: `Kanji Chapter ${ch}`,
      jlpt: 'N5',
      createdAt: Date.now() - (24 - ch) * 86400000
    };
  });
}

class KotobaDB {
  private dbPromise: Promise<IDBDatabase> | null = null;

  public async getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Vocabulary Store
        if (!db.objectStoreNames.contains('vocabularies')) {
          const vocabStore = db.createObjectStore('vocabularies', { keyPath: 'id' });
          vocabStore.createIndex('japanese', 'japanese', { unique: false });
          vocabStore.createIndex('chapter', 'chapter', { unique: false });
          vocabStore.createIndex('source', 'source', { unique: false });
          vocabStore.createIndex('learningStatus', 'learningStatus', { unique: false });
          vocabStore.createIndex('nextReview', 'nextReview', { unique: false });
        }

        // Practice Sessions Store
        if (!db.objectStoreNames.contains('practice_sessions')) {
          const sessionStore = db.createObjectStore('practice_sessions', { keyPath: 'id' });
          sessionStore.createIndex('timestamp', 'timestamp', { unique: false });
          sessionStore.createIndex('mode', 'mode', { unique: false });
        }

        // Settings Store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        // Notes Store (v2)
        if (!db.objectStoreNames.contains('notes')) {
          const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
          notesStore.createIndex('category', 'category', { unique: false });
          notesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          notesStore.createIndex('title', 'title', { unique: false });
        }

        // Kanji Store (v3)
        if (!db.objectStoreNames.contains('kanjis')) {
          const kanjiStore = db.createObjectStore('kanjis', { keyPath: 'id' });
          kanjiStore.createIndex('kanji', 'kanji', { unique: false });
          kanjiStore.createIndex('chapter', 'chapter', { unique: false });
          kanjiStore.createIndex('source', 'source', { unique: false });
          kanjiStore.createIndex('jlpt', 'jlpt', { unique: false });
          kanjiStore.createIndex('learningStatus', 'learningStatus', { unique: false });
          kanjiStore.createIndex('nextReview', 'nextReview', { unique: false });
        }

        // Kanji Practice Sessions Store (v3)
        if (!db.objectStoreNames.contains('kanji_practice_sessions')) {
          const kanjiSessionStore = db.createObjectStore('kanji_practice_sessions', { keyPath: 'id' });
          kanjiSessionStore.createIndex('timestamp', 'timestamp', { unique: false });
          kanjiSessionStore.createIndex('mode', 'mode', { unique: false });
          kanjiSessionStore.createIndex('testType', 'testType', { unique: false });
        }

        // Vocabulary Chapters Store (v4)
        if (!db.objectStoreNames.contains('vocab_chapters')) {
          const chStore = db.createObjectStore('vocab_chapters', { keyPath: 'id' });
          chStore.createIndex('chapterNumber', 'chapterNumber', { unique: false });
          chStore.createIndex('jlpt', 'jlpt', { unique: false });
        }

        // Kanji Chapters Store (v4)
        if (!db.objectStoreNames.contains('kanji_chapters')) {
          const kChStore = db.createObjectStore('kanji_chapters', { keyPath: 'id' });
          kChStore.createIndex('chapterNumber', 'chapterNumber', { unique: false });
          kChStore.createIndex('jlpt', 'jlpt', { unique: false });
        }

        // Users Store (v5)
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('email', 'email', { unique: true });
        }

        // User Vocab Customization Store (v5 - Zero Master Overwrite)
        if (!db.objectStoreNames.contains('user_vocab')) {
          const uvStore = db.createObjectStore('user_vocab', { keyPath: 'id' });
          uvStore.createIndex('userId', 'userId', { unique: false });
          uvStore.createIndex('vocabId', 'vocabId', { unique: false });
        }

        // User Kanji Customization Store (v5 - Zero Master Overwrite)
        if (!db.objectStoreNames.contains('user_kanji')) {
          const ukStore = db.createObjectStore('user_kanji', { keyPath: 'id' });
          ukStore.createIndex('userId', 'userId', { unique: false });
          ukStore.createIndex('kanjiId', 'kanjiId', { unique: false });
        }
      };

      request.onsuccess = async (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        try {
          await this.ensureSeedData(db);
        } catch (err) {
          console.error('Error during initial seed check:', err);
        }
        resolve(db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB open failed:', (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });

    return this.dbPromise;
  }

  private async ensureSeedData(db: IDBDatabase): Promise<void> {
    // 1. Seed Vocabulary
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['vocabularies'], 'readwrite');
      const store = tx.objectStore('vocabularies');
      const countReq = store.count();

      countReq.onsuccess = () => {
        if (countReq.result === 0) {
          console.log('NihongoHub: Initializing database with chapter-wise seed vocabulary...');
          INITIAL_VOCABULARY.forEach((item, index) => {
            const fullItem: VocabularyItem = {
              ...item,
              jlpt: 'N5',
              id: 'seed_' + (index + 1) + '_' + Date.now().toString(36),
              createdAt: Date.now() - (INITIAL_VOCABULARY.length - index) * 60000,
            };
            store.put(fullItem);
          });
          INITIAL_N4_VOCABULARY.forEach((item, index) => {
            const fullItem: VocabularyItem = {
              ...item,
              id: 'seed_n4_' + (index + 1) + '_' + Date.now().toString(36),
              createdAt: Date.now() - (INITIAL_N4_VOCABULARY.length - index) * 60000,
            };
            store.put(fullItem);
          });
          INITIAL_N3_VOCABULARY.forEach((item, index) => {
            const fullItem: VocabularyItem = {
              ...item,
              id: 'seed_n3_' + (index + 1) + '_' + Date.now().toString(36),
              createdAt: Date.now() - (INITIAL_N3_VOCABULARY.length - index) * 60000,
            };
            store.put(fullItem);
          });
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    // 2. Seed Notes if empty
    if (db.objectStoreNames.contains('notes')) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['notes'], 'readwrite');
        const store = tx.objectStore('notes');
        const countReq = store.count();

        countReq.onsuccess = () => {
          if (countReq.result === 0) {
            console.log('NihongoHub: Initializing database with seed study notes...');
            INITIAL_NOTES.forEach((note, index) => {
              const fullNote: StudyNote = {
                ...note,
                id: 'seed_note_' + (index + 1) + '_' + Date.now().toString(36),
                createdAt: Date.now() - (INITIAL_NOTES.length - index) * 120000,
                updatedAt: Date.now() - (INITIAL_NOTES.length - index) * 120000
              };
              store.put(fullNote);
            });
          }
        };

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }

    // 3. Purge legacy seed kanji from IndexedDB so MongoDB remains the sole source of truth
    if (db.objectStoreNames.contains('kanjis')) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['kanjis'], 'readwrite');
        const store = tx.objectStore('kanjis');
        const req = store.getAll();
        req.onsuccess = () => {
          const items = req.result || [];
          let hasLegacySeed = false;
          items.forEach((item: any) => {
            if (item.id && typeof item.id === 'string' && item.id.startsWith('kanji_seed_')) {
              store.delete(item.id);
              hasLegacySeed = true;
            }
          });
          if (hasLegacySeed) {
            console.log('NihongoHub: Purged legacy seed kanji from IndexedDB cache');
          }
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }

    // 4. Seed Vocabulary Chapters
    if (db.objectStoreNames.contains('vocab_chapters')) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['vocab_chapters'], 'readwrite');
        const store = tx.objectStore('vocab_chapters');
        const countReq = store.count();

        countReq.onsuccess = () => {
          if (countReq.result === 0) {
            console.log('NihongoHub: Initializing database with default vocabulary chapters...');
            const initialChs = getInitialVocabChapters();
            initialChs.forEach(c => store.put(c));
            INITIAL_N4_VOCAB_CHAPTERS.forEach(c => store.put(c));
            INITIAL_N3_VOCAB_CHAPTERS.forEach(c => store.put(c));
          } else {
            INITIAL_N4_VOCAB_CHAPTERS.forEach(c => {
              const checkReq = store.get(c.id);
              checkReq.onsuccess = () => {
                if (!checkReq.result) store.put(c);
              };
            });
            INITIAL_N3_VOCAB_CHAPTERS.forEach(c => {
              const checkReq = store.get(c.id);
              checkReq.onsuccess = () => {
                if (!checkReq.result) store.put(c);
              };
            });
          }
        };

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }

    // 5. Seed Kanji Chapters
    if (db.objectStoreNames.contains('kanji_chapters')) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['kanji_chapters'], 'readwrite');
        const store = tx.objectStore('kanji_chapters');
        const countReq = store.count();

        countReq.onsuccess = () => {
          if (countReq.result === 0) {
            console.log('NihongoHub: Initializing database with 24 default kanji chapters...');
            const initialKChs = getInitialKanjiChapters();
            initialKChs.forEach(c => store.put(c));
          }
        };

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
  }

  // --- Vocabulary Operations ---

  public async getAllVocabularies(): Promise<VocabularyItem[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('vocabularies', 'readonly');
      const store = tx.objectStore('vocabularies');
      const request = store.getAll();

      request.onsuccess = () => {
        const results = (request.result as any[]).map(normalizeVocabItem);
        results.sort((a, b) => b.createdAt - a.createdAt);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  public async getVocabularyById(id: string): Promise<VocabularyItem | undefined> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('vocabularies', 'readonly');
      const store = tx.objectStore('vocabularies');
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result ? normalizeVocabItem(request.result) : undefined);
      };
      request.onerror = () => reject(request.error);
    });
  }

  public async addVocabulary(
    itemData: Omit<VocabularyItem, 'id' | 'createdAt' | 'practiceCount' | 'correctCount' | 'wrongCount' | 'consecutiveCorrect' | 'difficulty' | 'learningStatus'>
  ): Promise<VocabularyItem> {
    const db = await this.getDB();
    const newItem: VocabularyItem = {
      ...itemData,
      id: generateId('vocab'),
      createdAt: Date.now(),
      practiceCount: 0,
      correctCount: 0,
      wrongCount: 0,
      consecutiveCorrect: 0,
      difficulty: 'medium',
      learningStatus: 'New',
      acceptedMeanings: itemData.acceptedMeanings?.length > 0 
        ? itemData.acceptedMeanings 
        : [itemData.english],
      categories: itemData.categories?.length > 0
        ? itemData.categories
        : (itemData.category ? [itemData.category] : ['General'])
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction('vocabularies', 'readwrite');
      const store = tx.objectStore('vocabularies');
      const request = store.add(newItem);

      request.onsuccess = () => resolve(newItem);
      request.onerror = () => reject(request.error);
    });
  }

  public async updateVocabulary(item: VocabularyItem): Promise<VocabularyItem> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('vocabularies', 'readwrite');
      const store = tx.objectStore('vocabularies');
      const request = store.put(item);

      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(request.error);
    });
  }

  public async deleteVocabulary(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('vocabularies', 'readwrite');
      const store = tx.objectStore('vocabularies');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Vocabulary Chapters Operations ---

  public async getAllVocabChapters(): Promise<ChapterItem[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('vocab_chapters', 'readonly');
      const store = tx.objectStore('vocab_chapters');
      const request = store.getAll();

      request.onsuccess = () => {
        const chapters = (request.result as ChapterItem[]).sort((a, b) => a.chapterNumber - b.chapterNumber);
        resolve(chapters);
      };
      request.onerror = () => reject(request.error);
    });
  }

  public async addVocabChapter(chapterData: Omit<ChapterItem, 'id' | 'createdAt'>): Promise<ChapterItem> {
    const db = await this.getDB();
    const newChapter: ChapterItem = {
      ...chapterData,
      id: generateId('vch'),
      createdAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction('vocab_chapters', 'readwrite');
      const store = tx.objectStore('vocab_chapters');
      const request = store.add(newChapter);

      request.onsuccess = () => resolve(newChapter);
      request.onerror = () => reject(request.error);
    });
  }

  public async updateVocabChapter(chapter: ChapterItem, oldChapterNumber?: number): Promise<void> {
    const db = await this.getDB();
    const needsWordUpdate = oldChapterNumber !== undefined && oldChapterNumber !== chapter.chapterNumber;

    return new Promise((resolve, reject) => {
      const storeNames = needsWordUpdate ? ['vocab_chapters', 'vocabularies'] : ['vocab_chapters'];
      const tx = db.transaction(storeNames, 'readwrite');
      const chapterStore = tx.objectStore('vocab_chapters');
      chapterStore.put(chapter);

      if (needsWordUpdate) {
        const vocabStore = tx.objectStore('vocabularies');
        const vocabReq = vocabStore.getAll();
        vocabReq.onsuccess = () => {
          const words = (vocabReq.result as any[]).map(normalizeVocabItem);
          words.forEach(w => {
            if (w.source === 'Textbook' && w.chapter === oldChapterNumber) {
              w.chapter = chapter.chapterNumber;
              vocabStore.put(w);
            }
          });
        };
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async deleteVocabChapter(chapterId: string, chapterNumber: number): Promise<{ movedVocabCount: number }> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['vocab_chapters', 'vocabularies'], 'readwrite');
      const chapterStore = tx.objectStore('vocab_chapters');
      const vocabStore = tx.objectStore('vocabularies');
      let movedCount = 0;

      // 1. Delete chapter record
      chapterStore.delete(chapterId);

      // 2. Safely reassign all words in this chapter to Extra / Unassigned
      const vocabReq = vocabStore.getAll();
      vocabReq.onsuccess = () => {
        const words = (vocabReq.result as any[]).map(normalizeVocabItem);
        words.forEach(w => {
          if (w.source === 'Textbook' && w.chapter === chapterNumber) {
            movedCount++;
            w.source = 'Extra';
            w.chapter = undefined;
            w.category = 'Unassigned';
            if (!w.categories) w.categories = [];
            if (!w.categories.includes('Unassigned')) {
              w.categories.push('Unassigned');
            }
            vocabStore.put(w);
          }
        });
      };

      tx.oncomplete = () => resolve({ movedVocabCount: movedCount });
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- Kanji Operations ---

  /**
   * Synchronizes IndexedDB local kanji store with authoritative MongoDB data
   */
  public async syncKanjisFromBackend(incoming: KanjiItem[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('kanjis', 'readwrite');
      const store = tx.objectStore('kanjis');
      store.clear();
      incoming.forEach(k => store.put(normalizeKanjiItem(k)));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Completely clears all cached kanji from IndexedDB
   */
  public async clearAllKanjis(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('kanjis', 'readwrite');
      const store = tx.objectStore('kanjis');
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getAllKanjis(): Promise<KanjiItem[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('kanjis', 'readonly');
      const store = tx.objectStore('kanjis');
      const request = store.getAll();

      request.onsuccess = () => {
        const results = (request.result as any[]).map(normalizeKanjiItem);
        results.sort((a, b) => b.createdAt - a.createdAt);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  public async getKanjiById(id: string): Promise<KanjiItem | undefined> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('kanjis', 'readonly');
      const store = tx.objectStore('kanjis');
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result ? normalizeKanjiItem(request.result) : undefined);
      };
      request.onerror = () => reject(request.error);
    });
  }

  public async addKanji(
    itemData: Omit<KanjiItem, 'id' | 'createdAt' | 'practiceCount' | 'correctCount' | 'wrongCount' | 'consecutiveCorrect' | 'difficulty' | 'learningStatus'>
  ): Promise<KanjiItem> {
    const db = await this.getDB();
    const newItem: KanjiItem = {
      ...itemData,
      id: generateId('kanji'),
      createdAt: Date.now(),
      practiceCount: 0,
      correctCount: 0,
      wrongCount: 0,
      consecutiveCorrect: 0,
      difficulty: 'medium',
      learningStatus: 'New',
      acceptedMeanings: itemData.acceptedMeanings?.length > 0 
        ? itemData.acceptedMeanings 
        : [itemData.meaning]
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction('kanjis', 'readwrite');
      const store = tx.objectStore('kanjis');
      const request = store.add(newItem);

      request.onsuccess = () => resolve(newItem);
      request.onerror = () => reject(request.error);
    });
  }

  public async updateKanji(item: KanjiItem): Promise<KanjiItem> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('kanjis', 'readwrite');
      const store = tx.objectStore('kanjis');
      const request = store.put(item);

      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(request.error);
    });
  }

  public async deleteKanji(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('kanjis', 'readwrite');
      const store = tx.objectStore('kanjis');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Kanji Chapters Operations ---

  public async getAllKanjiChapters(): Promise<ChapterItem[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('kanji_chapters', 'readonly');
      const store = tx.objectStore('kanji_chapters');
      const request = store.getAll();

      request.onsuccess = () => {
        const chapters = (request.result as ChapterItem[]).sort((a, b) => a.chapterNumber - b.chapterNumber);
        resolve(chapters);
      };
      request.onerror = () => reject(request.error);
    });
  }

  public async addKanjiChapter(chapterData: Omit<ChapterItem, 'id' | 'createdAt'>): Promise<ChapterItem> {
    const db = await this.getDB();
    const newChapter: ChapterItem = {
      ...chapterData,
      id: generateId('kch'),
      createdAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction('kanji_chapters', 'readwrite');
      const store = tx.objectStore('kanji_chapters');
      const request = store.add(newChapter);

      request.onsuccess = () => resolve(newChapter);
      request.onerror = () => reject(request.error);
    });
  }

  public async updateKanjiChapter(chapter: ChapterItem, oldChapterNumber?: number): Promise<void> {
    const db = await this.getDB();
    const needsKanjiUpdate = oldChapterNumber !== undefined && oldChapterNumber !== chapter.chapterNumber;

    return new Promise((resolve, reject) => {
      const storeNames = needsKanjiUpdate ? ['kanji_chapters', 'kanjis'] : ['kanji_chapters'];
      const tx = db.transaction(storeNames, 'readwrite');
      const chapterStore = tx.objectStore('kanji_chapters');
      chapterStore.put(chapter);

      if (needsKanjiUpdate) {
        const kanjiStore = tx.objectStore('kanjis');
        const kanjiReq = kanjiStore.getAll();
        kanjiReq.onsuccess = () => {
          const kanjis = (kanjiReq.result as any[]).map(normalizeKanjiItem);
          kanjis.forEach(k => {
            if (k.source === 'Textbook' && k.chapter === oldChapterNumber) {
              k.chapter = chapter.chapterNumber;
              kanjiStore.put(k);
            }
          });
        };
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async deleteKanjiChapter(chapterId: string, chapterNumber: number): Promise<{ movedKanjiCount: number }> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['kanji_chapters', 'kanjis'], 'readwrite');
      const chapterStore = tx.objectStore('kanji_chapters');
      const kanjiStore = tx.objectStore('kanjis');
      let movedCount = 0;

      // 1. Delete chapter record
      chapterStore.delete(chapterId);

      // 2. Safely reassign all kanji in this chapter to Extra / Unassigned
      const kanjiReq = kanjiStore.getAll();
      kanjiReq.onsuccess = () => {
        const kanjis = (kanjiReq.result as any[]).map(normalizeKanjiItem);
        kanjis.forEach(k => {
          if (k.source === 'Textbook' && k.chapter === chapterNumber) {
            movedCount++;
            k.source = 'Extra';
            k.chapter = undefined;
            k.category = 'Unassigned';
            kanjiStore.put(k);
          }
        });
      };

      tx.oncomplete = () => resolve({ movedKanjiCount: movedCount });
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- Practice & Spaced Repetition Operations ---

  public async recordPracticeResults(results: { vocabId: string; isCorrect: boolean }[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('vocabularies', 'readwrite');
      const store = tx.objectStore('vocabularies');

      results.forEach(res => {
        const getReq = store.get(res.vocabId);
        getReq.onsuccess = () => {
          if (getReq.result) {
            const currentItem = normalizeVocabItem(getReq.result);
            const srsUpdate = calculateSRSUpdate(currentItem, res.isCorrect);
            const updated: VocabularyItem = {
              ...currentItem,
              ...srsUpdate
            };
            store.put(updated);
          }
        };
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async recordKanjiPracticeResults(results: { kanjiId: string; isCorrect: boolean }[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('kanjis', 'readwrite');
      const store = tx.objectStore('kanjis');

      results.forEach(res => {
        const getReq = store.get(res.kanjiId);
        getReq.onsuccess = () => {
          if (getReq.result) {
            const currentItem = normalizeKanjiItem(getReq.result);
            const srsUpdate = calculateKanjiSRSUpdate(currentItem, res.isCorrect);
            const updated: KanjiItem = {
              ...currentItem,
              ...srsUpdate
            };
            store.put(updated);
          }
        };
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async savePracticeSession(sessionData: Omit<PracticeSession, 'id' | 'timestamp'>): Promise<PracticeSession> {
    const db = await this.getDB();
    const session: PracticeSession = {
      ...sessionData,
      id: generateId('session'),
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction('practice_sessions', 'readwrite');
      const store = tx.objectStore('practice_sessions');
      const request = store.add(session);

      request.onsuccess = () => resolve(session);
      request.onerror = () => reject(request.error);
    });
  }

  public async getAllPracticeSessions(): Promise<PracticeSession[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('practice_sessions', 'readonly');
      const store = tx.objectStore('practice_sessions');
      const request = store.getAll();

      request.onsuccess = () => {
        const sessions = request.result as PracticeSession[];
        sessions.sort((a, b) => b.timestamp - a.timestamp);
        resolve(sessions);
      };
      request.onerror = () => reject(request.error);
    });
  }

  public async saveKanjiPracticeSession(sessionData: Omit<KanjiPracticeSession, 'id' | 'timestamp'>): Promise<KanjiPracticeSession> {
    const db = await this.getDB();
    const session: KanjiPracticeSession = {
      ...sessionData,
      id: generateId('ksession'),
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction('kanji_practice_sessions', 'readwrite');
      const store = tx.objectStore('kanji_practice_sessions');
      const request = store.add(session);

      request.onsuccess = () => resolve(session);
      request.onerror = () => reject(request.error);
    });
  }

  public async getAllKanjiPracticeSessions(): Promise<KanjiPracticeSession[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('kanji_practice_sessions', 'readonly');
      const store = tx.objectStore('kanji_practice_sessions');
      const request = store.getAll();

      request.onsuccess = () => {
        const sessions = request.result as KanjiPracticeSession[];
        sessions.sort((a, b) => b.timestamp - a.timestamp);
        resolve(sessions);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // --- Study Notes Operations ---

  public async getAllNotes(): Promise<StudyNote[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('notes', 'readonly');
      const store = tx.objectStore('notes');
      const request = store.getAll();

      request.onsuccess = () => {
        const notes = (request.result as StudyNote[]).sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(notes);
      };
      request.onerror = () => reject(request.error);
    });
  }

  public async addNote(noteData: Omit<StudyNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<StudyNote> {
    const db = await this.getDB();
    const now = Date.now();
    const newNote: StudyNote = {
      ...noteData,
      id: generateId('note'),
      createdAt: now,
      updatedAt: now
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction('notes', 'readwrite');
      const store = tx.objectStore('notes');
      const request = store.add(newNote);

      request.onsuccess = () => resolve(newNote);
      request.onerror = () => reject(request.error);
    });
  }

  public async updateNote(note: StudyNote): Promise<StudyNote> {
    const db = await this.getDB();
    const updated: StudyNote = {
      ...note,
      updatedAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction('notes', 'readwrite');
      const store = tx.objectStore('notes');
      const request = store.put(updated);

      request.onsuccess = () => resolve(updated);
      request.onerror = () => reject(request.error);
    });
  }

  public async deleteNote(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('notes', 'readwrite');
      const store = tx.objectStore('notes');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Settings Operations ---

  public async getSettings(): Promise<AppSettings> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const request = store.get('app_settings');

      request.onsuccess = () => {
        if (request.result && request.result.value) {
          resolve({ ...DEFAULT_SETTINGS, ...request.result.value });
        } else {
          resolve(DEFAULT_SETTINGS);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  public async updateSettings(newSettings: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.getSettings();
    const updated = { ...current, ...newSettings };
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      const request = store.put({ key: 'app_settings', value: updated });

      request.onsuccess = () => resolve(updated);
      request.onerror = () => reject(request.error);
    });
  }

  // --- Export & Import Operations ---

  public async exportAllData(): Promise<string> {
    const vocabularies = await this.getAllVocabularies();
    const practiceSessions = await this.getAllPracticeSessions();
    const kanjis = await this.getAllKanjis();
    const kanjiPracticeSessions = await this.getAllKanjiPracticeSessions();
    const vocabChapters = await this.getAllVocabChapters();
    const kanjiChapters = await this.getAllKanjiChapters();
    const notes = await this.getAllNotes();
    const settings = await this.getSettings();

    const backupPayload = {
      app: 'NihongoHub',
      version: 4,
      exportedAt: new Date().toISOString(),
      counts: {
        vocabularies: vocabularies.length,
        practiceSessions: practiceSessions.length,
        kanjis: kanjis.length,
        kanjiPracticeSessions: kanjiPracticeSessions.length,
        vocabChapters: vocabChapters.length,
        kanjiChapters: kanjiChapters.length,
        notes: notes.length
      },
      data: {
        vocabularies,
        practiceSessions,
        kanjis,
        kanjiPracticeSessions,
        vocabChapters,
        kanjiChapters,
        notes,
        settings
      }
    };

    return JSON.stringify(backupPayload, null, 2);
  }

  public async importAllData(
    jsonData: string,
    mode: 'merge' | 'replace'
  ): Promise<{ importedVocabs: number; importedSessions: number; importedNotes: number; importedKanjis?: number; importedVocabChapters?: number; importedKanjiChapters?: number }> {
    let parsed: any;
    try {
      parsed = JSON.parse(jsonData);
    } catch {
      throw new Error('Invalid JSON file format.');
    }

    if (!parsed.data || (!Array.isArray(parsed.data.vocabularies) && !Array.isArray(parsed.data.kanjis))) {
      throw new Error('Backup file is missing required data structure.');
    }

    const incomingVocabs: VocabularyItem[] = Array.isArray(parsed.data.vocabularies)
      ? parsed.data.vocabularies.map(normalizeVocabItem)
      : [];
    const incomingSessions: PracticeSession[] = Array.isArray(parsed.data.practiceSessions)
      ? parsed.data.practiceSessions
      : [];
    const incomingKanjis: KanjiItem[] = Array.isArray(parsed.data.kanjis)
      ? parsed.data.kanjis.map(normalizeKanjiItem)
      : [];
    const incomingKanjiSessions: KanjiPracticeSession[] = Array.isArray(parsed.data.kanjiPracticeSessions)
      ? parsed.data.kanjiPracticeSessions
      : [];
    const incomingVocabChapters: ChapterItem[] = Array.isArray(parsed.data.vocabChapters)
      ? parsed.data.vocabChapters
      : [];
    const incomingKanjiChapters: ChapterItem[] = Array.isArray(parsed.data.kanjiChapters)
      ? parsed.data.kanjiChapters
      : [];
    const incomingNotes: StudyNote[] = Array.isArray(parsed.data.notes)
      ? parsed.data.notes
      : [];

    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const storeNames = ['vocabularies', 'practice_sessions', 'settings'];
      if (db.objectStoreNames.contains('notes')) storeNames.push('notes');
      if (db.objectStoreNames.contains('kanjis')) storeNames.push('kanjis');
      if (db.objectStoreNames.contains('kanji_practice_sessions')) storeNames.push('kanji_practice_sessions');
      if (db.objectStoreNames.contains('vocab_chapters')) storeNames.push('vocab_chapters');
      if (db.objectStoreNames.contains('kanji_chapters')) storeNames.push('kanji_chapters');

      const tx = db.transaction(storeNames, 'readwrite');
      const vocabStore = tx.objectStore('vocabularies');
      const sessionStore = tx.objectStore('practice_sessions');
      const settingsStore = tx.objectStore('settings');
      const notesStore = db.objectStoreNames.contains('notes') ? tx.objectStore('notes') : null;
      const kanjiStore = db.objectStoreNames.contains('kanjis') ? tx.objectStore('kanjis') : null;
      const kanjiSessionStore = db.objectStoreNames.contains('kanji_practice_sessions') ? tx.objectStore('kanji_practice_sessions') : null;
      const vocabChapterStore = db.objectStoreNames.contains('vocab_chapters') ? tx.objectStore('vocab_chapters') : null;
      const kanjiChapterStore = db.objectStoreNames.contains('kanji_chapters') ? tx.objectStore('kanji_chapters') : null;

      if (mode === 'replace') {
        vocabStore.clear();
        sessionStore.clear();
        if (notesStore) notesStore.clear();
        if (kanjiStore) kanjiStore.clear();
        if (kanjiSessionStore) kanjiSessionStore.clear();
        if (vocabChapterStore) vocabChapterStore.clear();
        if (kanjiChapterStore) kanjiChapterStore.clear();
      }

      // Add vocabularies
      incomingVocabs.forEach((v) => {
        if (v.japanese && v.english) {
          vocabStore.put(v);
        }
      });

      // Add sessions
      incomingSessions.forEach((s) => {
        sessionStore.put(s);
      });

      // Add kanjis
      if (kanjiStore) {
        incomingKanjis.forEach((k) => {
          if (k.kanji && k.meaning) {
            kanjiStore.put(k);
          }
        });
      }

      // Add kanji sessions
      if (kanjiSessionStore) {
        incomingKanjiSessions.forEach((ks) => {
          kanjiSessionStore.put(ks);
        });
      }

      // Add vocab chapters
      if (vocabChapterStore) {
        incomingVocabChapters.forEach((vc) => {
          vocabChapterStore.put(vc);
        });
      }

      // Add kanji chapters
      if (kanjiChapterStore) {
        incomingKanjiChapters.forEach((kc) => {
          kanjiChapterStore.put(kc);
        });
      }

      // Add notes
      if (notesStore) {
        incomingNotes.forEach((n) => {
          if (n.title && n.content) {
            notesStore.put(n);
          }
        });
      }

      if (parsed.data.settings) {
        settingsStore.put({ key: 'app_settings', value: parsed.data.settings });
      }

      tx.oncomplete = () => {
        resolve({
          importedVocabs: incomingVocabs.length,
          importedSessions: incomingSessions.length,
          importedNotes: incomingNotes.length,
          importedKanjis: incomingKanjis.length,
          importedVocabChapters: incomingVocabChapters.length,
          importedKanjiChapters: incomingKanjiChapters.length
        });
      };

      tx.onerror = () => reject(tx.error);
    });
  }

  // ==========================================
  // USERS & AUTH
  // ==========================================
  public async createUser(user: User): Promise<User> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['users'], 'readwrite');
      const store = tx.objectStore('users');
      const req = store.add(user);
      req.onsuccess = () => resolve(user);
      req.onerror = () => reject(req.error);
    });
  }

  public async getUserById(id: string): Promise<User | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['users'], 'readonly');
      const store = tx.objectStore('users');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  public async getUserByEmail(email: string): Promise<User | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['users'], 'readonly');
      const store = tx.objectStore('users');
      const index = store.index('email');
      const req = index.get(email);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  public async updateUser(user: User): Promise<User> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['users'], 'readwrite');
      const store = tx.objectStore('users');
      const req = store.put(user);
      req.onsuccess = () => resolve(user);
      req.onerror = () => reject(req.error);
    });
  }

  // ==========================================
  // USER VOCABULARY OVERLAYS (ZERO MASTER OVERWRITE)
  // ==========================================
  public async getUserVocabList(userId: string): Promise<UserVocabData[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['user_vocab'], 'readonly');
      const store = tx.objectStore('user_vocab');
      const index = store.index('userId');
      const req = index.getAll(userId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  public async getUserVocab(userId: string, vocabId: string): Promise<UserVocabData | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['user_vocab'], 'readonly');
      const store = tx.objectStore('user_vocab');
      const req = store.get(`${userId}_${vocabId}`);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  public async saveUserVocab(data: UserVocabData): Promise<UserVocabData> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['user_vocab'], 'readwrite');
      const store = tx.objectStore('user_vocab');
      const req = store.put(data);
      req.onsuccess = () => resolve(data);
      req.onerror = () => reject(req.error);
    });
  }

  public async deleteUserVocab(userId: string, vocabId: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['user_vocab'], 'readwrite');
      const store = tx.objectStore('user_vocab');
      const req = store.delete(`${userId}_${vocabId}`);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // ==========================================
  // USER KANJI OVERLAYS (ZERO MASTER OVERWRITE)
  // ==========================================
  public async getUserKanjiList(userId: string): Promise<UserKanjiData[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['user_kanji'], 'readonly');
      const store = tx.objectStore('user_kanji');
      const index = store.index('userId');
      const req = index.getAll(userId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  public async getUserKanji(userId: string, kanjiId: string): Promise<UserKanjiData | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['user_kanji'], 'readonly');
      const store = tx.objectStore('user_kanji');
      const req = store.get(`${userId}_${kanjiId}`);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  public async saveUserKanji(data: UserKanjiData): Promise<UserKanjiData> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['user_kanji'], 'readwrite');
      const store = tx.objectStore('user_kanji');
      const req = store.put(data);
      req.onsuccess = () => resolve(data);
      req.onerror = () => reject(req.error);
    });
  }

  public async deleteUserKanji(userId: string, kanjiId: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['user_kanji'], 'readwrite');
      const store = tx.objectStore('user_kanji');
      const req = store.delete(`${userId}_${kanjiId}`);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async clearAllDataDevOnly(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const storeNames = ['vocabularies', 'practice_sessions', 'settings'];
      if (db.objectStoreNames.contains('notes')) storeNames.push('notes');
      if (db.objectStoreNames.contains('kanjis')) storeNames.push('kanjis');
      if (db.objectStoreNames.contains('kanji_practice_sessions')) storeNames.push('kanji_practice_sessions');
      if (db.objectStoreNames.contains('vocab_chapters')) storeNames.push('vocab_chapters');
      if (db.objectStoreNames.contains('kanji_chapters')) storeNames.push('kanji_chapters');
      if (db.objectStoreNames.contains('users')) storeNames.push('users');
      if (db.objectStoreNames.contains('user_vocab')) storeNames.push('user_vocab');
      if (db.objectStoreNames.contains('user_kanji')) storeNames.push('user_kanji');

      const tx = db.transaction(storeNames, 'readwrite');
      storeNames.forEach(name => tx.objectStore(name).clear());

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const idb = new KotobaDB();
