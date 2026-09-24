import { JLPTLevel } from './kanji';

export interface ChapterItem {
  id: string;
  chapterNumber: number;
  title: string;
  japaneseTitle?: string;
  description?: string;
  jlpt?: JLPTLevel;
  createdAt: number;
}
