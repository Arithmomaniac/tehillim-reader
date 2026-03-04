import { test, expect, Page } from '@playwright/test';

test.describe('Tehillim Reader — Initial Load', () => {
  test('should display Psalm 1 on initial load', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#chapter-title')).toHaveText(/תהילים א׳/);
    // Should have at least one verse rendered
    await expect(page.locator('.verse')).not.toHaveCount(0);
  });

  test('should have the first word highlighted on load', async ({ page }) => {
    await page.goto('/');
    const highlighted = page.locator('.word.highlighted');
    await expect(highlighted).toHaveCount(1);
    // First word should be highlighted (verse 0, word 0)
    await expect(highlighted).toHaveAttribute('data-verse', '0');
    await expect(highlighted).toHaveAttribute('data-word', '0');
  });

  test('should not contain cantillation marks in rendered text', async ({ page }) => {
    await page.goto('/');
    const text = await page.locator('#text-container').textContent();
    // Cantillation marks are Unicode U+0591–U+05AF
    const cantillation = text?.match(/[\u0591-\u05AF]/g);
    expect(cantillation).toBeNull();
  });
});

test.describe('Tehillim Reader — Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Focus the reading area
    await page.locator('#reading-area').focus();
  });

  test('ArrowLeft moves to next word (forward in Hebrew)', async ({ page }) => {
    await page.keyboard.press('ArrowLeft');
    const highlighted = page.locator('.word.highlighted');
    await expect(highlighted).toHaveCount(1);
    // Should now be on word 1 (second word)
    await expect(highlighted).toHaveAttribute('data-word', '1');
  });

  test('ArrowRight moves back to previous word', async ({ page }) => {
    // First move forward, then back
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowRight');
    const highlighted = page.locator('.word.highlighted');
    await expect(highlighted).toHaveAttribute('data-word', '0');
    await expect(highlighted).toHaveAttribute('data-verse', '0');
  });

  test('ArrowDown moves to next verse', async ({ page }) => {
    await page.keyboard.press('ArrowDown');
    const highlighted = page.locator('.word.highlighted');
    await expect(highlighted).toHaveAttribute('data-verse', '1');
    await expect(highlighted).toHaveAttribute('data-word', '0');
  });

  test('ArrowUp moves to previous verse', async ({ page }) => {
    // Move to verse 1, then back
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowUp');
    const highlighted = page.locator('.word.highlighted');
    await expect(highlighted).toHaveAttribute('data-verse', '0');
  });

  test('Space moves forward like ArrowLeft', async ({ page }) => {
    await page.keyboard.press('Space');
    const highlighted = page.locator('.word.highlighted');
    await expect(highlighted).toHaveAttribute('data-word', '1');
  });

  test('Enter moves to next verse', async ({ page }) => {
    await page.keyboard.press('Enter');
    const highlighted = page.locator('.word.highlighted');
    await expect(highlighted).toHaveAttribute('data-verse', '1');
    await expect(highlighted).toHaveAttribute('data-word', '0');
  });

  test('Home moves to beginning of chapter', async ({ page }) => {
    // Navigate forward a few words first
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowDown');
    // Now go home
    await page.keyboard.press('Home');
    const highlighted = page.locator('.word.highlighted');
    await expect(highlighted).toHaveAttribute('data-verse', '0');
    await expect(highlighted).toHaveAttribute('data-word', '0');
  });

  test('End moves to last word of chapter', async ({ page }) => {
    await page.keyboard.press('End');
    const highlighted = page.locator('.word.highlighted');
    // Should be at the last verse
    const verseIdx = await highlighted.getAttribute('data-verse');
    expect(parseInt(verseIdx!)).toBeGreaterThan(0);
  });

  test('multiple ArrowLeft presses advance through words sequentially', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('ArrowLeft');
    }
    const highlighted = page.locator('.word.highlighted');
    await expect(highlighted).toHaveAttribute('data-word', '5');
  });
});

