import { test, expect } from '@playwright/test';

test.use({ baseURL: 'http://localhost:5173' });

test.describe('Auth', () => {
  test('login success as client', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[placeholder="Email Address"]', 'mohammed.client@raiyah.dev');
    await page.fill('input[placeholder="Password"]', 'password');
    await page.click('button:has-text("Sign in to Account")');
    await expect(page).toHaveURL(/.*careseeker/);
  });

  test('login failure with wrong credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[placeholder="Email Address"]', 'wrong@example.com');
    await page.fill('input[placeholder="Password"]', 'wrongpassword');
    await page.click('button:has-text("Sign in to Account")');
    await expect(page.locator('text=Invalid email or password')).toBeVisible();
  });

  test('logout redirects to login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[placeholder="Email Address"]', 'mohammed.client@raiyah.dev');
    await page.fill('input[placeholder="Password"]', 'password');
    await page.click('button:has-text("Sign in to Account")');
    await expect(page).toHaveURL(/.*careseeker/);

    await page.click('button[title="Sign Out"]');
    await expect(page).toHaveURL(/.*login/);
  });
});
