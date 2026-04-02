import { test, expect } from '@playwright/test';

test('invalid tenant payload rejected', async ({ request }) => {

  const response = await request.post(
    'http://localhost:8080/api/admin/tenants/bulk',
    {
      data: { wrongField: "bad" }
    }
  );

  expect(response.status()).toBeGreaterThanOrEqual(400);
});