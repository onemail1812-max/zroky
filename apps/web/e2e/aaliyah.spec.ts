import { test, expect } from '@playwright/test';

test.describe('Aaliyah Suite E2E', () => {
    test.beforeEach(async ({ page }) => {
        // Assuming the app is running locally
        await page.goto('http://localhost:3000');
    });

    test('Connect Gmail and see threads', async ({ page }) => {
        // 1. Find and click Gmail connect
        // Using test-ids or clean text selectors
        await page.click('text=Connect Gmail');

        // 2. Simulate OAuth redirect/success (Mocked in backend usually)
        // For now we assume clicking it transitions state
        await expect(page.locator('text=Syncing Gmail...')).toBeVisible();

        // 3. Verify threads appear in the feed
        await expect(page.locator('.thread-item')).toHaveCount({ min: 1 });
    });

    test('Ask question and get answer from Gmail', async ({ page }) => {
        // 1. Typing into the Composer
        const composer = page.locator('textarea[placeholder*="Ask Aaliyah"]');
        await composer.fill('What is my latest invoice?');
        await page.keyboard.press('Enter');

        // 2. Wait for Aaliyah to think and answer
        await expect(page.locator('text=Searching mailbox...')).toBeVisible();

        // 3. Verify answer structure and citation (Sprint 9 Requirement)
        await expect(page.locator('.aaliyah-answer')).toContainText('invoice');
        await expect(page.locator('.aaliyah-answer')).toContainText('I found this in:');
    });

    test('Connect Outlook and verify unified inbox + badges', async ({ page }) => {
        await page.click('text=Connect Outlook');
        await expect(page.locator('text=Syncing Outlook...')).toBeVisible();

        // Verify unified view showing badges for both
        await expect(page.locator('.badge-google')).toBeVisible();
        await expect(page.locator('.badge-outlook')).toBeVisible();
    });

    test('Search "invoice last month" returns results', async ({ page }) => {
        const composer = page.locator('textarea[placeholder*="Ask Aaliyah"]');
        await composer.fill('invoice last month');
        await page.keyboard.press('Enter');

        await expect(page.locator('.aaliyah-answer')).toBeVisible();
        await expect(page.locator('.aaliyah-answer')).toContainText('last month');
    });

    test('Not found phrase match', async ({ page }) => {
        const composer = page.locator('textarea[placeholder*="Ask Aaliyah"]');
        await composer.fill('search for non-existent-secret-xyz-123');
        await page.keyboard.press('Enter');

        // Exact lock-in phrase from Sprint 8/9
        await expect(page.locator('.aaliyah-answer')).toContainText("I searched Gmail + Outlook (and calendar). I couldn't find it.");
    });
});
