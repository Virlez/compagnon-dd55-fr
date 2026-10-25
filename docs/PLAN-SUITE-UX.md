# Suite du compendium : diagnostic et plan

Diagnostic initial : 27 septembre 2026. État mis à jour : 28 septembre 2026.

## Objectif

Permettre de trouver une référence, l’épingler et la retrouver pendant une partie, avec une navigation prévisible, un catalogue complet et des données personnelles conservées correctement.

Ce document conserve le diagnostic initial et suit les améliorations demandées pour le compendium.

## État d’avancement au 28 septembre

| Lot | État | Changements et vérifications |
| --- | --- | --- |
| Catalogue complet | Terminé | Recherche exhaustive, compteurs cohérents, pagination, accès au Vautour géant et test du catalogue complet. |
| Favoris, récents et synchronisation | Terminé | Mutations sérialisées par le service worker, validation des références, synchronisation des panneaux, reprise après échec de sauvegarde et test de concurrence prévu avec l’extension chargée. |
| Navigation, focus et contexte | Terminé | Action favoris sur les cartes locales et externes, retour au bon résultat, focus restauré, annulation visible du retrait, vues vides guidées et recherche/contexte conservés par espace. |
| Réactivité | Terminé | Parcours DOM coûteux évités sur les grandes feuilles ; dernier passage : initialisation 918 ms, mutation 50 ms, accueil 328 ms, vues Sorts 207 ms, Objets magiques 152 ms et Monstres 143 ms. Chaque mesure reste sous son budget défini dans `tests/e2e/performance.spec.ts`. |
| Sauvegarde et restauration | Terminé | Export/import JSON des favoris, récents et réglages portables, validation du fichier et confirmation avant remplacement ; tests unitaires et test d’import du panneau. |
| Vérification automatisée | Terminé dans le code | Workflow GitHub Actions pour TypeScript, tests unitaires, Playwright, extension chargée et paquet ; test navigateur exécuté : 27 réussis, 1 ignoré localement. |
| Découpage du code et essai UX réel | En cours | Le service des collections est extrait, mais `panel.ts` porte encore plusieurs responsabilités. Restent l’essai sur une vraie table Roll20, la vérification Chrome/Edge et les contrôles de zoom 125–200 % avec retours utilisateur. |
| Paquet de version | Préparé | Version 1.4.0 dans `package.json`, le lockfile et le manifeste ; archive locale vérifiée. Le test d’installation propre dans Chrome et Edge reste manuel ; aucune publication en boutique n’est lancée. |

