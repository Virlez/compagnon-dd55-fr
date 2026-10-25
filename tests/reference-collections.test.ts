import { describe, expect, it } from "vitest";
import { applyReferenceCollectionMutation, isReferenceCollectionMutation, normalizeReferenceCollection } from "../src/services/reference-collections";

describe("collections de références", () => {
  it("nettoie les données sauvegardées et élimine les récents en double", () => {
    const stored = [
      { kind: "local", entryId: "monster-owlbear" },
      { kind: "external", referenceKind: "spell", referenceId: "shield" },
      { kind: "local", entryId: "monster-owlbear" },
      { kind: "external", referenceKind: "unknown", referenceId: "invalid" },
      null
    ];
    expect(normalizeReferenceCollection(stored, "recentReferences")).toEqual([
      { kind: "local", entryId: "monster-owlbear" },
      { kind: "external", referenceKind: "spell", referenceId: "shield" }
    ]);
    expect(normalizeReferenceCollection("corrupt", "favoriteReferences")).toEqual([]);
  });

  it("applique les changements favoris sans remplacer les ajouts d’un autre onglet", () => {
    let stored: unknown = [];
    stored = applyReferenceCollectionMutation(stored, { collection: "favoriteReferences", action: "add", reference: { kind: "local", entryId: "spell-shield" } });
    stored = applyReferenceCollectionMutation(stored, { collection: "favoriteReferences", action: "add", reference: { kind: "local", entryId: "spell-bless" } });
    stored = applyReferenceCollectionMutation(stored, { collection: "favoriteReferences", action: "remove", reference: { kind: "local", entryId: "spell-shield" } });
    expect(stored).toEqual([{ kind: "local", entryId: "spell-bless" }]);
  });

  it("replace la référence revisitée et garde seulement les dix plus récentes", () => {
    let stored: unknown = [];
    for (let index = 0; index < 12; index++) {
      stored = applyReferenceCollectionMutation(stored, { collection: "recentReferences", action: "visit", reference: { kind: "local", entryId: `entry-${index}` } });
    }
    stored = applyReferenceCollectionMutation(stored, { collection: "recentReferences", action: "visit", reference: { kind: "local", entryId: "entry-5" } });
    const normalized = normalizeReferenceCollection(stored, "recentReferences");
    expect(normalized).toHaveLength(10);
    expect(normalized[0]).toEqual({ kind: "local", entryId: "entry-5" });
    expect(normalized.filter(reference => reference.kind === "local" && reference.entryId === "entry-5")).toHaveLength(1);
    expect(applyReferenceCollectionMutation(stored, { collection: "recentReferences", action: "clear" })).toEqual([]);
  });

  it("valide et restaure une sauvegarde de collections en conservant leurs limites", () => {
    const mutation = {
      collection: "favoriteReferences" as const,
      action: "replace" as const,
      references: [{ kind: "local" as const, entryId: "spell-shield" }]
    };
    expect(isReferenceCollectionMutation(mutation)).toBe(true);
    expect(isReferenceCollectionMutation({ ...mutation, references: [{ kind: "invalid" }] })).toBe(false);
    expect(applyReferenceCollectionMutation([{ kind: "local", entryId: "spell-bless" }], mutation)).toEqual(mutation.references);
    expect(applyReferenceCollectionMutation([null], { collection: "recentReferences", action: "replace", references: [] })).toEqual([]);
  });
});
