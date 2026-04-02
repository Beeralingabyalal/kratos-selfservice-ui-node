import { test, expect } from '@playwright/test';

test('security headers exist', async ({ request }) => {

  const response = await request.get('http://localhost:8080');

  expect(response.headers()['content-security-policy']).toBeDefined();
});