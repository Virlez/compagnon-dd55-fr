import { chromium, expect, test, type TestInfo } from "@playwright/test";
import path from "node:path";

const extensionPath = path.resolve(process.env.DD55_EXTENSION_PATH ?? "dist");
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
const usesBrandedChrome = Boolean(executablePath && /^chrome(?:\.exe)?$/i.test(path.basename(executablePath)));
const roll20Fixture = `<!doctype html><html><head><title>Roll20 test</title></head><body><main data-sheet-type="dnd2024byroll20"><h1>Feuille D&amp;D 2024</h1></main></body></html>`;

function launchExtension(testInfo: TestInfo) {
  test.skip(usesBrandedChrome, "Chrome stable bloque le chargement d’extensions par ligne de commande ; ce scénario utilise Chromium de Playwright.");
  return chromium.launchPersistentContext(testInfo.outputPath("extension-profile"), {
    headless: true,
    channel: "chromium",
    ...(executablePath ? { executablePath } : {}),
    ignoreDefaultArgs: ["--disable-extensions"],
    args: [
      "--headless=new",
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ],
    ignoreHTTPSErrors: true
  });
}

test("configure une seule fois, synchronise les réglages et préserve les favoris concurrents", async ({}, testInfo) => {
  const context = await launchExtension(testInfo);

  try {
    const pageErrors: string[] = [];
    const serviceWorker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker", { timeout: 10_000 });
    expect(new URL(serviceWorker.url()).protocol).toBe("chrome-extension:");
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
      if (page === pageA) await expect(page.locator("[data-quick-setup]")).toBeVisible();
      else await expect(page.locator("[data-quick-setup]")).toBeHidden();
    }
    expect(pageErrors).toEqual([]);
    await pageA.screenshot({ path: testInfo.outputPath("quick-setup.png") });
    await pageA.locator("[data-setup-enabled]").focus();
    await pageA.keyboard.press("Tab");
    await expect(pageA.locator("[data-setup-bilingual]")).toBeFocused();
    await pageA.keyboard.press("Space");
    await pageA.keyboard.press("Tab");
    await expect(pageA.locator("[data-setup-font-size]")).toBeFocused();
    await pageA.keyboard.press("End");
    await expect(pageA.locator("[data-setup-preview]")).toHaveText("Force · Dextérité");
    await pageA.keyboard.press("Tab");
    await expect(pageA.locator("[data-setup-start]")).toBeFocused();
    await pageA.keyboard.press("Enter");
    await expect(pageB.locator("#dd55-companion")).toHaveAttribute("data-font-size", "large");
    await expect.poll(() => serviceWorker.evaluate(async () => (await chrome.storage.local.get("bilingual")).bilingual)).toBe(false);

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
    await expect(pageA.locator("[data-quick-setup]")).toBeHidden();
    await expect(pageA.locator("#dd55-companion")).toHaveAttribute("data-font-size", "large");
    await pageA.locator("[data-view='favorites']").click();
    await expect(pageA.locator("[data-entry-id='spell-boule-de-feu']")).toBeVisible();
    await expect(pageA.locator("[data-entry-id='spell-baies-nourricieres']")).toBeVisible();

    const pageC = await context.newPage();
    pageC.on("pageerror", error => pageErrors.push(error.message));
    await pageC.route("https://roll20.net/**", route => route.fulfill({
      status: 200,
      contentType: "text/html",
      body: roll20Fixture
    }));
    await pageC.goto("https://roll20.net/");
    await expect(pageC.locator("#dd55-launcher")).toBeVisible();
    await pageC.evaluate(() => document.dispatchEvent(new Event("keydown")));
    expect(pageErrors).toEqual([]);
  } finally {
    await context.close();
  }
});

test("préserve une ancienne configuration et propose de la revoir dans les réglages", async ({}, testInfo) => {
  const context = await launchExtension(testInfo);
  try {
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
    await worker.evaluate(() => chrome.storage.local.set({ enabled: false, bilingual: false, fontSize: "large", theme: "dark" }));
    const page = await context.newPage();
    await page.route("https://app.roll20.net/**", route => route.fulfill({ contentType: "text/html", body: roll20Fixture }));
    await page.goto("https://app.roll20.net/editor/test");
    await page.locator("#dd55-launcher").click();
    await expect(page.locator("[data-quick-setup]")).toBeHidden();
    await expect(page.locator("#dd55-companion")).toHaveAttribute("data-font-size", "large");
    await page.locator("[data-settings-open]").click();
    await page.locator("[data-reopen-setup]").click();
    await expect(page.locator("[data-setup-enabled]")).not.toBeChecked();
    await expect(page.locator("[data-setup-font-size]")).toHaveValue("large");
    await page.setViewportSize({ width: 360, height: 740 });
    await page.screenshot({ path: testInfo.outputPath("quick-setup-dark-narrow.png") });
    const setup = page.locator("[data-quick-setup]");
    expect(await setup.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-reopen-setup]")).toBeFocused();
    expect(await worker.evaluate(async () => (await chrome.storage.local.get("enabled")).enabled)).toBe(false);
    await page.locator("[data-reopen-setup]").click();
    await page.locator("[data-setup-recommended]").click();
    await expect(page.locator("[data-enabled]")).toBeChecked();
    await expect(page.locator("[data-setting-font-size]")).toHaveValue("normal");
  } finally {
    await context.close();
  }
});
