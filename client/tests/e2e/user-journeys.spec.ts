/**
 * E2E Tests with Playwright
 * End-to-end user journey testing
 */

import { test, expect } from '@playwright/test';

test.describe('Careseeker Journey', () => {
    test('should complete booking flow', async ({ page }) => {
        // Navigate to login
        await page.goto('http://localhost:5173/login');

        // Login as careseeker
        await page.fill('input[name="email"]', 'careseeker@test.com');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');

        // Wait for dashboard
        await expect(page).toHaveURL(/.*dashboard/);

        // Navigate to providers
        await page.click('text=Find Providers');
        await expect(page).toHaveURL(/.*providers/);

        // Select a provider
        await page.click('.provider-card:first-child');

        // Book appointment
        await page.click('text=Book Appointment');

        // Select date
        await page.click('.calendar-day.available:first-child');

        // Select time slot
        await page.click('.time-slot:first-child');

        // Proceed to payment
        await page.click('text=Continue to Payment');

        // Fill payment details (test mode)
        await page.fill('input[name="cardNumber"]', '4242424242424242');
        await page.fill('input[name="expiry"]', '12/25');
        await page.fill('input[name="cvc"]', '123');

        // Confirm booking
        await page.click('text=Confirm Booking');

        // Verify success
        await expect(page.locator('text=Booking Confirmed')).toBeVisible();
    });

    test('should send and receive messages', async ({ page }) => {
        // Login
        await page.goto('http://localhost:5173/login');
        await page.fill('input[name="email"]', 'careseeker@test.com');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');

        // Navigate to messages
        await page.click('text=Messages');
        await expect(page).toHaveURL(/.*messages/);

        // Select conversation
        await page.click('.conversation-item:first-child');

        // Send message
        const messageText = `Test message ${Date.now()}`;
        await page.fill('textarea[placeholder*="message"]', messageText);
        await page.click('button[aria-label="Send"]');

        // Verify message appears
        await expect(page.locator(`text=${messageText}`)).toBeVisible();
    });
});

test.describe('Provider Journey', () => {
    test('should manage schedule', async ({ page }) => {
        // Login as provider
        await page.goto('http://localhost:5173/login');
        await page.fill('input[name="email"]', 'provider@test.com');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');

        // Navigate to schedule
        await page.click('text=Manage Schedule');
        await expect(page).toHaveURL(/.*schedule/);

        // Enable Monday
        await page.check('input[type="checkbox"]:first-child');

        // Add time slot
        await page.click('text=Add Time Slot');

        // Set times
        await page.fill('input[type="time"]:first-child', '09:00');
        await page.fill('input[type="time"]:nth-child(2)', '17:00');

        // Save schedule
        await page.click('text=Save Schedule');

        // Verify success
        await expect(page.locator('text=Schedule saved')).toBeVisible();
    });
});

test.describe('Admin Journey', () => {
    test('should approve provider', async ({ page }) => {
        // Login as admin
        await page.goto('http://localhost:5173/login');
        await page.fill('input[name="email"]', 'admin@test.com');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');

        // Navigate to pending providers
        await page.click('text=Pending Providers');

        // View provider details
        await page.click('.provider-card:first-child');

        // Approve provider
        await page.click('text=Approve');

        // Confirm approval
        await page.click('text=Confirm');

        // Verify success
        await expect(page.locator('text=Provider approved')).toBeVisible();
    });
});

test.describe('Payment Flow', () => {
    test('should process payment successfully', async ({ page }) => {
        // Login
        await page.goto('http://localhost:5173/login');
        await page.fill('input[name="email"]', 'careseeker@test.com');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');

        // Navigate to payments
        await page.click('text=Payments');

        // Verify payment history loads
        await expect(page.locator('.payment-item')).toBeVisible();

        // Check for payment details
        await page.click('.payment-item:first-child');
        await expect(page.locator('text=Transaction ID')).toBeVisible();

        // Download invoice
        await page.click('text=Download Invoice');

        // Verify download started
        const download = await page.waitForEvent('download');
        expect(download.suggestedFilename()).toContain('invoice');
    });
});
