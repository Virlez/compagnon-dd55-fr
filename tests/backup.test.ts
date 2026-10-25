import { describe, expect, it } from "vitest";
import { createBackup, parseBackup } from "../src/content/backup";

const preferences = {
  enabled: true,
  bilingual: false,
  theme: "dark" as const,
  fontSize: "large" as const,
  resultDensity: "compact" as const,
  defaultCategory: "spell" as const,
  expandedByDefault: true,
  monsterRollMode: "ask" as const,
  autoRollMonsterActions: false,
  launcherVisible: true,
  panelPosition: { left: 50, top: 70 }
};

describe("sauvegarde locale du compendium", () => {
  it("exporte uniquement les préférences portables et les collections", () => {
    const backup = createBackup(preferences, [{ kind: "local", entryId: "spell-boule-de-feu" }], []);
    expect(backup.format).toBe("compagnon-dd55-fr-backup");
    expect(backup.preferences.theme).toBe("dark");
    expect(backup).not.toHaveProperty("panelPosition");
    expect(parseBackup(JSON.parse(JSON.stringify(backup)))).toEqual(backup);
  });

  it("refuse les formats inconnus et les références ou réglages invalides", () => {
    const backup = createBackup(preferences, [], []);
    expect(parseBackup({ ...backup, schemaVersion: 2 })).toBeUndefined();
    expect(parseBackup({ ...backup, favoriteReferences: [{ kind: "external", referenceKind: "javascript", referenceId: "bad" }] })).toBeUndefined();
    expect(parseBackup({ ...backup, recentReferences: Array.from({ length: 11 }, (_, index) => ({ kind: "local", entryId: `spell-${index}` })) })).toBeUndefined();
    expect(parseBackup({ ...backup, preferences: { ...backup.preferences, theme: "system" } })).toBeUndefined();
  });

  it("normalise les doublons importés sans modifier le format de la sauvegarde", () => {
    const reference = { kind: "local", entryId: "spell-boule-de-feu" } as const;
    const backup = createBackup(preferences, [reference, reference], [reference, reference]);
    const parsed = parseBackup(backup)!;
    expect(parsed.favoriteReferences).toEqual([reference]);
    expect(parsed.recentReferences).toEqual([reference]);
  });
});
