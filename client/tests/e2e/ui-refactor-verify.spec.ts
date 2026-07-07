import { test, expect } from '@playwright/test';

// Test suite for UI/UX Refactor Verification
// Screenshots key pages in light and dark modes

test.describe('UI/UX Refactor Verification', () => {
  
  test('Homepage - Light Mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/Raiyah/);
    await page.screenshot({ path: 'test-results/homepage-light.png', fullPage: true });
  });

  test('Homepage - Dark Mode', async ({ page }) => {
    await page.goto('/');
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/homepage-dark.png', fullPage: true });
  });

  test('Careseeker Login - Light Mode', async ({ page }) => {
    await page.goto('/careseeker/login');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.screenshot({ path: 'test-results/careseeker-login-light.png', fullPage: true });
  });

  test('Careseeker Login - Dark Mode', async ({ page }) => {
    await page.goto('/careseeker/login');
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.screenshot({ path: 'test-results/careseeker-login-dark.png', fullPage: true });
  });

  test('Provider Login - Light Mode', async ({ page }) => {
    await page.goto('/provider/login');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.screenshot({ path: 'test-results/provider-login-light.png', fullPage: true });
  });

  test('Provider Login - Dark Mode', async ({ page }) => {
    await page.goto('/provider/login');
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.screenshot({ path: 'test-results/provider-login-dark.png', fullPage: true });
  });

  test('Skip to Content link is accessible', async ({ page }) => {
    await page.goto('/');
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeVisible();
    
    // Tab to focus the skip link
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();
    
    // Click should navigate to main content
    await skipLink.click();
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeVisible();
  });

  test('Design system tokens are applied', async ({ page }) => {
    await page.goto('/careseeker/login');
    
    // Check that CSS variables are present
    const body = page.locator('body');
    const fontFamily = await body.evaluate(el => 
      window.getComputedStyle(el).fontFamily
    );
    expect(fontFamily).toContain('Plus Jakarta Sans');
  });

});