Les 161 tests unitaires, le typecheck, le build et les 27 tests fonctionnels navigateur passent. Le test qui charge réellement l’extension est ignoré sur cette machine parce que Chrome Stable ne prend plus en charge `--load-extension` depuis Chrome 137 ; le workflow CI utilise le Chromium de Playwright. Voir les [notes de Chrome](https://developer.chrome.com/blog/extension-news-june-2025?authuser=31) et le guide officiel de [tests de bout en bout pour les extensions](https://developer.chrome.com/docs/extensions/how-to/test/end-to-end-testing). La vérification sur extension chargée reste à confirmer par le workflow CI.

## Diagnostic initial (27 septembre)

- Navigation Catalogue / Favoris / Récents, catégories regroupées, recherche propre à chaque espace et filtres conservés au retour au catalogue.
- Contrôles persistants pendant le défilement ; rendu examiné en panneau étroit, standard et agrandi, y compris en thème sombre.
- Dernières vérifications : 149 tests unitaires et 26 tests fonctionnels navigateur réussis ; compilation et TypeScript réussis.
- Dernier test de performance en échec : mutation à 440 ms pour un budget inférieur à 400 ms. Cette mesure inclut les attentes Playwright ; elle ne démontre pas à elle seule 440 ms de traitement de traduction.
- Les tests navigateur injectent le bundle dans des pages de test. La validation de la nouvelle interface sur une vraie table Roll20, avec l’extension chargée dans Chrome et Edge, reste à faire.

## Constats et niveau de preuve

| Sujet | Constat | Preuve |
| --- | --- | --- |
| Exhaustivité du catalogue | La vue globale s’arrête à 1 264 références au lieu de 1 367. | Reproduit dans Chrome après chargement de toutes les pages : 1 000 fiches locales accessibles. « Vautour géant » absent. `panel.ts` passe une limite de 1 000 à `searchCompendiumResults`. |
| Ajout aux favoris | Les résultats externes proposent l’étoile ; les résultats locaux imposent d’ouvrir la fiche. | Code des cartes et contrôle DOM du catalogue : aucun bouton de favori local. |
| Navigation clavier | Le retour depuis une fiche et le retrait du dernier favori ramènent le focus au document. | Reproduit dans Chrome : `document.activeElement` vaut `BODY` après les deux actions. |
| Plusieurs onglets | Les changements de favoris et récents ne sont pas reçus par les autres panneaux ouverts. Un enregistrement depuis un état ancien peut écraser une modification plus récente. | Lecture de `index.ts` : seuls `enabled` et `bilingual` sont traités dans `storage.onChanged`. Les collections sont réenregistrées intégralement. Scénario concurrent à reproduire en test d’extension. |
| Continuité de consultation | Changer d’espace conserve recherche et filtres, mais remet le défilement à zéro et la limite à 80. | Lecture de `setCategory` dans `panel.ts`. |
| Recherche | Le catalogue utilise un moteur avec mots et pertinence ; Favoris et Récents utilisent une recherche de sous-chaîne. | Lecture des deux branches de `renderList` : une requête équivalente peut produire des résultats différents selon l’espace. |
| Performance de la liste | Le HTML de toutes les correspondances est construit avant de limiter l’affichage aux 80 premières. | Lecture de `renderList`. Coût à mesurer avant de choisir une optimisation. |
| Maintenance et livraison | Le panneau concentre HTML, état, recherche, favoris, événements et jets ; le navigateur de test est fixé à un chemin Windows. | Lecture de `panel.ts` et `playwright.config.ts`. Aucun dossier `.github` présent dans ce checkout. |
| Documentation | La section Confidentialité du README omet encore les favoris alors que `PRIVACY.md` les mentionne. | Lecture des deux documents. |

## Ordre d’exécution

Priorité P1 : correction nécessaire avant livraison. P2 : amélioration à intégrer dans cette stabilisation. P3 : évolution à réévaluer après observation en partie.

### Lot 1 — Catalogue complet et favoris fiables

**P1 — 1. Corriger le plafonnement du catalogue. Effort : petit.**

- Séparer la recherche exhaustive, le calcul du total et la pagination de l’affichage.
- Éliminer la limite arbitraire de 1 000 dans la vue globale.
- Calculer les compteurs à partir du même ensemble de références dédupliquées.
- Ajouter une régression sur le parcours complet et une fiche située en fin de données.

Acceptation : avec les données actuelles, 1 367 références uniques accessibles dans la vue globale ; chargement par lots toujours limité ; Vautour géant accessible ; recherche, tri et filtres cohérents avec les compteurs.

**P1 — 2. Sécuriser la persistance entre onglets. Effort : moyen.**

- Reproduire ajout dans l’onglet A, ajout dans B, retrait dans A et rechargement des deux.
- Centraliser les mutations de collections pour éviter les remplacements issus d’états anciens ; envisager leur sérialisation dans le service worker.
- Répercuter les changements de stockage dans les panneaux déjà montés, sans boucle de réécriture.
- Enregistrer uniquement le réglage modifié, notamment pour la commande de traduction qui réenregistre actuellement l’objet de préférences complet.
- Valider les collections à la lecture et prévoir un retour explicite en cas d’échec de sauvegarde.

Acceptation : deux onglets convergent après chaque action ; aucun favori perdu lors d’actions rapprochées ou d’un changement de traduction ; rechargement fidèle ; récents uniques et limités à dix.

### Lot 2 — Terminer les parcours UX essentiels

**P1 — 3. Harmoniser les favoris et restaurer le focus. Effort : moyen.**

- Proposer la même action d’ajout/retrait sur toutes les cartes locales et externes, y compris dans Récents.
- Garder une séparation claire entre ouvrir la fiche et modifier son favori.
- Au retour d’une fiche, retrouver la carte d’origine et sa position ; choisir un repli explicite si elle n’existe plus.
- Après suppression, placer le focus sur l’élément suivant ou sur un contrôle pertinent de l’état vide.
- Annoncer l’ajout/retrait aux lecteurs d’écran ; proposer une action Annuler après retrait.
- Dans un espace vide, proposer un accès direct au catalogue.

Acceptation : ajouter un favori sans ouvrir sa fiche ; aucun saut involontaire vers le document au clavier ; retour à la même référence ; retrait réversible.

**P2 — 4. Conserver le contexte et rendre les recherches cohérentes. Effort : moyen.**

- Mémoriser pour chaque espace la recherche, le défilement et le nombre de résultats déjà chargés pendant la session.
- Ne pas réinitialiser la vue lorsqu’on clique sur l’espace déjà actif.
- Réutiliser les mêmes règles de recherche pour le catalogue, les favoris et les récents, en limitant le périmètre aux références de l’espace.
- Montrer clairement les filtres actifs et permettre leur effacement, y compris quand ils sont dans un panneau replié.

Acceptation : après 160 résultats chargés, un aller-retour Catalogue → Favoris → Catalogue retrouve la même liste et la même position ; les variantes de requête déjà prises en charge par le catalogue fonctionnent aussi dans Favoris.

**P2 — 5. Valider l’ergonomie en situation de jeu. Effort : moyen.**

- Faire essayer trois tâches : retrouver un sort et l’épingler ; consulter un monstre puis revenir à la liste ; retrouver un favori sans perdre le contexte du catalogue.
- Observer hésitations, mauvais clics et perte de contexte. La satisfaction sur le nouveau menu reste à confirmer avec l’utilisateur.
- Examiner la lisibilité des textes secondaires, la largeur des cartes en mode agrandi et la place occupée par les filtres sur petite hauteur.
- Contrôler zoom 125 %, 150 % et 200 %, taille de texte grande, thèmes clair/sombre, clavier et focus non masqué par les éléments fixes.
- Ajuster les dimensions et libellés à partir de ces observations.

Acceptation : les trois tâches sont réalisables sans aide ; aucun contenu ou contrôle indispensable inaccessible aux tailles testées ; validation du rendu sur Roll20 réel.

### Lot 3 — Mesurer puis stabiliser la performance et le code

**P1 — 6. Diagnostiquer le budget de performance en échec. Effort : moyen, à préciser après mesure.**

- Mesurer dans la page le délai entre mutation et référence traduite, en séparant temps de traitement et surcoût du pilotage de test.
- Répéter un protocole défini sur une machine de référence et conserver les mesures ; distinguer démarrage et mises à jour.
- Profiler la portée des parcours DOM, les mutations produites par l’extension et la fréquence des traitements.
- Optimiser la cause mesurée, puis vérifier que la réactivité perçue et les traductions restent correctes.

Acceptation : protocole documenté et reproductible, budget validé sur ce protocole. Ne pas augmenter arbitrairement les seuils pour obtenir un test vert.

**P2 — 7. Réduire le travail de rendu et clarifier les responsabilités. Effort : moyen.**

- Trier et paginer les résultats avant de produire le HTML des cartes.
- Extraire progressivement la navigation, les collections et les cartes de `panel.ts`, avec les tests de comportement existants comme protection.
- Centraliser les dimensions/couleurs nécessaires à l’interface et isoler les styles exposés aux règles globales de Roll20.
- Évaluer le chargement du catalogue embarqué d’environ 2,26 Mo seulement si le profilage montre un impact notable ; préserver le fonctionnement hors ligne et les contraintes des scripts d’extension.

Acceptation : comportement conservé, rendu limité aux références affichées, métriques avant/après disponibles ; aucune migration de framework nécessaire à ce lot.

### Lot 4 — Préparer une livraison reproductible

**P1 pour la livraison — 8. Compléter les vérifications et le paquet. Effort : moyen.**

- Ajouter des tests avec l’extension réellement chargée pour stockage, service worker, plusieurs onglets et rechargement.
- Rendre le choix du navigateur configurable et installer une vérification automatisée reproductible : dépendances verrouillées, TypeScript, tests unitaires, build, tests navigateur et paquet.
- Exécuter la checklist dans Chrome et Edge sur les surfaces Roll20 prises en charge.
- Aligner README, confidentialité, textes de boutique et captures avec les fonctions réellement livrées.
- Préparer une version et une archive identifiables, puis vérifier une installation propre. La publication reste une étape distincte à autoriser.

Acceptation : catalogue complet, persistance fiable, parcours clavier validés, aucun échec inexpliqué dans les vérifications, paquet installable et documentation cohérente.

## Dépendances et jalons

1. **Jalon A : données fiables** — tickets 1 et 2 terminés.
2. **Jalon B : parcours validés** — tickets 3 à 5 terminés, avec validation du menu en utilisation réelle.
3. **Jalon C : stabilité** — tickets 6 et 7 terminés. Le diagnostic du ticket 6 peut commencer dès le jalon A.
4. **Jalon D : version distribuable** — ticket 8 et checklist de publication terminés.

Les efforts sont relatifs : petit = modification localisée ; moyen = plusieurs responsabilités et scénarios de régression. Aucun délai calendaire ferme avant le diagnostic de concurrence et de performance.

## Évolutions à réévaluer ensuite — P3

- Collections de favoris par personnage ou campagne, si une longue liste unique devient réellement difficile à utiliser.
- Filtres enregistrés, si des combinaisons sont répétées pendant les parties.
- Personnalisation des accès rapides, si les essais montrent des catégories systématiquement utilisées.

Le prochain contrôle concret est l’essai UX du ticket 5 sur une vraie table Roll20, puis la vérification du paquet 1.4.0 dans Chrome et Edge. Les observations de cet essai serviront à décider si d’autres changements visuels sont nécessaires.
