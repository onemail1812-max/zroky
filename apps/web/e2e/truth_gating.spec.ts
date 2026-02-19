
import { test, expect } from '@playwright/test';

test.describe('Aaliyah Truth Gating & Preflight Gate', () => {

    test('Disconnected State - UI Blocks & Connect CTA shown', async ({ page }) => {
        // 1. Mock health as disconnected
        await page.route('**/health/providers', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    status: 'ok',
                    data: {
                        email_accessible: false,
                        calendar_accessible: false,
                        email_health: { status: 'NOT_CONNECTED', connected: false },
                        calendar_health: { status: 'NOT_CONNECTED', connected: false }
                    }
                })
            });
        });

        await page.goto('http://localhost:3000/aaliyahworkspace');

        // 2. Verify Banner is visible
        await expect(page.getByTestId('connection-health-banner')).toBeVisible();
        await expect(page.getByTestId('connection-health-message')).toContainText('inactive');

        // 3. Verify Authorize CTA is present
        await expect(page.getByTestId('authorize-email-cta')).toBeVisible();

        // 4. Verify Composer is disabled and placeholder is truth-driven
        const composer = page.getByTestId('chat-composer-input');
        await expect(composer).toBeDisabled();
        await expect(composer).toHaveAttribute('placeholder', /Authorize email/);

        // 5. Verify Sidebar is disabled (visual check via grayscale/pointer-events is harder, check for class)
        // Actually our testid on NavItem or Sidebar could check for 'grayscale'
    });

    test('Connected State - Preflight runs and syncs allowed', async ({ page }) => {
        // 1. Mock health as connected
        await page.route('**/health/providers', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    status: 'ok',
                    data: {
                        email_accessible: true,
                        calendar_accessible: true,
                        email_health: { status: 'OK', connected: true },
                        calendar_health: { status: 'OK', connected: true }
                    }
                })
            });
        });

        // 2. Mock preflight success
        await page.route('**/aaliyah/preflight/run', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ status: 'OK', email_connected: true, timestamp: new Date().toISOString() })
            });
        });

        // 3. Mock briefing
        await page.route('**/aaliyah/briefing', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ content: 'Good morning! Here is your briefing...' })
            });
        });

        await page.goto('http://localhost:3000/aaliyahworkspace');

        // 4. Verify working status appears during protocols
        await expect(page.getByTestId('working-status-indicator')).toBeVisible();
        await expect(page.getByTestId('working-status-text')).toContainText(/morning/);

        // 5. Verify Briefing Card appears in feed
        await expect(page.locator('text=Good morning! Here is your briefing...')).toBeVisible();

        // 6. Verify Composer is ENABLED
        await expect(page.getByTestId('chat-composer-input')).toBeEnabled();
    });

    test('Onboarding Checklist reflects real health', async ({ page }) => {
        // Mock health as disconnected for onboarding
        await page.route('**/health/providers', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    status: 'ok',
                    data: { email_accessible: false, calendar_accessible: false }
                })
            });
        });

        await page.goto('http://localhost:3000/aaliyahonboarding');

        // Check step 7 (Success Screen)
        // (Assuming we navigate to screen 7 or it's visible based on state)
        // For this test, let's assume we are viewing the checklist
        await expect(page.getByTestId('checklist-status-email-connected')).toContainText('PENDING');

        // Now mock health as connected and check if it updates (need trigger or reload)
        await page.route('**/health/providers', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    status: 'ok',
                    data: { email_accessible: true, calendar_accessible: true }
                })
            });
        });

        // Potential: polling check or manual reload
        await page.reload();
        await expect(page.getByTestId('checklist-status-email-connected')).toContainText('OK');
    });

});
