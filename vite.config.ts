import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const packageMetadata = JSON.parse(readFileSync(fileURLToPath(new URL("./package.json", import.meta.url)), "utf8")) as { version: string };

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        content: fileURLToPath(new URL("./src/content/index.ts", import.meta.url)),
        detector: fileURLToPath(new URL("./src/content/detect-modern-table.ts", import.meta.url)),
        background: fileURLToPath(new URL("./src/background.ts", import.meta.url))
      },
      output: { entryFileNames: "[name].js", assetFileNames: "content.[ext]" }
    }
  },
  plugins: [{
    name: "copy-manifest",
    generateBundle(_, bundle) {
      const content = bundle["content.js"];
      if (content?.type === "chunk") {
        if (content.imports.length || content.dynamicImports.length) this.error("Le script de contenu Chrome doit être autonome, sans import de module partagé.");
        content.code = `(() => {\n${content.code}\n})();\n`;
      }
      this.emitFile({ type: "asset", fileName: "manifest.json", source: JSON.stringify({
        manifest_version: 3,
        name: "Compagnon D&D 5.5 FR",
        description: "Traduction française, compendium DRS hors ligne, récents et jets intégrés pour la feuille D&D 2024 de Roll20.",
        version: packageMetadata.version,
        icons: {
          "16": "icons/icon-16.png",
          "32": "icons/icon-32.png",
          "48": "icons/icon-48.png",
          "128": "icons/icon-128.png"
        },
        permissions: ["storage", "contextMenus"],
        host_permissions: [
          "https://app.roll20.net/*",
          "https://*.roll20.net/*",
          "https://*.roll20preflight.net/*",
          "https://storage.googleapis.com/roll20-cdn/*"
        ],
        background: { service_worker: "background.js", type: "module" },
        action: { default_title: "Afficher ou masquer le Compendium D&D 5.5 FR" },
        content_scripts: [{
          matches: ["https://app.roll20.net/editor/*"],
          js: ["detector.js"],
          run_at: "document_start",
          world: "MAIN"
        }, {
          matches: [
            "https://app.roll20.net/*",
            "https://*.roll20.net/*",
            "https://*.roll20preflight.net/*",
            "https://storage.googleapis.com/roll20-cdn/*"
          ],
          js: ["content.js"],
          css: ["content.css"],
          run_at: "document_idle",
          all_frames: true,
          match_about_blank: true
        }]
      }, null, 2) });
    }
  }]
});
