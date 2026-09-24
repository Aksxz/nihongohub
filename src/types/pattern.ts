import { JLPTLevel } from "./kanji";

export interface PatternExample {
  japanese: string;
  reading?: string;
  english: string;
}

export interface PatternItem {
  id: string;
  _id?: string;
  title: string;
  pattern: string;
  formula?: string;
  meaning: string;
  usage?: string;
  examples: PatternExample[];
  jlptLevel: JLPTLevel;
  destinationType: "chapter" | "custom";
  chapter?: number | null;
  customChapterId?: string | { _id?: string; id?: string; name: string; displayName?: string; title?: string } | null;
  order?: number;
  isActive?: boolean;
  createdAt?: number | string;
  updatedAt?: number | string;
}

export interface PatternChapterItem {
  jlpt: string;
  chapter: number;
  chapterName: string;
  title: string;
  count: number;
}
