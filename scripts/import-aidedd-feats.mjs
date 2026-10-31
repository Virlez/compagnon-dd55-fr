import fs from "node:fs";
import path from "node:path";
import { fetchOfficialCatalog, mergeAideddCatalog, normalizeCatalogName } from "./lib/aidedd-catalog.mjs";

const projectRoot = path.resolve(import.meta.dirname, "..");
const targetPath = path.resolve(projectRoot, process.argv[2] ?? "src/data/aidedd-feats.json");
const current = JSON.parse(fs.readFileSync(targetPath, "utf8"));
const localFeats = JSON.parse(fs.readFileSync(path.join(projectRoot, "src/data/srd-compendium.json"), "utf8")).entries.filter(entry => entry.type === "feat");
const localByName = new Map(localFeats.map(entry => [normalizeCatalogName(entry.title), entry]));
const entries = mergeAideddCatalog(current, await fetchOfficialCatalog("feat")).map(item => {
  const local = item.compendiumId ? localFeats.find(entry => entry.id === item.compendiumId)
    : [item.nameFr, ...(item.aliases ?? [])].map(normalizeCatalogName).map(name => localByName.get(name)).find(Boolean);
  if (item.compendiumId && !local) throw new Error(`Fiche DRS absente pour ${item.nameEn}.`);
  return local ? { ...item, compendiumId: local.id } : item;
});
fs.writeFileSync(targetPath, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
console.log(`${entries.length} dons importés, toutes sources publiées, sans Unearthed Arcana.`);
