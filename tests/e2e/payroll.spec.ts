import { test, expect } from '@playwright/test';

test.describe('Payroll and Salary Management E2E Tests', () => {
  // Login as Admin before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'toiminhvuive@gmail.com');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('should successfully view payroll dashboard, configure salary, and generate a payslip', async ({ page }) => {
    // 1. Navigate to Payroll page
    await page.goto('/payroll');
    
    // Expect correct page header
    const heading = page.locator('h1');
    await expect(heading).toHaveText(/Chốt Công & Bảng Lương/i);

    // Verify analytics cards are visible
    await expect(page.locator('text=Nhân sự chu kỳ')).toBeVisible();
    await expect(page.locator('text=Đã xuất bản phiếu lương')).toBeVisible();

    // 2. Open Salary Configuration for An Le (Barista)
    // Find An Le row and click Settings gear button
    const anLeRow = page.locator('tr:has-text("An Le")');
    await expect(anLeRow).toBeVisible();
    
    const configBtn = anLeRow.locator('button[title*="Cấu hình lương"]');
    await configBtn.click();

    // Verify Salary Configuration Modal is open
    await expect(page.locator('h3:has-text("Cấu Hình Lương Nhân Sự")')).toBeVisible();
    
    // Update salary configurations
    await page.fill('input[placeholder*="Lương thỏa thuận"]', '10500000');
    await page.fill('input[placeholder*="Xăng xe, điện thoại"]', '1700000');
    
    // Save configuration
    await page.click('button:has-text("Lưu cấu hình")');
    
    // Verify modal is closed
    await expect(page.locator('h3:has-text("Cấu Hình Lương Nhân Sự")')).not.toBeVisible();

    // 3. Open Generate Payslip Modal for An Le
    const chotBtn = anLeRow.locator('button:has-text("Sửa"), button:has-text("Chốt")');
    await chotBtn.click();

    // Verify Chốt Phiếu Lương Modal is open
    await expect(page.locator('h3:has-text("Chốt Phiếu Lương"), h3:has-text("Điều Chỉnh Phiếu Lương")')).toBeVisible();

    // Fill in adjustments
    await page.fill('label:has-text("Khấu trừ đi trễ") + input', '50000');
    await page.fill('label:has-text("Thưởng thêm khác") + input', '200000');
    await page.fill('label:has-text("Khấu trừ kỷ luật") + input', '0');
    await page.fill('textarea[placeholder*="lý do thưởng"]', 'Hoàn thành tốt dự án F&B');
    
    // Select status Published
    await page.selectOption('select', 'published');

    // Click Save
    await page.click('button:has-text("Cập nhật phiếu lương"), button:has-text("Chốt & Lưu Phiếu")');

    // Verify modal is closed
    await expect(page.locator('h3:has-text("Chốt Phiếu Lương")')).not.toBeVisible();

    // Verify status badge updated in table to "Đã xuất bản"
    await expect(anLeRow.locator('text=Đã xuất bản')).toBeVisible();
  });
});
