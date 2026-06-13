import { expect, test } from "@playwright/test";

test("permite login alterno con email y renderiza el lobby", async ({ page }) => {
  await page.route("**/api/ranking", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ userId: "u-9", displayName: "Campeon", avatarUrl: null, bestWinMoveCount: 12, wins: 3, achievedAt: new Date().toISOString() }]),
    });
  });

  await page.route("**/api/auth/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        sessionToken: "damas_local_test_token",
        user: {
          userId: "u-1",
          clerkUserId: null,
          email: "gabriel@example.com",
          displayName: "Gabriel",
          avatarUrl: null,
          equippedSkinId: null,
          unlockedSkinIds: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
    });
  });

  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        userId: "u-1",
        clerkUserId: null,
        email: "gabriel@example.com",
        displayName: "Gabriel",
        avatarUrl: null,
        equippedSkinId: null,
        unlockedSkinIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    });
  });

  await page.route("**/api/games", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  await page.goto("/");
  await page.getByTestId("auth-email").fill("gabriel@example.com");
  await page.getByTestId("auth-password").fill("ClaveSegura1!");
  await page.getByTestId("auth-submit").click();

  await expect(page.getByTestId("lobby-user-card")).toContainText("Gabriel");
  await expect(page.getByText("Nueva partida")).toBeVisible();
});
