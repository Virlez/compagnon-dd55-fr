import { translations } from "../data/translations";
import { feats, spells } from "../data/references";
import { normalizeName, referenceUrl } from "../services/reference-matcher";
import { compendiumEntries, findCompendiumEntry, type CompendiumEntry, type CompendiumSection } from "../services/srd-compendium";
import type { Preferences, Reference } from "../types";

const SKIP_SELECTOR = "#dd55-companion, #dd55-launcher, script, style, textarea, input, [contenteditable='true'], .dd55-reference, .dd55-content-translation";
const restrictReferenceContexts = true;
const originalText = new WeakMap<Text, string>();
const translatedTextNodes = new WeakSet<Text>();
const translationLookup = new Map(Object.entries(translations).map(([english, french]) => [english.toLocaleLowerCase("en"), french]));
const featureAliases: Record<string, string> = {
  "weapon mastery": "Bottes d’arme", "spellcasting": "Sorts", "favored enemy": "Ennemi juré",
  "fighting style": "Style de combat", "extra attack": "Attaque supplémentaire", "sneak attack": "Attaque sournoise",
  "cunning action": "Ruse", "second wind": "Second souffle", "action surge": "Fougue", "indomitable": "Inflexible",
  "unarmored defense": "Défense sans armure", "danger sense": "Sens du danger", "reckless attack": "Témérité",
  "font of inspiration": "Source d’inspiration", "jack of all trades": "Touche-à-tout", "channel divinity": "Conduit divin",
  "wild shape": "Forme sauvage", "metamagic": "Métamagie", "sorcery points": "Réserve arcanique",
  "arcane recovery": "Restauration magique", "martial arts": "Arts martiaux", "focus points": "Credo du Moine",
  "lay on hands": "Imposition des mains", "divine smite": "Châtiment de paladin", "hunter's mark": "Ennemi juré",
  "ability score improvement": "Amélioration de caractéristique",
  "draconic ancestry": "Ascendance draconique", "damage resistance": "Résistance aux dégâts", "breath weapon": "Souffle", "draconic flight": "Vol draconique",
  "fey ancestry": "Ascendance féerique", "elven lineage": "Lignage elfique", "keen senses": "Sens aiguisés", trance: "Transe",
  "gnomish lineage": "Lignage gnome", "gnomish cunning": "Ruse gnome",
  "giant ancestry": "Ascendance gigante", "large form": "Forme de géant", "powerful build": "Forte carrure",
  "halfling nimbleness": "Agilité halfeline", brave: "Brave", luck: "Chance", "naturally stealthy": "Discrétion naturelle",
  skillful: "Compétent", resourceful: "Ingénieux", versatile: "Polyvalent",
  stonecunning: "Connaissance de la pierre", "dwarven resilience": "Résistance naine", "dwarven toughness": "Ténacité naine",
  "relentless endurance": "Acharnement", "adrenaline rush": "Poussée d’adrénaline",
  "fiendish legacy": "Héritage fiélon", "otherworldly presence": "Présence d’outre-monde",
  "celestial resistance": "Résistance céleste", "healing hands": "Mains guérisseuses", "light bearer": "Porteur de lumière",
  "celestial revelation": "Révélation céleste", "heavenly wings": "Ailes célestes", "inner radiance": "Rayonnement intérieur", "necrotic shroud": "Voile nécrotique"
};
const classAliases: Record<string, string> = {
  barbarian: "Barbare", bard: "Barde", cleric: "Clerc", druid: "Druide", fighter: "Guerrier", monk: "Moine",
  paladin: "Paladin", ranger: "Rôdeur", rogue: "Roublard", sorcerer: "Ensorceleur", warlock: "Occultiste", wizard: "Magicien"
};
const speciesAliases: Record<string, string> = {
  aasimar: "Aasimar", dragonborn: "Drakéide", elf: "Elfe", gnome: "Gnome", goliath: "Goliath", halfling: "Halfelin",
  human: "Humain", dwarf: "Nain", orc: "Orc", tiefling: "Tieffelin"
};
const weaponMasteryAliases: Record<string, string> = {
  nick: "Coup double",
  graze: "Écorchure",
  cleave: "Enchaînement",
  vex: "Ouverture",
  push: "Poussée",
  slow: "Ralentissement",
  topple: "Renversement",
  sap: "Sape"
};
const referenceNameLookup = new Map([...spells, ...feats].map(reference => [normalizeName(reference.nameEn), reference.nameFr]));
const classContextCache = new WeakMap<Document, string>();
const speciesContextCache = new WeakMap<Document, string>();
let referenceContextCache = new WeakMap<HTMLElement, boolean>();
let referenceFreeContextCache = new WeakMap<HTMLElement, boolean>();
let characterSummaryContextCache = new WeakMap<HTMLElement, boolean>();
const delegatedReferenceDocuments = new WeakSet<Document>();