test.describe('Tehillim Reader — Click Navigation', () => {
  test('clicking a word highlights it', async ({ page }) => {
    await page.goto('/');
    // Click the third word in the first verse
    const thirdWord = page.locator('.word[data-verse="0"][data-word="2"]');
    await thirdWord.click();
    await expect(thirdWord).toHaveClass(/highlighted/);
  });

  test('clicking a word in a different verse jumps there', async ({ page }) => {
    await page.goto('/');
    const targetWord = page.locator('.word[data-verse="1"][data-word="0"]');
    await targetWord.click();
    await expect(targetWord).toHaveClass(/highlighted/);
  });
});

test.describe('Tehillim Reader — Scroll Wheel Navigation', () => {
  test('scroll down moves forward', async ({ page }) => {
    await page.goto('/');
    const readingArea = page.locator('#reading-area');
    await readingArea.hover();
    await page.mouse.wheel(0, 100);
    // After scroll, should no longer be at word 0
    await page.waitForTimeout(100);
    const highlighted = page.locator('.word.highlighted');
    await expect(highlighted).toHaveAttribute('data-word', '1');
  });
});

test.describe('Tehillim Reader — Settings Panel', () => {
  test('settings panel opens and closes', async ({ page }) => {
    await page.goto('/');
    const overlay = page.locator('#settings-overlay');
    await expect(overlay).toHaveClass(/hidden/);

    await page.locator('#settings-btn').click();
    await expect(overlay).not.toHaveClass(/hidden/);

    await page.locator('#settings-close').click();
    await expect(overlay).toHaveClass(/hidden/);
  });

  test('switching to syllable mode re-renders with syllable spans', async ({ page }) => {
    await page.goto('/');
    await page.locator('#settings-btn').click();
    await page.locator('#mode-syllable').click();
    await page.locator('#settings-close').click();

    // Should now have syllable spans inside word spans
    const syllableSpans = page.locator('.syllable');
    await expect(syllableSpans.first()).toBeVisible();
  });

  test('syllable mode highlights individual syllables on ArrowLeft', async ({ page }) => {
    await page.goto('/');
    // Switch to syllable mode
    await page.locator('#settings-btn').click();
    await page.locator('#mode-syllable').click();
    await page.locator('#settings-close').click();

    await page.locator('#reading-area').focus();
    // The first word of Psalm 1 has multiple syllables
    // Press ArrowLeft to advance one syllable
    await page.keyboard.press('ArrowLeft');

    const highlighted = page.locator('.syllable.highlighted');
    await expect(highlighted).toHaveCount(1);
  });

  test('changing highlight color updates CSS variable', async ({ page }) => {
    await page.goto('/');
    await page.locator('#settings-btn').click();
    await page.locator('#highlight-color').fill('#FF0000');
    await page.locator('#highlight-color').dispatchEvent('input');

    const color = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--highlight-color').trim()
    );
    expect(color.toLowerCase()).toBe('#ff0000');
  });

  test('font size slider changes CSS variable', async ({ page }) => {
    await page.goto('/');
    await page.locator('#settings-btn').click();
    await page.locator('#font-size-slider').fill('48');
    await page.locator('#font-size-slider').dispatchEvent('input');

    const size = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--font-size').trim()
    );
    expect(size).toBe('48px');
  });

  test('theme toggle switches between warm, light, and dark', async ({ page }) => {
    await page.goto('/');
    await page.locator('#settings-btn').click();

    // Switch to dark
    await page.locator('#theme-dark').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Switch to light
    await page.locator('#theme-light').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    // Switch back to warm
    await page.locator('#theme-warm').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'warm');
  });
});

