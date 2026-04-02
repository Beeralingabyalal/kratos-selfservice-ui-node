import { test, expect } from '@playwright/test';

test('registration page loads', async ({ page }) => {
  await page.goto('http://localhost:8080/registration');

  await expect(page.locator('form')).toBeVisible();
});