function markReferenceHost(element: HTMLElement, entryId?: string, externalUrl?: string): void {
  element.classList.add("dd55-reference-host");
  if (entryId) element.dataset.dd55LinkEntry = entryId;
  else delete element.dataset.dd55LinkEntry;
  if (externalUrl) element.dataset.dd55LinkExternal = externalUrl;
  else delete element.dataset.dd55LinkExternal;
  element.title ||= entryId ? "Ouvrir dans le compendium français" : "Ouvrir la référence AideDD";
}

function unmarkReferenceHost(element: HTMLElement): void {
  element.classList.remove("dd55-reference-host");
  delete element.dataset.dd55LinkEntry;
  delete element.dataset.dd55LinkExternal;
}

function openCompendiumEntry(owner: Document, entryId: string): void {
  // Sur une fiche intégrée ou détachée, le panneau appartient au même document :
  // l’ouverture directe évite un aller-retour fragile par le service worker.
  if (owner.querySelector("#dd55-companion")) {
    owner.dispatchEvent(new CustomEvent("dd55:open-entry", { detail: entryId }));
    return;
  }
  // Une fiche rendue dans une iframe délègue encore l’ouverture au cadre principal.
  if (typeof chrome !== "undefined" && chrome.runtime?.id) {
    void chrome.runtime.sendMessage({ type: "DD55_OPEN_COMPENDIUM", entryId });
    return;
  }
  owner.dispatchEvent(new CustomEvent("dd55:open-entry", { detail: entryId }));
}

function ensureDelegatedReferenceClicks(owner: Document): void {
  if (delegatedReferenceDocuments.has(owner)) return;
  delegatedReferenceDocuments.add(owner);
  owner.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target || target.closest(".dd55-reference")) return;
    const host = target.closest<HTMLElement>(".dd55-reference-host");
    if (!host) return;
    const bounds = host.getBoundingClientRect();
    if (event.clientX < bounds.right - 30) return;
    const entryId = host.dataset.dd55LinkEntry;
    const externalUrl = host.dataset.dd55LinkExternal;
    if (!entryId && !externalUrl) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (entryId) {
      openCompendiumEntry(owner, entryId);
    } else if (externalUrl) {
      if (typeof chrome !== "undefined" && chrome.runtime?.id) void chrome.runtime.sendMessage({ type: "DD55_OPEN_EXTERNAL", url: externalUrl });
      else window.open(externalUrl, "_blank", "noopener,noreferrer");
    }
  }, true);
}

function isHitPointControl(element: HTMLElement): boolean {
  if (element.closest("[data-testid*='hit-point' i], [aria-label*='hit point' i], [class*='hit-point' i], [class*='hit_points' i], [data-testid*='health' i]")) return true;
  const visited: HTMLElement[] = [];
  let ancestor: HTMLElement | null = element;
  for (let depth = 0; ancestor && depth < 7; depth++, ancestor = ancestor.parentElement) {
    const cached = referenceContextCache.get(ancestor);
    if (cached !== undefined) {
      visited.forEach(item => referenceContextCache.set(item, cached));
      return cached;
    }
    visited.push(ancestor);
    const rawText = ancestor.textContent ?? "";
    if (rawText.length > 1400) continue;
    const text = normalizeName(rawText);
    if (text.length > 700) continue;
    const hasHeading = text.includes("hit points") || text.includes("points de vie");
    const controlMarkers = ["current", "actuels", "maximum", "temporary", "temporaire", "damage", "degats", "heal", "soigner"];
    if (hasHeading && controlMarkers.filter(marker => text.includes(marker)).length >= 2) {
      visited.forEach(item => referenceContextCache.set(item, true));
      return true;
    }
  }
  visited.forEach(item => referenceContextCache.set(item, false));
  return false;
}

