import { test, expect } from '@playwright/test';

test('login page loads', async ({ page }) => {
  await page.goto('http://localhost:8080/login');

  await expect(page.locator('form')).toBeVisible();
});