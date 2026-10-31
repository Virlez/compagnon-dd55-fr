import fs from "node:fs";
import path from "node:path";
import { fetchOfficialCatalog, mergeAideddCatalog } from "./lib/aidedd-catalog.mjs";

const projectRoot = path.resolve(import.meta.dirname, "..");
const targetPath = path.resolve(projectRoot, process.argv[2] ?? "src/data/aidedd-spells.json");
const current = JSON.parse(fs.readFileSync(targetPath, "utf8"));
const local = JSON.parse(fs.readFileSync(path.join(projectRoot, "src/data/srd-compendium.json"), "utf8"));
const localById = new Map(local.entries.filter(entry => entry.type === "spell").map(entry => [entry.id, entry]));
const merged = mergeAideddCatalog(current, await fetchOfficialCatalog("spell"));
const resolved = merged.map(item => {
  if (!item.compendiumId) return item;
  const entry = localById.get(item.compendiumId);
  if (!entry) throw new Error(`Fiche SRD absente pour ${item.slug}.`);
  return { ...item, school: entry.meta["École"], ritual: /rituel/i.test(entry.meta.Incantation ?? ""), concentration: /concentration/i.test(entry.meta["Durée"] ?? "") };
});
fs.writeFileSync(targetPath, `${JSON.stringify(resolved, null, 2)}\n`, "utf8");
console.log(`${resolved.length} sorts importés, toutes sources publiées, sans Unearthed Arcana (${resolved.filter(item => item.compendiumId).length} fiches SRD).`);
