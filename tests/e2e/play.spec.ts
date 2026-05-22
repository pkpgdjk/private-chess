import { expect, test } from '@playwright/test';

test('play page redirects anonymous users to login', async ({ page }) => {
  await page.goto('/play');

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});