const referenceFreeHeadings = new Set([
  "sense", "senses", "sens",
  "proficiencies & languages", "proficiencies and languages",
  "maitrises & langues", "maitrises et langues"
]);

function isCharacterSummaryContext(element: HTMLElement): boolean {
  if (element.closest("[data-testid*='character-summary' i], [aria-label*='character-summary' i], [class*='character-summary' i], [data-testid*='character-header' i], [class*='character-header' i]")) return true;
  const visited: HTMLElement[] = [];
  let ancestor: HTMLElement | null = element;
  for (let depth = 0; ancestor && depth < 7; depth++, ancestor = ancestor.parentElement) {
    if (ancestor === element.ownerDocument.body || ancestor === element.ownerDocument.documentElement) break;
    const cached = characterSummaryContextCache.get(ancestor);
    if (cached !== undefined) {
      visited.forEach(item => characterSummaryContextCache.set(item, cached));
      return cached;
    }
    visited.push(ancestor);
    const rawText = ancestor.textContent ?? "";
    if (rawText.length > 1800) continue;
    const text = normalizeName(rawText);
    if (text.length > 900) continue;
    const markers = ["inspiration", "initiative", "exp", "experience", "bonus de maitrise", "proficiency bonus"];
    if (markers.filter(marker => text.includes(marker)).length >= 3) {
      visited.forEach(item => characterSummaryContextCache.set(item, true));
      return true;
    }
  }
  visited.forEach(item => characterSummaryContextCache.set(item, false));
  return false;
}

function isExcludedReferenceContext(element: HTMLElement): boolean {
  return isHitPointControl(element) || isCharacterSummaryContext(element) || isReferenceFreeContext(element);
}

function skipReference(element: HTMLElement): boolean {
  return Boolean(element.closest(SKIP_SELECTOR)) || (restrictReferenceContexts && isExcludedReferenceContext(element));
}

function panelHeading(container: HTMLElement): string | undefined {
  // Un titre de panneau doit être un enfant direct. Parcourir récursivement
  // capturait les titres des colonnes voisines dans la grille globale Roll20.
  const candidates = [...container.children].slice(0, 7) as HTMLElement[];
  for (const candidate of candidates) {
    const directText = [...candidate.childNodes]
      .filter(node => node.nodeType === Node.TEXT_NODE)
      .map(node => node.textContent ?? "").join(" ").trim();
    const normalized = normalizeName(directText || (candidate.childElementCount === 0 ? candidate.textContent ?? "" : ""));
    if (referenceFreeHeadings.has(normalized)) return normalized;
  }
  return undefined;
}

function isInventoryItemRow(container: HTMLElement): boolean {
  if (container.querySelectorAll("button, [role='button']").length < 2) return false;
  const text = normalizeName(container.textContent ?? "");
  const carriedState = ["possession", "carried", "equipped", "stored"].some(label => text.includes(label));
  const hasWeight = /\b(?:lb|lbs|kg)\b/.test(text);
  return carriedState || hasWeight;
}

function isInventoryContext(element: HTMLElement): boolean {
  const row = element.closest<HTMLElement>("[role='row'], [data-testid*='item' i], [class*='item-row' i]");
  if (row && isInventoryItemRow(row)) return true;
  let ancestor: HTMLElement | null = element;
  for (let depth = 0; ancestor && depth < 18; depth++, ancestor = ancestor.parentElement) {
    if (ancestor === element.ownerDocument.body || ancestor === element.ownerDocument.documentElement) break;
    if (ancestor.matches("[data-testid*='inventory' i], [aria-label*='inventory' i], [class*='inventory' i], [data-testid*='equipment' i], [aria-label*='equipment' i], [class*='equipment' i]")) return true;
    const heading = panelHeading(ancestor);
    if (heading && ["equipment", "inventory", "equipement", "inventaire"].includes(heading)) return true;
    if (isInventoryItemRow(ancestor)) return true;
    const rawText = ancestor.textContent ?? "";
    if (rawText.length > 1800) continue;
    const text = normalizeName(rawText);
    if (text.length > 900) continue;
    const inventoryLabel = /(?:^| )(?:inventory|inventaire|equipment|equipement)(?: |$)/.test(text);
    const itemControls = ancestor.querySelectorAll("button").length >= 2 || /(?:^| )(?:lbs?|kg|poids|quantity|quantite)(?: |$)/.test(text);
    const carriedState = /(?:^| )(?:possession|carried|equipped|stored)(?: |$)/.test(text);
    const weightedItem = /(?:^| )(?:lbs?|kg)(?: |$)/.test(text);
    if (itemControls && (inventoryLabel || carriedState || weightedItem)) return true;
  }
  return false;
}

