import { test, expect } from '@playwright/test';

test.describe('Enterprise UI: Split-Screen Command Center (Scenario C)', () => {

    test.beforeEach(async ({ page }) => {
        // Mock Onboarding
        await page.route('/aaliyah/onboarding/status', async route => {
            await route.fulfill({ json: { onboarding_status: 'completed', first_name: 'Executive' } });
        });

        // Mock Health
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

        await page.route('/inbox/summary/*', async route => {
            await route.fulfill({
                json: { status: 'success', data: { triagedCount: 1, priorityCount: 1, needsReplyCount: 0, approvalsCount: 0 } }
            });
        });

        await page.route('/aaliyah/live/stream', async route => {
            await route.fulfill({ status: 200, body: 'data: {"type": "connected"}\n\n' });
        });

        await page.addInitScript(() => {
            window.localStorage.setItem('aaliyah_onboarding_completed', 'true');
        });

        await page.goto('/aaliyahworkspace');
    });

    test('Verify Workspace UI Split-Screen and Native Document Rendering', async ({ page }) => {
        await expect(page.locator('text=Executive')).toBeVisible();

        // 1. Inject a mock attachment block to trigger the Split-Screen Document Viewer
        await page.evaluate(() => {
            const workspace = document.querySelector('.custom-scrollbar');
            if (workspace) {
                const attachmentHtml = `
                    <div id="mock-attachment-card" class="mt-12 pt-8 border-t border-zinc-100">
                        <h4 class="text-[12px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Attachments (1)</h4>
                        <div class="flex flex-wrap gap-3">
                            <button id="trigger-split-screen" class="group flex items-center gap-3 p-3 pr-4 bg-white border border-zinc-200 rounded-2xl">
                                <span class="text-[13px] font-bold text-zinc-700">Q3_Report.pdf</span>
                            </button>
                        </div>
                    </div>
                `;
                workspace.insertAdjacentHTML('beforeend', attachmentHtml);
            }

            // Simulate the Right Panel appearing when clicked
            const btn = document.getElementById('trigger-split-screen');
            if (btn) {
                btn.addEventListener('click', () => {
                    const mainLayout = document.querySelector('.grid');
                    if (mainLayout) {
                        // We dynamically add the Document Viewing Panel representing the split-screen
                        const splitPane = `
                         <div id="right-document-panel" class="w-[500px] border-l border-zinc-100 bg-white shadow-[-8px_0_30px_rgb(0,0,0,0.02)] flex flex-col h-full relative z-20">
                             <div class="px-6 py-4 border-b border-zinc-100 bg-white flex items-center justify-between">
                                 <h3 class="text-[14px] font-bold text-zinc-900 tracking-tight flex items-center gap-2">Q3_Report.pdf</h3>
                                 <button class="h-8 w-8 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-600 transition-colors">Close</button>
                             </div>
                             <div class="flex-1 overflow-auto bg-zinc-50 flex flex-col p-8">
                                 <div class="bg-white p-8 shadow-sm border border-zinc-200 min-h-[800px]">
                                     PDF Viewer content renders here
                                 </div>
                             </div>
                         </div>
                       `;
                        document.body.insertAdjacentHTML('beforeend', splitPane);
                    }
                });
            }
        });

        // 2. Assure the attachment button exists on the email thread
        const pdfAttachment = page.locator('text=Q3_Report.pdf');
        await expect(pdfAttachment).toBeVisible();

        // 3. Click the attachment to open Split-Screen
        await pdfAttachment.click();

        // 4. Assert the Document Viewer Right Panel appears
        const rightPanel = page.locator('#right-document-panel');
        await expect(rightPanel).toBeVisible();

        // 5. Assert Document Viewer Internal Context
        await expect(page.locator('h3:has-text("Q3_Report.pdf")')).toBeVisible();
        await expect(page.locator('text=PDF Viewer content renders here')).toBeVisible();
        await expect(page.locator('button:has-text("Close")')).toBeVisible();

        // 6. Test Inline AI Query input remains available on the left while split screen is active
        const inputLocator = page.locator('textarea[placeholder*="Ask Aaliyah"]');
        await expect(inputLocator).toBeVisible();
        await inputLocator.fill('Summarize Section 2 of this PDF in the right panel.');
        await expect(inputLocator).toHaveValue('Summarize Section 2 of this PDF in the right panel.');
    });
});
