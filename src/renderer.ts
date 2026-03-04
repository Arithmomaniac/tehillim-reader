import { Chapter, NavigationPosition, AppSettings } from './types';
import { toHebrewNumeral } from './utils';

/**
 * Renders the chapter text with word/syllable spans and manages highlight updates.
 */
export class Renderer {
  private container: HTMLElement;
  private titleEl: HTMLElement;

  constructor(containerId: string, titleId: string) {
    this.container = document.getElementById(containerId)!;
    this.titleEl = document.getElementById(titleId)!;
  }

  /**
   * Render a chapter's text into the container with clickable word/syllable spans.
   */
  renderChapter(
    chapter: Chapter,
    settings: AppSettings,
    onWordClick: (verseIndex: number, wordIndex: number) => void
  ): void {
    this.titleEl.textContent = `תהילים ${chapter.hebrewNumber}`;
    this.container.innerHTML = '';

    for (let vIdx = 0; vIdx < chapter.verses.length; vIdx++) {
      const verse = chapter.verses[vIdx];
      const verseEl = document.createElement('div');
      verseEl.className = 'verse';
      verseEl.dataset.verse = String(vIdx);

      // Verse number
      const numSpan = document.createElement('span');
      numSpan.className = 'verse-number';
      numSpan.textContent = toHebrewNumeral(verse.number);
      verseEl.appendChild(numSpan);

      for (let wIdx = 0; wIdx < verse.words.length; wIdx++) {
        const word = verse.words[wIdx];
        const wordSpan = document.createElement('span');
        wordSpan.className = 'word';
        wordSpan.dataset.verse = String(vIdx);
        wordSpan.dataset.word = String(wIdx);

        const syllables = settings.readingMode ? word.syllables : word.syllablesTiberian;

        if (settings.highlightMode === 'syllable' && syllables.length > 1) {
          // Render individual syllable spans
          for (let sIdx = 0; sIdx < syllables.length; sIdx++) {
            const sylSpan = document.createElement('span');
            sylSpan.className = 'syllable';
            sylSpan.dataset.syllable = String(sIdx);
            sylSpan.textContent = syllables[sIdx];
            wordSpan.appendChild(sylSpan);
          }
        } else {
          wordSpan.textContent = word.text;
        }

        wordSpan.addEventListener('click', () => {
          onWordClick(vIdx, wIdx);
        });

        verseEl.appendChild(wordSpan);
        // Add space between words
        if (wIdx < verse.words.length - 1) {
          verseEl.appendChild(document.createTextNode(' '));
        }
      }

      this.container.appendChild(verseEl);
    }
  }

  /**
   * Update the highlight to reflect the current navigation position.
   */
  updateHighlight(pos: NavigationPosition, settings: AppSettings): void {
    // Clear all highlights
    this.container.querySelectorAll('.highlighted').forEach(el => {
      el.classList.remove('highlighted');
    });

    // Find the current word element
    const wordEl = this.container.querySelector(
      `.word[data-verse="${pos.verseIndex}"][data-word="${pos.wordIndex}"]`
    ) as HTMLElement | null;

    if (!wordEl) return;

    if (settings.highlightMode === 'syllable') {
      // Highlight specific syllable
      const sylEl = wordEl.querySelector(
        `.syllable[data-syllable="${pos.syllableIndex}"]`
      );
      if (sylEl) {
        sylEl.classList.add('highlighted');
      } else {
        // Fallback: highlight whole word if no syllable spans
        wordEl.classList.add('highlighted');
      }
    } else {
      wordEl.classList.add('highlighted');
    }

    // Scroll the highlighted element into view
    this.scrollToElement(wordEl);
  }

  private scrollToElement(el: HTMLElement): void {
    const readingArea = document.getElementById('reading-area')!;
    const elRect = el.getBoundingClientRect();
    const areaRect = readingArea.getBoundingClientRect();

    // Check if element is outside the visible area
    if (elRect.bottom > areaRect.bottom - 40 || elRect.top < areaRect.top + 40) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}