function isEquipmentPropertyContext(element: HTMLElement): boolean {
  if (isInventoryContext(element)) return true;
  const markers = ["melee weapon", "ranged weapon", "gear", "proficient", "ammunition", "loading", "finesse", "thrown", "simple", "martial", "studded leather", "armor"];
  let ancestor: HTMLElement | null = element.parentElement;
  for (let depth = 0; ancestor && depth < 8; depth++, ancestor = ancestor.parentElement) {
    if (ancestor === element.ownerDocument.body || ancestor === element.ownerDocument.documentElement) break;
    const rawText = ancestor.textContent ?? "";
    if (rawText.length > 2400) continue;
    const text = normalizeName(rawText);
    if (text.length > 1200) continue;
    if (markers.filter(marker => text.includes(marker)).length >= 2) return true;
  }
  return false;
}

function isReferenceFreeContext(element: HTMLElement): boolean {
  const visited: HTMLElement[] = [];
  let ancestor: HTMLElement | null = element;
  for (let depth = 0; ancestor && depth < 7; depth++, ancestor = ancestor.parentElement) {
    if (ancestor === element.ownerDocument.body || ancestor === element.ownerDocument.documentElement) break;
    const cached = referenceFreeContextCache.get(ancestor);
    if (cached !== undefined) {
      visited.forEach(item => referenceFreeContextCache.set(item, cached));
      return cached;
    }
    visited.push(ancestor);
    if (ancestor.matches([
      "[data-testid*='sense' i]", "[aria-label*='sense' i]", "[class*='sense' i]",
      "[data-testid*='proficien' i]", "[aria-label*='proficien' i]", "[class*='proficien' i]",
      "[data-testid*='language' i]", "[aria-label*='language' i]", "[class*='language' i]"
    ].join(","))) {
      visited.forEach(item => referenceFreeContextCache.set(item, true));
      return true;
    }
    const text = ancestor.textContent ?? "";
    if (text.length > 1200) continue;
    const semanticHeading = ancestor.matches("h1, h2, [role='heading']")
      ? ancestor
      : ancestor.querySelector<HTMLElement>("h1, h2, [role='heading']");
    if (semanticHeading) {
      const referenceFree = referenceFreeHeadings.has(normalizeName(semanticHeading.textContent ?? ""));
      visited.forEach(item => referenceFreeContextCache.set(item, referenceFree));
      return referenceFree;
    }
    if (panelHeading(ancestor)) {
      visited.forEach(item => referenceFreeContextCache.set(item, true));
      return true;
    }
  }
  visited.forEach(item => referenceFreeContextCache.set(item, false));
  return false;
}

interface IndexedReference {
  item: Reference;
  kind: "spell" | "feat";
}

const referenceIndex = new Map<string, IndexedReference>();
for (const indexed of [
  ...spells.map(item => ({ item, kind: "spell" as const })),
  ...feats.map(item => ({ item, kind: "feat" as const }))
]) {
  for (const name of [indexed.item.nameEn, indexed.item.nameFr, ...(indexed.item.aliases ?? [])]) {
    referenceIndex.set(normalizeName(name), indexed);
  }
}

interface ClassFeatureMatch {
  entry: CompendiumEntry;
  title: string;
}

