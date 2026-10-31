import { JSDOM } from "jsdom";

const schools = new Set(["Abjuration", "Divination", "Enchantement", "Évocation", "Illusion", "Invocation", "Nécromancie", "Transmutation"]);
const featCategories = new Map([
  ["Don d'origines", "origin"], ["Don général", "general"], ["Don de Style de combat", "fighting-style"],
  ["Don de faveur épique", "epic-boon"], ["Don de dracogramme", "dragonmark"]
]);
const isPlaytest = source => /unearthed\s+arcana|^\s*UA\b/i.test(source);
export const normalizeCatalogName = value => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[’']/g, "").replace(/\s+/g, " ").trim().toLowerCase();

export function officialCatalogForm(html, kind) {
  const dom = new JSDOM(html);
  try {
    const form = dom.window.document.querySelector("form#filtres");
    if (!form) throw new Error("Formulaire de filtres AideDD absent.");
    const params = new URLSearchParams();
    for (const input of form.querySelectorAll("input[name]")) {
      if (["submit", "button"].includes(input.type)) continue;
      if (input.name === "source[]") {
        if (input.value.toLowerCase() === "ua" || isPlaytest(input.closest("label")?.textContent ?? "")) continue;
      } else if (input.type === "checkbox" && !input.checked && !input.name.startsWith("Filtre")) continue;
      params.append(input.name, input.value);
    }
    if (!params.getAll("source[]").length) throw new Error("Aucune source publiée proposée par AideDD.");
    params.set("filtrer", "FILTRER");
    if (kind === "spell") { params.set("nivMin", "0"); params.set("nivMax", "9"); }
    return params;
  } finally {
    dom.window.close();
  }
}

export function parseAideddCatalog(html, kind) {
  if (kind !== "spell" && kind !== "feat") throw new Error(`Catalogue non pris en charge : ${kind}`);
  const dom = new JSDOM(html, { url: `https://www.aidedd.org/${kind}/fr/` });
  try {
    const entries = [...dom.window.document.querySelectorAll("table tbody tr")].flatMap(row => {
      const link = row.querySelector(`.item a[href*='/${kind}/fr/']`);
      if (!link) return [];
      const source = (row.querySelector(".colS, .tagS")?.textContent ?? row.cells[row.cells.length - 1]?.textContent ?? "").trim().replace(/\s*\(BR\)$/, "");
      if (isPlaytest(source)) return [];
      const url = new URL(link.getAttribute("href"), dom.window.document.URL);
      const slug = url.pathname.split("/").at(-1);
      if (url.origin !== "https://www.aidedd.org" || url.pathname !== `/${kind}/fr/${slug}` || !/^[a-z0-9-]+$/.test(slug) || url.search || url.hash) {
        throw new Error(`Lien AideDD invalide : ${url.href}`);
      }
      const names = link.textContent.split("|").map(name => name.trim()).filter(Boolean);
      const nameFr = names.join(" / ");
      const nameEn = (row.querySelector(".colV") ?? row.cells[4])?.textContent.trim();
      if (!nameFr || !nameEn || !source) throw new Error(`Identité AideDD incomplète : ${slug}`);
      const entry = { nameFr, nameEn, slug, source, aliases: names.length > 1 ? names : [] };
      if (kind === "spell") {
        const levelText = row.cells[5]?.textContent.trim() ?? "";
        const level = Number(levelText);
        const school = (row.querySelector(".colE") ?? row.cells[6])?.textContent.trim();
        if (!/^[0-9]$/.test(levelText) || !schools.has(school)) throw new Error(`Métadonnées de sort invalides : ${slug}`);
        return [{ ...entry, level, school, concentration: Boolean((row.querySelector(".colC") ?? row.cells[11])?.textContent.trim()), ritual: Boolean((row.querySelector(".colR") ?? row.cells[12])?.textContent.trim()) }];
      }
      const category = featCategories.get(row.cells[5]?.textContent.trim());
      if (!category) throw new Error(`Catégorie de don inconnue : ${slug}`);
      return [{ ...entry, category }];
    });
    if (!entries.length) throw new Error("Catalogue AideDD vide : import interrompu.");
    if (new Set(entries.map(item => item.slug)).size !== entries.length) throw new Error("Liens AideDD dupliqués.");
    return entries;
  } finally {
    dom.window.close();
  }
}

export async function fetchOfficialCatalog(kind, fetcher = globalThis.fetch) {
  if (kind !== "spell" && kind !== "feat") throw new Error(`Catalogue non pris en charge : ${kind}`);
  const url = `https://www.aidedd.org/${kind}/fr/`;
  const headers = { "user-agent": "Mozilla/5.0 Compagnon-DD55-FR catalogue importer" };
  const initial = await fetcher(url, { headers, signal: AbortSignal.timeout(30_000) });
  if (!initial.ok) throw new Error(`AideDD a répondu ${initial.status}`);
  const body = officialCatalogForm(await initial.text(), kind);
  const response = await fetcher(url, { method: "POST", headers, body, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`AideDD a répondu ${response.status}`);
  return parseAideddCatalog(await response.text(), kind);
}

export function mergeAideddCatalog(current, extracted) {
  const bySlug = new Map(current.map(item => [item.slug, item]));
  const byName = new Map(current.map(item => [normalizeCatalogName(item.nameEn), item]));
  const retained = new Set();
  const merged = extracted.filter(item => !isPlaytest(item.source)).map(item => {
    const previous = bySlug.get(item.slug) ?? byName.get(normalizeCatalogName(item.nameEn));
    if (previous) retained.add(previous.id);
    if (previous && normalizeCatalogName(previous.nameEn) !== normalizeCatalogName(item.nameEn)) throw new Error(`Identité modifiée pour ${item.slug}.`);
    if (previous?.level !== undefined && previous.level !== item.level) throw new Error(`Niveau modifié pour ${item.nameEn}.`);
    const id = previous?.id ?? normalizeCatalogName(item.nameEn).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!id) throw new Error(`Identifiant AideDD vide pour ${item.nameEn}.`);
    const aliases = [...new Set([...(previous?.aliases ?? []), ...(item.aliases ?? []), ...(previous?.nameFr && previous.nameFr !== item.nameFr ? [previous.nameFr] : [])])].filter(alias => alias !== item.nameFr);
    return { ...previous, ...item, id, aliases: aliases.length ? aliases : undefined, source: previous?.compendiumId ? previous.source : item.source };
  });
  const missing = current.filter(item => !isPlaytest(item.source) && !retained.has(item.id));
  if (missing.length) throw new Error(`Références existantes absentes : ${missing.map(item => item.nameEn).join(", ")}`);
  if (new Set(merged.map(item => item.id)).size !== merged.length || new Set(merged.map(item => item.slug)).size !== merged.length) throw new Error("Identifiants ou liens AideDD dupliqués après fusion.");
  return merged;
}
