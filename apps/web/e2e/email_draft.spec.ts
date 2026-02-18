import { test, expect } from '@playwright/test';

test.describe('Email Draft UI & Persistence', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the Aaliyah workspace
        await page.goto('http://localhost:3000');
    });

    test('Draft formatting persists after refresh', async ({ page }) => {
        // 1. Find the "Waiting Approval" conversation (Q3 Investor Update)
        await page.click('text=Q3 Investor Update');

        // 2. Click "Edit"
        await page.click('button:has-text("Edit")');

        // 3. Edit the body in the TipTap editor
        // TipTap uses .ProseMirror class
        const editor = page.locator('.ProseMirror');
        await editor.click();
        await page.keyboard.type('This is some **bold text**');

        // Note: To truly test "bold", we might need to select and click the bold button
        // But let's assume typing works for now or use the toolbar
        await page.click('button[aria-label="Bold"]');
        await page.keyboard.type('Bolded Content');
        await page.click('button[aria-label="Bold"]'); // Toggle off

        // 4. Wait for auto-save (debounced 3s + buffer)
        await page.waitForTimeout(5000);

        // 5. Refresh the page
        await page.reload();

        // 6. Select the conversation again
        await page.click('text=Q3 Investor Update');

        // 7. Verify the content is still there and has formatting
        await expect(page.locator('.ProseMirror')).toContainText('Bolded Content');
        const boldText = page.locator('.ProseMirror strong');
        await expect(boldText).toBeVisible();
    });

    test('Attachment management works correctly', async ({ page }) => {
        await page.click('text=Q3 Investor Update');
        await page.click('button:has-text("Edit")');

        // 1. Verify we can click "+ Attach"
        // Since we can't easily upload a real file in a simple way without a path, 
        // we can check if the file input is triggered or mock the file choice.
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.click('button:has-text("+ Attach")');
        const fileChooser = await fileChooserPromise;

        // We can provide a mock file
        await fileChooser.setFiles({
            name: 'invoice_test.pdf',
            mimeType: 'application/pdf',
            buffer: Buffer.from('this is a test pdf')
        });

        // 2. Verify the chip appears with size and remove option
        await expect(page.locator('text=invoice_test.pdf')).toBeVisible();
        await expect(page.locator('text=0.0MB')).toBeVisible(); // Small file

        // 3. Remove the attachment
        await page.click('button[title="Remove attachment"]');
        await expect(page.locator('text=invoice_test.pdf')).not.toBeVisible();
    });

    test('UI remains uncluttered', async ({ page }) => {
        await page.click('text=Q3 Investor Update');

        // Check toolbar height or dominance
        const toolbar = page.locator('.border-b.border-borderSubtle.bg-surfaceHover\\/50');
        const box = await toolbar.boundingBox();
        if (box) {
            expect(box.height).toBeLessThan(100); // Minimalist toolbar should be relatively small
        }

        // Verify visual elements from objective
        await expect(page.locator('text=Recipient')).toBeVisible();
        await expect(page.locator('text=Subject')).toBeVisible();
    });

    test('Error handling for failed sends', async ({ page }) => {
        // Intercept the send request and return 500
        await page.route('**/aaliyah/send_draft', route => {
            route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'Mail server unreachable' })
            });
        });

        await page.click('text=Q3 Investor Update');

        // Click Approve & Send
        await page.click('button:has-text("Approve & Send")');

        // Verify error alert appears
        await expect(page.locator('text=Failed to send email')).toBeVisible();

        // Verify the draft is still visible (not lost)
        await expect(page.locator('.ProseMirror')).toBeVisible();
    });
});