function translateDynamicLabel(value: string): string | undefined {
  let masteryMatch = value.match(/^(?:(?:Weapon\s+)?Mastery(?:\s+Property)?\s*:\s*)(Nick|Graze|Cleave|Vex|Push|Slow|Topple|Sap)$/i);
  if (masteryMatch) return `Botte d’arme : ${weaponMasteryAliases[masteryMatch[1].toLocaleLowerCase("en")]}`;
  let match = value.match(/^([+-]?\d+)\s+Attack$/i);
  if (match) return `${match[1]} Attaque`;
  match = value.match(/^(\d+(?:\/\d+)?)\s*ft\.?$/i);
  if (match) return `${match[1]} pi`;
  match = value.match(/^Level\s+(\d+)(\+)?$/i);
  if (match) return `Niveau ${match[1]}${match[2] ?? ""}`;
  match = value.match(/^Level\s+(\d+)\s+Feat$/i);
  if (match) return `Don de niveau ${match[1]}`;
  match = value.match(/^New Item\s*\(Attack\s*(\d+)\)$/i);
  if (match) return `Nouvel objet (Attaque ${match[1]})`;
  match = value.match(/^Prerequisite:\s*(.+)$/i);
  if (match) {
    const prerequisite = match[1]
      .replace(/Fighting Style Feature/gi, "don Style de combat")
      .replace(/Level\s+(\d+)/gi, "niveau $1")
      .replace(/Strength/gi, "Force").replace(/Dexterity/gi, "Dextérité")
      .replace(/Wisdom/gi, "Sagesse").replace(/Charisma/gi, "Charisme");
    return `Prérequis : ${prerequisite}`;
  }
  return undefined;
}

function isWeaponMasteryContext(element: HTMLElement): boolean {
  if (element.matches("[data-testid*='mastery' i], [aria-label*='mastery' i], [class*='mastery' i]")) return true;
  let ancestor: HTMLElement | null = element.parentElement;
  for (let depth = 0; ancestor && depth < 4; depth++, ancestor = ancestor.parentElement) {
    if (ancestor.matches("[data-testid*='mastery' i], [aria-label*='mastery' i], [class*='mastery' i]")) return true;
    const rawText = ancestor.textContent ?? "";
    if (rawText.length > 1000) continue;
    const context = normalizeName(rawText);
    if (context.length > 500) continue;
    if (/(?:weapon )?mastery(?: property)?/.test(context)) return true;
  }
  return false;
}

function translateWeaponMastery(value: string, element: HTMLElement): string | undefined {
  const translated = weaponMasteryAliases[normalizeName(value)];
  return translated && isWeaponMasteryContext(element) ? translated : undefined;
}

const equipmentPropertyAliases: Record<string, string> = {
  light: "Légère", heavy: "Lourde", finesse: "Finesse", thrown: "Lancer", ammunition: "Munitions",
  loading: "Chargement", "two handed": "Deux mains", "two-handed": "Deux mains", versatile: "Polyvalente", reach: "Allonge", range: "Portée"
};

function translateEquipmentLabel(value: string, element: HTMLElement): string | undefined {
  const normalized = normalizeName(value);
  const translated = equipmentPropertyAliases[normalized];
  if (!translated || element.matches("h1, h2, h3, h4, [data-testid*='name' i], [class*='name' i]")) return undefined;
  return isEquipmentPropertyContext(element) ? translated : undefined;
}

export function isDnd2024Sheet(root: ParentNode = document): boolean {
  const explicit = root.querySelector("[data-sheet-type*='dnd2024' i], [data-character-sheet*='2024' i], .dnd2024, .sheet-2024, [aria-label*='D&D 2024' i]");
  if (explicit) return true;
  const text = root instanceof Element ? root.textContent ?? "" : document.body?.textContent ?? "";
  if (/D&D\s*(?:5e\s*)?2024|Dungeons\s*&\s*Dragons\s*2024/i.test(text)) return true;
  const signature = ["ABILITIES", "AC/SPEED", "FEATURES & TRAITS", "CLASS FEATURES", "CONDITION IMMUNITIES", "PROFICIENCY BONUS"];
  const upperText = text.toLocaleUpperCase("en");
  return signature.filter(marker => upperText.includes(marker)).length >= 3;
}

