import { test, expect } from '@playwright/test';

test('Kratos UI loads', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/welcome/);
});