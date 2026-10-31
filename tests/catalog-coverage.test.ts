// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { enhanceSheet } from "../src/content/sheet";
import { feats, spells } from "../src/data/references";
import { translations } from "../src/data/translations";
import { referenceUrl } from "../src/services/reference-matcher";
import { compendiumEntries } from "../src/services/srd-compendium";
import magicItemsData from "../src/data/aidedd-magic-items.json";
import legacyReferences from "./fixtures/aidedd-legacy-identities.json";
import { isAllowedExternalUrl } from "../src/services/external-url";

describe("couverture du catalogue 2024", () => {
  beforeEach(() => { document.body.innerHTML = ""; });

  it("importe toutes les sources publiées attendues, sans Unearthed Arcana", () => {
    const countSources = (entries: typeof feats) => entries.reduce<Record<string, number>>((counts, item) => {
      counts[item.source ?? ""] = (counts[item.source ?? ""] ?? 0) + 1;
      return counts;
    }, {});
    expect(countSources(spells)).toEqual({ "SRD 5.2.1": 339, "Player's Handbook 2024": 52, "Arcana Unleashed": 33, "Forgotten Realms: Heroes of Faerûn": 19, "Eberron: Forge of the Artificer": 1 });
    expect(countSources(feats)).toEqual({ "Player's Handbook 2024": 75, "Arcana Unleashed": 25, "Forgotten Realms: Heroes of Faerûn": 34, "Eberron: Forge of the Artificer": 28, "Ravenloft: The Horrors Within": 2 });
    expect([...spells, ...feats].some(item => /unearthed\s+arcana/i.test(item.source ?? ""))).toBe(false);
    for (const [kind, entries] of [["spell", spells], ["feat", feats]] as const) {
      for (const reference of entries) expect(isAllowedExternalUrl(referenceUrl(kind, reference)), reference.nameFr).toBe(true);
    }
  });

  it("préserve les identifiants sauvegardés avant l’ajout des suppléments", () => {
    const spellIds = new Set(spells.map(item => item.id));
    const featIds = new Set(feats.map(item => item.id));
    for (const id of legacyReferences.spells) expect(spellIds.has(id), id).toBe(true);
    for (const id of legacyReferences.feats) expect(featIds.has(id), id).toBe(true);
    for (const { id, oldName, newSlug } of legacyReferences.renamedFeats) {
      const current = feats.find(item => item.id === id);
      expect(current?.slug, id).toBe(newSlug);
      expect(current?.aliases, id).toContain(oldName);
    }
  });

  it("contient les 444 sorts et les 164 dons sans doublon", () => {
    expect(spells).toHaveLength(444);
    expect(feats).toHaveLength(164);
    expect(new Set(spells.map(spell => spell.id)).size).toBe(444);
    expect(new Set(spells.map(spell => spell.slug)).size).toBe(444);
    expect(new Set(feats.map(feat => feat.id)).size).toBe(164);
    expect(new Set(feats.map(feat => feat.slug)).size).toBe(164);
  });

  it("relie exactement 339 sorts au SRD et 105 sorts à AideDD", () => {
    const local = spells.filter(spell => spell.compendiumId);
    const external = spells.filter(spell => !spell.compendiumId);
    expect(local).toHaveLength(339);
    expect(external).toHaveLength(105);
    for (const spell of local) {
      const entry = compendiumEntries.find(candidate => candidate.id === spell.compendiumId);
      expect(entry?.type, spell.nameEn).toBe("spell");
    }
    for (const spell of external) {
      expect(referenceUrl("spell", spell), spell.nameEn).toBe(`https://www.aidedd.org/spell/fr/${spell.slug}`);
    }
  });

  it("relie les 17 dons DRS à une fiche locale unique", () => {
    const local = feats.filter(item => item.compendiumId);
    expect(local).toHaveLength(17);
    expect(new Set(local.map(item => item.compendiumId)).size).toBe(17);
    expect(feats.filter(item => !item.compendiumId)).toHaveLength(147);
    for (const reference of local) expect(compendiumEntries.find(entry => entry.id === reference.compendiumId)?.type, reference.nameFr).toBe("feat");
  });

  it("fournit école, rituel et concentration pour les 444 sorts", () => {
    const schools = ["Abjuration", "Divination", "Enchantement", "Évocation", "Illusion", "Invocation", "Nécromancie", "Transmutation"];
    expect(new Set(spells.map(spell => spell.school))).toEqual(new Set(schools));
    for (const spell of spells) {
      expect(schools, spell.nameFr).toContain(spell.school);
      expect(typeof spell.ritual, spell.nameFr).toBe("boolean");
      expect(typeof spell.concentration, spell.nameFr).toBe("boolean");
    }
    expect(spells.find(spell => spell.slug === "armure-d-agathys")).toMatchObject({ school: "Abjuration", ritual: false, concentration: false });
    expect(spells.find(spell => spell.slug === "arme-elementaire")).toMatchObject({ school: "Transmutation", ritual: false, concentration: true });
    expect(spells.find(spell => spell.slug === "etat-cadaverique")).toMatchObject({ school: "Nécromancie", ritual: true, concentration: false });
  });

  it("référence 350 objets magiques, dont 258 fiches SRD et 92 liens externes", () => {
    const items = magicItemsData.items;
    expect(items).toHaveLength(350);
    expect(new Set(items.map(item => item.id)).size).toBe(350);
    expect(new Set(items.map(item => item.slug)).size).toBe(350);
    expect(items.filter(item => item.compendiumId)).toHaveLength(258);
    expect(items.filter(item => !item.compendiumId)).toHaveLength(92);
    for (const item of items) {
      expect(item.itemType, item.nameFr).not.toBe("");
      expect(item.rarities.length, item.nameFr).toBeGreaterThan(0);
      expect(referenceUrl("magic-item", item), item.nameFr).toBe(`https://www.aidedd.org/magic-item/fr/${item.slug}`);
      if (item.compendiumId) expect(compendiumEntries.find(entry => entry.id === item.compendiumId)?.type).toBe("magic-item");
    }
  });

  it("reconnaît et enrichit chaque nom anglais du catalogue sur une fiche", () => {
    const fragment = document.createDocumentFragment();
    for (const spell of spells) {
      const button = document.createElement("button");
      button.dataset.catalogSpell = spell.id;
      button.textContent = spell.nameEn;
      fragment.append(button);
    }
    document.body.append(fragment);
    enhanceSheet(document, { enabled: true, bilingual: true });

    for (const spell of spells) {
      const button = document.querySelector<HTMLElement>(`[data-catalog-spell="${spell.id}"]`)!;
      expect(button.textContent, spell.nameEn).toContain(spell.nameFr);
      if (spell.compendiumId) {
        expect(button.querySelector(`[data-dd55-open="${spell.compendiumId}"]`), spell.nameEn).not.toBeNull();
      } else {
        expect(button.querySelector<HTMLAnchorElement>("a")?.href, spell.nameEn).toBe(referenceUrl("spell", spell));
      }
    }
  }, 15_000);

  it("n’injecte pas de liens d’objets magiques dans l’inventaire Roll20", () => {
    document.body.innerHTML = `<button data-inventory-item>Amulet of Health</button>`;
    enhanceSheet(document, { enabled: true, bilingual: true });
    expect(document.querySelector("[data-inventory-item] .dd55-reference")).toBeNull();
  });

  it("dépasse le seuil MVP de 80 libellés d'interface", () => {
    expect(Object.keys(translations).length).toBeGreaterThanOrEqual(80);
  });
});
