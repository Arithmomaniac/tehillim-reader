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
