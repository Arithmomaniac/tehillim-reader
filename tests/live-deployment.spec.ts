import { test, expect } from '@playwright/test';

const LIVE_URL = 'https://arithmomaniac.github.io/tehillim-reader/';

test.describe('Live Deployment — Smoke Tests', () => {
  test('site loads and displays Psalm 1', async ({ page }) => {
    await page.goto(LIVE_URL);
    await expect(page.locator('#chapter-title')).toHaveText(/תהילים א׳/);
    await expect(page.locator('.verse')).not.toHaveCount(0);
  });

  test('first word is highlighted on load', async ({ page }) => {
    await page.goto(LIVE_URL);
    const highlighted = page.locator('.word.highlighted');
    await expect(highlighted).toHaveCount(1);
    await expect(highlighted).toHaveAttribute('data-verse', '0');
    await expect(highlighted).toHaveAttribute('data-word', '0');
  });

  test('no cantillation marks in rendered text', async ({ page }) => {
    await page.goto(LIVE_URL);
    const text = await page.locator('#text-container').textContent();
    const cantillation = text?.match(/[\u0591-\u05AF\u05C0\u05C4-\u05C6]/g);
    expect(cantillation).toBeNull();
  });

  test('sof pasuq is preserved', async ({ page }) => {
    await page.goto(LIVE_URL);
    const text = await page.locator('#text-container').textContent();
    const sofPasuq = text?.match(/\u05C3/g);
    expect(sofPasuq).not.toBeNull();
    expect(sofPasuq!.length).toBeGreaterThan(0);
  });

  test('keyboard navigation works', async ({ page }) => {
    await page.goto(LIVE_URL);
    await page.locator('#reading-area').focus();
    await page.keyboard.press('ArrowLeft');
    const highlighted = page.locator('.word.highlighted');
    await expect(highlighted).toHaveAttribute('data-word', '1');
  });

  test('click navigation works', async ({ page }) => {
    await page.goto(LIVE_URL);
    const target = page.locator('.word[data-verse="0"][data-word="3"]');
    await target.click();
    await expect(target).toHaveClass(/highlighted/);
  });

  test('chapter selector works', async ({ page }) => {
    await page.goto(LIVE_URL);
    await page.locator('#chapter-select-btn').click();
    await expect(page.locator('.chapter-cell')).toHaveCount(150);
    await page.locator('.chapter-cell[data-chapter="23"]').click();
    await expect(page.locator('#chapter-title')).toHaveText(/כ״ג/);
  });

  test('settings panel opens and theme toggle works', async ({ page }) => {
    await page.goto(LIVE_URL);
    await page.locator('#settings-btn').click();
    await expect(page.locator('#settings-overlay')).not.toHaveClass(/hidden/);

    await page.locator('#theme-dark').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.locator('#theme-light').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('syllable mode renders syllable spans', async ({ page }) => {
    await page.goto(LIVE_URL);
    await page.locator('#settings-btn').click();
    await page.locator('#mode-syllable').click();
    await page.locator('#settings-close').click();
    await expect(page.locator('.syllable').first()).toBeVisible();
  });

  test('next/prev chapter navigation works', async ({ page }) => {
    await page.goto(LIVE_URL);
    await page.locator('#next-chapter').click();
    await expect(page.locator('#chapter-title')).toHaveText(/ב׳/);
    await page.locator('#prev-chapter').click();
    await expect(page.locator('#chapter-title')).toHaveText(/א׳/);
  });
});
