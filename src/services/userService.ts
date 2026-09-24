import { idb } from '../db/idb';
import { api } from './api';
import { VocabularyItem } from '../types/vocab';
import { KanjiItem } from '../types/kanji';
import { 
  UserVocabData, 
  UserKanjiData, 
  DisplayVocabularyItem, 
  DisplayKanjiItem 
} from '../types/user';

export class UserService {
  /**
   * Fetch all user-specific vocabulary overlay customizations for a given user
   */
  public async getUserVocabOverlays(userId: string): Promise<Record<string, UserVocabData>> {
    // 1. Try fetching from MongoDB Atlas API
    try {
      const res = await api.userVocabulary.getAll();
      if (res.success && res.data) {
        return res.data;
      }
    } catch (_) {
      // Backend not running or offline; fallback to IndexedDB
    }

    // 2. Fallback to IndexedDB
    const list = await idb.getUserVocabList(userId);
    const map: Record<string, UserVocabData> = {};
    for (const item of list) {
      map[item.vocabId] = item;
    }
    return map;
  }

  /**
   * Save or update private user vocabulary customizations (meaning, reading, notes, flags)
   */
  public async saveVocabCustomization(
    userId: string,
    vocabId: string,
    data: Partial<Omit<UserVocabData, 'id' | 'userId' | 'vocabId' | 'updatedAt'>>
  ): Promise<UserVocabData> {
    const existing = await idb.getUserVocab(userId, vocabId);
    const record: UserVocabData = {
      id: `${userId}_${vocabId}`,
      userId,
      vocabId,
      customMeaning: data.customMeaning !== undefined ? data.customMeaning : (existing?.customMeaning || ''),
      customReading: data.customReading !== undefined ? data.customReading : (existing?.customReading || ''),
      personalNote: data.personalNote !== undefined ? data.personalNote : (existing?.personalNote || ''),
      isFavorite: data.isFavorite !== undefined ? data.isFavorite : (existing?.isFavorite ?? false),
      isLearned: data.isLearned !== undefined ? data.isLearned : (existing?.isLearned ?? false),
      isDifficult: data.isDifficult !== undefined ? data.isDifficult : (existing?.isDifficult ?? false),
      isHidden: data.isHidden !== undefined ? data.isHidden : (existing?.isHidden ?? false),
      updatedAt: Date.now()
    };

    // 1. Sync to MongoDB Atlas API (propagate error on failure)
    await api.userVocabulary.update(vocabId, record);

    // 2. Persist locally to IndexedDB
    await idb.saveUserVocab(record);
    return record;
  }

  public async saveUserVocabCustomization(
    userId: string,
    vocabId: string,
    data: Partial<Omit<UserVocabData, 'id' | 'userId' | 'vocabId' | 'updatedAt'>>
  ): Promise<UserVocabData> {
    return this.saveVocabCustomization(userId, vocabId, data);
  }

  /**
   * Hide a vocabulary item for the authenticated user only (Zero master overwrite)
   */
  public async hideUserVocab(userId: string, vocabId: string): Promise<UserVocabData> {
    const existing = await idb.getUserVocab(userId, vocabId);
    const record: UserVocabData = {
      id: `${userId}_${vocabId}`,
      userId,
      vocabId,
      customMeaning: existing?.customMeaning || '',
      customReading: existing?.customReading || '',
      personalNote: existing?.personalNote || '',
      isFavorite: existing?.isFavorite ?? false,
      isLearned: existing?.isLearned ?? false,
      isDifficult: existing?.isDifficult ?? false,
      isHidden: true,
      updatedAt: Date.now()
    };

    // 1. Sync to MongoDB Atlas API (propagate error on failure)
    await api.userVocabulary.hide(vocabId);

    // 2. Persist locally to IndexedDB
    await idb.saveUserVocab(record);
    return record;
  }

