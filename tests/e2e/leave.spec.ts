import { test, expect } from '@playwright/test';

test.describe('Leave Management Tests', () => {
  // Login helper for every test in this block
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'toiminhvuive@gmail.com');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('should successfully submit and approve a leave request', async ({ page }) => {
    // Navigate to the leave page
    await page.goto('/leave');
    
    // Verify we landed on the leave page correctly
    const heading = page.locator('h1');
    await expect(heading).toHaveText(/Leave Management/i);

    // Form inputs: Leave type, start date, end date, reason
    const today = new Date();
    
    // Format helper: YYYY-MM-DD
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const startVal = formatDate(new Date(today.getTime() + 24 * 60 * 60 * 1000)); // tomorrow
    const endVal = formatDate(new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000)); // 5 days from now

    // Fill in the form fields
    await page.selectOption('select', 'annual');
    
    // Find date inputs. Start date is first, end date is second
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.nth(0).fill(startVal);
    await dateInputs.nth(1).fill(endVal);

    // Fill the text reasoning
    const uniqueReason = `Elite Star Pickleball rest trip - ID ${Date.now()}`;
    await page.fill('textarea', uniqueReason);

    // Click submit and wait for success message
    await page.click('button[type="submit"]');

    // Verify success banner is displayed
    const successBanner = page.locator('form div.text-teal-700');
    await expect(successBanner).toBeVisible();
    await expect(successBanner).toHaveText(/Leave request submitted successfully/i);

    // Verify request is present in "My Time-off Requests" list with status pending
    const myLeavesList = page.locator('div:has-text("My Time-off Requests")');
    await expect(myLeavesList).toContainText(uniqueReason);
    await expect(myLeavesList).toContainText('pending');

    // Verify request is present in "Absence Approval Queue" since we are also admin/approver
    const queueList = page.locator('div:has-text("Absence Approval Queue")');
    await expect(queueList).toContainText(uniqueReason);
    await expect(queueList).toContainText('pending');

    // Select this specific item and approve it
    const reqCard = page.locator('div.bg-slate-50', { hasText: uniqueReason });
    await reqCard.locator('button', { hasText: 'Process Decision' }).click();

    // Fill comment and click Approve
    await reqCard.locator('input[placeholder*="comment"]').fill('Enjoy the vacation rest, team!');
    await reqCard.locator('button', { hasText: 'Confirm Approve' }).click();

    // Verify the status of the item updates to approved
    await expect(reqCard).toContainText('approved');
    await expect(page.locator('div.bg-slate-50', { hasText: uniqueReason })).toContainText('approved');
  });
});
