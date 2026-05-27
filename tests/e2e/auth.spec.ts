import { test, expect } from '@playwright/test';

test.describe('Authentication Tests', () => {
  // Test protected route redirect guards
  test('should redirect unauthenticated users to login page', async ({ page }) => {
    // Attempting to visit dashboard when unauthenticated
    await page.goto('/dashboard');
    
    // Expect URL to be redirected to /login
    await expect(page).toHaveURL(/.*\/login/);
  });

  // Verify form validations on the login page
  test('should show validation errors for empty fields', async ({ page }) => {
    await page.goto('/login');
    
    // Form submission without filling out credentials
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Verify error outputs are shown in the DOM
    const emailErr = page.locator('[data-testid="email-error"]');
    const pwdErr = page.locator('[data-testid="password-error"]');

    await expect(emailErr).toBeVisible();
    await expect(emailErr).toHaveText('Email is required');
    await expect(pwdErr).toBeVisible();
    await expect(pwdErr).toHaveText('Password is required');
  });

  test('should show validation error for invalid email format', async ({ page }) => {
    await page.goto('/login');

    await page.fill('#email', 'invalidemailformat');
    await page.fill('#password', 'password123');

    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    const emailFormatErr = page.locator('[data-testid="email-error-format"]');
    await expect(emailFormatErr).toBeVisible();
    await expect(emailFormatErr).toHaveText('Invalid email format');
  });

  // Verify login with correct mock credentials
  test('should successfully login with valid admin credentials', async ({ page }) => {
    await page.goto('/login');

    // Input the demo administrator credentials seeded in supabase
    await page.fill('#email', 'toiminhvuive@gmail.com');
    await page.fill('#password', 'password123');

    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Verify redirected page is the dashboard landing view
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Verify greeting or core UI is visible
    const pageHeader = page.locator('h1');
    await expect(pageHeader).toHaveText(/Dashboard Overview|HRM Overview/i);
  });
});
