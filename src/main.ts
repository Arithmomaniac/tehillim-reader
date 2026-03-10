import { TehillimData, AppSettings, NavigationPosition } from './types';
import { loadTehillimData } from './data-loader';
import { loadSettings, saveSettings, applySettingsToDOM } from './settings';
import { Navigator } from './navigator';
import { Renderer } from './renderer';
import { toHebrewNumeral, shuffleArray } from './utils';

class TehillimReaderApp {
  private data: TehillimData;
  private settings: AppSettings;
  private navigator!: Navigator;
  private renderer: Renderer;
  private currentChapterNum: number = 1;
  private chapterSequence: number[] = [];

  constructor() {
    this.data = loadTehillimData();
    this.settings = loadSettings();
    this.renderer = new Renderer('text-container', 'chapter-title');
    this.buildChapterSequence();
    this.setupEventListeners();
    this.loadChapter(this.currentChapterNum);
    applySettingsToDOM(this.settings);
    this.syncSettingsUI();
  }

  private buildChapterSequence(): void {
    const nums = Array.from({ length: 150 }, (_, i) => i + 1);
    this.chapterSequence =
      this.settings.chapterOrder === 'random' ? shuffleArray(nums) : nums;
  }

  private loadChapter(chapterNum: number): void {
    this.currentChapterNum = chapterNum;
    const chapter = this.data.chapters.find(c => c.number === chapterNum);
    if (!chapter) return;

    this.navigator = new Navigator(chapter, this.settings, (pos) => {
      this.renderer.updateHighlight(pos, this.settings);
    });

    this.renderer.renderChapter(chapter, this.settings, (vIdx, wIdx, sIdx) => {
      this.navigator.jumpTo(vIdx, wIdx, sIdx);
    });

    // Highlight the first word
    this.renderer.updateHighlight(this.navigator.getPosition(), this.settings);
    this.updateChapterGridHighlight();

    // Focus the reading area for keyboard events
    document.getElementById('reading-area')!.focus();
  }

  private goToNextChapter(): void {
    const currentIdx = this.chapterSequence.indexOf(this.currentChapterNum);
    if (currentIdx < this.chapterSequence.length - 1) {
      this.loadChapter(this.chapterSequence[currentIdx + 1]);
    } else if (this.settings.autoAdvance) {
      // Wrap around
      this.loadChapter(this.chapterSequence[0]);
    }
  }

  private goToPrevChapter(): void {
    const currentIdx = this.chapterSequence.indexOf(this.currentChapterNum);
    if (currentIdx > 0) {
      this.loadChapter(this.chapterSequence[currentIdx - 1]);
    }
  }

  private setupEventListeners(): void {
    this.setupKeyboardNavigation();
    this.setupScrollNavigation();
    this.setupSettingsPanel();
    this.setupChapterSelector();
    this.setupFooterNav();
  }

  private setupKeyboardNavigation(): void {
    const readingArea = document.getElementById('reading-area')!;
    readingArea.addEventListener('keydown', (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
        case ' ':
          e.preventDefault();
          if (!this.navigator.moveForward()) {
            if (this.settings.autoAdvance) this.goToNextChapter();
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.navigator.moveBackward();
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.navigator.nextVerse();
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.navigator.prevVerse();
          break;
        case 'Enter':
          e.preventDefault();
          if (!this.navigator.nextVerse()) {
            if (this.settings.autoAdvance) this.goToNextChapter();
          }
          break;
        case 'Home':
          e.preventDefault();
          this.navigator.goToBeginning();
          break;
        case 'End':
          e.preventDefault();
          this.navigator.goToEnd();
          break;
      }
    });
  }