  /**
   * Unhide/restore a vocabulary item for the authenticated user
   */
  public async unhideUserVocab(userId: string, vocabId: string): Promise<UserVocabData> {
    const existing = await idb.getUserVocab(userId, vocabId);
    const record: UserVocabData = {
      id: `${userId}_${vocabId}`,
      userId,
      vocabId,
      customMeaning: existing?.customMeaning || '',
      customReading: existing?.customReading || '',
      personalNote: existing?.personalNote || '',
      isFavorite: existing?.isFavorite ?? false,
      isLearned: existing?.isLearned ?? false,
      isDifficult: existing?.isDifficult ?? false,
      isHidden: false,
      updatedAt: Date.now()
    };

    await api.userVocabulary.unhide(vocabId);
    await idb.saveUserVocab(record);
    return record;
  }

  /**
   * Toggle a boolean flag (isFavorite, isLearned, isDifficult) for a vocabulary word
   */
  public async toggleVocabFlag(
    userId: string,
    vocabId: string,
    flag: 'isFavorite' | 'isLearned' | 'isDifficult',
    value: boolean
  ): Promise<UserVocabData> {
    return this.saveVocabCustomization(userId, vocabId, { [flag]: value });
  }

  /**
   * Remove custom overlay for a word to revert back to default master data
   */
  public async resetVocabCustomization(userId: string, vocabId: string): Promise<void> {
    try {
      await api.userVocabulary.reset(vocabId);
    } catch (_) {}
    await idb.deleteUserVocab(userId, vocabId);
  }

  public async removeUserVocabCustomization(userId: string, vocabId: string): Promise<void> {
    return this.resetVocabCustomization(userId, vocabId);
  }

  /**
   * Fetch all user-specific kanji overlay customizations for a given user
   */
  public async getUserKanjiOverlays(userId: string): Promise<Record<string, UserKanjiData>> {
    // 1. Try fetching from MongoDB Atlas API
    try {
      const res = await api.userKanji.getAll();
      if (res.success && res.data) {
        return res.data;
      }
    } catch (_) {}

    // 2. Fallback to IndexedDB
    const list = await idb.getUserKanjiList(userId);
    const map: Record<string, UserKanjiData> = {};
    for (const item of list) {
      map[item.kanjiId] = item;
    }
    return map;
  }

  /**
   * Save or update private user kanji customizations (meaning, notes, flags)
   */
  public async saveKanjiCustomization(
    userId: string,
    kanjiId: string,
    data: Partial<Omit<UserKanjiData, 'id' | 'userId' | 'kanjiId' | 'updatedAt'>>
  ): Promise<UserKanjiData> {
    const existing = await idb.getUserKanji(userId, kanjiId);
    const record: UserKanjiData = {
      id: `${userId}_${kanjiId}`,
      userId,
      kanjiId,
      customMeaning: data.customMeaning !== undefined ? data.customMeaning : existing?.customMeaning,
      personalNote: data.personalNote !== undefined ? data.personalNote : existing?.personalNote,
      isFavorite: data.isFavorite !== undefined ? data.isFavorite : existing?.isFavorite,
      isMastered: data.isMastered !== undefined ? data.isMastered : existing?.isMastered,
      isDifficult: data.isDifficult !== undefined ? data.isDifficult : existing?.isDifficult,
      updatedAt: Date.now()
    };

    // 1. Sync to MongoDB Atlas API
    await api.userKanji.update(kanjiId, record);

    // 2. Persist locally to IndexedDB
    await idb.saveUserKanji(record);
    return record;
  }

  public async saveUserKanjiCustomization(
    userId: string,
    kanjiId: string,
    data: Partial<Omit<UserKanjiData, 'id' | 'userId' | 'kanjiId' | 'updatedAt'>>
  ): Promise<UserKanjiData> {
    return this.saveKanjiCustomization(userId, kanjiId, data);
  }

  /**
   * Toggle a boolean flag (isFavorite, isMastered, isDifficult) for a kanji character
   */
  public async toggleKanjiFlag(
    userId: string,
    kanjiId: string,
    flag: 'isFavorite' | 'isMastered' | 'isDifficult',
    value: boolean
  ): Promise<UserKanjiData> {
    return this.saveKanjiCustomization(userId, kanjiId, { [flag]: value });
  }

