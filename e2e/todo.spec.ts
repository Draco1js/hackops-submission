import { test, expect } from '@playwright/test';

test('should add a new todo item', async ({ page }) => {
  await page.goto('http://localhost:5173');
  
  // Add a new todo
  await page.fill('input[placeholder="Add a new todo"]', 'Test E2E todo');
  await page.click('button[type="submit"]');
  
  // Verify the todo was added
  await expect(page.locator('li')).toContainText('Test E2E todo');
});

test('should mark a todo as completed', async ({ page }) => {
  await page.goto('http://localhost:5173');
  
  // Add a new todo if none exists
  if (await page.locator('li').count() === 0) {
    await page.fill('input[placeholder="Add a new todo"]', 'Complete me');
    await page.click('button[type="submit"]');
  }
  
  // Mark the first todo as completed
  await page.click('input[type="checkbox"]');
  
  // Verify the todo is marked as completed
  await expect(page.locator('li span')).toHaveClass(/line-through/);
});