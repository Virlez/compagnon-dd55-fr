import { describe, expect, it, vi } from "vitest";
import { fetchOfficialCatalog, mergeAideddCatalog, officialCatalogForm, parseAideddCatalog } from "../scripts/lib/aidedd-catalog.mjs";

const form = `<form id="filtres">
  <label><input type="checkbox" name="source[]" value="phb" checked>Player's Handbook</label>
  <label><input type="checkbox" name="source[]" value="au">Arcana Unleashed</label>
  <label><input type="checkbox" name="source[]" value="hof">Forgotten Realms</label>
  <label><input type="checkbox" name="source[]" value="efa">Eberron</label>
  <label><input type="checkbox" name="source[]" value="rhw">Ravenloft</label>
  <label><input type="checkbox" name="source[]" value="ua" checked>Unearthed Arcana</label>
  <input type="checkbox" name="Filtre1[]" value="Don de dracogramme">
  <input type="hidden" name="nivMin"><input type="hidden" name="nivMax">
  <input type="submit" name="filtrer" value="FILTRER">
</form>`;
const table = (rows: string[]) => `<table><tbody>${rows.join("")}</tbody></table>`;
type SpellRowOptions = { source?: string; nameEn?: string; nameFr?: string; slug?: string; level?: string; school?: string; href?: string };
function spellRow({ source = "Arcana Unleashed", nameEn = "Example Spell", nameFr = "Sort exemple", slug = "sort-exemple", level = "2", school = "Abjuration", href = `/spell/fr/${slug}` }: SpellRowOptions = {}) {
  return `<tr>${["", `<a href="${href}">${nameFr}</a>`, "", "", nameEn, level, school, "Action", "9 m", "1 minute", "V,S", "Concentration", "Rituel", "Résumé non importé", `<span class="tagS">${source}</span>`]
    .map((cell, index) => `<td${index === 1 ? ' class="item"' : ""}>${cell}</td>`).join("")}</tr>`;
}
function featRow(category = "Don de dracogramme", source = "Eberron: Forge of the Artificer") {
  return `<tr>${["", '<a href="/feat/fr/don-exemple">Don exemple</a>', "", "", "Example Feat", category, "Prérequis non importé", "", "Résumé non importé", `<span class="tagS">${source}</span>`]
    .map((cell, index) => `<td${index === 1 ? ' class="item"' : ""}>${cell}</td>`).join("")}</tr>`;
}

