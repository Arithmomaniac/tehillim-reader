import { Chapter, WordData, NavigationPosition, AppSettings } from './types';
import { flattenWords } from './data-loader';
import { isDivineName, getDivineNameForm, stripNikkud } from './utils';

/** Get the active syllable array for a word based on reading mode and divine name handling */
function getWordSyllables(word: WordData, settings: AppSettings): string[] {
  if (isDivineName(word.text)) {
    const form = getDivineNameForm(word.text);
    if (form === 'adonai') {
      return [stripNikkud(word.text)];
    }
    // Elohim form: 3 syllables
    return ['יֱ', 'הֹ', 'וִה'];
  }
  return settings.readingMode ? word.syllables : word.syllablesTiberian;
}

/**
 * Manages the current reading position and provides navigation methods.
 */
export class Navigator {
  private chapter: Chapter;
  private flatWords: WordData[];
  private pos: NavigationPosition;
  private settings: AppSettings;
  private onPositionChange: (pos: NavigationPosition) => void;

  constructor(
    chapter: Chapter,
    settings: AppSettings,
    onPositionChange: (pos: NavigationPosition) => void
  ) {
    this.chapter = chapter;
    this.flatWords = flattenWords(chapter);
    this.settings = settings;
    this.onPositionChange = onPositionChange;
    this.pos = {
      chapterIndex: chapter.number - 1,
      verseIndex: 0,
      wordIndex: 0,
      syllableIndex: 0,
    };
  }

  getPosition(): NavigationPosition {
    return { ...this.pos };
  }

  updateSettings(settings: AppSettings): void {
    this.settings = settings;
  }

  setChapter(chapter: Chapter): void {
    this.chapter = chapter;
    this.flatWords = flattenWords(chapter);
    this.pos = {
      chapterIndex: chapter.number - 1,
      verseIndex: 0,
      wordIndex: 0,
      syllableIndex: 0,
    };
    this.onPositionChange(this.pos);
  }

  /** Get the flat index of the current word */
  private getFlatIndex(): number {
    let idx = 0;
    for (let v = 0; v < this.pos.verseIndex; v++) {
      idx += this.chapter.verses[v].words.length;
    }
    idx += this.pos.wordIndex;
    return idx;
  }

  /** Set position from a flat word index */
  private setFromFlatIndex(flatIdx: number): void {
    let remaining = flatIdx;
    for (let v = 0; v < this.chapter.verses.length; v++) {
      const verseWordCount = this.chapter.verses[v].words.length;
      if (remaining < verseWordCount) {
        this.pos.verseIndex = v;
        this.pos.wordIndex = remaining;
        this.pos.syllableIndex = 0;
        return;
      }
      remaining -= verseWordCount;
    }
  }

  /** Get current word data */
  getCurrentWord(): WordData | undefined {
    const verse = this.chapter.verses[this.pos.verseIndex];
    if (!verse) return undefined;
    return verse.words[this.pos.wordIndex];
  }

  /**
   * Move forward (in Hebrew reading direction: right-to-left, then next line).
   * Returns true if moved, false if at end of chapter.
   */
  moveForward(): boolean {
    if (this.settings.highlightMode === 'syllable') {
      const word = this.getCurrentWord();
      if (word && this.pos.syllableIndex < getWordSyllables(word, this.settings).length - 1) {
        this.pos.syllableIndex++;
        this.onPositionChange(this.pos);
        return true;
      }
    }

    // Move to next word
    const flatIdx = this.getFlatIndex();
    if (flatIdx < this.flatWords.length - 1) {
      this.setFromFlatIndex(flatIdx + 1);
      this.pos.syllableIndex = 0;
      this.onPositionChange(this.pos);
      return true;
    }
    return false; // At end of chapter
  }

  /**
   * Move backward.
   * Returns true if moved, false if at beginning of chapter.
   */
  moveBackward(): boolean {
    if (this.settings.highlightMode === 'syllable') {
      if (this.pos.syllableIndex > 0) {
        this.pos.syllableIndex--;
        this.onPositionChange(this.pos);
        return true;
      }
    }

    // Move to previous word
    const flatIdx = this.getFlatIndex();
    if (flatIdx > 0) {
      this.setFromFlatIndex(flatIdx - 1);
      // In syllable mode, jump to last syllable of previous word
      if (this.settings.highlightMode === 'syllable') {
        const word = this.getCurrentWord();
        if (word) {
          this.pos.syllableIndex = getWordSyllables(word, this.settings).length - 1;
        }
      } else {
        this.pos.syllableIndex = 0;
      }
      this.onPositionChange(this.pos);
      return true;
    }
    return false; // At beginning of chapter
  }

  /** Jump to a specific word by verse and word index, optionally to a specific syllable */
  jumpTo(verseIndex: number, wordIndex: number, syllableIndex?: number): void {
    this.pos.verseIndex = verseIndex;
    this.pos.wordIndex = wordIndex;
    this.pos.syllableIndex = syllableIndex ?? 0;
    this.onPositionChange(this.pos);
  }

  /** Move to next verse */
  nextVerse(): boolean {
    if (this.pos.verseIndex < this.chapter.verses.length - 1) {
      this.pos.verseIndex++;
      this.pos.wordIndex = 0;
      this.pos.syllableIndex = 0;
      this.onPositionChange(this.pos);
      return true;
    }
    return false;
  }

  /** Move to previous verse */
  prevVerse(): boolean {
    if (this.pos.verseIndex > 0) {
      this.pos.verseIndex--;
      this.pos.wordIndex = 0;
      this.pos.syllableIndex = 0;
      this.onPositionChange(this.pos);
      return true;
    }
    return false;
  }

  /** Jump to beginning of chapter */
  goToBeginning(): void {
    this.pos.verseIndex = 0;
    this.pos.wordIndex = 0;
    this.pos.syllableIndex = 0;
    this.onPositionChange(this.pos);
  }

  /** Jump to end of chapter */
  goToEnd(): void {
    const lastVerse = this.chapter.verses.length - 1;
    this.pos.verseIndex = lastVerse;
    this.pos.wordIndex = this.chapter.verses[lastVerse].words.length - 1;
    this.pos.syllableIndex = 0;
    this.onPositionChange(this.pos);
  }

  /** Check if at end of chapter */
  isAtEnd(): boolean {
    const flatIdx = this.getFlatIndex();
    const atLastWord = flatIdx === this.flatWords.length - 1;
    if (!atLastWord) return false;
    if (this.settings.highlightMode === 'syllable') {
      const word = this.getCurrentWord();
      return !word || this.pos.syllableIndex >= getWordSyllables(word, this.settings).length - 1;
    }
    return true;
  }
}
