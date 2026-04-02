import { test, expect } from '@playwright/test';

test('multiple API requests handled', async ({ request }) => {

  for (let i = 0; i < 5; i++) {
    const response = await request.post(
      'http://localhost:8080/api/admin/tenants/bulk',
      { data: { tenantNames: ['t'+i] } }
    );

    expect(response.status()).toBeGreaterThanOrEqual(400);
  }
});