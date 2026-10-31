import { describe, expect, it } from "vitest";
import { feats, spells } from "../src/data/references";
import { findReference, normalizeName, referenceUrl } from "../src/services/reference-matcher";
import { isAllowedExternalUrl } from "../src/services/external-url";

describe("reference matcher", () => {
  it("normalise accents, apostrophes et suffixes", () => expect(normalizeName("  Flèche d’acide [PHB 2024]  ")).toBe("fleche dacide"));
  it("reconnaît un sort anglais avec suffixe", () => expect(findReference("Magic Missile (2024)", spells)?.nameFr).toBe("Projectile magique"));
  it("reconnaît un don français sans accents", () => expect(findReference("Tireur d'elite", feats)?.nameEn).toBe("Sharpshooter"));
  it("utilise le slug validé", () => expect(referenceUrl("spell", spells.find(s => s.id === "magic-missile")!)).toBe("https://www.aidedd.org/spell/fr/projectile-magique"));
  it("autorise les objets magiques AideDD dans le service worker", () => {
    expect(isAllowedExternalUrl("https://www.aidedd.org/magic-item/fr/amulette-de-sombre-eclat")).toBe(true);
    expect(isAllowedExternalUrl("https://www.aidedd.org/spell/fr/projectile-magique")).toBe(true);
    expect(isAllowedExternalUrl("https://www.aidedd.org/magic-item/fr/item?redirect=https://example.com")).toBe(false);
  });
  it.each([
    ["charger", "expert-de-la-charge"],
    ["crossbow-expert", "maitre-arbaletrier"],
    ["fey-touched", "affinite-feerique"],
    ["grappler", "empoigneur"],
    ["great-weapon-master", "maitre-des-armes-lourdes-cogneur-lourd"],
    ["inspiring-leader", "figure-de-proue"],
    ["lightly-armored", "protection-legere"],
    ["mobile", "mobile"],
    ["polearm-master", "maitre-d-hast"],
    ["spell-sniper", "incantateur-d-elite"],
    ["durable", "gaillard"],
    ["tough", "robuste"]
  ])("utilise le lien AideDD publié pour %s", (id, slug) => {
    expect(referenceUrl("feat", feats.find(feat => feat.id === id)!)).toBe(`https://www.aidedd.org/feat/fr/${slug}`);
  });
  it("référence les 164 dons AideDD sans identifiant ni lien en double", () => {
    expect(feats).toHaveLength(164);
    expect(new Set(feats.map(feat => feat.id)).size).toBe(164);
    expect(new Set(feats.map(feat => referenceUrl("feat", feat))).size).toBe(164);
    expect(feats.filter(feat => feat.source === "Forgotten Realms: Heroes of Faerûn")).toHaveLength(34);
    expect(feats.filter(feat => feat.source === "Eberron: Forge of the Artificer")).toHaveLength(28);
  });

  it.each([
    ["hof-agent-des-menestrels", "agent-des-menestrels"],
    ["efa-marque-de-sentinelle", "marque-de-sentinelle"]
  ])("utilise le lien AideDD publié pour %s", (id, slug) => {
    expect(referenceUrl("feat", feats.find(feat => feat.id === id)!)).toBe(`https://www.aidedd.org/feat/fr/${slug}`);
  });
});
