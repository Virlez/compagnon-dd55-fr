// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountPanel } from "../src/content/panel";
import { createBackup } from "../src/content/backup";
import { compendiumEntries } from "../src/services/srd-compendium";

describe("compendium SRD local", () => {
  beforeEach(() => { document.body.innerHTML = ""; });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    Reflect.deleteProperty(document, "execCommand");
  });

  function search(value: string): void {
    const input = document.querySelector<HTMLInputElement>("[data-search]")!;
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function selectCategory(type: string): void {
    document.querySelector<HTMLButtonElement>(`[data-category="${type}"]`)!.click();
  }

  it("affiche une recherche sans résultat comme du texte, sans créer de HTML", () => {
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    const query = '<img src=x onerror=alert(1)>';
    search(query);
    const empty = document.querySelector<HTMLElement>("[data-results] .dd55-empty")!;
    expect(empty.textContent).toContain(query);
    expect(empty.querySelector("img")).toBeNull();
  });

  it("conserve la catégorie, les filtres et la recherche de chaque espace", () => {
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    selectCategory("spell");
    const level = document.querySelector<HTMLSelectElement>("[data-spell-level]")!;
    level.value = "3";
    level.dispatchEvent(new Event("change"));
    search("Boule de feu");
    document.querySelector<HTMLButtonElement>("[data-view='favorites']")!.click();
    expect(document.querySelector<HTMLInputElement>("[data-search]")!.value).toBe("");
    expect(document.querySelector<HTMLElement>(".dd55-category-browser")!.hidden).toBe(true);
    search("Dragon");
    document.querySelector<HTMLButtonElement>("[data-view='recent']")!.click();
    expect(document.querySelector<HTMLInputElement>("[data-search]")!.value).toBe("");
    document.querySelector<HTMLButtonElement>("[data-view='catalog']")!.click();
    expect(document.querySelector("[data-category-label]")!.textContent).toBe("Sorts");
    expect(document.querySelector<HTMLInputElement>("[data-search]")!.value).toBe("Boule de feu");
    expect(level.value).toBe("3");
    expect(document.querySelector("[data-entry-id='spell-boule-de-feu']")).not.toBeNull();
    document.querySelector<HTMLButtonElement>("[data-view='favorites']")!.click();
    expect(document.querySelector<HTMLInputElement>("[data-search]")!.value).toBe("Dragon");
  });

  it("ferme le sélecteur avant le panneau et rend le focus à son déclencheur", () => {
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    document.querySelector<HTMLButtonElement>("#dd55-launcher")!.click();
    const trigger = document.querySelector<HTMLButtonElement>("[data-category-toggle]")!;
    const picker = document.querySelector<HTMLElement>("#dd55-category-options")!;
    trigger.focus();
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(picker.hidden).toBe(false);
    expect(document.activeElement).toBe(picker.querySelector("[aria-pressed='true']"));
    document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(picker.hidden).toBe(true);
    expect(document.querySelector<HTMLElement>("#dd55-companion")!.hidden).toBe(false);
    expect(document.activeElement).toBe(trigger);
    trigger.click();
    selectCategory("monster");
    expect(picker.hidden).toBe(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });

  it("rend le catalogue complet par pages et inclut la dernière référence locale", () => {
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    expect(document.querySelector("[data-category='spell']")?.textContent).toContain("391");
    expect(document.querySelector("[data-category='feat']")?.textContent).toContain("137");
    expect(document.querySelector("[data-category='rule']")?.textContent).toContain("70");
    expect(document.querySelector("[data-category='classes']")?.textContent).toContain("24");
    expect(document.querySelector("[data-category='equipment']")?.textContent).toContain("51");
    expect(document.querySelector("[data-category='origins']")?.textContent).toContain("14");
    expect(document.querySelector("[data-category='magic-item']")?.textContent).toContain("350");
    expect(document.querySelector("[data-category='monster']")?.textContent).toContain("330");
    document.querySelector<HTMLButtonElement>("#dd55-launcher")!.click();
    expect(document.querySelector("[data-result-count]")?.textContent).toContain("1367");
    expect(document.querySelectorAll("[data-results] .dd55-entry-card")).toHaveLength(80);
    while (document.querySelector<HTMLButtonElement>("[data-load-more]")) document.querySelector<HTMLButtonElement>("[data-load-more]")!.click();
    expect(document.querySelectorAll("[data-results] .dd55-entry-card")).toHaveLength(1367);
    expect(document.querySelector("[data-entry-id='monster-vautour-geant']")).not.toBeNull();
  }, 20_000);

  it("permet d’ajouter un favori depuis les résultats et restaure le focus après une fiche", async () => {
    const save = vi.fn();
    mountPanel({ enabled: true, bilingual: true }, () => undefined, save);
    document.querySelector<HTMLButtonElement>("#dd55-launcher")!.click();
    const card = document.querySelector<HTMLButtonElement>("[data-results] .dd55-entry-card[data-entry-id='spell-boule-de-feu']")!;
    const favoriteToggle = card.parentElement!.querySelector<HTMLButtonElement>("[data-favorite-toggle]")!;
    favoriteToggle.click();
    expect(favoriteToggle.getAttribute("aria-pressed")).toBe("true");
    expect(save).toHaveBeenLastCalledWith({ favoriteReferences: [{ kind: "local", entryId: "spell-boule-de-feu" }] }, [
      { collection: "favoriteReferences", action: "add", reference: { kind: "local", entryId: "spell-boule-de-feu" } }
    ]);
    card.focus();
    card.click();
    document.querySelector<HTMLButtonElement>("[data-back]")!.click();
    await new Promise(resolve => requestAnimationFrame(resolve));
    expect(document.activeElement).toBe(document.querySelector("[data-entry-id='spell-boule-de-feu']"));
    document.querySelector<HTMLButtonElement>("[data-view='favorites']")!.click();
    const savedFavorite = document.querySelector<HTMLButtonElement>("[data-results] [data-favorite-toggle]")!;
    savedFavorite.click();
    expect(document.querySelector("[data-results] [data-empty-open-catalogue]")).not.toBeNull();
    expect(document.activeElement).toBe(document.querySelector("[data-empty-open-catalogue]"));
  });

  it("synchronise les favoris reçus d’un autre panneau", () => {
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    document.querySelector<HTMLButtonElement>("#dd55-launcher")!.click();
    const favorite = { kind: "local" as const, entryId: "spell-boule-de-feu" };
    document.dispatchEvent(new CustomEvent("dd55:reference-collections-changed", { detail: { favoriteReferences: [favorite] } }));
    const toggle = document.querySelector<HTMLButtonElement>("[data-entry-id='spell-boule-de-feu']")!.parentElement!.querySelector<HTMLButtonElement>("[data-favorite-toggle]")!;
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    document.querySelector<HTMLButtonElement>("[data-view='favorites']")!.click();
    expect(document.querySelector("[data-entry-id='spell-boule-de-feu']")).not.toBeNull();
  });

  it("annule le retrait d’un favori et restaure le focus sur sa fiche", () => {
    const save = vi.fn();
    const favorite = { kind: "local" as const, entryId: "spell-boule-de-feu" };
    mountPanel({ enabled: true, bilingual: true, favoriteReferences: [favorite] }, () => undefined, save);
    document.querySelector<HTMLButtonElement>("#dd55-launcher")!.click();
    document.querySelector<HTMLButtonElement>("[data-view='favorites']")!.click();
    document.querySelector<HTMLButtonElement>("[data-favorite-toggle]")!.click();
    const undo = document.querySelector<HTMLButtonElement>("[data-undo-favorite]")!;
    expect(undo).not.toBeNull();
    expect(document.querySelector("[data-collection-status]")?.textContent).toContain("Retiré des favoris");
    undo.click();
    const restored = document.querySelector<HTMLButtonElement>("[data-results] [data-favorite-toggle]")!;
    expect(restored.dataset.favoriteId).toBe("spell-boule-de-feu");
    expect(restored.getAttribute("aria-pressed")).toBe("true");
    expect(document.activeElement).toBe(restored);
    expect(document.querySelector("[data-collection-status]")?.textContent).toBe("Favori rétabli.");
    expect(save).toHaveBeenLastCalledWith({ favoriteReferences: [favorite] }, [
      { collection: "favoriteReferences", action: "add", reference: favorite }
    ]);
  });

  it("restaure une sauvegarde après confirmation et la propage sans réécrire les collections directement", async () => {
    const savePreferences = vi.fn();
    const saveCollections = vi.fn();
    const backup = createBackup({
      enabled: false,
      bilingual: false,
      theme: "dark",
      fontSize: "large",
      resultDensity: "compact",
      defaultCategory: "monster",
      expandedByDefault: true,
      monsterRollMode: "ask",
      autoRollMonsterActions: true,
      launcherVisible: false
    }, [{ kind: "local", entryId: "spell-boule-de-feu" }], [{ kind: "local", entryId: "monster-aboleth" }]);
    mountPanel({ enabled: true, bilingual: true }, savePreferences, saveCollections);
    document.querySelector<HTMLButtonElement>("#dd55-launcher")!.click();
    document.querySelector<HTMLButtonElement>("[data-settings-open]")!.click();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const input = document.querySelector<HTMLInputElement>("[data-backup-file]")!;
    const file = { size: JSON.stringify(backup).length, text: async () => JSON.stringify(backup) } as File;
    Object.defineProperty(input, "files", { configurable: true, value: [file] });
    input.dispatchEvent(new Event("change"));
    await vi.waitFor(() => expect(document.querySelector("[data-backup-status]")?.textContent).toContain("Sauvegarde restaurée"));

    expect(savePreferences).toHaveBeenCalledWith(expect.objectContaining({ enabled: false, theme: "dark", monsterRollMode: "ask" }));
    expect(saveCollections).toHaveBeenCalledWith(
      expect.objectContaining({ favoriteReferences: backup.favoriteReferences, recentReferences: backup.recentReferences }),
      [
        { collection: "favoriteReferences", action: "replace", references: backup.favoriteReferences },
        { collection: "recentReferences", action: "replace", references: backup.recentReferences }
      ]
    );
    expect(document.querySelector<HTMLElement>("#dd55-companion")?.dataset.theme).toBe("dark");
    expect(document.querySelector<HTMLInputElement>("[data-auto-roll-monsters]")?.checked).toBe(true);
    expect(document.querySelector<HTMLInputElement>("#dd55-launcher")?.hidden).toBe(true);
  });

  it("affiche les filtres minimaux des monstres et replie les options avancées", () => {
    mountPanel({ enabled: true, bilingual: true, defaultCategory: "monster" }, () => undefined);
    document.querySelector<HTMLButtonElement>("#dd55-launcher")!.click();
    expect(document.querySelector("[data-category='monster']")?.getAttribute("aria-pressed")).toBe("true");
    expect(document.querySelector<HTMLElement>("[data-monster-filters]")!.hidden).toBe(false);
    expect(document.querySelector<HTMLElement>("[data-monster-advanced]")!.hidden).toBe(true);
    expect(document.querySelector("[data-result-count]")?.textContent).toContain("330");
    expect(document.querySelectorAll("[data-results] .dd55-entry-card")).toHaveLength(80);
  });

  it("filtre les monstres par type, FP et critères avancés avec bornes cohérentes", () => {
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    selectCategory("monster");
    const type = document.querySelector<HTMLSelectElement>("[data-monster-type]")!;
    const fpMin = document.querySelector<HTMLSelectElement>("[data-monster-fp-min]")!;
    const fpMax = document.querySelector<HTMLSelectElement>("[data-monster-fp-max]")!;
    type.value = "Aberration"; type.dispatchEvent(new Event("change"));
    fpMin.value = "10"; fpMin.dispatchEvent(new Event("change"));
    fpMax.value = "10"; fpMax.dispatchEvent(new Event("change"));
    expect(document.querySelector("[data-entry-id='monster-aboleth']")).not.toBeNull();
    expect(document.querySelector("[data-result-count]")?.textContent).toContain("1 référence");
    fpMax.value = "1"; fpMax.dispatchEvent(new Event("change"));
    expect(fpMin.value).toBe("1");

    document.querySelector<HTMLButtonElement>("[data-clear-monster-filters]")!.click();
    document.querySelector<HTMLButtonElement>("[data-monster-advanced-toggle]")!.click();
    const category = document.querySelector<HTMLSelectElement>("[data-monster-category]")!;
    const size = document.querySelector<HTMLSelectElement>("[data-monster-size]")!;
    category.value = "Animaux"; category.dispatchEvent(new Event("change"));
    size.value = "G"; size.dispatchEvent(new Event("change"));
    const count = Number(document.querySelector("[data-result-count]")?.textContent?.match(/\d+/)?.[0]);
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(95);
    expect(document.querySelector("[data-monster-advanced-count]")?.textContent).toBe("2");

    const caMin = document.querySelector<HTMLInputElement>("[data-monster-ca-min]")!;
    const caMax = document.querySelector<HTMLInputElement>("[data-monster-ca-max]")!;
    caMin.value = "20"; caMin.dispatchEvent(new Event("input"));
    caMax.value = "10"; caMax.dispatchEvent(new Event("input"));
    expect(caMin.value).toBe("10");
    document.querySelector<HTMLButtonElement>("[data-clear-monster-filters]")!.click();
    expect(document.querySelector("[data-result-count]")?.textContent).toContain("330");
    expect(document.querySelector<HTMLElement>("[data-monster-advanced]")!.hidden).toBe(true);
  });

  it("affiche et copie un profil de monstre complet", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    selectCategory("monster");
    search("Aboleth");
    document.querySelector<HTMLButtonElement>("[data-entry-id='monster-aboleth']")!.click();
    expect(document.querySelector("[data-detail] h2")?.textContent).toBe("Aboleth");
    expect(document.querySelectorAll(".dd55-monster-abilities > div")).toHaveLength(6);
    expect(document.querySelector(".dd55-monster-combat")?.textContent).toContain("150 (20d10 + 40)");
    expect(document.querySelector(".dd55-monster-category")?.textContent).toContain("Créature légendaire");
    document.querySelector<HTMLButtonElement>("[data-copy-target='all']")!.click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledOnce());
    expect(writeText.mock.calls[0][0]).toContain("Caractéristiques : For 21 (+5), JS +5");
    expect(writeText.mock.calls[0][0]).toContain("Actions Légendaires");
  });

  it("affiche les boutons Roll20 uniquement sur les actions mécaniques", () => {
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    selectCategory("monster");
    search("Aboleth");
    document.querySelector<HTMLButtonElement>("[data-entry-id='monster-aboleth']")!.click();
    const cards = [...document.querySelectorAll<HTMLElement>(".dd55-monster-action")];
    const multiattack = cards.find(card => card.querySelector("h4")?.textContent === "Attaques multiples")!;
    const tentacle = cards.find(card => card.querySelector("h4")?.textContent === "Tentacule")!;
    const legendaryReference = cards.find(card => card.querySelector("h4")?.textContent === "Coup de tentacule")!;
    expect(multiattack.querySelector("[data-monster-roll-action]")).toBeNull();
    expect(tentacle.querySelector("[data-monster-roll-action]")).not.toBeNull();
    expect(legendaryReference.querySelector("[data-monster-roll-action]")).not.toBeNull();
    expect(document.querySelector(".dd55-copyable-section h3")?.textContent).toBe("Traits");
  });

  it("préremplit le chat Roll20 sans envoyer la macro", () => {
    document.body.innerHTML = `<div id="textchat-input"><textarea></textarea><button id="send-chat">Envoyer</button></div>`;
    const sent = vi.fn();
    document.querySelector("#send-chat")!.addEventListener("click", sent);
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    selectCategory("monster");
    search("Aboleth");
    document.querySelector<HTMLButtonElement>("[data-entry-id='monster-aboleth']")!.click();
    const action = [...document.querySelectorAll<HTMLElement>(".dd55-monster-action")].find(card => card.querySelector("h4")?.textContent === "Tentacule")!;
    action.querySelector<HTMLButtonElement>("[data-monster-roll-action]")!.click();
    const chat = document.querySelector<HTMLTextAreaElement>("#textchat-input textarea")!;
    expect(chat.value).toContain("/w gm &{template:default}");
    expect(chat.value).toContain("{{Attaque 1=[[1d20+9]]}}");
    expect(sent).not.toHaveBeenCalled();
    expect(document.querySelector("[data-copy-status]")?.textContent).toContain("n’a pas été envoyée");
  });

  it("envoie le jet quand l’option automatique est active", () => {
    document.body.innerHTML = `<div id="textchat-input"><textarea></textarea><button id="chatSendBtn" class="btn">Envoyer</button></div>`;
    const sent = vi.fn();
    document.querySelector("#chatSendBtn")!.addEventListener("click", sent);
    mountPanel({ enabled: true, bilingual: true, autoRollMonsterActions: true }, () => undefined);
    selectCategory("monster");
    search("Aboleth");
    document.querySelector<HTMLButtonElement>("[data-entry-id='monster-aboleth']")!.click();
    const action = [...document.querySelectorAll<HTMLElement>(".dd55-monster-action")].find(card => card.querySelector("h4")?.textContent === "Tentacule")!;
    action.querySelector<HTMLButtonElement>("[data-monster-roll-action]")!.click();
    expect(sent).toHaveBeenCalledOnce();
    expect(document.querySelector("[data-copy-status]")?.textContent).toContain("Jet envoyé");
  });

  it("demande Normal, Avantage ou Désavantage avant une attaque", async () => {
    document.body.innerHTML = `<div id="textchat-input"><textarea></textarea><button id="chatSendBtn">Envoyer</button></div>`;
    mountPanel({ enabled: true, bilingual: true, monsterRollMode: "ask" }, () => undefined);
    selectCategory("monster");
    search("Aboleth");
    document.querySelector<HTMLButtonElement>("[data-entry-id='monster-aboleth']")!.click();
    const action = [...document.querySelectorAll<HTMLElement>(".dd55-monster-action")].find(card => card.querySelector("h4")?.textContent === "Tentacule")!;
    action.querySelector<HTMLButtonElement>("[data-monster-roll-action]")!.click();

    expect(document.querySelector("[data-roll-mode-dialog]")).not.toBeNull();
    expect(document.querySelector<HTMLTextAreaElement>("#textchat-input textarea")!.value).toBe("");
    document.querySelector<HTMLButtonElement>("[data-roll-mode-choice='advantage']")!.click();
    await vi.waitFor(() => expect(document.querySelector<HTMLTextAreaElement>("#textchat-input textarea")!.value).toContain("Attaque avec Avantage=[[2d20kh1+9]]"));
    expect(document.querySelector("[data-roll-mode-dialog]")).toBeNull();
  });

  it("ne demande pas de mode pour une action sans jet d’attaque", async () => {
    document.body.innerHTML = `<div id="textchat-input"><textarea></textarea></div>`;
    mountPanel({ enabled: true, bilingual: true, monsterRollMode: "ask" }, () => undefined);
    selectCategory("monster");
    search("Ankheg");
    document.querySelector<HTMLButtonElement>("[data-entry-id='monster-ankheg']")!.click();
    const action = [...document.querySelectorAll<HTMLElement>(".dd55-monster-action")].find(card => card.querySelector("h4")?.textContent?.startsWith("Aspersion acide"))!;
    action.querySelector<HTMLButtonElement>("[data-monster-roll-action]")!.click();
    expect(document.querySelector("[data-roll-mode-dialog]")).toBeNull();
    await vi.waitFor(() => expect(document.querySelector<HTMLTextAreaElement>("#textchat-input textarea")!.value).toContain("Sauvegarde=Dextérité DD 12"));
  });

  it("copie la macro sans écraser un brouillon Roll20", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    document.body.innerHTML = `<div id="textchat-input"><textarea>brouillon MJ</textarea></div>`;
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    selectCategory("monster");
    search("Ankheg");
    document.querySelector<HTMLButtonElement>("[data-entry-id='monster-ankheg']")!.click();
    const action = [...document.querySelectorAll<HTMLElement>(".dd55-monster-action")].find(card => card.querySelector("h4")?.textContent?.startsWith("Aspersion acide"))!;
    action.querySelector<HTMLButtonElement>("[data-monster-roll-action]")!.click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledOnce());
    expect(document.querySelector<HTMLTextAreaElement>("#textchat-input textarea")!.value).toBe("brouillon MJ");
    expect(writeText.mock.calls[0][0]).toContain("{{Sauvegarde=Dextérité DD 12}}");
    await vi.waitFor(() => expect(document.querySelector("[data-copy-status]")?.textContent).toContain("Macro Roll20 copiée"));
  });

  it("émet des préférences complètes quand les réglages changent", () => {
    const onChange = vi.fn();
    mountPanel({ enabled: true, bilingual: true }, onChange);
    const enabled = document.querySelector<HTMLInputElement>("[data-enabled]")!;
    const bilingual = document.querySelector<HTMLInputElement>("[data-bilingual]")!;
    enabled.checked = false;
    enabled.dispatchEvent(new Event("change", { bubbles: true }));
    expect(onChange).toHaveBeenLastCalledWith({ enabled: false, bilingual: true });
    bilingual.checked = false;
    bilingual.dispatchEvent(new Event("change", { bubbles: true }));
    expect(onChange).toHaveBeenLastCalledWith({ enabled: false, bilingual: false });
  });

  it("ouvre les réglages depuis l’écrou et applique les préférences visuelles", () => {
    const onChange = vi.fn();
    mountPanel({ enabled: true, bilingual: true }, onChange);
    const panel = document.querySelector<HTMLElement>("#dd55-companion")!;
    const settingsButton = document.querySelector<HTMLButtonElement>("[data-settings-open]")!;
    expect(settingsButton.nextElementSibling).toMatchObject({ dataset: expect.objectContaining({ expand: "" }) });
    settingsButton.click();
    expect(document.querySelector<HTMLElement>("[data-settings]")!.hidden).toBe(false);
    expect(document.querySelector<HTMLElement>("[data-home]")!.hidden).toBe(true);

    const theme = document.querySelector<HTMLSelectElement>("[data-setting-theme]")!;
    theme.value = "dark";
    theme.dispatchEvent(new Event("change", { bubbles: true }));
    expect(panel.dataset.theme).toBe("dark");
    expect(onChange).toHaveBeenLastCalledWith({ theme: "dark" });

    const autoRoll = document.querySelector<HTMLInputElement>("[data-auto-roll-monsters]")!;
    expect(autoRoll.checked).toBe(false);
    autoRoll.checked = true;
    autoRoll.dispatchEvent(new Event("change", { bubbles: true }));
    expect(onChange).toHaveBeenLastCalledWith({ autoRollMonsterActions: true });

    const rollMode = document.querySelector<HTMLSelectElement>("[data-monster-roll-mode]")!;
    expect(rollMode.value).toBe("two");
    rollMode.value = "ask";
    rollMode.dispatchEvent(new Event("change", { bubbles: true }));
    expect(onChange).toHaveBeenLastCalledWith({ monsterRollMode: "ask" });

    document.querySelector<HTMLButtonElement>("[data-settings-back]")!.click();
    expect(document.querySelector<HTMLElement>("[data-home]")!.hidden).toBe(false);
    expect(document.activeElement).toBe(settingsButton);
  });

  it("restaure les préférences d’affichage et la catégorie initiale", () => {
    mountPanel({ enabled: true, bilingual: true, theme: "dark", fontSize: "large", resultDensity: "compact", defaultCategory: "spell", expandedByDefault: true }, () => undefined);
    const panel = document.querySelector<HTMLElement>("#dd55-companion")!;
    document.querySelector<HTMLButtonElement>("#dd55-launcher")!.click();
    expect(panel.dataset).toMatchObject({ theme: "dark", fontSize: "large", density: "compact" });
    expect(panel.classList.contains("is-expanded")).toBe(true);
    expect(document.querySelector("[data-category='spell']")?.getAttribute("aria-pressed")).toBe("true");
    expect(document.querySelector<HTMLElement>("[data-spell-filters]")!.hidden).toBe(false);
  });

  it("réinitialise la position et permet de masquer le lanceur", () => {
    const onLauncherChange = vi.fn();
    mountPanel({ enabled: true, bilingual: true, launcherPosition: { left: 100, top: 80 }, panelPosition: { left: 60, top: 40 } }, () => undefined, onLauncherChange);
    document.querySelector<HTMLButtonElement>("[data-settings-open]")!.click();
    document.querySelector<HTMLButtonElement>("[data-reset-panel]")!.click();
    expect(document.querySelector<HTMLElement>("#dd55-companion")!.style.left).toBe("");
    expect(onLauncherChange).toHaveBeenCalledWith({ panelPosition: null });
    document.querySelector<HTMLButtonElement>("[data-reset-launcher]")!.click();
    const launcher = document.querySelector<HTMLButtonElement>("#dd55-launcher")!;
    expect(launcher.style.left).toBe("");
    expect(onLauncherChange).toHaveBeenCalledWith({ launcherPosition: null });
    const visible = document.querySelector<HTMLInputElement>("[data-launcher-visible]")!;
    visible.checked = false;
    visible.dispatchEvent(new Event("change", { bubbles: true }));
    expect(launcher.hidden).toBe(true);
  });

  it("affiche un état vide actionnable", () => {
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    search("requête introuvable xyz");
    expect(document.querySelector(".dd55-empty")?.textContent).toContain("Aucune fiche trouvée");
    document.querySelector<HTMLButtonElement>("[data-empty-clear-search]")!.click();
    expect(document.querySelector<HTMLInputElement>("[data-search]")!.value).toBe("");
    expect(document.querySelectorAll("[data-results] .dd55-entry-card")).toHaveLength(80);
  });

  it("surligne une correspondance même sans accent dans la requête", () => {
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    search("Epuisement");
    expect(document.querySelector("[data-entry-id='rule-etat-epuisement'] mark")?.textContent).toBe("Épuisement");
  });

  it("charge réellement les références suivantes dans l'onglet Tout", () => {
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    document.querySelector<HTMLButtonElement>("#dd55-launcher")!.click();
    expect(document.querySelectorAll("[data-results] .dd55-entry-card")).toHaveLength(80);
    const before = document.querySelector("[data-load-more]")?.textContent;
    document.querySelector<HTMLButtonElement>("[data-load-more]")!.click();
    expect(document.querySelectorAll("[data-results] .dd55-entry-card")).toHaveLength(160);
    expect(document.querySelector("[data-load-more]")?.textContent).not.toBe(before);
  });

  it("parcourt les classes et ouvre une sous-classe", () => {
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    selectCategory("classes");
    expect(document.querySelector<HTMLSelectElement>("[data-class-kind]")?.value).toBe("class");
    expect(document.querySelectorAll("[data-results] .dd55-entry-card")).toHaveLength(12);
    expect(document.querySelector("[data-entry-id='class-magicien']")).not.toBeNull();
    expect(document.querySelector("[data-results] [data-entry-id^='subclass-']")).toBeNull();
    document.querySelector<HTMLButtonElement>("[data-entry-id='class-magicien']")!.click();
    const subclassLink = document.querySelector<HTMLButtonElement>(".dd55-mastery-link [data-entry-id='subclass-evocateur']")!;
    expect(subclassLink).not.toBeNull();
    subclassLink.click();
    const detail = document.querySelector("[data-detail]")?.textContent ?? "";
    expect(detail).toContain("Sous-classe de Magicien");
    expect(detail).toContain("Évocateur érudit");
  });

  it("filtre les classes et sous-classes par type de fiche", () => {
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    selectCategory("classes");
    const select = document.querySelector<HTMLSelectElement>("[data-class-kind]")!;
    select.value = "subclass";
    select.dispatchEvent(new Event("change"));
    expect(document.querySelectorAll("[data-results] .dd55-entry-card")).toHaveLength(12);
    expect(document.querySelector("[data-results] [data-entry-id^='class-']")).toBeNull();
    expect(document.querySelector("[data-entry-id='subclass-evocateur']")).not.toBeNull();
    select.value = "";
    select.dispatchEvent(new Event("change"));
    expect(document.querySelectorAll("[data-results] .dd55-entry-card")).toHaveLength(24);
  });

  it("filtre les règles par type", () => {
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    selectCategory("rule");
    const select = document.querySelector<HTMLSelectElement>("[data-rule-kind]")!;
    select.value = "État";
    select.dispatchEvent(new Event("change"));
    expect(document.querySelectorAll("[data-results] .dd55-entry-card")).toHaveLength(15);
    expect(document.querySelector("[data-entry-id='rule-etat-aveugle']")).not.toBeNull();
    select.value = "Propriété d’arme";
    select.dispatchEvent(new Event("change"));
    expect(document.querySelectorAll("[data-results] .dd55-entry-card")).toHaveLength(10);
    expect(document.querySelector("[data-entry-id='rule-propriete-arme-legere']")).not.toBeNull();
    document.querySelector<HTMLButtonElement>("[data-clear-rule-filters]")!.click();
    expect(document.querySelectorAll("[data-results] .dd55-entry-card")).toHaveLength(70);
  });

  it("affiche la progression d’une classe comme un vrai tableau", () => {
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    selectCategory("classes");
    document.querySelector<HTMLButtonElement>("[data-entry-id='class-barde']")!.click();
    const table = document.querySelector<HTMLTableElement>(".dd55-progression table")!;
    expect(table).not.toBeNull();
    expect(document.querySelectorAll(".dd55-start-card")).toHaveLength(2);
    expect(document.querySelector(".dd55-presentation")?.textContent).toContain("Personnage multiclassé");
    expect(document.querySelector(".dd55-progression-heading")?.textContent).toContain("Progression du Barde");
    expect(table.querySelectorAll("thead th")).toHaveLength(15);
    expect(table.querySelectorAll("tbody tr")).toHaveLength(20);
    expect(table.querySelector("tbody tr")?.textContent).toContain("Inspiration bardique, Sorts");
  });

  it("affiche une vraie fiche de sort structurée", () => {
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    search("Boule de feu");
    document.querySelector<HTMLButtonElement>("[data-entry-id='spell-boule-de-feu']")!.click();
    const detail = document.querySelector("[data-detail]")?.textContent ?? "";
    expect(detail).toContain("Sort de niveau 3");
    expect(detail).toContain("Évocation");
    expect(detail).toContain("Portée");
    expect(detail).toContain("45 m");
    expect(detail).toContain("8d6 dégâts de feu");
  });

  it("copie un bloc de texte propre et confirme la copie", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    search("Boule de feu");
    document.querySelector<HTMLButtonElement>("[data-entry-id='spell-boule-de-feu']")!.click();
    const button = document.querySelector<HTMLButtonElement>("[data-copy-target='section-0']")!;
    button.click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledOnce());
    const copied = writeText.mock.calls[0][0] as string;
    expect(copied).toContain("8d6 dégâts de feu");
    expect(copied).not.toContain("Copier");
    expect(copied).not.toContain("À découvrir aussi");
    await vi.waitFor(() => expect(button.textContent).toContain("✓ Copié"));
    expect(document.querySelector("[data-copy-status]")?.textContent).toContain("Contenu copié");
  });

  it("copie la fiche complète dans l’ordre avec ses métadonnées et sa source", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    search("Boule de feu");
    document.querySelector<HTMLButtonElement>("[data-entry-id='spell-boule-de-feu']")!.click();
    document.querySelector<HTMLButtonElement>("[data-copy-target='all']")!.click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledOnce());
    const copied = writeText.mock.calls[0][0] as string;
    expect(copied.startsWith("Boule de feu\n")).toBe(true);
    expect(copied).toContain("Niveau : 3");
    expect(copied.indexOf("8d6 dégâts de feu")).toBeLessThan(copied.indexOf("Source : SRD 5.2.1 FR"));
    expect(copied).not.toContain("Page SRD");
    expect(copied).not.toContain("À découvrir aussi");
  });

  it("copie les présentations et les tableaux avec des retours et tabulations", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    selectCategory("classes");
    document.querySelector<HTMLButtonElement>("[data-entry-id='class-barde']")!.click();
    document.querySelector<HTMLButtonElement>("[data-copy-target='presentation']")!.click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0][0]).toContain("Présentation\n");
    document.querySelector<HTMLButtonElement>("[data-copy-target='table-0']")!.click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(2));
    const copiedTable = writeText.mock.calls[1][0] as string;
    expect(copiedTable).toContain("Niveau\tBM\tAptitudes de classe");
    expect(copiedTable.split("\n").length).toBeGreaterThanOrEqual(22);
  });

  it("utilise la copie de repli puis signale un échec total", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("refusé"));
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const execCommand = vi.fn().mockReturnValueOnce(true).mockReturnValueOnce(false);
    Object.defineProperty(document, "execCommand", { configurable: true, value: execCommand });
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    search("Boule de feu");
    document.querySelector<HTMLButtonElement>("[data-entry-id='spell-boule-de-feu']")!.click();
    const sectionButton = document.querySelector<HTMLButtonElement>("[data-copy-target='section-0']")!;
    sectionButton.click();
    await vi.waitFor(() => expect(execCommand).toHaveBeenCalledTimes(1));
    expect(sectionButton.textContent).toContain("✓ Copié");
    expect(document.querySelector("textarea")).toBeNull();
    const allButton = document.querySelector<HTMLButtonElement>("[data-copy-target='all']")!;
    allButton.click();
    await vi.waitFor(() => expect(execCommand).toHaveBeenCalledTimes(2));
    expect(allButton.textContent).toContain("Copie impossible");
    expect(document.querySelector("[data-copy-status]")?.textContent).toContain("échoué");
  });

  it("transforme la table textuelle des actions en lignes lisibles", () => {
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    search("Actions");
    document.querySelector<HTMLButtonElement>("[data-entry-id='rule-actions']")!.click();
    expect(document.querySelectorAll(".dd55-action-item")).toHaveLength(12);
    expect(document.querySelector(".dd55-action-item dt")?.textContent).toBe("Attaque");
    expect(document.querySelector(".dd55-prose h4")?.textContent).toBe("Une chose à la fois");
  });

  it("sépare les paragraphes, encarts et listes des aptitudes de classe", () => {
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    selectCategory("classes");
    document.querySelector<HTMLButtonElement>("[data-entry-id='class-barbare']")!.click();
    expect(document.querySelectorAll(".dd55-rule-point").length).toBeGreaterThan(3);
    expect(document.querySelectorAll(".dd55-bullets li").length).toBeGreaterThanOrEqual(3);
    expect(document.querySelector(".dd55-rule-point")?.textContent).toContain("Résistance aux dégâts");
  });

  it("résout les variantes françaises vers le titre du SRD", () => {
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    search("Éclair traçant");
    expect(document.querySelector("[data-entry-id='spell-rayon-tracant']")).not.toBeNull();
    expect(document.querySelector("a[href*='eclair-tracant']")).toBeNull();
  });

  it("propose AideDD uniquement pour une référence absente du SRD", () => {
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    search("Chanceux");
    expect(document.querySelector("[data-external-url*='/feat/fr/chanceux']")).not.toBeNull();
  });

  it("affiche les 137 dons locaux et externes dans la catégorie Dons", () => {
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    selectCategory("feat");
    expect(document.querySelector("[data-result-count]")?.textContent).toContain("137");
    expect(document.querySelectorAll("[data-results] .dd55-entry-card")).toHaveLength(80);
    expect(document.querySelector("[data-load-more]")?.textContent).toContain("57 restantes");
  });

  it("conserve les libellés complets dans les onglets et panneaux de filtres", () => {
    mountPanel({ enabled: true, bilingual: true, theme: "dark" }, () => undefined);
    expect(document.querySelector("[data-category='magic-item']")?.textContent).toContain("Objets magiques350");
    selectCategory("classes");
    expect(document.querySelector("[data-class-filters] > div:first-child")?.textContent).toContain("Filtrer les classes");
    expect(document.querySelector("[data-class-filters] label > span")?.textContent).toBe("Type de fiche");
    expect(document.querySelector<HTMLSelectElement>("[data-class-kind]")?.selectedOptions[0].textContent).toBe("Classes seulement");
    selectCategory("feat");
    expect(document.querySelector("[data-feat-filters] > div:first-child")?.textContent).toContain("Filtrer les dons");
    expect([...document.querySelectorAll("[data-feat-filters] label > span")].map(label => label.textContent)).toEqual(["Type de don", "Source"]);
    expect(document.querySelector<HTMLSelectElement>("[data-feat-category]")?.selectedOptions[0].textContent).toBe("Tous les types");
    expect(document.querySelector<HTMLSelectElement>("[data-feat-source]")?.selectedOptions[0].textContent).toBe("Toutes les sources");
  });

  it("filtre les dons par type et par source", () => {
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    selectCategory("feat");
    const category = document.querySelector<HTMLSelectElement>("[data-feat-category]")!;
    const source = document.querySelector<HTMLSelectElement>("[data-feat-source]")!;

    category.value = "dragonmark";
    category.dispatchEvent(new Event("change"));
    expect(document.querySelector("[data-result-count]")?.textContent).toContain("13");
    expect(document.querySelector("[data-results] .dd55-entry-card small")?.textContent).toContain("Don de dracogramme");

    source.value = "Eberron: Forge of the Artificer";
    source.dispatchEvent(new Event("change"));
    expect(document.querySelector("[data-result-count]")?.textContent).toContain("13");

    category.value = "epic-boon";
    category.dispatchEvent(new Event("change"));
    expect(document.querySelector("[data-result-count]")?.textContent).toContain("1 référence");

    category.value = "origin";
    category.dispatchEvent(new Event("change"));
    source.value = "Player's Handbook 2024";
    source.dispatchEvent(new Event("change"));
    expect(document.querySelector("[data-entry-id='feat-vigilant']")).not.toBeNull();
    expect(document.querySelector("[data-result-count]")?.textContent).toContain("10");

    document.querySelector<HTMLButtonElement>("[data-clear-feat-filters]")!.click();
    expect(document.querySelector("[data-result-count]")?.textContent).toContain("137");
  });

  it("affiche les 391 sorts locaux et externes dans la catégorie Sorts", () => {
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    selectCategory("spell");
    expect(document.querySelector("[data-result-count]")?.textContent).toContain("391");
    expect(document.querySelectorAll("[data-results] .dd55-entry-card")).toHaveLength(80);
    expect(document.querySelector("[data-load-more]")?.textContent).toContain("311 restantes");
  });

  it("trie les sorts par nom ou par niveau sans compter le tri comme filtre", () => {
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    selectCategory("spell");
    const sort = document.querySelector<HTMLSelectElement>("[data-spell-sort]")!;
    expect([...sort.options].map(option => option.textContent)).toEqual(["Pertinence", "Nom A–Z", "Niveau croissant"]);
    expect(sort.value).toBe("relevance");

    search("armure");
    const searchedTitles = [...document.querySelectorAll<HTMLElement>("[data-results] .dd55-entry-card strong")].map(element => element.textContent ?? "");
    expect(searchedTitles.length).toBeGreaterThan(1);
    expect(searchedTitles[0].toLocaleLowerCase("fr")).toMatch(/^armure/);
    sort.value = "name";
    sort.dispatchEvent(new Event("change"));
    const alphabeticalTitles = [...document.querySelectorAll<HTMLElement>("[data-results] .dd55-entry-card strong")].map(element => element.textContent ?? "");
    expect(alphabeticalTitles).toEqual([...alphabeticalTitles].sort((left, right) => left.localeCompare(right, "fr")));

    search("");
    sort.value = "level";
    sort.dispatchEvent(new Event("change"));
    expect(document.querySelector<HTMLElement>("[data-spell-filter-count]")!.hidden).toBe(true);
    expect(document.querySelector<HTMLElement>("[data-clear-spell-filters]")!.hidden).toBe(false);
    while (document.querySelector<HTMLButtonElement>("[data-load-more]")) document.querySelector<HTMLButtonElement>("[data-load-more]")!.click();
    const rows = [...document.querySelectorAll<HTMLElement>("[data-results] .dd55-entry-card")].map(card => {
      const subtitle = card.querySelector("small")?.textContent ?? "";
      const match = subtitle.match(/niveau\s+(\d+)/i);
      return { title: card.querySelector("strong")?.textContent ?? "", level: /sort mineur/i.test(subtitle) ? 0 : Number(match?.[1]) };
    });
    expect(rows).toHaveLength(391);
    expect(new Set(rows.map(row => row.level))).toEqual(new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
    expect(rows).toEqual([...rows].sort((left, right) => left.level - right.level || left.title.localeCompare(right.title, "fr")));
    expect(document.querySelectorAll("[data-results] .dd55-external").length).toBeGreaterThan(0);
    expect(document.querySelectorAll("[data-results] [data-entry-id]").length).toBeGreaterThan(0);

    document.querySelector<HTMLButtonElement>("[data-clear-spell-filters]")!.click();
    expect(sort.value).toBe("relevance");
    document.body.innerHTML = "";
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    expect(document.querySelector<HTMLSelectElement>("[data-spell-sort]")!.value).toBe("relevance");
  });

  it("combine les filtres avancés des sorts et affiche leurs compteurs", () => {
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    selectCategory("spell");
    const advanced = document.querySelector<HTMLElement>("[data-spell-advanced]")!;
    expect(advanced.hidden).toBe(true);
    document.querySelector<HTMLButtonElement>("[data-spell-advanced-toggle]")!.click();
    expect(advanced.hidden).toBe(false);
    expect([...document.querySelectorAll<HTMLOptionElement>("[data-spell-school] option")].map(option => option.textContent)).toEqual([
      "Toutes les écoles", "Abjuration", "Divination", "Enchantement", "Évocation", "Illusion", "Invocation", "Nécromancie", "Transmutation"
    ]);
    const classSelect = document.querySelector<HTMLSelectElement>("[data-spell-class]")!;
    const levelSelect = document.querySelector<HTMLSelectElement>("[data-spell-level]")!;
    const school = document.querySelector<HTMLSelectElement>("[data-spell-school]")!;
    const concentration = document.querySelector<HTMLSelectElement>("[data-spell-concentration]")!;
    const sort = document.querySelector<HTMLSelectElement>("[data-spell-sort]")!;
    classSelect.value = "Magicien"; classSelect.dispatchEvent(new Event("change"));
    levelSelect.value = "3"; levelSelect.dispatchEvent(new Event("change"));
    school.value = "Transmutation"; school.dispatchEvent(new Event("change"));
    concentration.value = "yes"; concentration.dispatchEvent(new Event("change"));
    sort.value = "level"; sort.dispatchEvent(new Event("change"));
    expect(document.querySelector("[data-entry-id='spell-hate']")).not.toBeNull();
    expect(document.querySelector("[data-spell-advanced-count]")?.textContent).toBe("2");
    expect(document.querySelector("[data-spell-filter-count]")?.textContent).toBe("4");
    for (const card of document.querySelectorAll<HTMLElement>("[data-results] [data-entry-id]")) {
      const entry = compendiumEntries.find(item => item.id === card.dataset.entryId)!;
      expect(entry.tags).toContain("Magicien");
      expect(entry.meta.Niveau).toBe("3");
      expect(entry.meta["École"]).toBe("Transmutation");
      expect(entry.meta["Durée"]).toMatch(/concentration/i);
    }
    document.querySelector<HTMLButtonElement>("[data-clear-spell-filters]")!.click();
    expect(document.querySelector("[data-result-count]")?.textContent).toContain("391");
    expect(sort.value).toBe("relevance");
    expect(advanced.hidden).toBe(true);
    expect(document.querySelector<HTMLElement>("[data-spell-filter-count]")!.hidden).toBe(true);
    selectCategory("feat");
    selectCategory("spell");
    expect(advanced.hidden).toBe(true);
  });

  it("filtre aussi les références AideDD avec les métadonnées avancées", () => {
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    selectCategory("spell");
    const level = document.querySelector<HTMLSelectElement>("[data-spell-level]")!;
    const school = document.querySelector<HTMLSelectElement>("[data-spell-school]")!;
    const concentration = document.querySelector<HTMLSelectElement>("[data-spell-concentration]")!;
    level.value = "1"; level.dispatchEvent(new Event("change"));
    school.value = "Abjuration"; school.dispatchEvent(new Event("change"));
    concentration.value = "no"; concentration.dispatchEvent(new Event("change"));
    search("Armor of Agathys");
    expect(document.querySelector("[data-external-url$='/spell/fr/armure-d-agathys']")).not.toBeNull();
  });

  it("mémorise, déduplique et efface les dix références récentes", () => {
    const save = vi.fn();
    const recentReferences = Array.from({ length: 10 }, (_, index) => ({ kind: "local" as const, entryId: compendiumEntries[index].id }));
    mountPanel({ enabled: true, bilingual: true, recentReferences }, () => undefined, save);
    expect(document.querySelector(".dd55-category-nav [data-recent-open]")).not.toBeNull();
    document.querySelector<HTMLButtonElement>("[data-recent-open]")!.click();
    expect(document.querySelectorAll("[data-results] .dd55-entry-card")).toHaveLength(10);
    const firstId = recentReferences[0].entryId;
    document.querySelector<HTMLButtonElement>(`[data-entry-id='${firstId}']`)!.click();
    expect(save).toHaveBeenLastCalledWith({ recentReferences }, [
      { collection: "recentReferences", action: "visit", reference: recentReferences[0] }
    ]);
    document.querySelector<HTMLButtonElement>("[data-back]")!.click();
    expect(document.querySelector<HTMLElement>("[data-home]")!.hidden).toBe(false);
    expect(document.querySelector<HTMLElement>("[data-detail]")!.hidden).toBe(true);
    document.querySelector<HTMLButtonElement>(`[data-entry-id='${recentReferences[1].entryId}']`)!.click();
    const lastSaved = save.mock.calls.at(-1)?.[0].recentReferences;
    expect(lastSaved).toHaveLength(10);
    expect(lastSaved[0]).toEqual(recentReferences[1]);
    expect(new Set(lastSaved.map((reference: { entryId: string }) => reference.entryId)).size).toBe(10);
    document.querySelector<HTMLButtonElement>("[data-back]")!.click();
    document.querySelector<HTMLButtonElement>("[data-clear-recents]")!.click();
    expect(save).toHaveBeenLastCalledWith({ recentReferences: [] }, [{ collection: "recentReferences", action: "clear" }]);
    expect(document.querySelector(".dd55-empty")?.textContent).toContain("Aucune fiche consultée");
  });

  it("enregistre les références AideDD et ignore les récents obsolètes", () => {
    const sendMessage = vi.fn();
    const save = vi.fn();
    vi.stubGlobal("chrome", { runtime: { sendMessage } });
    mountPanel({ enabled: true, bilingual: true, recentReferences: [{ kind: "local", entryId: "fiche-disparue" }] }, () => undefined, save);
    document.querySelector<HTMLButtonElement>("[data-recent-open]")!.click();
    expect(save).toHaveBeenCalledWith({ recentReferences: [] }, [
      { collection: "recentReferences", action: "remove", reference: { kind: "local", entryId: "fiche-disparue" } }
    ]);
    selectCategory("spell");
    search("Armor of Agathys");
    document.querySelector<HTMLButtonElement>("[data-external-url$='/spell/fr/armure-d-agathys']")!.click();
    expect(save).toHaveBeenLastCalledWith({ recentReferences: [{ kind: "external", referenceKind: "spell", referenceId: "armor-of-agathys" }] }, [
      { collection: "recentReferences", action: "visit", reference: { kind: "external", referenceKind: "spell", referenceId: "armor-of-agathys" } }
    ]);
    document.querySelector<HTMLButtonElement>("[data-recent-open]")!.click();
    expect(document.querySelector("[data-external-url$='/spell/fr/armure-d-agathys']")).not.toBeNull();
  });

  it("ajoute et retire des favoris locaux et AideDD depuis les résultats et les fiches", () => {
    const save = vi.fn();
    mountPanel({ enabled: true, bilingual: true }, () => undefined, save);
    selectCategory("spell");
    search("Armor of Agathys");
    const externalCard = document.querySelector<HTMLElement>("[data-external-url$='/spell/fr/armure-d-agathys']")!;
    externalCard.parentElement!.querySelector<HTMLButtonElement>("[data-favorite-toggle]")!.click();
    expect(save).toHaveBeenLastCalledWith({ favoriteReferences: [{ kind: "external", referenceKind: "spell", referenceId: "armor-of-agathys" }] }, [
      { collection: "favoriteReferences", action: "add", reference: { kind: "external", referenceKind: "spell", referenceId: "armor-of-agathys" } }
    ]);
    expect(document.querySelector("[data-favorites-count]")?.textContent).toBe("1");

    document.querySelector<HTMLButtonElement>(".dd55-category-nav [data-type='favorites']")!.click();
    expect(document.querySelector<HTMLInputElement>("[data-search]")!.value).toBe("");
    expect(document.querySelector<HTMLButtonElement>(".dd55-category-nav [data-type='favorites']")!.getAttribute("aria-label")).toBe("Favoris (1)");
    expect(document.querySelector("[data-external-url$='/spell/fr/armure-d-agathys']")).not.toBeNull();
    const favoriteExternalCard = document.querySelector<HTMLElement>("[data-external-url$='/spell/fr/armure-d-agathys']")!;
    favoriteExternalCard.parentElement!.querySelector<HTMLButtonElement>("[data-favorite-toggle]")!.click();
    expect(document.querySelectorAll("[data-results] .dd55-entry-card")).toHaveLength(0);
    expect(save).toHaveBeenLastCalledWith({ favoriteReferences: [] }, [
      { collection: "favoriteReferences", action: "remove", reference: { kind: "external", referenceKind: "spell", referenceId: "armor-of-agathys" } }
    ]);

    selectCategory("monster");
    search("");
    const localCard = document.querySelector<HTMLElement>("[data-entry-id='monster-aboleth']")!;
    localCard.click();
    document.querySelector<HTMLButtonElement>("[data-detail] [data-favorite-toggle]")!.click();
    document.querySelector<HTMLButtonElement>("[data-back]")!.click();
    document.querySelector<HTMLButtonElement>(".dd55-category-nav [data-type='favorites']")!.click();
    document.querySelector<HTMLButtonElement>("[data-entry-id='monster-aboleth']")!.click();
    const detailFavorite = document.querySelector<HTMLButtonElement>("[data-detail] [data-favorite-toggle]")!;
    expect(detailFavorite.getAttribute("aria-pressed")).toBe("true");
    detailFavorite.click();
    document.querySelector<HTMLButtonElement>("[data-back]")!.click();
    expect(document.querySelector(".dd55-empty")?.textContent).toContain("Aucun favori");
    expect(save).toHaveBeenLastCalledWith({ favoriteReferences: [] }, [
      { collection: "favoriteReferences", action: "remove", reference: { kind: "local", entryId: "monster-aboleth" } }
    ]);
  });

  it("restaure la liste chargée et applique les niveaux de navigation clavier", async () => {
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    const panel = document.querySelector<HTMLElement>("#dd55-companion")!;
    const onError = vi.fn();
    window.addEventListener("error", onError);
    document.dispatchEvent(new Event("keydown"));
    window.removeEventListener("error", onError);
    expect(onError).not.toHaveBeenCalled();
    document.querySelector<HTMLButtonElement>("#dd55-launcher")!.click();
    document.querySelector<HTMLButtonElement>("[data-load-more]")!.click();
    expect(document.querySelectorAll("[data-results] .dd55-entry-card")).toHaveLength(160);
    panel.scrollTop = 120;
    document.querySelector<HTMLButtonElement>("[data-results] [data-entry-id]")!.click();
    document.querySelector<HTMLButtonElement>("[data-back]")!.click();
    await new Promise(resolve => requestAnimationFrame(resolve));
    expect(document.querySelectorAll("[data-results] .dd55-entry-card")).toHaveLength(160);
    expect(panel.scrollTop).toBe(120);

    document.querySelector<HTMLButtonElement>("[data-results] [data-entry-id]")!.click();
    panel.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(document.querySelector<HTMLElement>("[data-home]")!.hidden).toBe(false);
    panel.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(panel.hidden).toBe(true);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
    expect(panel.hidden).toBe(false);
    expect(document.activeElement).toBe(document.querySelector("[data-search]"));
  });

  it("filtre et trie les objets magiques locaux et externes par type et rareté", () => {
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    selectCategory("magic-item");
    expect(document.querySelector("[data-result-count]")?.textContent).toContain("350");
    expect(document.querySelectorAll("[data-results] .dd55-entry-card")).toHaveLength(80);
    expect(document.querySelector("[data-load-more]")?.textContent).toContain("270 restantes");
    const type = document.querySelector<HTMLSelectElement>("[data-magic-item-type]")!;
    expect([...type.options].map(option => option.textContent)).toEqual([
      "Tous les types", "Anneau", "Arme", "Armure", "Baguette", "Bâton", "Objet merveilleux", "Parchemin", "Potion", "Sceptre"
    ]);
    type.value = "Arme";
    type.dispatchEvent(new Event("change"));
    document.querySelector<HTMLButtonElement>("[data-magic-rarity='Courant']")!.click();
    document.querySelector<HTMLButtonElement>("[data-magic-rarity='Rare']")!.click();
    const cards = [...document.querySelectorAll<HTMLElement>("[data-results] .dd55-entry-card")];
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.every(card => card.querySelector("small")?.textContent?.includes("Arme"))).toBe(true);
    expect(cards.every(card => /courant|rare/i.test(card.querySelector("small")?.textContent ?? ""))).toBe(true);
    const sort = document.querySelector<HTMLSelectElement>("[data-magic-item-sort]")!;
    sort.value = "rarity-asc";
    sort.dispatchEvent(new Event("change"));
    expect(document.querySelector("[data-results] .dd55-entry-card small")?.textContent?.toLocaleLowerCase("fr")).toContain("courant");
    sort.value = "rarity-desc";
    sort.dispatchEvent(new Event("change"));
    expect(document.querySelector("[data-results] .dd55-entry-card small")?.textContent?.toLocaleLowerCase("fr")).toContain("rare");
    document.querySelector<HTMLButtonElement>("[data-clear-magic-item-filters]")!.click();
    expect(type.value).toBe("");
    expect(document.querySelector("[data-result-count]")?.textContent).toContain("350");

    type.value = "Arme";
    type.dispatchEvent(new Event("change"));
    search("Arme en adamantium");
    expect(document.querySelector("[data-external-url$='/magic-item/fr/arme-en-adamantium']")).not.toBeNull();

    search("");
    type.value = "Armure";
    type.dispatchEvent(new Event("change"));
    expect(document.querySelector("[data-entry-id='magic-item-armure-d-ecailles-de-dragon']")).not.toBeNull();
  });

  it("ouvre une fiche magique locale et une référence AideDD externe", () => {
    const sendMessage = vi.fn();
    vi.stubGlobal("chrome", { runtime: { sendMessage } });
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    selectCategory("magic-item");
    search("Amulette d’antidétection");
    document.querySelector<HTMLButtonElement>("[data-entry-id='magic-item-amulette-d-antidetection']")!.click();
    expect(document.querySelector("[data-detail] h2")?.textContent).toBe("Amulette d’antidétection");
    expect(document.querySelector("[data-detail] [data-copy-target='all']")).not.toBeNull();
    document.querySelector<HTMLButtonElement>("[data-back]")!.click();
    search("Dark Shard Amulet");
    document.querySelector<HTMLButtonElement>("[data-external-url$='/magic-item/fr/amulette-de-sombre-eclat']")!.click();
    expect(sendMessage).toHaveBeenCalledWith({ type: "DD55_OPEN_EXTERNAL", url: "https://www.aidedd.org/magic-item/fr/amulette-de-sombre-eclat" });
  });

  it("retrouve un sort externe en anglais avec son lien AideDD français", () => {
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    search("Armor of Agathys");
    const button = document.querySelector<HTMLButtonElement>("[data-external-url$='/spell/fr/armure-d-agathys']");
    expect(button).not.toBeNull();
    expect(button?.textContent).toContain("Armure d'Agathys");
    expect(button?.textContent).toContain("niveau 1");
  });

  it("retrouve un don enrichi en anglais avec son lien AideDD français", () => {
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    search("Telekinetic");
    const link = document.querySelector<HTMLButtonElement>("[data-external-url*='/feat/fr/telekinesiste']");
    expect(link).not.toBeNull();
    expect(link?.textContent).toContain("Télékinésiste");
  });

  it("ouvre AideDD via l'extension sans exposer de lien interceptable par Roll20", () => {
    const sendMessage = vi.fn();
    vi.stubGlobal("chrome", { runtime: { sendMessage } });
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    search("Crossbow Expert");
    const button = document.querySelector<HTMLButtonElement>("[data-external-url*='/feat/fr/maitre-arbaletrier']")!;
    expect(button.tagName).toBe("BUTTON");
    button.click();
    expect(sendMessage).toHaveBeenCalledWith({
      type: "DD55_OPEN_EXTERNAL",
      url: "https://www.aidedd.org/feat/fr/maitre-arbaletrier"
    });
  });

  it("filtre les sorts simultanément par classe et par niveau", () => {
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    selectCategory("spell");
    const filters = document.querySelector<HTMLElement>("[data-spell-filters]")!;
    expect(filters.hidden).toBe(false);
    const classSelect = document.querySelector<HTMLSelectElement>("[data-spell-class]")!;
    const levelSelect = document.querySelector<HTMLSelectElement>("[data-spell-level]")!;
    classSelect.value = "Magicien";
    classSelect.dispatchEvent(new Event("change"));
    levelSelect.value = "3";
    levelSelect.dispatchEvent(new Event("change"));
    const ids = [...document.querySelectorAll<HTMLElement>("[data-results] [data-entry-id]")].map(element => element.dataset.entryId);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      const entry = compendiumEntries.find(item => item.id === id)!;
      expect(entry.tags).toContain("Magicien");
      expect(entry.meta.Niveau).toBe("3");
    }
    expect(document.querySelector("[data-results] .dd55-external")).toBeNull();
  });

  it("filtre l’équipement par type et maîtrise d’arme", () => {
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    selectCategory("equipment");
    expect(document.querySelector("[data-result-count]")?.textContent).toContain("51");
    const typeSelect = document.querySelector<HTMLSelectElement>("[data-equipment-type]")!;
    const masterySelect = document.querySelector<HTMLSelectElement>("[data-weapon-mastery]")!;
    typeSelect.value = "Arme de guerre à distance";
    typeSelect.dispatchEvent(new Event("change"));
    masterySelect.value = "Ouverture";
    masterySelect.dispatchEvent(new Event("change"));
    const ids = [...document.querySelectorAll<HTMLElement>("[data-results] [data-entry-id]")].map(element => element.dataset.entryId);
    expect(ids).toHaveLength(3);
    for (const id of ids) {
      const entry = compendiumEntries.find(item => item.id === id)!;
      expect(entry.meta["Type d’équipement"]).toBe("Arme de guerre à distance");
      expect(entry.meta["Botte d’arme"]).toBe("Ouverture");
    }
  });

  it("relie une arme à la règle de sa botte d’arme", () => {
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    selectCategory("equipment");
    document.querySelector<HTMLButtonElement>("[data-entry-id='equipment-weapon-pistolet']")!.click();
    expect(document.querySelector("[data-detail]")?.textContent).toContain("1d10 perforants");
    const masteryLink = document.querySelector<HTMLButtonElement>(".dd55-mastery-link [data-entry-id='rule-botte-ouverture']")!;
    expect(masteryLink).not.toBeNull();
    masteryLink.click();
    expect(document.querySelector("[data-detail] h2")?.textContent).toBe("Ouverture");
    expect(document.querySelector("[data-detail]")?.textContent).toContain("Page SRD 96");
  });

  it("parcourt les origines et ouvre le don accordé par un historique", () => {
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    selectCategory("origins");
    expect(document.querySelector("[data-result-count]")?.textContent).toContain("14");
    expect(document.querySelector("[data-entry-id='species-drakeide']")).not.toBeNull();
    document.querySelector<HTMLButtonElement>("[data-entry-id='background-criminel']")!.click();
    expect(document.querySelector("[data-detail]")?.textContent).toContain("Discrétion et Escamotage");
    const featLink = document.querySelector<HTMLButtonElement>(".dd55-mastery-link [data-entry-id='feat-vigilant']")!;
    expect(featLink).not.toBeNull();
    featLink.click();
    expect(document.querySelector("[data-detail] h2")?.textContent).toBe("Vigilant");
  });

  it("affiche les lignages d’une espèce dans un tableau d’options", () => {
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    selectCategory("origins");
    document.querySelector<HTMLButtonElement>("[data-entry-id='species-elfe']")!.click();
    const options = document.querySelector<HTMLElement>(".dd55-options-table")!;
    expect(options).not.toBeNull();
    expect(options.textContent).toContain("Lignages elfiques");
    expect(options.textContent).toContain("Drow");
    expect(options.textContent).toContain("Haut-elfe");
    expect(options.querySelectorAll("tbody tr")).toHaveLength(3);
    expect(options.textContent).not.toContain("Progression du Elfe");
    expect(options.querySelector(".dd55-progression-heading > span")).toBeNull();
  });

  it("présente l’Aasimar avec une source complémentaire distincte du SRD", () => {
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    selectCategory("origins");
    document.querySelector<HTMLButtonElement>("[data-entry-id='species-aasimar']")!.click();
    const detail = document.querySelector<HTMLElement>("[data-detail]")!;
    expect(detail.textContent).toContain("Mains guérisseuses");
    expect(detail.textContent).toContain("Ailes célestes");
    expect(detail.textContent).toContain("Source complémentaire");
    expect(detail.textContent).not.toContain("Page SRD 0");
    expect(detail.querySelector<HTMLAnchorElement>(".dd55-source a")?.href).toBe("https://dnd2024.wikidot.com/species:aasimar");
  });

  it("filtre les origines entre espèces et historiques", () => {
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    selectCategory("origins");
    const filters = document.querySelector<HTMLElement>("[data-origin-filters]")!;
    const select = document.querySelector<HTMLSelectElement>("[data-origin-kind]")!;
    expect(filters.hidden).toBe(false);
    select.value = "species";
    select.dispatchEvent(new Event("change"));
    expect(document.querySelectorAll("[data-results] .dd55-entry-card")).toHaveLength(10);
    expect(document.querySelector("[data-results] [data-entry-id^='background-']")).toBeNull();
    select.value = "background";
    select.dispatchEvent(new Event("change"));
    expect(document.querySelectorAll("[data-results] .dd55-entry-card")).toHaveLength(4);
    expect(document.querySelector("[data-results] [data-entry-id^='species-']")).toBeNull();
    document.querySelector<HTMLButtonElement>("[data-clear-origin-filters]")!.click();
    expect(document.querySelectorAll("[data-results] .dd55-entry-card")).toHaveLength(14);
  });

  it("agrandit et réduit le compendium sans perdre son état", () => {
    mountPanel({ enabled: true, bilingual: true }, () => undefined);
    const panel = document.querySelector<HTMLElement>("#dd55-companion")!;
    const expand = document.querySelector<HTMLButtonElement>("[data-expand]")!;
    const search = document.querySelector<HTMLInputElement>("[data-search]")!;
    search.value = "rage";
    search.dispatchEvent(new Event("input"));

    expand.click();
    expect(panel.classList.contains("is-expanded")).toBe(true);
    expect(expand.getAttribute("aria-pressed")).toBe("true");
    expect(expand.getAttribute("aria-label")).toBe("Réduire le compendium");
    expect(search.value).toBe("rage");

    expand.click();
    expect(panel.classList.contains("is-expanded")).toBe(false);
    expect(expand.getAttribute("aria-pressed")).toBe("false");
    expect(expand.getAttribute("aria-label")).toBe("Agrandir le compendium");
    expect(search.value).toBe("rage");
  });
});
