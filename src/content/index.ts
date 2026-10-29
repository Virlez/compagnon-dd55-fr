import "./style.css";
import { mountPanel } from "./panel";
import { enhanceSheet, isDnd2024Sheet } from "./sheet";
import type { Preferences, ReferenceCollectionMutation } from "../types";
import { initialOnboardingVersion } from "../services/onboarding-state";

const defaults: Preferences = {
  enabled: true,
  bilingual: true,
  theme: "light",
  fontSize: "normal",
  resultDensity: "comfortable",
  defaultCategory: "",
  expandedByDefault: false,
  monsterRollMode: "two",
  autoRollMonsterActions: false,
  launcherVisible: true
};
let preferences = defaults;
let sheetDetected = false;
let flushTimer: number | undefined;
const pendingRoots = new Set<Element>();

async function loadPreferences(): Promise<Preferences> {
  if (!globalThis.chrome?.storage?.local) return defaults;
  try {
    const stored = await chrome.storage.local.get();
    const onboardingVersion = initialOnboardingVersion(stored);
    if (stored.onboardingVersion === undefined && onboardingVersion > 0) {
      try {
        await chrome.storage.local.set({ onboardingVersion });
      } catch {
        // Une migration non enregistrée ne doit pas remplacer les réglages lus.
      }
    }
    return { ...defaults, ...stored, onboardingVersion } as Preferences;
  } catch {
    return defaults;
  }
}

function savePreferences(next: Partial<Preferences>): void {
  try {
    if (!globalThis.chrome?.storage?.local || !globalThis.chrome?.runtime?.id) return;
    const pending = chrome.storage.local.set(next);
    void pending.catch(() => undefined);
  } catch {
    // Le contexte d'une ancienne version peut être invalidé après un rechargement
    // de l'extension. Le réglage reste appliqué à la page sans créer d'erreur Chrome.
  }
}

function broadcastPreferences(next: Partial<Preferences>): void {
  try {
    if (!globalThis.chrome?.runtime?.id) return;
    const pending = chrome.runtime.sendMessage({ type: "DD55_PREFERENCES_CHANGED", preferences: next });
    void pending.catch(() => undefined);
  } catch {
    // Une fiche déjà ouverte continue d'être mise à jour dans le document courant.
  }
}

function applySheetPreferences(next: Partial<Preferences>): void {
  preferences = { ...preferences, ...next };
  document.querySelectorAll(".dd55-reference").forEach(element => element.remove());
  processDocument();
}

function isModernDnd5Table(): boolean {
  if (document.documentElement.dataset.dd55ModernDnd5 === "true") return true;
  return Boolean(document.querySelector("[data-sheet-type*='dnd2024byroll20' i], [data-character-sheet*='dnd2024byroll20' i], [src*='dnd2024byroll20' i], [href*='dnd2024byroll20' i]"));
}

function ensurePanel(): void {
  if (window.top !== window) return;
  mountPanel(preferences, (next) => {
    applySheetPreferences(next);
    savePreferences(next);
    broadcastPreferences(next);
  }, (next, mutations) => {
    preferences = { ...preferences, ...next };
    if (!mutations?.length || !globalThis.chrome?.runtime?.id) {
      savePreferences(next);
      return;
    }
    mutations.forEach(mutation => {
      void chrome.runtime.sendMessage({ type: "DD55_UPDATE_REFERENCE_COLLECTION", mutation })
        .then((response: { ok?: boolean } | undefined) => {
          if (response?.ok) return;
          reconcileReferenceCollections();
        })
        .catch(() => reconcileReferenceCollections());
    });
  });
}

function reconcileReferenceCollections(): void {
  if (!globalThis.chrome?.storage?.local) {
    document.dispatchEvent(new CustomEvent("dd55:reference-collection-save-failed"));
    return;
  }
  void chrome.storage.local.get(["favoriteReferences", "recentReferences"]).then(stored => {
    const next: Partial<Preferences> = {};
    next.favoriteReferences = Array.isArray(stored.favoriteReferences) ? stored.favoriteReferences : [];
    next.recentReferences = Array.isArray(stored.recentReferences) ? stored.recentReferences : [];
    if (Object.keys(next).length) {
      preferences = { ...preferences, ...next };
      document.dispatchEvent(new CustomEvent("dd55:reference-collections-changed", { detail: next }));
    }
  }).catch(() => undefined).finally(() => {
    document.dispatchEvent(new CustomEvent("dd55:reference-collection-save-failed"));
  });
}

function processDocument(): void {
  if (!sheetDetected) {
    if (isDnd2024Sheet()) {
      sheetDetected = true;
      if (window.top === window) ensurePanel();
      else if (globalThis.chrome?.runtime) void chrome.runtime.sendMessage({ type: "DD55_SHEET_DETECTED" });
    } else if (window.top === window && isModernDnd5Table()) {
      ensurePanel();
      return;
    } else return;
  }
  pendingRoots.clear();
  enhanceSheet(document, preferences);
}

