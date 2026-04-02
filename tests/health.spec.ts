import { test, expect } from '@playwright/test';

test('health endpoint returns OK', async ({ request }) => {

  const response = await request.get('http://localhost:8080/health');

  expect(response.status()).toBe(200);
});