  /**
   * Remove custom overlay for a kanji to revert back to default master data
   */
  public async resetKanjiCustomization(userId: string, kanjiId: string): Promise<void> {
    try {
      await api.userKanji.reset(kanjiId);
    } catch (_) {}
    await idb.deleteUserKanji(userId, kanjiId);
  }

  public async removeUserKanjiCustomization(userId: string, kanjiId: string): Promise<void> {
    return this.resetKanjiCustomization(userId, kanjiId);
  }

  /**
   * Merges master vocabulary array with the user's private overlay map
   */
  public mergeVocabList(
    masterVocab: VocabularyItem[],
    overlays: Record<string, UserVocabData>
  ): DisplayVocabularyItem[] {
    return masterVocab
      .filter(item => {
        const overlay = overlays[item.id];
        return !overlay?.isHidden && !(overlay as any)?.hidden;
      })
      .map(item => {
        const overlay = overlays[item.id];
        const hasCustomization = !!(
          overlay && (
            (overlay.customMeaning && overlay.customMeaning.trim() !== '') ||
            (overlay.customReading && overlay.customReading.trim() !== '') ||
            (overlay.personalNote && overlay.personalNote.trim() !== '')
          )
        );

        const practiceCount = overlay?.practiceCount !== undefined ? overlay.practiceCount : item.practiceCount;
        const correctCount = overlay?.correctCount !== undefined ? overlay.correctCount : item.correctCount;
        const wrongCount = overlay?.wrongCount !== undefined ? overlay.wrongCount : item.wrongCount;
        const consecutiveCorrect = overlay?.consecutiveCorrect !== undefined ? overlay.consecutiveCorrect : item.consecutiveCorrect;
        const status = overlay?.status || item.status || (overlay?.isDifficult ? 'weak' : 'normal');
        const isDifficult = status === 'weak' || status === 'hard' || !!overlay?.isDifficult || item.difficulty === 'hard';
        const isLearned = status === 'mastered' || (overlay?.isLearned !== undefined ? overlay.isLearned : item.learningStatus === 'Mastered');

        return {
          ...item,
          practiceCount,
          correctCount,
          wrongCount,
          consecutiveCorrect,
          status,
          lastPracticed: overlay?.lastPracticed || item.lastPracticed,
          effectiveMeaning: (overlay?.customMeaning && overlay.customMeaning.trim() !== '') 
            ? overlay.customMeaning 
            : item.english,
          effectiveReading: (overlay?.customReading && overlay.customReading.trim() !== '') 
            ? overlay.customReading 
            : item.reading,
          personalNote: overlay?.personalNote || item.notes,
          isFavorite: !!overlay?.isFavorite,
          isLearned,
          isDifficult,
          isHidden: false,
          hasPersonalCustomization: hasCustomization
        };
      });
  }

  /**
   * Merges master kanji array with the user's private overlay map
   */
  public mergeKanjiList(
    masterKanji: KanjiItem[],
    overlays: Record<string, UserKanjiData>
  ): DisplayKanjiItem[] {
    return masterKanji.map(item => {
      const overlay = overlays[item.id];
      const hasCustomization = !!(
        overlay && (
          (overlay.customMeaning && overlay.customMeaning.trim() !== '') ||
          (overlay.personalNote && overlay.personalNote.trim() !== '')
        )
      );

      return {
        ...item,
        effectiveMeaning: (overlay?.customMeaning && overlay.customMeaning.trim() !== '') 
          ? overlay.customMeaning 
          : item.meaning,
        personalNote: overlay?.personalNote || item.notes,
        isFavorite: !!overlay?.isFavorite,
        isMastered: overlay?.isMastered !== undefined 
          ? overlay.isMastered 
          : item.learningStatus === 'Mastered',
        isDifficult: overlay?.isDifficult !== undefined 
          ? overlay.isDifficult 
          : (item.learningStatus === 'Difficult' || item.difficulty === 'hard'),
        hasPersonalCustomization: hasCustomization
      };
    });
  }
}

export const userService = new UserService();
