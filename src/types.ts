export interface Reference {
  id: string;
  nameEn: string;
  nameFr: string;
  slug: string;
  aliases?: string[];
  compendiumId?: string;
  level?: number;
  category?: string;
  source?: string;
}

export type SpellSchool = "Abjuration" | "Divination" | "Enchantement" | "Évocation" | "Illusion" | "Invocation" | "Nécromancie" | "Transmutation";
export interface SpellReference extends Reference {
  level: number;
  school: SpellSchool;
  ritual: boolean;
  concentration: boolean;
}

export type MagicItemRarity = "Courant" | "Peu courant" | "Rare" | "Très rare" | "Légendaire" | "Artefact" | "Variable";
export type MonsterRollMode = "two" | "single" | "ask";
export type RecentReference =
  | { kind: "local"; entryId: string }
  | { kind: "external"; referenceKind: "spell" | "feat" | "magic-item"; referenceId: string };
export type FavoriteReference = RecentReference;
export type ReferenceCollection = "favoriteReferences" | "recentReferences";
export type ReferenceCollectionMutation =
  | { collection: "favoriteReferences"; action: "replace"; references: FavoriteReference[] }
  | { collection: "favoriteReferences"; action: "add" | "remove"; reference: FavoriteReference }
  | { collection: "recentReferences"; action: "replace"; references: RecentReference[] }
  | { collection: "recentReferences"; action: "visit" | "remove"; reference: RecentReference }
  | { collection: "recentReferences"; action: "clear" };

export interface MagicItemReference extends Reference {
  itemType: string;
  rarities: MagicItemRarity[];
  rarity: string;
  source: string;
}

export interface Preferences {
  enabled: boolean;
  bilingual: boolean;
  theme?: "light" | "dark";
  fontSize?: "small" | "normal" | "large";
  resultDensity?: "comfortable" | "compact";
  defaultCategory?: "" | "rule" | "classes" | "origins" | "equipment" | "spell" | "feat" | "magic-item" | "monster" | "recent";
  expandedByDefault?: boolean;
  monsterRollMode?: MonsterRollMode;
  autoRollMonsterActions?: boolean;
  launcherVisible?: boolean;
  launcherPosition?: { left: number; top: number } | null;
  panelPosition?: { left: number; top: number } | null;
  recentReferences?: RecentReference[];
  favoriteReferences?: FavoriteReference[];
}
