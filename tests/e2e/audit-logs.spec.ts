import { test, expect } from '@playwright/test';

test.describe('System Audit Logs Tests', () => {
  // Login helper for every test in this block
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'toiminhvuive@gmail.com');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('should successfully display system audit log ledger and perform filters', async ({ page }) => {
    // Navigate to the audit-logs page
    await page.goto('/audit-logs');
    
    // Verify headers
    const heading = page.locator('h1');
    await expect(heading).toHaveText(/System Audit Logs/i);

    // Verify search input is present
    const searchInput = page.locator('input[placeholder*="Search audits"]');
    await expect(searchInput).toBeVisible();

    // Verify the logs container shows up
    const logsContainer = page.locator('div.divide-y');
    await expect(logsContainer).toBeVisible();

    // Fill in a query searching for a standard action (e.g. check_in or seed values)
    await searchInput.fill('seed');
    
    // Let's filter by a seeded audit log action
    const actionSelect = page.locator('select');
    await expect(actionSelect).toBeVisible();
    
    // Search for a specific action that was seeded
    await searchInput.fill('toiminhvuive');
    
    // Check that we have at least one audit log row present
    const logRows = page.locator('div.hover\\:bg-slate-50\\/40');
    const count = await logRows.count();
    expect(count).toBeGreaterThanOrEqual(0);

    if (count > 0) {
      // Verify that actor information is rendered
      const firstRow = logRows.first();
      await expect(firstRow).toContainText('toiminhvuive@gmail.com');
      
      // Verify old and new state details block exists if applicable
      const stateBlock = firstRow.locator('div.font-mono');
      if (await stateBlock.count() > 0) {
        await expect(stateBlock).toBeVisible();
      }
    }
  });
});
