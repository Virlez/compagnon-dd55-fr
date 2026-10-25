import { expect, test } from "@playwright/test";
import path from "node:path";

const bundlePath = path.resolve("dist/content.js");
const stylePath = path.resolve("dist/content.css");

test("respecte les budgets de navigation sur une fiche volumineuse", async ({ page }, testInfo) => {
  const rows = Array.from({ length: 2400 }, (_, index) => `<div class="sheet-row">${index % 3 === 0 ? "Armor Class" : index % 3 === 1 ? "Proficiency Bonus" : "Saving Throws"}</div>`).join("");
  await page.setContent(`<div>ABILITIES AC/SPEED FEATURES &amp; TRAITS</div><main>${rows}</main>`);
  await page.addStyleTag({ path: stylePath });

  const initialStart = await page.evaluate(() => performance.now());
  await page.addScriptTag({ path: bundlePath });
  await expect(page.locator(".sheet-row").first()).toContainText("Classe d’armure");
  const initialMs = await page.evaluate(start => performance.now() - start, initialStart);

  const mutationMs = await page.evaluate(() => new Promise<number>((resolve, reject) => {
    const row = document.createElement("button");
    row.id = "late-spell";
    row.textContent = "Goodberry";
    const start = performance.now();
    const observer = new MutationObserver(() => {
      if (!row.querySelector(".dd55-reference")) return;
      observer.disconnect();
      clearTimeout(timeout);
      resolve(performance.now() - start);
    });
    const timeout = window.setTimeout(() => {
      observer.disconnect();
      reject(new Error("La référence traduite n’est pas apparue dans les 2 secondes."));
    }, 2000);
    observer.observe(row, { childList: true, subtree: true });
    document.querySelector("main")!.append(row);
  }));
  await expect(page.locator("#late-spell")).toContainText("Baies nourricières");
  await expect(page.locator("#late-spell .dd55-reference")).toHaveCount(1);

  await page.evaluate(() => {
    const row = document.querySelector<HTMLButtonElement>("#late-spell")!;
    row.childNodes[0].textContent = "Fireball";
  });
  await expect(page.locator("#late-spell")).toContainText("Boule de feu");
  await expect(page.locator("#late-spell [data-dd55-open='spell-boule-de-feu']")).toHaveCount(1);

  const homeStart = await page.evaluate(() => {
    const start = performance.now();
    document.querySelector<HTMLButtonElement>("#dd55-launcher")!.click();
    return start;
  });
  await expect(page.locator("[data-results] .dd55-entry-card").first()).toBeVisible();
  const homeMs = await page.evaluate(start => performance.now() - start, homeStart);

  const spellsStart = await page.evaluate(() => {
    const start = performance.now();
    document.querySelector<HTMLButtonElement>("[data-category='spell']")!.click();
    return start;
  });
  await expect(page.locator("[data-results] .dd55-entry-card")).toHaveCount(80);
  const spellsMs = await page.evaluate(start => performance.now() - start, spellsStart);

  const magicItemsStart = await page.evaluate(() => {
    const start = performance.now();
    document.querySelector<HTMLButtonElement>("[data-category='magic-item']")!.click();
    return start;
  });
  await expect(page.locator("[data-results] .dd55-entry-card")).toHaveCount(80);
  const magicItemsMs = await page.evaluate(start => performance.now() - start, magicItemsStart);

  const monstersStart = await page.evaluate(() => {
    const start = performance.now();
    document.querySelector<HTMLButtonElement>("[data-category='monster']")!.click();
    return start;
  });
  await expect(page.locator("[data-results] .dd55-entry-card")).toHaveCount(80);
  const monstersMs = await page.evaluate(start => performance.now() - start, monstersStart);

  const metrics = { initialMs, mutationMs, homeMs, spellsMs, magicItemsMs, monstersMs };
  await testInfo.attach("performance.json", { body: JSON.stringify(metrics, null, 2), contentType: "application/json" });
  console.info("Budget performance DD55", metrics);

  expect(initialMs).toBeLessThan(1200);
  expect(mutationMs).toBeLessThan(100);
  expect(homeMs).toBeLessThan(350);
  expect(spellsMs).toBeLessThan(350);
  expect(magicItemsMs).toBeLessThan(350);
  expect(monstersMs).toBeLessThan(350);
});
