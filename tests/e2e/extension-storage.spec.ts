import { chromium, expect, test } from "@playwright/test";
import path from "node:path";

const extensionPath = path.resolve("dist");
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
const usesBrandedChrome = Boolean(executablePath && /^chrome(?:\.exe)?$/i.test(path.basename(executablePath)));
const roll20Fixture = `<!doctype html><html><head><title>Roll20 test</title></head><body><main class="dnd2024"><h1>Feuille D&amp;D 2024</h1></main></body></html>`;

test("préserve les favoris concurrents entre deux onglets et après rechargement", async ({}, testInfo) => {
  test.skip(usesBrandedChrome, "Chrome stable bloque le chargement d’extensions par ligne de commande ; ce scénario utilise Chromium de Playwright.");
  const context = await chromium.launchPersistentContext(testInfo.outputPath("extension-profile"), {
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    ignoreDefaultArgs: ["--disable-extensions"],
    args: [
      "--headless=new",
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ],
    ignoreHTTPSErrors: true
  });

  try {
    const pageErrors: string[] = [];
    const pageA = await context.newPage();
    const pageB = await context.newPage();
    for (const page of [pageA, pageB]) {
      page.on("pageerror", error => pageErrors.push(error.message));
      await page.route("https://app.roll20.net/**", route => route.fulfill({
        status: 200,
        contentType: "text/html",
        body: roll20Fixture
      }));
      await page.goto("https://app.roll20.net/editor/test");
      await expect(page.locator("#dd55-launcher")).toBeVisible();
      await page.locator("#dd55-launcher").click();
    }
    const serviceWorker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker", { timeout: 5000 });
    expect(pageErrors).toEqual([]);
    expect(new URL(serviceWorker.url()).protocol).toBe("chrome-extension:");

    await pageA.locator("[data-search]").fill("Boule de feu");
    await pageB.locator("[data-search]").fill("Baies nourricières");
    const fireballFavorite = pageA.locator("[data-entry-id='spell-boule-de-feu']").locator("..").locator("[data-favorite-toggle]");
    const goodberryFavorite = pageB.locator("[data-entry-id='spell-baies-nourricieres']").locator("..").locator("[data-favorite-toggle]");
    await expect(fireballFavorite).toBeVisible();
    await expect(goodberryFavorite).toBeVisible();

    await Promise.all([fireballFavorite.click(), goodberryFavorite.click()]);
    await expect(pageA.locator("[data-favorites-count]")).toHaveText("2");
    await expect(pageB.locator("[data-favorites-count]")).toHaveText("2");

    await pageA.reload();
    await expect(pageA.locator("#dd55-launcher")).toBeVisible();
    await pageA.locator("#dd55-launcher").click();
    await pageA.locator("[data-view='favorites']").click();
    await expect(pageA.locator("[data-entry-id='spell-boule-de-feu']")).toBeVisible();
    await expect(pageA.locator("[data-entry-id='spell-baies-nourricieres']")).toBeVisible();
  } finally {
    await context.close();
  }
});
