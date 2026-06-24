# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> permite login alterno con email y renderiza el lobby
- Location: tests\e2e\auth.spec.ts:3:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByTestId('lobby-user-card')
Expected substring: "Gabriel"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for getByTestId('lobby-user-card')

```

```yaml
- banner:
  - paragraph: Proyecto UTP
  - heading "Juego de Damas" [level=1]
- main:
  - paragraph: Proyecto UTP
  - heading "Juego de Damas con IA, persistencia y ranking global" [level=2]
  - paragraph: Inicia sesion para acceder al lobby, retomar partidas guardadas, consultar el ranking y desbloquear skins para tus fichas.
  - text: Partidas persistidas IA separada por microservicio Login local con hash Marketplace con Stripe sandbox
  - paragraph: Acceso
  - heading "Elige como quieres entrar" [level=3]
  - paragraph: Puedes usar login local con hash o continuar con Clerk si las llaves estan configuradas.
  - button "Email y contrasena"
  - button "Clerk" [disabled]
  - paragraph: Login alterno
  - heading "Entrar con email" [level=3]
  - paragraph: Persistencia propia en MongoDB con hash de contraseñas.
  - button "Login local"
  - button "Registro local"
  - text: Correo
  - textbox "Correo"
  - text: Contrasena
  - textbox "Contrasena"
  - paragraph: Usa 8+ caracteres con mayuscula, minuscula, numero y simbolo.
  - button "Entrar con email"
  - paragraph: "Clerk no esta visible porque falta la publishable key en el frontend. Ahora tambien acepta `CLERK_PUBLISHABLE_KEY` como respaldo."
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | test("permite login alterno con email y renderiza el lobby", async ({ page }) => {
  4  |   await page.route("**/api/ranking", async (route) => {
  5  |     await route.fulfill({
  6  |       status: 200,
  7  |       contentType: "application/json",
  8  |       body: JSON.stringify([{ userId: "u-9", displayName: "Campeon", avatarUrl: null, bestWinMoveCount: 12, wins: 3, achievedAt: new Date().toISOString() }]),
  9  |     });
  10 |   });
  11 | 
  12 |   await page.route("**/api/auth/login", async (route) => {
  13 |     await route.fulfill({
  14 |       status: 200,
  15 |       contentType: "application/json",
  16 |       body: JSON.stringify({
  17 |         sessionToken: "damas_local_test_token",
  18 |         user: {
  19 |           userId: "u-1",
  20 |           clerkUserId: null,
  21 |           email: "gabriel@example.com",
  22 |           displayName: "Gabriel",
  23 |           avatarUrl: null,
  24 |           equippedSkinId: null,
  25 |           unlockedSkinIds: [],
  26 |           createdAt: new Date().toISOString(),
  27 |           updatedAt: new Date().toISOString(),
  28 |         },
  29 |       }),
  30 |     });
  31 |   });
  32 | 
  33 |   await page.route("**/api/auth/me", async (route) => {
  34 |     await route.fulfill({
  35 |       status: 200,
  36 |       contentType: "application/json",
  37 |       body: JSON.stringify({
  38 |         userId: "u-1",
  39 |         clerkUserId: null,
  40 |         email: "gabriel@example.com",
  41 |         displayName: "Gabriel",
  42 |         avatarUrl: null,
  43 |         equippedSkinId: null,
  44 |         unlockedSkinIds: [],
  45 |         createdAt: new Date().toISOString(),
  46 |         updatedAt: new Date().toISOString(),
  47 |       }),
  48 |     });
  49 |   });
  50 | 
  51 |   await page.route("**/api/games", async (route) => {
  52 |     await route.fulfill({
  53 |       status: 200,
  54 |       contentType: "application/json",
  55 |       body: JSON.stringify([]),
  56 |     });
  57 |   });
  58 | 
  59 |   await page.goto("/");
  60 |   await page.getByTestId("auth-email").fill("gabriel@example.com");
  61 |   await page.getByTestId("auth-password").fill("ClaveSegura1!");
  62 |   await page.getByTestId("auth-submit").click();
  63 | 
> 64 |   await expect(page.getByTestId("lobby-user-card")).toContainText("Gabriel");
     |                                                     ^ Error: expect(locator).toContainText(expected) failed
  65 |   await expect(page.getByText("Nueva partida")).toBeVisible();
  66 | });
  67 | 
```