test.describe('Tehillim Reader — Chapter Selection', () => {
  test('chapter selector opens and shows 150 chapters', async ({ page }) => {
    await page.goto('/');
    await page.locator('#chapter-select-btn').click();
    const cells = page.locator('.chapter-cell');
    await expect(cells).toHaveCount(150);
  });

  test('clicking a chapter loads it', async ({ page }) => {
    await page.goto('/');
    await page.locator('#chapter-select-btn').click();
    // Click chapter 23 (כ״ג)
    await page.locator('.chapter-cell[data-chapter="23"]').click();
    await expect(page.locator('#chapter-title')).toHaveText(/כ״ג/);
  });

  test('random chapter button loads a chapter', async ({ page }) => {
    await page.goto('/');
    await page.locator('#chapter-select-btn').click();
    await page.locator('#random-chapter').click();
    // Chapter overlay should close and a chapter should be displayed
    await expect(page.locator('#chapter-overlay')).toHaveClass(/hidden/);
    await expect(page.locator('.verse')).not.toHaveCount(0);
  });

  test('next/prev chapter buttons work', async ({ page }) => {
    await page.goto('/');
    // Should start at chapter 1
    await expect(page.locator('#chapter-title')).toHaveText(/א׳/);

    // Click "next chapter" (which in Hebrew/RTL is "פרק הקודם")
    await page.locator('#next-chapter').click();
    await expect(page.locator('#chapter-title')).toHaveText(/ב׳/);

    // Click "prev chapter"
    await page.locator('#prev-chapter').click();
    await expect(page.locator('#chapter-title')).toHaveText(/א׳/);
  });

  test('current chapter is highlighted in grid', async ({ page }) => {
    await page.goto('/');
    await page.locator('#chapter-select-btn').click();
    const currentCell = page.locator('.chapter-cell.current');
    await expect(currentCell).toHaveAttribute('data-chapter', '1');
  });
});

test.describe('Tehillim Reader — Reading Mode Toggle', () => {
  test('reading mode checkbox defaults to checked (casual)', async ({ page }) => {
    await page.goto('/');
    await page.locator('#settings-btn').click();
    const checkbox = page.locator('#reading-mode');
    await expect(checkbox).toBeChecked();
  });

  test('toggling reading mode changes syllable count for first word', async ({ page }) => {
    await page.goto('/');
    // Switch to syllable mode first
    await page.locator('#settings-btn').click();
    await page.locator('#mode-syllable').click();
    await page.locator('#settings-close').click();

    // In casual mode, first word אַשְׁרֵי has 2 syllables
    const casualSyllables = await page.locator('.word[data-verse="0"][data-word="0"] .syllable').count();
    expect(casualSyllables).toBe(2);

    // Toggle to Tiberian mode
    await page.locator('#settings-btn').click();
    await page.locator('#reading-mode').uncheck();
    await page.locator('#settings-close').click();

    // In Tiberian mode, first word אַשְׁרֵי has 3 syllables
    const tiberianSyllables = await page.locator('.word[data-verse="0"][data-word="0"] .syllable').count();
    expect(tiberianSyllables).toBe(3);
  });

  test('reading mode persists across reload', async ({ page }) => {
    await page.goto('/');
    // Uncheck reading mode
    await page.locator('#settings-btn').click();
    await page.locator('#reading-mode').uncheck();
    await page.locator('#settings-close').click();

    // Reload
    await page.reload();
    await page.locator('#settings-btn').click();
    await expect(page.locator('#reading-mode')).not.toBeChecked();
  });

  test('navigation works correctly after switching reading mode', async ({ page }) => {
    await page.goto('/');
    // Switch to syllable mode + Tiberian
    await page.locator('#settings-btn').click();
    await page.locator('#mode-syllable').click();
    await page.locator('#reading-mode').uncheck();
    await page.locator('#settings-close').click();

    // Navigate forward — should move through Tiberian syllable count
    await page.keyboard.press('ArrowLeft');
    const highlighted = page.locator('.syllable.highlighted');
    await expect(highlighted).toHaveCount(1);
  });
});
