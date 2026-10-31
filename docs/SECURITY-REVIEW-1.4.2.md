# Revue de sécurité — version 1.4.2

État au 31 octobre 2026. Périmètre : dépôt, dépendances npm, manifeste MV3, service worker, rendu du compendium et import de sauvegarde. Revue statique et tests automatisés ; aucun test d’intrusion sur une table Roll20 réelle.

## Résultats et corrections

| Sujet | Constat | Mesure |
| --- | --- | --- |
| Dépendances de développement | L’audit npm initial signalait 5 vulnérabilités connues (3 élevées, 2 modérées), dans Vite, Vitest et leurs dépendances transitives. Aucune dépendance npm de production n’est déclarée. | Vite 6.4.5, Vitest 4.1.12 et versions transitives corrigées dans le lockfile. `npm audit --audit-level=moderate` : 0 vulnérabilité. La CI exécute désormais cet audit. |
| Rendu HTML | Le texte libre de la recherche était interpolé sans échappement dans le message « Aucun résultat ». Une chaîne ressemblant à du HTML pouvait créer des éléments dans le DOM de la page. La fonction d’échappement n’encodait pas les guillemets alors qu’elle sert aussi dans des attributs HTML. | Échappement avant `innerHTML`, encodage des guillemets dans les deux rendus et test de régression avec une balise `img` et un attribut `onerror`. |
| Version de Node.js | La CI utilisait Node 22. | Migration vers Node 24 LTS, version minimale 24.22.2, avec `.node-version`, `engines` et CI cohérents. Le binaire officiel 24.22.2 utilisé localement a été vérifié contre le SHA-256 publié par Node.js. |

## Contrôles complémentaires

- Le manifeste utilise MV3 avec `storage` et `contextMenus`. Le catalogue et le code exécutable sont intégrés au package ; les scripts de génération qui accèdent au réseau ne font pas partie de l’extension distribuée.
- Les ouvertures déclenchées par le service worker sont limitées à des URL HTTPS de fiches AideDD par `isAllowedExternalUrl`. Les mutations de favoris et de récents sont validées avant écriture ; l’import JSON impose une taille maximale de 5 Mo, un format et une confirmation.
- L’extension n’expose pas `externally_connectable` et n’écoute pas `onMessageExternal`. Le script de contenu principal s’exécute dans le monde isolé de Chrome ; le détecteur injecté dans le monde de la page est limité à `app.roll20.net/editor/*`.
- Le premier accueil est réservé par le service worker pour éviter plusieurs parcours simultanés. Les réglages ne sont appliqués qu’après validation ; l’indicateur d’accueil reste local et n’est pas exporté dans les sauvegardes.
- Le build refuse les imports de modules partagés dans le script de contenu, qui doit rester autonome pour son injection par Chrome.
- Les tests sous Node 24.22.2 passent : 329 unitaires, 31 navigateur, vérification TypeScript et build. Les scénarios d’installation neuve, de migration et de synchronisation chargent l’extension réelle dans Chromium.
- Les [imports de catalogues AideDD](AIDEDD-CATALOG-1.4.2.md) valident les URL et métadonnées, excluent les Unearthed Arcana et préservent les identifiants existants. Les fiches DRS restent prioritaires, sans doublons visibles ; seuls les noms, liens et métadonnées sont importés pour les références hors DRS.
- Le [contrôle de mutation](MUTATION-TESTING.md) couvre la validation des sauvegardes, les collections, le premier démarrage et les URL externes : 460 mutations détectées sur 471 (97,66 %), avec un seuil CI de 90 %. L’override `qs` du client HTTP de Stryker maintient l’audit npm sans vulnérabilité connue.

## Risques à suivre

1. Les motifs d’accès couvrent plusieurs sous-domaines Roll20 et le chemin `storage.googleapis.com/roll20-cdn/*`. Ils servent aux différentes surfaces et iframes observées, mais leur réduction demanderait une vérification sur une table Roll20 réelle pour éviter de casser l’intégration.
2. Le détecteur `detector.js` s’exécute dans le monde de la page pour lire les métadonnées de Roll20. Il n’utilise pas les API privilégiées de l’extension ; toute extension future de ce script doit préserver cette limite.
3. L’audit npm ne couvre que les vulnérabilités publiées dans le registre au moment de son exécution. La revue statique et les tests ne constituent pas un audit externe exhaustif.

## Références

- [Versions et statut LTS de Node.js](https://nodejs.org/en/about/previous-releases)
- [Publication officielle de Node.js 24.22.2](https://nodejs.org/en/blog/release/v24.22.2/)
- [Documentation de `npm audit`](https://docs.npmjs.com/cli/v11/commands/npm-audit/)
- [Sécurité des extensions MV3](https://developer.chrome.com/docs/extensions/develop/migrate/improve-security)
- [Scripts de contenu et mondes isolés](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [Sécurité des messages d’extension](https://developer.chrome.com/docs/extensions/develop/concepts/messaging)