  private setupScrollNavigation(): void {
    const readingArea = document.getElementById('reading-area')!;
    readingArea.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY > 0) {
        // Scroll down = move forward
        if (!this.navigator.moveForward()) {
          if (this.settings.autoAdvance) this.goToNextChapter();
        }
      } else if (e.deltaY < 0) {
        this.navigator.moveBackward();
      }
    }, { passive: false });
  }

  private setupSettingsPanel(): void {
    const overlay = document.getElementById('settings-overlay')!;
    const openBtn = document.getElementById('settings-btn')!;
    const closeBtn = document.getElementById('settings-close')!;

    openBtn.addEventListener('click', () => overlay.classList.remove('hidden'));
    closeBtn.addEventListener('click', () => overlay.classList.add('hidden'));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.add('hidden');
    });

    // Highlight mode toggle
    document.getElementById('mode-word')!.addEventListener('click', () => {
      this.settings.highlightMode = 'word';
      this.applyAndSave();
    });
    document.getElementById('mode-syllable')!.addEventListener('click', () => {
      this.settings.highlightMode = 'syllable';
      this.applyAndSave();
    });

    // Color picker
    document.getElementById('highlight-color')!.addEventListener('input', (e) => {
      this.settings.highlightColor = (e.target as HTMLInputElement).value;
      applySettingsToDOM(this.settings);
      saveSettings(this.settings);
      // Live-update highlight
      this.renderer.updateHighlight(this.navigator.getPosition(), this.settings);
    });

    // Font size slider
    const slider = document.getElementById('font-size-slider') as HTMLInputElement;
    const sizeLabel = document.getElementById('font-size-value')!;
    slider.addEventListener('input', () => {
      this.settings.fontSize = parseInt(slider.value);
      sizeLabel.textContent = slider.value;
      applySettingsToDOM(this.settings);
      saveSettings(this.settings);
    });

    // Chapter order toggle
    document.getElementById('order-sequential')!.addEventListener('click', () => {
      this.settings.chapterOrder = 'sequential';
      this.buildChapterSequence();
      this.applyAndSave();
    });
    document.getElementById('order-random')!.addEventListener('click', () => {
      this.settings.chapterOrder = 'random';
      this.buildChapterSequence();
      this.applyAndSave();
    });

    // Auto-advance
    document.getElementById('auto-advance')!.addEventListener('change', (e) => {
      this.settings.autoAdvance = (e.target as HTMLInputElement).checked;
      saveSettings(this.settings);
    });

    // Reading mode (casual vs Tiberian syllables)
    document.getElementById('reading-mode')!.addEventListener('change', (e) => {
      this.settings.readingMode = (e.target as HTMLInputElement).checked;
      this.applyAndSave();
    });

    // Kamatz katan indicator
    for (const mode of ['off', 'tint', 'bold', 'dot'] as const) {
      document.getElementById(`kamatz-${mode}`)!.addEventListener('click', () => {
        this.settings.kamatzIndicator = mode;
        this.applyAndSave();
      });
    }

    // Theme toggle
    for (const theme of ['warm', 'light', 'dark'] as const) {
      document.getElementById(`theme-${theme}`)!.addEventListener('click', () => {
        this.settings.theme = theme;
        this.applyAndSave();
      });
    }
  }

  private setupChapterSelector(): void {
    const overlay = document.getElementById('chapter-overlay')!;
    const openBtn = document.getElementById('chapter-select-btn')!;
    const closeBtn = document.getElementById('chapter-close')!;
    const grid = document.getElementById('chapter-grid')!;
    const randomBtn = document.getElementById('random-chapter')!;

    openBtn.addEventListener('click', () => {
      this.updateChapterGridHighlight();
      overlay.classList.remove('hidden');
    });
    closeBtn.addEventListener('click', () => overlay.classList.add('hidden'));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.add('hidden');
    });

    // Build chapter grid
    for (let i = 1; i <= 150; i++) {
      const cell = document.createElement('button');
      cell.className = 'chapter-cell';
      cell.dataset.chapter = String(i);
      cell.textContent = toHebrewNumeral(i);
      cell.addEventListener('click', () => {
        this.loadChapter(i);
        overlay.classList.add('hidden');
      });
      grid.appendChild(cell);
    }

    randomBtn.addEventListener('click', () => {
      const randomNum = Math.floor(Math.random() * 150) + 1;
      this.loadChapter(randomNum);
      overlay.classList.add('hidden');
    });
  }

  private setupFooterNav(): void {
    // In RTL, "next" button (left arrow ◄) is on the right side
    document.getElementById('next-chapter')!.addEventListener('click', () => {
      this.goToNextChapter();
    });
    document.getElementById('prev-chapter')!.addEventListener('click', () => {
      this.goToPrevChapter();
    });
  }

  private updateChapterGridHighlight(): void {
    document.querySelectorAll('.chapter-cell').forEach(cell => {
      const el = cell as HTMLElement;
      el.classList.toggle('current', el.dataset.chapter === String(this.currentChapterNum));
    });
  }

  private applyAndSave(): void {
    saveSettings(this.settings);
    applySettingsToDOM(this.settings);
    this.syncSettingsUI();
    this.navigator.updateSettings(this.settings);
    // Re-render with new mode
    const chapter = this.data.chapters.find(c => c.number === this.currentChapterNum)!;
    const pos = this.navigator.getPosition();
    this.renderer.renderChapter(chapter, this.settings, (vIdx, wIdx, sIdx) => {
      this.navigator.jumpTo(vIdx, wIdx, sIdx);
    });
    this.renderer.updateHighlight(pos, this.settings);
  }

  private syncSettingsUI(): void {
    // Highlight mode
    document.getElementById('mode-word')!.classList.toggle('active', this.settings.highlightMode === 'word');
    document.getElementById('mode-syllable')!.classList.toggle('active', this.settings.highlightMode === 'syllable');

    // Color
    (document.getElementById('highlight-color') as HTMLInputElement).value = this.settings.highlightColor;

    // Font size
    (document.getElementById('font-size-slider') as HTMLInputElement).value = String(this.settings.fontSize);
    document.getElementById('font-size-value')!.textContent = String(this.settings.fontSize);

    // Chapter order
    document.getElementById('order-sequential')!.classList.toggle('active', this.settings.chapterOrder === 'sequential');
    document.getElementById('order-random')!.classList.toggle('active', this.settings.chapterOrder === 'random');

    // Auto-advance
    (document.getElementById('auto-advance') as HTMLInputElement).checked = this.settings.autoAdvance;

    // Reading mode
    (document.getElementById('reading-mode') as HTMLInputElement).checked = this.settings.readingMode;

    // Kamatz indicator
    for (const mode of ['off', 'tint', 'bold', 'dot']) {
      document.getElementById(`kamatz-${mode}`)!.classList.toggle('active', this.settings.kamatzIndicator === mode);
    }

    // Theme
    for (const theme of ['warm', 'light', 'dark']) {
      document.getElementById(`theme-${theme}`)!.classList.toggle('active', this.settings.theme === theme);
    }
  }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  new TehillimReaderApp();
});
