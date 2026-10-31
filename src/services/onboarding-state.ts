const existingPreferenceKeys = [
  "enabled", "bilingual", "theme", "fontSize", "resultDensity", "defaultCategory",
  "expandedByDefault", "monsterRollMode", "autoRollMonsterActions", "launcherVisible",
  "launcherPosition", "panelPosition", "favoriteReferences", "recentReferences"
];

export function initialOnboardingVersion(stored: Record<string, unknown>): number {
  if (typeof stored.onboardingVersion === "number" && stored.onboardingVersion >= 0) return stored.onboardingVersion;
  return existingPreferenceKeys.some(key => Object.hasOwn(stored, key)) ? 1 : 0;
}

export async function claimFirstRun(): Promise<boolean> {
  if (!globalThis.chrome?.runtime?.id) return true;
  try {
    const response = await chrome.runtime.sendMessage({ type: "DD55_CLAIM_ONBOARDING" });
    return response?.claimed === true;
  } catch {
    return false;
  }
}
