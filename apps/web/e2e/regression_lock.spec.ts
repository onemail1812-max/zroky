
import { test, expect } from '@playwright/test';

test.describe('Aaliyah Regression Lock - 5 Invariants', () => {

    test.beforeEach(async ({ page }) => {
        // Mock onboarding status as completed to avoid gate unless testing onboarding specifically
        await page.route('**/assist/onboarding/status', async route => {
            await route.fulfill({
                json: { onboarding_status: 'completed', first_name: 'TestUser' }
            });
        });
    });

    // Invariant 1: Not connected → show connect CTA
    test('I1: Not connected => show connect CTA', async ({ page }) => {
        // Mock health as NOT_CONNECTED
        await page.route('**/aaliyah/health/providers', async route => {
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

        await page.goto('/');

        // Verify Health Gate is active
        await expect(page.getByTestId('health-gate')).toBeVisible();
        await expect(page.getByTestId('health-gate-title')).toContainText('Connection Required');
        await expect(page.getByTestId('health-gate-cta')).toBeVisible();
    });

    // Invariant 2: Onboarding does not claim syncing without OK
    test('I2: Onboarding does not claim syncing without OK', async ({ page }) => {
        // Mock health as NOT_CONNECTED
        await page.route('**/aaliyah/health/providers', async route => {
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

        await page.goto('/aaliyahonboarding');

        // Clicks to get to Step 7
        await page.getByTestId('onboarding-next-1').click();
        await page.getByTestId('onboarding-next-2').click();
        await page.getByTestId('onboarding-next-3').click();
        await page.getByTestId('onboarding-next-4').click();
        await page.getByTestId('onboarding-next-5').click();
        await page.getByTestId('onboarding-next-6').click();

        // Now on Step 7
        await expect(page.getByTestId('onboarding-header')).toContainText('Connection Required');
        await expect(page.getByTestId('onboarding-status-email')).toContainText('DISCONNECTED');

        // Verify Launch button is disabled or not showing "Initialized"
        await expect(page.getByTestId('onboarding-launch-btn')).not.toBeEnabled();
    });

    // Invariant 3: Examples persists into settings
    test('I3: Examples persists into settings', async ({ page }) => {
        const testExamples = "This is my unique writing style example.";

        // 1. Mock settings GET/PUT
        let savedSettings: Record<string, any> = {};
        await page.route('**/assist/settings', async route => {
            if (route.request().method() === 'GET') {
                await route.fulfill({ json: { status: 'success', data: { examples: savedSettings['examples'] || '' } } });
            } else if (route.request().method() === 'POST') {
                const body = route.request().postDataJSON();
                savedSettings = { ...savedSettings, ...body };
                await route.fulfill({ json: { status: 'success' } });
            }
        });

        // 2. Mock health as OK to enter workspace
        await page.route('**/aaliyah/health/providers', async route => {
            await route.fulfill({
                json: {
                    status: 'ok',
                    data: {
                        email: { status: 'OK', connected: true },
                        calendar: { status: 'OK', connected: true },
                        email_accessible: true
                    }
                }
            });
        });

        await page.goto('/');

        // Open Settings
        await page.getByTestId('workspace-settings-btn').click();

        // Go to Persona (it's in Inbox tab now)
        await page.getByTestId('settings-tab-inbox').click();

        // Type examples
        await page.getByTestId('settings-examples').fill(testExamples);

        // Save
        await page.getByTestId('settings-save-btn').click();
        await expect(page.locator('text=Configuration saved.')).toBeVisible();

        // Reload and verify
        await page.reload();
        await page.getByTestId('workspace-settings-btn').click();
        await expect(page.getByTestId('settings-examples')).toHaveValue(testExamples);
    });

    // Invariant 4: Workspace blocks actions until health OK
    test('I4: Workspace blocks actions until health OK', async ({ page }) => {
        // Mock health as ERROR
        await page.route('**/aaliyah/health/providers', async route => {
            await route.fulfill({
                json: {
                    status: 'ok',
                    data: {
                        email: { status: 'ERROR', connected: true, error_code: 'REVOKED' },
                        email_accessible: false
                    }
                }
            });
        });

        await page.goto('/');

        // Health gate should be on top
        await expect(page.getByTestId('health-gate')).toBeVisible();

        // Try to find composer - it should be covered or not rendered
        const composer = page.getByTestId('composer-textarea');
        await expect(composer).not.toBeVisible();
    });

    // Invariant 5: Chat renders answer_text/reply reliably
    test('I5: Chat renders answer_text/reply reliably', async ({ page }) => {
        const mockReply = "Hello! I am Aaliyah. How can I help you today?";

        // Mock health as OK
        await page.route('**/aaliyah/health/providers', async route => {
            await route.fulfill({
                json: { status: 'ok', data: { email_accessible: true } }
            });
        });

        // Mock chat response
        await page.route('**/assist/chat', async route => {
            await route.fulfill({
                json: {
                    reply: mockReply,
                    status: 'found',
                    evidence: []
                }
            });
        });

        await page.goto('/');

        // Send message
        await page.getByTestId('composer-textarea').fill('Hi Aaliyah');
        await page.getByTestId('composer-send-btn').click();

        // Verify response
        await expect(page.getByTestId('chat-response-text').last()).toContainText(mockReply);
    });

});