function translatedLabel(value: string, element: HTMLElement): string | undefined {
  const normalized = normalizeName(value);
  const contextual = translateWeaponMastery(value, element) ?? translateEquipmentLabel(value, element);
  if (contextual) return contextual;
  const referenceName = referenceNameLookup.get(normalized);
  const interfaceTranslation = translations[value] ?? translationLookup.get(value.toLocaleLowerCase("en"));
  if (referenceName && (!interfaceTranslation || !isHitPointControl(element))) return referenceName;
  return interfaceTranslation ?? referenceName
    ?? featureAliases[normalized] ?? classAliases[normalized] ?? speciesAliases[normalized] ?? translateDynamicLabel(value);
}

export function translateSheet(root: ParentNode, enabled: boolean): void {
  const owner = root instanceof Document ? root : root.ownerDocument ?? document;
  const walker = owner.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(candidate) {
      const element = candidate.parentElement;
      if (!element || element.closest(SKIP_SELECTOR)) return NodeFilter.FILTER_REJECT;
      return candidate.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  nodes.forEach((node) => {
    const element = node.parentElement;
    if (!element) return;
    const remembered = originalText.get(node);
    if (remembered) {
      const rememberedTrimmed = remembered.trim();
      const currentTrimmed = node.data.trim();
      const expectedTranslation = translatedLabel(rememberedTrimmed, element);
      if (currentTrimmed !== rememberedTrimmed && currentTrimmed !== expectedTranslation) originalText.set(node, node.data);
    }
    if (!originalText.has(node)) originalText.set(node, node.data);
    const original = originalText.get(node)!;
    const trimmed = original.trim();
    const translated = translatedLabel(trimmed, element);
    if (translated && enabled) {
      const nextText = original.replace(trimmed, translated);
      if (node.data !== nextText) node.data = nextText;
      translatedTextNodes.add(node);
      element.title ||= trimmed;
      element.dataset.dd55Translated = "true";
    } else if (!enabled && translatedTextNodes.has(node)) {
      if (node.data !== original) node.data = original;
      translatedTextNodes.delete(node);
    }
  });
  if (!enabled) {
    root.querySelectorAll<HTMLElement>("[data-dd55-translated]").forEach(element => delete element.dataset.dd55Translated);
    if (root instanceof HTMLElement) delete root.dataset.dd55Translated;
  }
}

function featureTitle(section: CompendiumSection): string {
  return section.heading?.replace(/^Niveau\s+[\d et]+\s*·\s*/i, "").trim() ?? "";
}

const featureIndex = new Map<string, ClassFeatureMatch[]>();
for (const entry of compendiumEntries) {
  if (entry.type !== "class" && entry.type !== "subclass" && entry.type !== "species") continue;
  for (const section of entry.sections) {
    const title = featureTitle(section);
    if (!title) continue;
    const key = normalizeName(title);
    featureIndex.set(key, [...(featureIndex.get(key) ?? []), { entry, title }]);
  }
}

function detectableTextParts(root: ParentNode, limit = 120): string[] {
  const owner = root instanceof Document ? root : root.ownerDocument ?? document;
  const walker = owner.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const parts: string[] = [];
  while (parts.length < limit && walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (!node.parentElement?.closest(SKIP_SELECTOR) && node.data.trim()) parts.push(node.data.trim());
  }
  return parts;
}

function detectedClass(root: ParentNode): string | undefined {
  const parts = detectableTextParts(root).map(normalizeName);
  const found = Object.entries(classAliases).find(([english, french]) => parts.some(part =>
    part === english || part === normalizeName(french) || new RegExp(`^${english}\\s+\\d+(?:\\s|$)`, "i").test(part) || new RegExp(`^${normalizeName(french)}\\s+\\d+(?:\\s|$)`, "i").test(part)
  ))?.[1];
  const owner = root instanceof Document ? root : root.ownerDocument;
  if (found && owner) classContextCache.set(owner, found);
  return found ?? (owner ? classContextCache.get(owner) : undefined);
}

function detectedSpecies(root: ParentNode): string | undefined {
  const parts = detectableTextParts(root).map(normalizeName);
  const found = Object.entries(speciesAliases).find(([english, french]) => parts.some(part => part === english || part === normalizeName(french)))?.[1];
  const owner = root instanceof Document ? root : root.ownerDocument;
  if (found && owner) speciesContextCache.set(owner, found);
  return found ?? (owner ? speciesContextCache.get(owner) : undefined);
}

function findClassFeature(value: string, className?: string, speciesName?: string): ClassFeatureMatch | undefined {
  const normalizedEnglish = normalizeName(value);
  const french = featureAliases[normalizedEnglish] ?? translations[value] ?? translationLookup.get(value.toLocaleLowerCase("en")) ?? value;
  const wanted = normalizeName(french);
  let candidates = featureIndex.get(wanted) ?? [];
  if (className) {
    const contextual = candidates.filter(candidate => candidate.entry.title === className || candidate.entry.tags.includes(className));
    if (contextual.length) candidates = contextual;
  }
  if (speciesName) {
    const contextual = candidates.filter(candidate => candidate.entry.type === "species" && candidate.entry.title === speciesName);
    if (contextual.length) candidates = contextual;
  }
  return candidates.length === 1 ? candidates[0] : undefined;
}

function appendCompendiumReference(element: HTMLElement, entry: CompendiumEntry): void {
  if (skipReference(element)) return;
  markReferenceHost(element, entry.id);
  const existing = element.querySelector<HTMLElement>(":scope > .dd55-reference");
  if (existing?.dataset.dd55ReferenceKey === entry.id) return;
  existing?.remove();
  const badge = document.createElement("span");
  badge.className = "dd55-reference";
  badge.dataset.dd55ReferenceKey = entry.id;
  badge.innerHTML = `<span role="button" tabindex="0" data-dd55-open="${entry.id}" aria-label="Ouvrir dans le compendium" title="Ouvrir dans le compendium">📖</span>`;
  const openLocal = () => openCompendiumEntry(element.ownerDocument, entry.id);
  badge.querySelector("[data-dd55-open]")?.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); openLocal(); });
  badge.querySelector("[data-dd55-open]")?.addEventListener("keydown", event => { if ((event as KeyboardEvent).key === "Enter") openLocal(); });
  element.append(badge);
}

