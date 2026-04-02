import { test, expect } from '@playwright/test';

test('Admin API requires authentication', async ({ request }) => {
  const response = await request.post(
    'http://localhost:8080/api/admin/tenants/bulk',
    {
      data: { tenantNames: ['tenant-test'] }
    }
  );

  expect(response.status()).toBe(401);
});