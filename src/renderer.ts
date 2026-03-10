import { Chapter, NavigationPosition, AppSettings } from './types';
import { toHebrewNumeral, isDivineName, getDivineNameForm, stripNikkud } from './utils';

const KAMATZ_KATAN = '\u05C7';

/** Hebrew consonant range U+05D0–U+05EA */
function isConsonant(ch: string): boolean {
  const code = ch.codePointAt(0)!;
  return code >= 0x05D0 && code <= 0x05EA;
}

/**
 * Set text content of an element, optionally wrapping each consonant+kamatz_katan
 * grapheme cluster in a styled span to mark kamatz katan visually.
 */
function setTextWithKamatzMarking(el: HTMLElement, text: string, indicator: string): void {
  if (indicator === 'off' || !text.includes(KAMATZ_KATAN)) {
    el.textContent = text;
    return;
  }

  el.textContent = '';
  let i = 0;
  while (i < text.length) {
    const kamatzPos = text.indexOf(KAMATZ_KATAN, i);
    if (kamatzPos === -1) {
      el.appendChild(document.createTextNode(text.slice(i)));
      break;
    }

    // Find the consonant that owns this kamatz katan
    let consonantStart = kamatzPos - 1;
    while (consonantStart >= i && !isConsonant(text[consonantStart])) {
      consonantStart--;
    }
    if (consonantStart < i) consonantStart = kamatzPos;

    // Text before the consonant
    if (consonantStart > i) {
      el.appendChild(document.createTextNode(text.slice(i, consonantStart)));
    }

    // Find end of grapheme cluster (consonant + all combining marks)
    let clusterEnd = kamatzPos + 1;
    while (clusterEnd < text.length && !isConsonant(text[clusterEnd])) {
      clusterEnd++;
    }

    // Wrap consonant+kamatz cluster
    const span = document.createElement('span');
    span.className = 'kamatz-katan kamatz-dot';
    span.textContent = text.slice(consonantStart, clusterEnd);
    el.appendChild(span);

    i = kamatzPos + 1;
  }
}

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
    onWordClick: (verseIndex: number, wordIndex: number, syllableIndex?: number) => void
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

        // Determine display text and syllables, accounting for Tetragrammaton
        let displayText = word.text;
        let syllables = settings.readingMode ? word.syllables : word.syllablesTiberian;
        const divine = isDivineName(word.text);

        if (divine) {
          wordSpan.classList.add('divine-name');
          const form = getDivineNameForm(word.text);
          if (form === 'adonai') {
            // Adonai form: strip nikkud, show bare consonants, no syllable splitting
            displayText = stripNikkud(word.text);
            syllables = [displayText];
          } else {
            // Elohim form: keep nikkud, use manual 3-syllable breakdown
            syllables = ['יֱ', 'הֹ', 'וִה'];
          }
        }

        if (settings.highlightMode === 'syllable' && syllables.length > 1) {
          // Render individual syllable spans with per-syllable click handlers
          for (let sIdx = 0; sIdx < syllables.length; sIdx++) {
            const sylSpan = document.createElement('span');
            sylSpan.className = 'syllable';
            sylSpan.dataset.syllable = String(sIdx);
            setTextWithKamatzMarking(sylSpan, syllables[sIdx], settings.kamatzIndicator);
            const capturedSIdx = sIdx;
            sylSpan.addEventListener('click', (e) => {
              e.stopPropagation();
              onWordClick(vIdx, wIdx, capturedSIdx);
            });
            wordSpan.appendChild(sylSpan);
          }
        } else {
          setTextWithKamatzMarking(wordSpan, displayText, settings.kamatzIndicator);
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