function appendReference(element: HTMLElement, match: Reference, kind: "spell" | "feat", preferences: Preferences): void {
    if (skipReference(element)) return;
    const local = match.compendiumId
      ? compendiumEntries.find(entry => entry.id === match.compendiumId)
      : findCompendiumEntry(match.nameFr, kind);
    const externalUrl = local ? undefined : referenceUrl(kind, match);
    markReferenceHost(element, local?.id, externalUrl);
    const referenceKey = local?.id ?? `${kind}:${match.id}`;
    const existing = element.querySelector<HTMLElement>(":scope > .dd55-reference");
    if (existing?.dataset.dd55ReferenceKey === referenceKey) return;
    existing?.remove();
    const badge = document.createElement("span");
    badge.className = "dd55-reference";
    badge.dataset.dd55ReferenceKey = referenceKey;
    badge.innerHTML = local
      ? `<span role="button" tabindex="0" data-dd55-open="${local.id}" aria-label="Ouvrir ${escapeHtml(match.nameFr)} dans le compendium" title="Ouvrir ${escapeHtml(match.nameFr)} dans le compendium">📖</span>`
      : `<a href="${referenceUrl(kind, match)}" target="_blank" rel="noopener noreferrer" aria-label="Voir ${escapeHtml(match.nameFr)} sur AideDD" title="Voir ${escapeHtml(match.nameFr)} sur AideDD">📖</a>`;
    const openLocal = () => { if (local) openCompendiumEntry(element.ownerDocument, local.id); };
    badge.querySelector("[data-dd55-open]")?.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); openLocal(); });
    badge.querySelector("[data-dd55-open]")?.addEventListener("keydown", (event) => { if ((event as KeyboardEvent).key === "Enter") openLocal(); });
    element.append(badge);
}

