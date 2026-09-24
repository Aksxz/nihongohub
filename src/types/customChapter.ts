export interface CustomChapter {
  _id?: string;
  id: string;
  name: string;
  displayName: string;
  japaneseName?: string;
  description?: string;
  jlptLevel: string;
  order: number;
  wordCount?: number;
  vocabularies?: any[];
  createdAt?: string;
  updatedAt?: string;
}
