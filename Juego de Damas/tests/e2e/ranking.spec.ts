import { expect, test } from "@playwright/test";

test("renderiza el ranking con datos mockeados", async ({ page }) => {
  await page.route("**/api/ranking", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { userId: "u-1", displayName: "Ana", avatarUrl: null, bestWinMoveCount: 9, wins: 4, achievedAt: new Date().toISOString() },
        { userId: "u-2", displayName: "Luis", avatarUrl: null, bestWinMoveCount: 11, wins: 2, achievedAt: new Date().toISOString() },
      ]),
    });
  });

  await page.goto("/ranking");

  await expect(page.getByTestId("ranking-table")).toBeVisible();
  await expect(page.getByTestId("ranking-row-1")).toContainText("Ana");
  await expect(page.getByTestId("ranking-row-2")).toContainText("Luis");
});
