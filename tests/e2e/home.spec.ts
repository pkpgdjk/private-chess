import { expect, test } from '@playwright/test';

test('shows the temporary home page', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('Chess Trainer')).toBeVisible();
});
