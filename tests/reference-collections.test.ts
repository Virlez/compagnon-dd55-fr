import { describe, expect, it } from "vitest";
import { applyReferenceCollectionMutation, isReferenceCollectionMutation, normalizeReferenceCollection } from "../src/services/reference-collections";
import type { ReferenceCollectionMutation } from "../src/types";

describe("collections de références", () => {
  const local = { kind: "local" as const, entryId: "shared" };
  const external = { kind: "external" as const, referenceKind: "spell" as const, referenceId: "shared" };

  it("distingue les références locales et les trois types externes", () => {
    const references = [local, external,
      { kind: "external" as const, referenceKind: "feat" as const, referenceId: "shared" },
      { kind: "external" as const, referenceKind: "magic-item" as const, referenceId: "shared" }
    ];
    expect(normalizeReferenceCollection([...references, ...references], "favoriteReferences")).toEqual(references);
    expect(applyReferenceCollectionMutation(references, { collection: "favoriteReferences", action: "remove", reference: external }))
      .toEqual([references[0], references[2], references[3]]);
    expect(applyReferenceCollectionMutation(references, { collection: "recentReferences", action: "remove", reference: local }))
      .toEqual(references.slice(1));
  });

  it("borne les collections chargées sans tronquer les favoris à dix éléments", () => {
    const references = Array.from({ length: 5_001 }, (_, index) => ({ kind: "local" as const, entryId: `entry-${index}` }));
    expect(normalizeReferenceCollection(references, "favoriteReferences")).toEqual(references.slice(0, 5_000));
    expect(normalizeReferenceCollection(references, "recentReferences")).toEqual(references.slice(0, 10));
  });

  it("valide chaque combinaison de collection et d’action", () => {
    for (const collection of ["favoriteReferences", "recentReferences", "unknown", undefined]) {
      for (const action of ["add", "remove", "visit", "clear", "replace", "unknown", undefined]) {
        const expected = collection === "favoriteReferences" ? ["add", "remove", "replace"].includes(action ?? "")
          : collection === "recentReferences" && ["visit", "remove", "clear", "replace"].includes(action ?? "");
        expect(isReferenceCollectionMutation({ collection, action, reference: external, references: [local, external] })).toBe(expected);
      }
    }
    expect(isReferenceCollectionMutation({ collection: "recentReferences", action: "clear" })).toBe(true);
  });

  it.each([undefined, null, false, 0, "mutation", {}])("refuse une mutation de forme incorrecte : %j", mutation => {
    expect(isReferenceCollectionMutation(mutation)).toBe(false);
  });

  it.each([undefined, null, 0, {}, "corrupt"])("traite un stockage non tabulaire comme une collection vide : %j", stored => {
    expect(normalizeReferenceCollection(stored, "favoriteReferences")).toEqual([]);
  });

  it.each([
    undefined, null, false, "reference", {}, { kind: "other", entryId: "id" },
    { kind: "other", referenceKind: "spell", referenceId: "id" },
    { kind: "local" }, { kind: "local", entryId: 1 }, { kind: "local", entryId: "" }, { kind: "local", entryId: "x".repeat(257) },
    { kind: "external", referenceKind: "unknown", referenceId: "id" }, { kind: "external", referenceKind: "spell", referenceId: 1 },
    { kind: "external", referenceKind: "spell", referenceId: "" }, { kind: "external", referenceKind: "spell", referenceId: "x".repeat(257) },
    { kind: "external", referenceKind: "spell", referenceId: ["id"] }
  ])("rejette et nettoie une référence invalide : %j", reference => {
    expect(normalizeReferenceCollection([reference, local], "favoriteReferences")).toEqual([local]);
    expect(isReferenceCollectionMutation({ collection: "favoriteReferences", action: "add", reference })).toBe(false);
    expect(isReferenceCollectionMutation({ collection: "recentReferences", action: "visit", reference })).toBe(false);
    expect(isReferenceCollectionMutation({ collection: "favoriteReferences", action: "replace", references: [local, reference] })).toBe(false);
    expect(applyReferenceCollectionMutation([local], { collection: "favoriteReferences", action: "add", reference } as ReferenceCollectionMutation)).toEqual([local]);
  });

  it("accepte les identifiants de 1 à 256 caractères et les limites exactes de remplacement", () => {
    for (const length of [1, 256]) {
      for (const reference of [{ kind: "local", entryId: "x".repeat(length) }, { kind: "external", referenceKind: "feat", referenceId: "x".repeat(length) }]) {
        expect(isReferenceCollectionMutation({ collection: "favoriteReferences", action: "add", reference })).toBe(true);
      }
    }
    for (const [collection, limit] of [["favoriteReferences", 5_000], ["recentReferences", 10]] as const) {
      const references = Array.from({ length: limit }, (_, index) => ({ kind: "local", entryId: `entry-${index}` }));
      expect(isReferenceCollectionMutation({ collection, action: "replace", references })).toBe(true);
      expect(isReferenceCollectionMutation({ collection, action: "replace", references: [...references, local] })).toBe(false);
      expect(isReferenceCollectionMutation({ collection, action: "replace", references: null })).toBe(false);
      expect(isReferenceCollectionMutation({ collection, action: "replace", references: {} })).toBe(false);
    }
  });

  it("ajoute les favoris à la fin et retire seulement la référence demandée", () => {
    const references = Array.from({ length: 12 }, (_, index) => ({ kind: "local" as const, entryId: `entry-${index}` }));
    expect(applyReferenceCollectionMutation(references, { collection: "favoriteReferences", action: "add", reference: external })).toEqual([...references, external]);
    expect(applyReferenceCollectionMutation([external, local], { collection: "favoriteReferences", action: "add", reference: external })).toEqual([local, external]);
    expect(applyReferenceCollectionMutation([local], { collection: "favoriteReferences", action: "remove", reference: external })).toEqual([local]);
  });
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
    expect(stored).toEqual([11, 10, 9, 8, 7, 6, 5, 4, 3, 2].map(index => ({ kind: "local", entryId: `entry-${index}` })));
    stored = applyReferenceCollectionMutation(stored, { collection: "recentReferences", action: "visit", reference: { kind: "local", entryId: "entry-5" } });
    expect(stored).toHaveLength(10);
    expect(stored).toEqual([5, 11, 10, 9, 8, 7, 6, 4, 3, 2].map(index => ({ kind: "local", entryId: `entry-${index}` })));
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
