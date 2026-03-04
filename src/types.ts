export interface TehillimData {
  chapters: Chapter[];
}

export interface Chapter {
  number: number;
  hebrewNumber: string;
  verses: Verse[];
}

export interface Verse {
  number: number;
  text: string;
  words: WordData[];
}

export interface WordData {
  text: string;
  syllables: string[];
  verseIndex: number;
  wordIndex: number;
}

export type HighlightMode = 'word' | 'syllable';
export type ChapterOrder = 'sequential' | 'random';

export interface AppSettings {
  highlightMode: HighlightMode;
  highlightColor: string;
  fontSize: number;
  chapterOrder: ChapterOrder;
  autoAdvance: boolean;
}

export interface NavigationPosition {
  chapterIndex: number;
  verseIndex: number;
  wordIndex: number;
  syllableIndex: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  highlightMode: 'word',
  highlightColor: '#FFD700',
  fontSize: 36,
  chapterOrder: 'sequential',
  autoAdvance: true,
};
