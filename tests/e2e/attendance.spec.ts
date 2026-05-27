import { test, expect } from '@playwright/test';

test.describe('Attendance Management Tests', () => {
  // Login helper for every test in this block
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'toiminhvuive@gmail.com');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('should successfully perform clock check-in and check-out', async ({ page }) => {
    // Navigate to the attendance page
    await page.goto('/attendance');
    
    // Verify headers
    const heading = page.locator('h1');
    await expect(heading).toHaveText(/Attendance Chấm Công/i);

    // Get current local date formatted as YYYY-MM-DD to verify row later
    const todayStr = new Date().toISOString().split('T')[0];

    // Find the terminal button. It can be a check-in, check-out or completed banner
    const actionButtonCheckIn = page.locator('button:has-text("Check In")');
    const actionButtonCheckOut = page.locator('button:has-text("Check Out")');
    const completedBanner = page.locator('div:has-text("Fully checked in and out for today")');

    if (await actionButtonCheckIn.isVisible()) {
      // Step A: We have not checked in yet. Let's perform Check-In
      await page.fill('input[placeholder*="Optional tasks"]', 'Starting morning Shift A - Elite Star Court maintenance');
      await actionButtonCheckIn.click();

      // Verify the button switches to Check-Out
      await expect(actionButtonCheckOut).toBeVisible();

      // Step B: Now let's perform Check-Out
      await actionButtonCheckOut.click();

      // Verify completion banner shows up
      await expect(completedBanner).toBeVisible();
    } else if (await actionButtonCheckOut.isVisible()) {
      // Step A: Already checked in. Perform Check-Out
      await actionButtonCheckOut.click();

      // Verify completion banner shows up
      await expect(completedBanner).toBeVisible();
    } else {
      // Step A: Already fully checked in and out. Verify banner
      await expect(completedBanner).toBeVisible();
    }

    // Verify today's date exists in the history table log trail
    const ledgerTable = page.locator('table');
    await expect(ledgerTable).toContainText(todayStr);
  });
});
