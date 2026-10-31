# Tests de mutation

StrykerJS 10.1.1 utilise Vitest pour vérifier que les tests échouent lorsqu’une condition, une limite ou une valeur de retour du code est modifiée. L’exécution travaille sur une copie dans `.cache/stryker`, sans modifier les sources de travail.

## Exécution et périmètre

```bash
npm ci
npm run test:mutation
```

Node 24.22.2 ou plus récent dans la branche 24 est requis. Le périmètre est défini dans `stryker.config.json` et sa sélection de tests dans `vitest.mutation.config.ts`.

| Module | Comportements vérifiés |
| --- | --- |
| `src/content/backup.ts` | Format de sauvegarde, réglages valides, valeurs par défaut, références locales/externes, déduplication et limites d’import. |
| `src/services/reference-collections.ts` | Combinaisons de collection/action, références invalides, limites exactes, ajout/retrait et ordre des dix récents. |
| `src/services/onboarding-state.ts` | Détection des installations existantes, versions de configuration et validation des réponses à la réservation du premier accueil. |
| `src/services/external-url.ts` | Autorisation des seules URL de fiches françaises AideDD et refus des préfixes, domaines, chemins ou paramètres hors périmètre. |

Ce score porte sur ces quatre modules. Le rendu du panneau et la file de réservation du service worker restent vérifiés par leurs tests unitaires et navigateur ; ils ne sont pas mutés dans ce premier périmètre.

## Seuil et rapports

Le seuil bloquant est de **90 %** pour le périmètre complet. Aucune famille de mutations n’est désactivée. La CI lance un job dédié et conserve les rapports pendant 14 jours, y compris lorsque le seuil n’est pas atteint.

- Rapport HTML : `reports/mutation/index.html`.
- Rapport JSON : `reports/mutation/mutation.json`.
- Artefact GitHub Actions : `mutation-report`.

## Mesure du 29 octobre 2026

| Mesure | Premier passage | Après renforcement des tests |
| --- | ---: | ---: |
| Mutations générées | 471 | 471 |
| Mutations détectées par les tests | 242 | 460 |
| Survivantes | 151 | 11 |
| Sans couverture | 78 | 0 |
| Score | 51,38 % | **97,66 %** |

Le passage final utilise 147 tests ciblés, sans erreur d’exécution ni dépassement de délai. Il prend environ une minute sur la machine de développement ; cette durée n’est pas un budget de performance.

Les 11 survivantes ont été examinées : cinq modifient des gardes de type redondantes avec les validations suivantes pour les entrées JSON prises en charge ; cinq modifient le traitement de doublons ayant le même contenu ; une retire un accès optionnel dont l’échec est déjà récupéré par `catch`. Elles restent visibles dans le rapport. Le choix du premier ou du dernier doublon devra être réévalué si des métadonnées sont ajoutées aux références.

## Dépendances

Le client HTTP de Stryker, `typed-rest-client` 2.3.1, impose une version de `qs` avec des alertes de sécurité. Un override limité à ce client impose `qs ^6.17.1`. Le lockfile fixe la version résolue ; l’audit npm doit rester vert lors des mises à jour. Aucun de ces outils de test n’est inclus dans l’extension distribuée.

Au 31 octobre 2026, l’alerte [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) concerne aussi la version de `minimatch` imposée par Stryker 10.1.1. Un override limité à `@stryker-mutator/core` utilise `minimatch ^11.0.3`. Le passage complet de mutation vérifie sa compatibilité avec Stryker ; le seuil et le périmètre restent identiques.

## Références

- [Adaptateur Stryker pour Vitest](https://stryker-mutator.io/docs/stryker-js/vitest-runner/)
- [Configuration de StrykerJS](https://stryker-mutator.io/docs/stryker-js/configuration/)
