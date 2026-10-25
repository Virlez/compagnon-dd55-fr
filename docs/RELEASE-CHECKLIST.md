# Checklist de publication

## Vérifications automatiques

- `npm ci`
- `npm run typecheck`
- `npm test`
- `npx playwright install chromium`
- `npm run test:e2e`
- `npm run package`

## Vérifications manuelles

- Charger `dist` comme extension non empaquetée dans Chrome et Edge.
- Vérifier une fiche intégrée, une fiche en fenêtre détachée et une fiche chargée dans une iframe.
- Vérifier les profils Guerrier, Rôdeur, Magicien, Clerc et Roublard.
- Vérifier que les fiches SRD ouvrent le compendium local et que les autres références ouvrent directement le bon onglet AideDD.
- Vérifier le bestiaire, les FP fractionnaires, le panneau de filtres avancés et plusieurs profils multi-pages.
- Vérifier le tri des sorts par pertinence, nom et niveau croissant, puis les filtres avancés seuls ou combinés avec Classe, Niveau et recherche ; contrôler leur compteur et leur repli à chaque ouverture. Confirmer que le tri par pertinence privilégie le nom correspondant.
- Vérifier le tri des objets magiques par pertinence, nom et rareté, avec puis sans recherche.
- Vérifier les compteurs de filtres des huit panneaux, sans compter les tris.
- Vérifier l’accès Récents avec fiches locales et AideDD : compteur, ordre, déduplication, limite de 10, persistance, recherche et effacement.
- Vérifier la navigation Catalogue / Favoris / Récents à 320 px et en vue agrandie : accès visibles pendant le défilement, conservation des recherches et filtres, catégories accessibles au clavier et fermeture du sélecteur par Échap avant le panneau.
- Vérifier l’accès à la dernière référence du catalogue et les compteurs de toutes les catégories.
- Vérifier les favoris locaux et AideDD : ajout depuis une carte locale, une fiche et une carte AideDD, compteur, persistance après rechargement, recherche, retrait, annulation du retrait et liste vide.
- Dans deux onglets Roll20, ajouter et retirer des favoris rapidement, vérifier la synchronisation des compteurs et des listes, puis recharger les deux onglets.
- Vérifier la restauration de la position et du nombre de résultats, `Ctrl/Cmd + K` et les niveaux successifs d’Échap, avec priorité aux fenêtres modales.
- Vérifier les boutons Roll20 sur une attaque, un souffle, une sauvegarde et une action légendaire : modes deux dés, un dé et demande Normal/Avantage/Désavantage, carte privée MJ, aucun envoi par défaut, envoi lorsque l’option dédiée est active et repli vers le presse-papiers.
- Vérifier qu’un brouillon existant dans le chat n’est jamais remplacé et que le chat détaché déclenche bien la copie de la macro.
- Vérifier qu’aucune icône de référence n’apparaît dans le résumé, les points de vie, les sens et les maîtrises/langues.
- Vérifier l'absence d'erreur dans la console de la page et du service worker.
- Relire `PRIVACY.md` et `THIRD_PARTY_NOTICES.md` avant toute soumission à une boutique.

## Livraison

La commande `npm run package` crée l'archive correspondant à la version courante dans `releases/`. Elle contient directement `manifest.json`, les scripts, la feuille de style et les icônes attendus par Chrome/Edge.

## Mise à jour des Stores

- Utiliser les textes de `store-assets/STORE-LISTING-FR.md`.
- Remplacer les captures du compendium antérieures au bestiaire et ajouter une capture de la fenêtre Normal / Avantage / Désavantage.
- Vérifier que l’archive téléversée et son `manifest.json` portent une version strictement supérieure à celle déjà publiée.
- Dans Chrome Web Store, téléverser le nouveau paquet, mettre à jour la fiche et l’onglet **Privacy practices**, puis demander l’examen. Utiliser la publication différée pour valider la fiche avant la mise en ligne.
- Dans Microsoft Partner Center, téléverser la même archive, vérifier les propriétés, la confidentialité, la fiche française et les instructions de certification.
- Après approbation, contrôler l’installation depuis chaque Store sur un profil navigateur propre.
- Surveiller les erreurs et avis pendant les 48 premières heures ; conserver l’archive de la version précédente pour un retour arrière.
