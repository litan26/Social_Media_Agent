import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'Admin123!';

test.describe('Post creation flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder(/email/i).fill(ADMIN_EMAIL);
    await page.getByPlaceholder(/password/i).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await expect(page).toHaveURL(/\/(dashboard|admin)/);
  });

  test('new post page loads with generate UI', async ({ page }) => {
    await page.goto('/posts/new');
    await expect(page.getByText(/generate ai variants/i)).toBeVisible();
    await expect(page.getByPlaceholder(/what's on your mind/i)).toBeVisible();
  });

  test('settings shows connected accounts panel', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByText(/connect social accounts/i)).toBeVisible();
  });
});