function queueRoot(element: Element): void {
  if (element.closest("#dd55-companion, #dd55-launcher, .dd55-reference")) return;
  for (const root of pendingRoots) {
    if (root.contains(element)) return;
    if (element.contains(root)) pendingRoots.delete(root);
  }
  pendingRoots.add(element);
}

function flushRoots(): void {
  flushTimer = undefined;
  if (!sheetDetected) {
    processDocument();
    if (!sheetDetected) pendingRoots.clear();
    return;
  }
  const roots = [...pendingRoots];
  pendingRoots.clear();
  roots.forEach(root => root.isConnected && enhanceSheet(root, preferences));
}

function scheduleFlush(): void {
  if (flushTimer !== undefined) return;
  flushTimer = window.setTimeout(flushRoots, 32);
}

async function start(): Promise<void> {
  preferences = await loadPreferences();
  document.addEventListener("dd55:modern-table", processDocument);
  processDocument();
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
      if (!target || target.closest("#dd55-companion, #dd55-launcher, .dd55-reference")) continue;
      const additions = [...mutation.addedNodes];
      if (mutation.type === "childList" && additions.length) {
        additions.forEach(node => {
          const element = node instanceof Element ? node : node.parentElement;
          if (element) queueRoot(element);
        });
      } else {
        queueRoot(target);
      }
    }
    if (pendingRoots.size) scheduleFlush();
  }).observe(document.body, { childList: true, characterData: true, subtree: true });

  if (globalThis.chrome?.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") return;
      const next: Partial<Preferences> = {};
      if (changes.favoriteReferences) next.favoriteReferences = changes.favoriteReferences.newValue ?? [];
      if (changes.recentReferences) next.recentReferences = changes.recentReferences.newValue ?? [];
      if (changes.enabled) next.enabled = changes.enabled.newValue ?? defaults.enabled;
      if (changes.bilingual) next.bilingual = changes.bilingual.newValue ?? defaults.bilingual;
      if (changes.fontSize && ["small", "normal", "large"].includes(changes.fontSize.newValue)) next.fontSize = changes.fontSize.newValue;
      if (changes.onboardingVersion) next.onboardingVersion = changes.onboardingVersion.newValue;
      preferences = { ...preferences, ...next };
      document.dispatchEvent(new CustomEvent("dd55:preferences-changed", { detail: next }));
      if (next.favoriteReferences || next.recentReferences) {
        document.dispatchEvent(new CustomEvent("dd55:reference-collections-changed", { detail: next }));
      }
      if (next.enabled !== undefined || next.bilingual !== undefined) applySheetPreferences(next);
    });
  }

  if (globalThis.chrome?.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message: unknown) => {
      if (!message || typeof message !== "object") return;
      if ((message as { type?: string }).type === "DD55_TOGGLE_LAUNCHER") {
        if (!sheetDetected && !isModernDnd5Table()) return;
        ensurePanel();
        document.dispatchEvent(new CustomEvent("dd55:toggle-launcher"));
        return;
      }
      if ((message as { type?: string }).type === "DD55_ENABLE_COMPANION") {
        ensurePanel();
        return;
      }
      if ((message as { type?: string }).type === "DD55_SHOW_ENTRY") {
        ensurePanel();
        const entryId = (message as { entryId?: string }).entryId;
        if (entryId) document.dispatchEvent(new CustomEvent("dd55:open-entry", { detail: entryId }));
        return;
      }
      if ((message as { type?: string }).type === "DD55_APPLY_PREFERENCES") {
        const next = (message as { preferences?: Partial<Preferences> }).preferences;
        if (next && (typeof next.enabled === "boolean" || typeof next.bilingual === "boolean")) applySheetPreferences(next);
        return;
      }
      if ((message as { type?: string }).type !== "DD55_TRANSLATE_SHEET") return;
      preferences = { ...preferences, enabled: true };
      savePreferences(preferences);
      document.querySelectorAll(".dd55-reference").forEach((element) => element.remove());
      processDocument();
      if (!sheetDetected) return;
      const previous = document.querySelector("#dd55-toast");
      previous?.remove();
      const toast = document.createElement("div");
      toast.id = "dd55-toast";
      toast.textContent = "✓ Traduction française appliquée";
      document.body.append(toast);
      window.setTimeout(() => toast.remove(), 2600);
    });
  }
}

const contentRuntime = globalThis as typeof globalThis & { __dd55ContentStarted?: boolean };
if (!contentRuntime.__dd55ContentStarted) {
  contentRuntime.__dd55ContentStarted = true;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => void start(), { once: true }); else void start();
}
