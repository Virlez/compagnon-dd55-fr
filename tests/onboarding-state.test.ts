import { describe, expect, it } from "vitest";
import { initialOnboardingVersion } from "../src/services/onboarding-state";

describe("première configuration", () => {
  it("propose le démarrage uniquement sur une installation sans préférences", () => {
    expect(initialOnboardingVersion({})).toBe(0);
    expect(initialOnboardingVersion({ unrelated: true })).toBe(0);
    expect(initialOnboardingVersion({ enabled: false, fontSize: "large" })).toBe(1);
    expect(initialOnboardingVersion({ favoriteReferences: [] })).toBe(1);
    expect(initialOnboardingVersion({ onboardingVersion: 1 })).toBe(1);
    expect(initialOnboardingVersion({ onboardingVersion: 0, enabled: true })).toBe(0);
  });
});
