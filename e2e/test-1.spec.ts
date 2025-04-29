import { test, expect } from '@playwright/test';

test('should add new todo item', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  await page.getByRole('textbox', { name: 'Add a new todo' }).click();
  await page.getByRole('textbox', { name: 'Add a new todo' }).fill('Hello');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByRole('list')).toContainText('Hello');
});

test('should mark a todo as completed', async ({ page }) => {
  await page.goto('http://localhost:5173');
  
  // Add a new todo if none exists
  if (await page.locator('li').count() === 0) {
  await page.getByRole('textbox', { name: 'Add a new todo' }).click();
  await page.getByRole('textbox', { name: 'Add a new todo' }).fill('Hello');
  await page.getByRole('button', { name: 'Add' }).click();
  }
  
  // Mark the first todo as completed
  await page.click('input[type="checkbox"]');
  
  // Verify the todo is marked as completed
  await expect(page.locator('li span:has-text("Hello")').first()).toHaveCSS('text-decoration', /line-through/);
});
