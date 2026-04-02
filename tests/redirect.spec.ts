import { test, expect } from '@playwright/test';

test('root redirects to welcome', async ({ page }) => {

  await page.goto('http://localhost:8080');

  await expect(page).toHaveURL(/welcome/);
});