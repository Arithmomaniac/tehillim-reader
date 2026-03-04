import { TehillimData, Chapter, Verse, WordData } from './types';
import { toHebrewNumeral, stripHtml } from './utils';

// Will be replaced with actual data via the fetch script
import rawData from './data/tehillim.json';

/**
 * Load and return the pre-processed Tehillim data.
 * Data includes syllable breakdowns computed at build time via havarotjs.
 */
export function loadTehillimData(): TehillimData {
  return rawData as TehillimData;
}

/**
 * Get a specific chapter by 1-based number.
 */
export function getChapter(data: TehillimData, chapterNum: number): Chapter | undefined {
  return data.chapters.find(c => c.number === chapterNum);
}

/**
 * Get total word count in a chapter (for progress tracking).
 */
export function getTotalWords(chapter: Chapter): number {
  return chapter.verses.reduce((sum, v) => sum + v.words.length, 0);
}

/**
 * Flatten all words in a chapter into a single array with verse context.
 */
export function flattenWords(chapter: Chapter): WordData[] {
  const words: WordData[] = [];
  for (const verse of chapter.verses) {
    for (const word of verse.words) {
      words.push(word);
    }
  }
  return words;
}
