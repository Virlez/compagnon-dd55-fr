import type { Preferences } from "../types";

type QuickPreferences = Pick<Preferences, "enabled" | "bilingual" | "fontSize">;

export function createQuickSetup(panel: HTMLElement, getPreferences: () => Preferences, onApply: (next: QuickPreferences) => void, onClose: () => void) {
  const section = document.createElement("section");
  section.className = "dd55-quick-setup";
  section.dataset.quickSetup = "";
  section.hidden = true;
  section.setAttribute("aria-labelledby", "dd55-setup-title");
  section.innerHTML = `<h2 id="dd55-setup-title" tabindex="-1">Configurez votre compagnon</h2><p>Trois choix pour lire votre feuille et consulter les règles en français. Vous pourrez les modifier dans Réglages.</p><form><label class="dd55-switch"><span><strong>Traduire la feuille en français</strong></span><input type="checkbox" data-setup-enabled></label><label class="dd55-switch"><span><strong>Conserver les noms anglais</strong><small>Affiche le nom original à côté de sa traduction.</small></span><input type="checkbox" data-setup-bilingual></label><label class="dd55-setup-size">Taille du texte<select data-setup-font-size><option value="small">Petite</option><option value="normal">Normale</option><option value="large">Grande</option></select></label><div class="dd55-setup-preview"><small>Aperçu</small><p data-setup-preview></p></div><div class="dd55-setup-actions"><button type="submit" data-setup-start>Commencer</button><button type="button" data-setup-recommended>Utiliser les réglages recommandés</button><button type="button" data-setup-skip>Fermer sans modifier</button></div></form>`;
  panel.querySelector("header")!.after(section);
  const enabled = section.querySelector<HTMLInputElement>("[data-setup-enabled]")!;
  const bilingual = section.querySelector<HTMLInputElement>("[data-setup-bilingual]")!;
  const size = section.querySelector<HTMLSelectElement>("[data-setup-font-size]")!;
  const preview = section.querySelector<HTMLElement>("[data-setup-preview]")!;
  const updatePreview = () => {
    bilingual.disabled = !enabled.checked;
    preview.textContent = !enabled.checked ? "Strength · Dexterity" : bilingual.checked ? "Force (Strength) · Dextérité (Dexterity)" : "Force · Dextérité";
    preview.style.fontSize = size.value === "large" ? "18px" : size.value === "small" ? "13px" : "15px";
  };
  const close = () => {
    if (section.hidden) return;
    section.hidden = true;
    panel.classList.remove("is-setup-open");
    onClose();
  };
  section.addEventListener("change", updatePreview);
  section.querySelector("form")!.addEventListener("submit", event => {
    event.preventDefault();
    onApply({ enabled: enabled.checked, bilingual: bilingual.checked, fontSize: size.value as Preferences["fontSize"] });
    close();
  });
  section.querySelector("[data-setup-recommended]")!.addEventListener("click", () => {
    onApply({ enabled: true, bilingual: true, fontSize: "normal" });
    close();
  });
  section.querySelector("[data-setup-skip]")!.addEventListener("click", close);
  return {
    get isOpen() { return !section.hidden; },
    close,
    show() {
      const preferences = getPreferences();
      enabled.checked = preferences.enabled;
      bilingual.checked = preferences.bilingual;
      size.value = preferences.fontSize ?? "normal";
      updatePreview();
      section.hidden = false;
      panel.classList.add("is-setup-open");
      section.querySelector<HTMLElement>("h2")!.focus();
    }
  };
}
