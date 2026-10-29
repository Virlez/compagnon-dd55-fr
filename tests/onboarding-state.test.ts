import { afterEach, describe, expect, it, vi } from "vitest";
import { claimFirstRun, initialOnboardingVersion } from "../src/services/onboarding-state";

describe("première configuration", () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    "enabled", "bilingual", "theme", "fontSize", "resultDensity", "defaultCategory",
    "expandedByDefault", "monsterRollMode", "autoRollMonsterActions", "launcherVisible",
    "launcherPosition", "panelPosition", "favoriteReferences", "recentReferences"
  ])("reconnaît une installation avec seulement le réglage %s", key => {
    expect(initialOnboardingVersion({ [key]: false })).toBe(1);
  });

  it.each([-1, "0", null, undefined, Number.NaN])("ignore une version de configuration invalide : %s", value => {
    expect(initialOnboardingVersion({ onboardingVersion: value })).toBe(0);
  });

  it("conserve les versions futures et ignore les propriétés héritées", () => {
    expect(initialOnboardingVersion({ onboardingVersion: 3 })).toBe(3);
    expect(initialOnboardingVersion(Object.create({ enabled: true }))).toBe(0);
  });

  it.each([undefined, {}, { runtime: {} }, { runtime: { id: "" } }])("permet le mode local sans contexte d’extension : %j", async chromeValue => {
    vi.stubGlobal("chrome", chromeValue);
    expect(await claimFirstRun()).toBe(true);
  });

  it.each([
    [{ claimed: true }, true], [{ claimed: false }, false], [{ claimed: 1 }, false],
    [{ claimed: "true" }, false], [{}, false], [undefined, false], [null, false]
  ])("valide strictement la réponse à la réservation : %j", async (response, claimed) => {
    const sendMessage = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("chrome", { runtime: { id: "extension-id", sendMessage } });
    expect(await claimFirstRun()).toBe(claimed);
    expect(sendMessage).toHaveBeenCalledExactlyOnceWith({ type: "DD55_CLAIM_ONBOARDING" });
  });

  it("ne propose pas l’accueil si le service worker ne répond pas", async () => {
    vi.stubGlobal("chrome", { runtime: { id: "extension-id", sendMessage: vi.fn().mockRejectedValue(new Error("Unavailable")) } });
    expect(await claimFirstRun()).toBe(false);
  });

  it("propose le démarrage uniquement sur une installation sans préférences", () => {
    expect(initialOnboardingVersion({})).toBe(0);
    expect(initialOnboardingVersion({ unrelated: true })).toBe(0);
    expect(initialOnboardingVersion({ enabled: false, fontSize: "large" })).toBe(1);
    expect(initialOnboardingVersion({ favoriteReferences: [] })).toBe(1);
    expect(initialOnboardingVersion({ onboardingVersion: 1 })).toBe(1);
    expect(initialOnboardingVersion({ onboardingVersion: 0, enabled: true })).toBe(0);
  });
});
