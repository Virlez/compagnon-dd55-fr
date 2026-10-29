import { describe, expect, it } from "vitest";
import { isAllowedExternalUrl } from "../src/services/external-url";

describe("URL externes autorisées", () => {
  it.each(["feat", "spell", "magic-item"])("accepte une fiche %s française sur AideDD", kind => {
    expect(isAllowedExternalUrl(`https://www.aidedd.org/${kind}/fr/exemple-2024`)).toBe(true);
  });

  it.each([
    "http://www.aidedd.org/spell/fr/shield",
    "https://www.aidedd.org.evil.test/spell/fr/shield",
    "https://evil.test/spell/fr/shield",
    "https://www.aidedd.org/spell/en/shield",
    "https://www.aidedd.org/spell/fr/shield?redirect=https://evil.test",
    "javascript:alert(1)",
    "prefixhttps://www.aidedd.org/spell/fr/shield",
    "https://www.aidedd.org/spell/fr/",
    "https://www.aidedd.org/rule/fr/shield",
    "https://www.aidedd.org/spell/fr/shield/extra",
    "https://www.aidedd.org/spell/fr/shield#fragment"
  ])("refuse une URL hors périmètre : %s", url => {
    expect(isAllowedExternalUrl(url)).toBe(false);
  });
});
