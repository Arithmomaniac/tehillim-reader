/**
 * Fetch all 150 Psalms from Sefaria API and process syllables with havarotjs.
 * Outputs src/data/tehillim.json with pre-computed syllable breakdowns.
 *
 * Usage: npx tsx scripts/fetch-tehillim.ts
 */

import { Text } from 'havarotjs';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface WordData {
  text: string;
  syllables: string[];
  verseIndex: number;
  wordIndex: number;
}

interface Verse {
  number: number;
  text: string;
  words: WordData[];
}

interface Chapter {
  number: number;
  hebrewNumber: string;
  verses: Verse[];
}

interface TehillimData {
  chapters: Chapter[];
}

function toHebrewNumeral(n: number): string {
  const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
  const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
  const hundreds = ['', 'ק', 'ר', 'ש', 'ת'];

  if (n === 15) return 'ט״ו';
  if (n === 16) return 'ט״ז';

  let result = '';
  let remaining = n;
  if (remaining >= 100) {
    result += hundreds[Math.floor(remaining / 100)];
    remaining %= 100;
  }
  if (remaining >= 10) {
    result += tens[Math.floor(remaining / 10)];
    remaining %= 10;
  }
  if (remaining > 0) {
    result += ones[remaining];
  }

  if (result.length === 1) {
    result += '׳';
  } else if (result.length > 1) {
    result = result.slice(0, -1) + '״' + result.slice(-1);
  }

  return result;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&thinsp;/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    // Strip cantillation marks (taamim) U+0591–U+05AF
    // Strip punctuation: paseq U+05C0, upper/lower dot U+05C4-05C5, nun hafukha U+05C6
    // Keep sof pasuq U+05C3 (end-of-verse marker)
    .replace(/[\u0591-\u05AF\u05C0\u05C4-\u05C6]/g, '')
    .trim();
}

function splitIntoWords(text: string): string[] {
  // Split on whitespace, filter out empty strings and maqaf-only entries
  return text.split(/\s+/).filter(w => w.length > 0);
}

function getSyllables(word: string): string[] {
  try {
    const text = new Text(word);
    const syllables = text.syllables.map(s => s.text);
    if (syllables.length > 0 && syllables.join('').length > 0) {
      return syllables;
    }
  } catch {
    // Fallback: return the whole word as a single syllable
  }
  return [word];
}

async function fetchChapter(chapterNum: number): Promise<string[]> {
  const url = `https://www.sefaria.org/api/v3/texts/Psalms.${chapterNum}?context=0&commentary=0`;
  console.log(`  Fetching Psalms ${chapterNum}...`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch Psalms ${chapterNum}: ${response.status}`);
  }

  const data = await response.json();

  // Sefaria returns Hebrew text in the "versions" array
  let hebrewTexts: string[] = [];
  if (data.versions && data.versions.length > 0) {
    for (const version of data.versions) {
      if (version.language === 'he' && version.text) {
        if (Array.isArray(version.text)) {
          hebrewTexts = version.text.map((t: string) => stripHtml(t));
        } else {
          hebrewTexts = [stripHtml(version.text)];
        }
        break;
      }
    }
  }

  // Fallback to legacy "he" field
  if (hebrewTexts.length === 0 && data.he) {
    if (Array.isArray(data.he)) {
      hebrewTexts = data.he.map((t: string) => stripHtml(t));
    } else {
      hebrewTexts = [stripHtml(data.he)];
    }
  }

  return hebrewTexts;
}

function processChapter(chapterNum: number, verseTexts: string[]): Chapter {
  const verses: Verse[] = [];

  for (let vIdx = 0; vIdx < verseTexts.length; vIdx++) {
    const verseText = verseTexts[vIdx];
    const rawWords = splitIntoWords(verseText);
    const words: WordData[] = [];

    for (let wIdx = 0; wIdx < rawWords.length; wIdx++) {
      const wordText = rawWords[wIdx];
      const syllables = getSyllables(wordText);
      words.push({
        text: wordText,
        syllables,
        verseIndex: vIdx,
        wordIndex: wIdx,
      });
    }

    verses.push({
      number: vIdx + 1,
      text: verseText,
      words,
    });
  }

  return {
    number: chapterNum,
    hebrewNumber: toHebrewNumeral(chapterNum),
    verses,
  };
}

async function main() {
  console.log('Fetching all 150 Psalms from Sefaria...\n');

  const chapters: Chapter[] = [];
  const batchSize = 5;

  for (let start = 1; start <= 150; start += batchSize) {
    const end = Math.min(start + batchSize - 1, 150);
    const promises: Promise<{ num: number; texts: string[] }>[] = [];

    for (let i = start; i <= end; i++) {
      promises.push(
        fetchChapter(i)
          .then(texts => ({ num: i, texts }))
      );
    }

    const results = await Promise.all(promises);

    for (const { num, texts } of results) {
      chapters.push(processChapter(num, texts));
    }

    // Small delay between batches to be polite to Sefaria API
    if (end < 150) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Sort by chapter number
  chapters.sort((a, b) => a.number - b.number);

  const output: TehillimData = { chapters };

  const outPath = path.join(__dirname, '..', 'src', 'data', 'tehillim.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');

  // Print stats
  const totalVerses = chapters.reduce((s, c) => s + c.verses.length, 0);
  const totalWords = chapters.reduce(
    (s, c) => s + c.verses.reduce((vs, v) => vs + v.words.length, 0),
    0
  );
  const fileSizeMB = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(2);

  console.log(`\n✅ Done!`);
  console.log(`   Chapters: ${chapters.length}`);
  console.log(`   Verses: ${totalVerses}`);
  console.log(`   Words: ${totalWords}`);
  console.log(`   Output: ${outPath} (${fileSizeMB} MB)`);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