describe("import des catalogues AideDD publiés", () => {
  it("sélectionne toutes les sources publiées et les catégories normalement décochées, sans UA", () => {
    const body = officialCatalogForm(form, "spell");
    expect(body.getAll("source[]")).toEqual(["phb", "au", "hof", "efa", "rhw"]);
    expect(body.getAll("Filtre1[]")).toEqual(["Don de dracogramme"]);
    expect(body.get("nivMin")).toBe("0");
    expect(body.get("nivMax")).toBe("9");
    expect(body.get("filtrer")).toBe("FILTRER");
    expect(() => officialCatalogForm("<html></html>", "feat")).toThrow("Formulaire");
  });

  it("lit les colonnes du catalogue actuel et exclut aussi les lignes UA renvoyées par le serveur", () => {
    const entries = parseAideddCatalog(table([spellRow({ nameFr: "Nom|Autre nom" }), spellRow({ source: "Unearthed Arcana", slug: "ua-exemple" })]), "spell");
    expect(entries).toEqual([{
      nameFr: "Nom / Autre nom", nameEn: "Example Spell", slug: "sort-exemple", aliases: ["Nom", "Autre nom"],
      source: "Arcana Unleashed", level: 2, school: "Abjuration", ritual: true, concentration: true
    }]);
  });

  it.each([
    ["Don d'origines", "origin"], ["Don général", "general"], ["Don de Style de combat", "fighting-style"],
    ["Don de faveur épique", "epic-boon"], ["Don de dracogramme", "dragonmark"]
  ])("importe la catégorie %s et normalise la source BR", (category, expected) => {
    const [entry] = parseAideddCatalog(table([featRow(category, "Player's Handbook 2024 (BR)")]), "feat");
    expect(entry).toEqual({ nameFr: "Don exemple", nameEn: "Example Feat", slug: "don-exemple", aliases: [], source: "Player's Handbook 2024", category: expected });
  });

  it.each([
    { href: "https://evil.test/spell/fr/sort-exemple" }, { href: "/spell/fr/exemple?redirect=evil" },
    { school: "Unknown" }, { level: "10" }, { nameEn: "" }
  ])("interrompt l’import plutôt que conserver une ligne de sort invalide : %j", change => {
    expect(() => parseAideddCatalog(table([spellRow(change)]), "spell")).toThrow();
  });

  it("refuse un catalogue vide, une catégorie inconnue et des liens dupliqués", () => {
    expect(() => parseAideddCatalog(table([]), "spell")).toThrow("vide");
    expect(() => parseAideddCatalog(table([featRow("Unknown")]), "feat")).toThrow("Catégorie");
    expect(() => parseAideddCatalog(table([spellRow(), spellRow()]), "spell")).toThrow("dupliqués");
    expect(() => parseAideddCatalog(table([spellRow({ level: "" })]), "spell")).toThrow("Métadonnées");
  });

  it("charge le formulaire avant d’envoyer les filtres publiés", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(form)).mockResolvedValueOnce(new Response(table([featRow()])));
    expect(await fetchOfficialCatalog("feat", fetcher)).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
    const [url, options] = fetcher.mock.calls[1];
    expect(url).toBe("https://www.aidedd.org/feat/fr/");
    expect(options?.method).toBe("POST");
    expect((options?.body as URLSearchParams).getAll("source[]")).toEqual(["phb", "au", "hof", "efa", "rhw"]);
  });

  it("interrompt l’import en cas d’échec HTTP", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("Unavailable", { status: 503 }));
    await expect(fetchOfficialCatalog("spell", fetcher)).rejects.toThrow("503");
  });

  it("conserve les identifiants, les anciennes traductions et les liens SRD lors d’un renommage", () => {
    const previous = { id: "legacy-id", nameEn: "Example Spell", nameFr: "Ancienne traduction", slug: "ancien-lien", aliases: ["Ancien alias"], compendiumId: "spell-exemple", source: "SRD 5.2.1", level: 2 };
    const updated = mergeAideddCatalog([previous], parseAideddCatalog(table([spellRow()]), "spell"));
    expect(updated[0]).toMatchObject({ id: "legacy-id", slug: "sort-exemple", nameFr: "Sort exemple", compendiumId: "spell-exemple", source: "SRD 5.2.1", aliases: ["Ancien alias", "Ancienne traduction"] });
    expect(mergeAideddCatalog(updated, parseAideddCatalog(table([spellRow()]), "spell"))).toEqual(updated);
  });

  it("refuse la perte silencieuse d’une référence et un changement de niveau", () => {
    const [entry] = parseAideddCatalog(table([spellRow()]), "spell");
    const previous = { ...entry, id: "old-id" };
    expect(() => mergeAideddCatalog([previous], [])).toThrow("absentes");
    expect(() => mergeAideddCatalog([previous], [{ ...entry, level: 3 }])).toThrow("Niveau");
    expect(() => mergeAideddCatalog([previous], [{ ...entry, nameEn: "Another Spell" }])).toThrow("Identité");
  });

  it("ne réintroduit pas de données UA et refuse les collisions d’identifiants", () => {
    const [entry] = parseAideddCatalog(table([spellRow()]), "spell");
    expect(mergeAideddCatalog([], [{ ...entry, source: "Unearthed Arcana" }])).toEqual([]);
    expect(mergeAideddCatalog([], [{ ...entry, source: "UA Psion" }])).toEqual([]);
    expect(() => mergeAideddCatalog([], [entry, { ...entry, slug: "autre-url" }])).toThrow("dupliqués");
    expect(() => mergeAideddCatalog([], [{ ...entry, nameEn: "???" }])).toThrow("Identifiant");
  });
});
