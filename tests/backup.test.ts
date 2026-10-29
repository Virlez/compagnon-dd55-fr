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
  it("complète les réglages absents et préserve les valeurs explicitement désactivées", () => {
    const backup = createBackup({ enabled: true, bilingual: false }, [], []);
    expect(backup.preferences).toEqual({
      enabled: true, bilingual: false, theme: "light", fontSize: "normal", resultDensity: "comfortable",
      defaultCategory: "", expandedByDefault: false, monsterRollMode: "two", autoRollMonsterActions: false, launcherVisible: true
    });
    expect(new Date(backup.exportedAt).toISOString()).toBe(backup.exportedAt);
    expect(createBackup({ ...preferences, launcherVisible: false, expandedByDefault: false, autoRollMonsterActions: true }, [], []).preferences)
      .toMatchObject({ launcherVisible: false, expandedByDefault: false, autoRollMonsterActions: true });
    expect(parseBackup(backup)).toEqual(backup);
  });

  it.each([
    ["theme", "light"], ["theme", "dark"],
    ["fontSize", "small"], ["fontSize", "normal"], ["fontSize", "large"],
    ["resultDensity", "comfortable"], ["resultDensity", "compact"],
    ["monsterRollMode", "two"], ["monsterRollMode", "single"], ["monsterRollMode", "ask"],
    ...["", "rule", "classes", "origins", "equipment", "spell", "feat", "magic-item", "monster", "recent"].map(value => ["defaultCategory", value])
  ])("restaure le réglage %s avec la valeur %s", (field, value) => {
    const backup = createBackup(preferences, [], []);
    const configured = { ...backup.preferences, [field]: value };
    expect(parseBackup({ ...backup, preferences: configured })?.preferences).toEqual(configured);
  });

  it.each(["enabled", "bilingual", "expandedByDefault", "autoRollMonsterActions", "launcherVisible"])("valide le booléen %s sans coercition", field => {
    const backup = createBackup(preferences, [], []);
    for (const value of [true, false]) {
      expect(parseBackup({ ...backup, preferences: { ...backup.preferences, [field]: value } })?.preferences).toMatchObject({ [field]: value });
    }
    for (const value of [undefined, null, 0, "false"]) {
      expect(parseBackup({ ...backup, preferences: { ...backup.preferences, [field]: value } })).toBeUndefined();
    }
  });

  it.each(["theme", "fontSize", "resultDensity", "defaultCategory", "monsterRollMode"])("refuse un réglage %s inconnu ou manquant", field => {
    const backup = createBackup(preferences, [], []);
    for (const value of [undefined, null, 0, {}, "not-supported"]) {
      expect(parseBackup({ ...backup, preferences: { ...backup.preferences, [field]: value } })).toBeUndefined();
    }
  });

  it.each([undefined, null, false, 0, "backup"])("refuse une sauvegarde ou des préférences de type incorrect : %j", value => {
    expect(parseBackup(value)).toBeUndefined();
    expect(parseBackup({ ...createBackup(preferences, [], []), preferences: value })).toBeUndefined();
  });

  it.each([
    { format: "unknown" }, { schemaVersion: "1" }, { exportedAt: 1 }, { exportedAt: undefined },
    { favoriteReferences: {} }, { recentReferences: null }
  ])("refuse une enveloppe de sauvegarde incorrecte : %j", change => {
    expect(parseBackup({ ...createBackup(preferences, [], []), ...change })).toBeUndefined();
  });

  it("accepte les limites exactes des collections et refuse leur dépassement", () => {
    const backup = createBackup(preferences, [], []);
    for (const [field, limit] of [["favoriteReferences", 5_000], ["recentReferences", 10]] as const) {
      const references = Array.from({ length: limit }, (_, index) => ({ kind: "local", entryId: `entry-${index}` }));
      expect(parseBackup({ ...backup, [field]: references })?.[field]).toHaveLength(limit);
      expect(parseBackup({ ...backup, [field]: [...references, { kind: "local", entryId: "overflow" }] })).toBeUndefined();
    }
  });

  it("restaure les références externes sans confondre types ou sources et retire leurs champs superflus", () => {
    const references = [
      { kind: "local", entryId: "shared" },
      ...["spell", "feat", "magic-item"].map(referenceKind => ({ kind: "external", referenceKind, referenceId: "shared" }))
    ];
    const backup = createBackup(preferences, [], []);
    const incoming = references.map(reference => ({ ...reference, extra: "discard" }));
    expect(parseBackup({ ...backup, favoriteReferences: [...incoming, ...incoming] })?.favoriteReferences).toEqual(references);
    expect(parseBackup({ ...backup, recentReferences: incoming })?.recentReferences).toEqual(references);
    for (const length of [1, 256]) {
      const local = { kind: "local", entryId: "x".repeat(length) };
      const external = { kind: "external", referenceKind: "spell", referenceId: "x".repeat(length) };
      expect(parseBackup({ ...backup, favoriteReferences: [local, external] })?.favoriteReferences).toEqual([local, external]);
    }
  });

  it.each([
    null, false, "reference", {}, [], { kind: "other", entryId: "id" },
    { kind: "other", referenceKind: "spell", referenceId: "id" },
    { kind: "local" }, { kind: "local", entryId: 1 }, { kind: "local", entryId: "" }, { kind: "local", entryId: "x".repeat(257) },
    { kind: "external", referenceKind: "spell" }, { kind: "external", referenceKind: "spell", referenceId: 1 },
    { kind: "external", referenceKind: "spell", referenceId: "" }, { kind: "external", referenceKind: "spell", referenceId: "x".repeat(257) },
    { kind: "external", referenceKind: "other", referenceId: "id" }, { kind: "external", referenceId: "id" }
  ])("refuse une référence importée incorrecte : %j", reference => {
    expect(parseBackup({ ...createBackup(preferences, [], []), favoriteReferences: [reference] })).toBeUndefined();
  });

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
