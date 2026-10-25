import type { FavoriteReference, Preferences, RecentReference } from "../types";

export type BackupPreferences = Required<Pick<Preferences,
  | "enabled"
  | "bilingual"
  | "theme"
  | "fontSize"
  | "resultDensity"
  | "defaultCategory"
  | "expandedByDefault"
  | "monsterRollMode"
  | "autoRollMonsterActions"
  | "launcherVisible"
>>;

export interface ExtensionBackup {
  format: "compagnon-dd55-fr-backup";
  schemaVersion: 1;
  exportedAt: string;
  preferences: BackupPreferences;
  favoriteReferences: FavoriteReference[];
  recentReferences: RecentReference[];
}

function normalizeReferences(value: unknown, limit: number): RecentReference[] | undefined {
  if (!Array.isArray(value) || value.length > limit) return undefined;
  const unique = new Map<string, RecentReference>();
  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") return undefined;
    const reference = candidate as Record<string, unknown>;
    let normalized: RecentReference;
    if (reference.kind === "local" && typeof reference.entryId === "string" && reference.entryId.length > 0 && reference.entryId.length <= 256) {
      normalized = { kind: "local", entryId: reference.entryId };
    } else if (reference.kind === "external"
      && (reference.referenceKind === "spell" || reference.referenceKind === "feat" || reference.referenceKind === "magic-item")
      && typeof reference.referenceId === "string"
      && reference.referenceId.length > 0
      && reference.referenceId.length <= 256) {
      normalized = { kind: "external", referenceKind: reference.referenceKind, referenceId: reference.referenceId };
    } else return undefined;
    const key = normalized.kind === "local" ? `local:${normalized.entryId}` : `${normalized.referenceKind}:${normalized.referenceId}`;
    if (!unique.has(key)) unique.set(key, normalized);
  }
  return [...unique.values()];
}

function normalizePreferences(value: unknown): BackupPreferences | undefined {
  if (!value || typeof value !== "object") return undefined;
  const preferences = value as Record<string, unknown>;
  const categories = ["", "rule", "classes", "origins", "equipment", "spell", "feat", "magic-item", "monster", "recent"];
  if (typeof preferences.enabled !== "boolean" || typeof preferences.bilingual !== "boolean"
    || (preferences.theme !== "light" && preferences.theme !== "dark")
    || !["small", "normal", "large"].includes(String(preferences.fontSize))
    || (preferences.resultDensity !== "comfortable" && preferences.resultDensity !== "compact")
    || !categories.includes(String(preferences.defaultCategory))
    || typeof preferences.expandedByDefault !== "boolean"
    || (preferences.monsterRollMode !== "two" && preferences.monsterRollMode !== "single" && preferences.monsterRollMode !== "ask")
    || typeof preferences.autoRollMonsterActions !== "boolean"
    || typeof preferences.launcherVisible !== "boolean") return undefined;
  return {
    enabled: preferences.enabled,
    bilingual: preferences.bilingual,
    theme: preferences.theme,
    fontSize: preferences.fontSize as BackupPreferences["fontSize"],
    resultDensity: preferences.resultDensity,
    defaultCategory: preferences.defaultCategory as BackupPreferences["defaultCategory"],
    expandedByDefault: preferences.expandedByDefault,
    monsterRollMode: preferences.monsterRollMode,
    autoRollMonsterActions: preferences.autoRollMonsterActions,
    launcherVisible: preferences.launcherVisible
  };
}

export function createBackup(preferences: Preferences, favorites: FavoriteReference[], recents: RecentReference[]): ExtensionBackup {
  return {
    format: "compagnon-dd55-fr-backup",
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    preferences: {
      enabled: preferences.enabled,
      bilingual: preferences.bilingual,
      theme: preferences.theme ?? "light",
      fontSize: preferences.fontSize ?? "normal",
      resultDensity: preferences.resultDensity ?? "comfortable",
      defaultCategory: preferences.defaultCategory ?? "",
      expandedByDefault: preferences.expandedByDefault ?? false,
      monsterRollMode: preferences.monsterRollMode ?? "two",
      autoRollMonsterActions: preferences.autoRollMonsterActions ?? false,
      launcherVisible: preferences.launcherVisible !== false
    },
    favoriteReferences: favorites.map(reference => ({ ...reference })),
    recentReferences: recents.map(reference => ({ ...reference }))
  };
}

export function parseBackup(value: unknown): ExtensionBackup | undefined {
  if (!value || typeof value !== "object") return undefined;
  const backup = value as Record<string, unknown>;
  if (backup.format !== "compagnon-dd55-fr-backup" || backup.schemaVersion !== 1 || typeof backup.exportedAt !== "string") return undefined;
  const preferences = normalizePreferences(backup.preferences);
  const favorites = normalizeReferences(backup.favoriteReferences, 5_000);
  const recents = normalizeReferences(backup.recentReferences, 10);
  if (!preferences || !favorites || !recents) return undefined;
  return {
    format: "compagnon-dd55-fr-backup",
    schemaVersion: 1,
    exportedAt: backup.exportedAt,
    preferences,
    favoriteReferences: favorites as FavoriteReference[],
    recentReferences: recents
  };
}