function enrichReferences(root: ParentNode, preferences: Preferences): void {
  const owner = root instanceof Document ? root : root.ownerDocument ?? document;
  const walker = owner.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
  const handled = new Set<HTMLElement>();
  textNodes.forEach(node => {
    const element = node.parentElement;
    if (!element || skipReference(element) || handled.has(element)) return;
    const original = originalText.get(node)?.trim() ?? "";
    const visible = node.data.trim();
    if ((!original || original.length > 100) && (!visible || visible.length > 100)) return;
    const visibleKey = normalizeName(visible);
    const originalIndexed = referenceIndex.get(normalizeName(original));
    const stillSameReference = originalIndexed && [originalIndexed.item.nameEn, originalIndexed.item.nameFr, ...(originalIndexed.item.aliases ?? [])]
      .some(name => normalizeName(name) === visibleKey);
    const indexed = stillSameReference ? originalIndexed : referenceIndex.get(visibleKey) ?? originalIndexed;
    if (!indexed) return;
    handled.add(element);
    appendReference(element, indexed.item, indexed.kind, preferences);
  });
  root.querySelectorAll<HTMLElement>("button, a, h3, h4, strong, [role='row'], [data-testid*='name' i]").forEach((element) => {
    if (handled.has(element) || skipReference(element)) return;
    const raw = element.childElementCount ? [...element.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join(" ") : element.textContent;
    const value = raw?.trim() ?? "";
    if (!value || value.length > 100) return;
    const indexed = referenceIndex.get(normalizeName(value));
    if (indexed) appendReference(element, indexed.item, indexed.kind, preferences);
  });
}

function enrichClassContent(root: ParentNode): void {
  const className = detectedClass(root);
  const speciesName = detectedSpecies(root);
  if (!className && !speciesName) return;
  root.querySelectorAll<HTMLElement>("button, h3, h4, strong, [role='row'], [data-testid*='name' i]").forEach(element => {
    if (skipReference(element)) return;
    const raw = element.childElementCount
      ? [...element.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join(" ").trim()
      : element.textContent?.trim() ?? "";
    if (!raw || raw.length > 90) return;
    const content = findClassFeature(raw, className, speciesName);
    if (content) appendCompendiumReference(element, content.entry);
  });
}

function escapeHtml(value: string): string { const span = document.createElement("span"); span.textContent = value; return span.innerHTML; }

export function enhanceSheet(root: ParentNode, preferences: Preferences): void {
  referenceContextCache = new WeakMap<HTMLElement, boolean>();
  referenceFreeContextCache = new WeakMap<HTMLElement, boolean>();
  characterSummaryContextCache = new WeakMap<HTMLElement, boolean>();
  root.querySelectorAll(".dd55-content-translation").forEach(element => element.remove());
  const owner = root instanceof Document ? root : root.ownerDocument ?? document;
  ensureDelegatedReferenceClicks(owner);
  if (!preferences.enabled) {
    translateSheet(root, false);
    root.querySelectorAll(".dd55-reference, .dd55-content-translation").forEach((element) => element.remove());
    root.querySelectorAll<HTMLElement>(".dd55-reference-host").forEach(unmarkReferenceHost);
    if (root instanceof HTMLElement && root.classList.contains("dd55-reference-host")) unmarkReferenceHost(root);
    return;
  }
  // Les mises à jour partielles de Roll20 ne doivent jamais supprimer les liens
  // valides situés ailleurs dans la fiche. Le nettoyage reste limité à la racine modifiée.
  const referenceScope = root;
  referenceScope.querySelectorAll<HTMLElement>(".dd55-reference").forEach(reference => {
    if (restrictReferenceContexts && reference.parentElement && isExcludedReferenceContext(reference.parentElement)) {
      unmarkReferenceHost(reference.parentElement);
      reference.remove();
    }
  });
  // Attacher les références avant de traduire préserve le nom anglais d’origine,
  // même lorsque Roll20 remplace ensuite le contenu d’un composant dynamique.
  enrichReferences(root, preferences);
  // Les correspondances de classe ou d’espèce sont contextuelles et doivent
  // primer sur un homonyme de sort (par exemple Darkvision chez l’Orc).
  enrichClassContent(root);
  translateSheet(root, true);
  // Une seconde passe courte résout les composants dont Roll20 vient de
  // remplacer le texte pendant la traduction ou qui étaient déjà en français.
  enrichReferences(root, preferences);
  enrichClassContent(root);
}
