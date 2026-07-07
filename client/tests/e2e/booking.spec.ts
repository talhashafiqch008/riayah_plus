import { test, expect } from '@playwright/test';

test.use({ baseURL: 'http://localhost:5173' });

test.describe('Booking', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[placeholder="Email Address"]', 'mohammed.client@raiyah.dev');
    await page.fill('input[placeholder="Password"]', 'password');
    await page.click('button:has-text("Sign in to Account")');
    await expect(page).toHaveURL(/.*careseeker/);
  });

  test('provider search page loads', async ({ page }) => {
    await page.goto('/careseeker/providers');
    await expect(page.locator('text=Find Providers')).toBeVisible();
  });
});
