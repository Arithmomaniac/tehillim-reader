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
  syllablesTiberian: string[];
  verseIndex: number;
  wordIndex: number;
}

export type HighlightMode = 'word' | 'syllable';
export type ChapterOrder = 'sequential' | 'random';
export type ThemeMode = 'warm' | 'light' | 'dark';

export interface AppSettings {
  highlightMode: HighlightMode;
  highlightColor: string;
  fontSize: number;
  chapterOrder: ChapterOrder;
  autoAdvance: boolean;
  theme: ThemeMode;
  readingMode: boolean; // true = casual/traditional, false = Tiberian/academic
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
  theme: 'warm',
  readingMode: true,
};
