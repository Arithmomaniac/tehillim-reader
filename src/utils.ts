/**
 * Convert a number (1-150) to Hebrew numeral representation.
 */
export function toHebrewNumeral(n: number): string {
  const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
  const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
  const hundreds = ['', 'ק', 'ר', 'ש', 'ת'];

  if (n === 15) return 'ט״ו';
  if (n === 16) return 'ט״ז';

  let result = '';
  if (n >= 100) {
    result += hundreds[Math.floor(n / 100)];
    n %= 100;
  }
  if (n >= 10) {
    result += tens[Math.floor(n / 10)];
    n %= 10;
  }
  if (n > 0) {
    result += ones[n];
  }

  // Add gershayim (״) before the last character for multi-char, or geresh (׳) for single-char
  if (result.length === 1) {
    result += '׳';
  } else if (result.length > 1) {
    result = result.slice(0, -1) + '״' + result.slice(-1);
  }

  return result;
}

/**
 * Strip HTML tags from a string (Sefaria sometimes returns HTML in text).
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Get a shuffled copy of an array (Fisher-Yates).
 */
export function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Regex to detect the Tetragrammaton consonants (yod-heh-vav-heh) after stripping nikkud
const YHVH_CONSONANTS = /^\u05D9\u05D4\u05D5\u05D4$/;

/** Strip all nikkud/vowel marks from Hebrew text (U+05B0–U+05C7) */
export function stripNikkud(text: string): string {
  return text.replace(/[\u05B0-\u05C7]/g, '');
}

/** Check if a word is the Tetragrammaton (YHVH) */
export function isDivineName(wordText: string): boolean {
  return YHVH_CONSONANTS.test(stripNikkud(wordText));
}

type DivineNameForm = 'adonai' | 'elohim';

/**
 * Determine the pronunciation form of the Tetragrammaton.
 * Elohim form has chataf segol (U+05B1) on the yod; Adonai form does not.
 */
export function getDivineNameForm(wordText: string): DivineNameForm {
  // The Elohim form has chataf segol (U+05B1) — check if the yod (first letter) has it
  const yodIdx = wordText.indexOf('\u05D9');
  if (yodIdx >= 0 && yodIdx + 1 < wordText.length && wordText[yodIdx + 1] === '\u05B1') {
    return 'elohim';
  }
  return 'adonai';
}

// Pre-computed syllable breakdown for Elohim-form Tetragrammaton
const ELOHIM_YHVH_SYLLABLES = ['יֱ', 'הֹ', 'וִה'];
