
import { test, expect } from '@playwright/test';

test.describe('Onboarding Connection Gating', () => {

    test('Not connected => no sync text, connection CTAs shown', async ({ page }) => {
        // 1. Mock health as NOT_CONNECTED
        await page.route('/aaliyah/health/providers', async route => {
            await route.fulfill({
                json: {
                    status: 'ok',
                    data: {
                        email: { status: 'NOT_CONNECTED', connected: false },
                        calendar: { status: 'NOT_CONNECTED', connected: false },
                        email_accessible: false,
                        calendar_accessible: false
                    }
                }
            });
        });

        // 2. Navigate to Onboarding Step 7
        await page.goto('/onboarding?step=7');

        // 3. Verify Requirements
        await expect(page.locator('text=Connection Required')).toBeVisible();
        await expect(page.locator('button:has-text("Authorize Google Account")')).toBeVisible();
        await expect(page.locator('button:has-text("Authorize Outlook Account")')).toBeVisible();

        // 4. Ensure NO syncing message
        await expect(page.locator('text=Synced')).not.toBeVisible();
        await expect(page.locator('text=Syncing')).not.toBeVisible();
    });

    test('Connected => System Ready, Launch button enabled', async ({ page }) => {
        // 1. Mock health as OK
        await page.route('/aaliyah/health/providers', async route => {
            await route.fulfill({
                json: {
                    status: 'ok',
                    data: {
                        email: { status: 'OK', connected: true, provider: 'google' },
                        calendar: { status: 'OK', connected: true, provider: 'google' },
                        email_accessible: true,
                        calendar_accessible: true
                    }
                }
            });
        });

        await page.goto('/onboarding?step=7');

        // 3. Verify Ready State
        await expect(page.locator('text=System Ready')).toBeVisible();

        // 4. Verify Launch Button
        const btn = page.locator('button:has-text("Launch Terminal")');
        await expect(btn).toBeEnabled();
    });

});

test.describe('Workspace Preflight Blocking', () => {

    test('Disconnected => Blocks sync, Shows Connect Card', async ({ page }) => {
        // 1. Mock health as NOT_CONNECTED
        await page.route('/aaliyah/health/providers', async route => {
            await route.fulfill({
                json: {
                    status: 'ok',
                    data: {
                        email: { status: 'NOT_CONNECTED', connected: false },
                        calendar: { status: 'NOT_CONNECTED', connected: false },
                        email_accessible: false
                    }
                }
            });
        });

        await page.goto('/aaliyahworkspace');

        // 2. Verify Preflight Panel Warning
        // The panel renders "Morning Check" with a warning/error state
        const card = page.locator('text=Connection Required').or(page.locator('text=Email/Calendar aren\'t connected yet'));
        // Wait, let's target more specifically from the PreFlightPanel component
        // Text: "Morning Check Complete" or "Connection Lost" or "Morning Check"
        // Desc: "Email/Calendar aren't connected yet"
        await expect(page.locator('text=Email/Calendar aren\'t connected yet')).toBeVisible();

        // 3. Verify Blocked Sync (Indirectly via UI absence of activity)
        // There should be no "Syncing..." toast or indicator
        await expect(page.locator('.lucide-refresh-cw.animate-spin')).not.toBeVisible();
    });

    test('Reconnect => Shows Reconnect CTA', async ({ page }) => {
        // 1. Mock health as NEEDS_RECONNECT
        await page.route('/aaliyah/health/providers', async route => {
            await route.fulfill({
                json: {
                    status: 'ok',
                    data: {
                        email: { status: 'NEEDS_RECONNECT', connected: true, error_code: 'token_expired' },
                        calendar: { status: 'OK', connected: true },
                        email_accessible: false
                    }
                }
            });
        });

        await page.goto('/aaliyahworkspace');

        // 2. Verify Reconnect CTA
        await expect(page.locator('button:has-text("Reconnect")')).toBeVisible(); // PreFlightPanel button
        // Or check greeting text
        await expect(page.locator('text=Connection Lost')).toBeVisible();
    });

});

test('Chat Message Rendering', async ({ page }) => {
    // 1. Mock chat response
    await page.route('/assist/answer', async route => {
        await route.fulfill({
            json: {
                answer_text: "Here is your requested draft.",
                sources: []
            }
        });
    });

    await page.goto('/aaliyahworkspace');

    // 2. Send message
    await page.fill('textarea[placeholder="Type a message..."]', 'Draft an email');
    await page.press('textarea[placeholder="Type a message..."]', 'Enter');

    // 3. Verify Render
    await expect(page.locator('text=Here is your requested draft.')).toBeVisible();
});
