import { test, expect } from '@playwright/test';

test('Unauthorized admin access blocked', async ({ request }) => {

  const response = await request.get(
    'http://localhost:8080/api/admin/tenants/bulk'
  );

  expect(response.status()).toBeGreaterThanOrEqual(400);
});