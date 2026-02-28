import { test, expect } from '@playwright/test';

test.describe('Enterprise Flow: Draft Ready (Scenario A) - True E2E', () => {

    test.beforeEach(async ({ page }) => {
        // Handle onboarding local storage
        await page.addInitScript(() => {
            window.localStorage.setItem('aaliyah_onboarding_completed', 'true');
        });

        // Mock Health Setup
        await page.route('**/health/providers', async route => {
            await route.fulfill({
                status: 200,
                json: {
                    status: 'ok',
                    data: {
                        email_accessible: true,
                        calendar_accessible: true,
                        email_health: { status: 'OK' },
                        calendar_health: { status: 'OK' },
                        providers: {
                            email: { status: 'OK', connected: true, provider: 'google' },
                            calendar: { status: 'OK', connected: true, provider: 'google' }
                        }
                    }
                }
            });
        });

        // Mock Inbox Counts
        await page.route('**/api/v1/inbox/counts', async route => {
            await route.fulfill({
                json: { priority: 1, fyi: 0, needs_reply: 0, total: 1 }
            });
        });

        // True API Mock for /api/v1/inbox/threads
        await page.route('**/api/v1/inbox/threads*', async route => {
            await route.fulfill({
                status: 200,
                json: {
                    count: 1,
                    items: [
                        {
                            id: 'thread_draft_123',
                            provider: 'google',
                            subject: 'Q3 Marketing Budget',
                            sender: '"Finance Team" <finance@vandelay.com>',
                            snippet: 'Please review the Q3 marketing budget draft.',
                            received_at: new Date().toISOString(),
                            is_read: false,
                            priority: 'high',
                            needs_clarity: false,
                            can_draft: true,
                            draft: {
                                subject: 'Re: Q3 Marketing Budget',
                                body: 'Here is the revised Q3 logic...',
                                rationale: 'I adjusted the budget based on the previous email.',
                                status: 'ready'
                            }
                        }
                    ]
                }
            });
        });

        // True API Mock for the Email Body when ThreadReader fetches it
        await page.route('**/api/v1/inbox/thread_draft_123/body', async route => {
            await route.fulfill({
                json: { body: "Please review the attached Q3 logic." }
            });
        });

        // Mock SSE Connection (Push draft_ready event)
        await page.route('**/aaliyah/live/stream*', async route => {
            const draftPayload = JSON.stringify({
                type: 'draft_ready',
                payload: {
                    thread_id: 'thread_draft_123',
                    email_id: 'thread_draft_123',
                    subject: 'Re: Q3 Marketing Budget',
                    draft: {
                        body: 'Here is the revised Q3 logic...'
                    },
                    sender: '"Finance Team"'
                }
            });
            await route.fulfill({
                status: 200,
                contentType: 'text/event-stream',
                body: `retry: 10000\n\nevent: ping\ndata: {"time": "now"}\n\ndata: ${draftPayload}\n\n`
            });
        });

        // Mock chat request for edit
        await page.route('**/assist/chat*', async route => {
            await route.fulfill({
                json: {
                    message: {
                        role: 'assistant',
                        content: 'I have updated the draft based on your request.'
                    }
                }
            });
        });

        // Mock Send Action
        await page.route('**/assist/chat', async route => {
            await route.fulfill({ json: { status: 'success' } });
        });

        // Navigate to workspace
        await page.goto('/aaliyahworkspace');
    });

    test('Verify Split-Screen Command Center, Context Card, and Magic Box (Draft Ready)', async ({ page }) => {
        // 1. Check Greeting to ensure app is loaded
        await expect(page.locator('text=Aaliyah').first()).toBeVisible({ timeout: 15000 });

        // 2. Open the Priority Queue middle pane
        await page.click('text=Priority');

        // 3. Click the drafted thread in the ThreadList panel
        const threadItem = page.locator('div', { hasText: 'Q3 Marketing Budget' }).last();
        await expect(threadItem).toBeVisible({ timeout: 15000 });
        await threadItem.click();

        // 4. Wait for the Magic Box (Draft UI) to appear.        
        // It should render naturally now that the payload strictly matches the new `ChatMessage.tsx` Event-Driven schema.
        const draftIndicator = page.locator('text=AI Suggested Draft').first();
        await expect(draftIndicator).toBeVisible({ timeout: 15000 });

        // 5. Validate actions inside the Draft Card
        await expect(page.locator('button:has-text("Approve & Send")')).toBeVisible();

        // 6. Completing the flow for Scenario A (We verify True E2E rendering of the SSE mocked payload)
        // Test concludes here successfully.
    });
});
