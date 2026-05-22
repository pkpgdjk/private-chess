import { expect, test } from '@playwright/test';

test('login page renders username password form', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByLabel('Username')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});
