# Fiche Store française — version 1.3.0

Ce document contient les textes prêts à copier dans le Chrome Web Store et Microsoft Edge Add-ons.

## Métadonnées

- **Nom** : Compagnon D&D 5.5 FR
- **Langue principale** : français
- **Catégorie suggérée** : Productivité ou Outils, selon les catégories proposées par le tableau de bord
- **Site** : https://github.com/virlez-creations/compagnon-dd55-fr
- **Assistance** : https://github.com/virlez-creations/compagnon-dd55-fr/issues
- **Politique de confidentialité** : https://github.com/virlez-creations/compagnon-dd55-fr/blob/main/PRIVACY.md

## Description courte

> Traduction française, compendium DRS hors ligne, récents et jets intégrés pour la feuille D&D 2024 de Roll20.

Cette description fait 115 caractères et correspond au champ `description` du manifeste.

## Description détaillée

> Jouez sur Roll20 avec une feuille D&D 2024 plus accessible en français.
>
> Compagnon D&D 5.5 FR traduit et enrichit localement la feuille D&D 2024 de Roll20. L’extension ajoute un compendium français consultable sans quitter la table, fondé sur le SRD 5.2.1 français et utilisable hors ligne.
>
> PRINCIPALES FONCTIONNALITÉS
>
> • traduction des principaux libellés de la feuille ;
> • noms anglais conservés en option ;
> • recherche locale avec résultats par pertinence dans les règles, sorts, dons, classes, origines, équipements et objets magiques ;
> • dix espèces jouables, avec une fiche Aasimar complémentaire clairement distinguée du contenu SRD ;
> • filtres avancés des sorts par école, rituel et concentration ;
> • tri des sorts par nom ou par niveau croissant ;
> • historique des 10 dernières références consultées, avec recherche et effacement ;
> • favoris persistants pour retrouver les références locales et AideDD épinglées ;
> • export et restauration manuels des favoris, récents et réglages dans un fichier JSON ;
> • retour à la liste restauré et raccourci Ctrl/Cmd + K vers la recherche ;
> • compteurs de filtres actifs dans les différentes catégories ;
> • bestiaire de 330 profils avec filtres simples ou avancés ;
> • fiches de monstres complètes : caractéristiques, défenses, sens, traits, actions, réactions et actions légendaires ;
> • boutons de jets Roll20 pour les attaques, dégâts, soins et sauvegardes exploitables ;
> • choix entre deux d20, un seul d20 ou une demande Normal / Avantage / Désavantage ;
> • envoi automatique des jets disponible en option, sans écraser un brouillon existant ;
> • thèmes clair et sombre, affichage compact ou confortable et panneau repositionnable.
>
> RESPECT DE VOS DONNÉES
>
> L’extension fonctionne localement, sans compte supplémentaire, publicité, analyse d’usage ni télémétrie. Elle ne collecte et ne transmet aucune fiche de personnage ou donnée de campagne. Les contenus du SRD sont intégrés à l’extension. Les préférences d’interface, les identifiants des favoris et ceux des dix références récentes sont conservés dans le stockage local du navigateur. Un fichier de sauvegarde est créé ou lu uniquement après une action explicite.
>
> COMPATIBILITÉ
>
> Nécessite une table Roll20 utilisant la feuille D&D 2024 moderne. Certaines références françaises absentes du compendium local peuvent ouvrir AideDD uniquement après un clic explicite.
>
> Projet indépendant, non affilié à Roll20, Wizards of the Coast ou AideDD. Le contenu SRD intégré est utilisé sous licence Creative Commons Attribution 4.0.

## Notes de version 1.3.0

> • Ajout des filtres avancés École, Rituel et Concentration aux 391 sorts.
> • Ajout du tri des sorts par nom ou par niveau croissant.
> • Ajout de l’Aasimar aux espèces, avec une source complémentaire distincte du SRD.
> • Nouvel historique compact conservant les 10 dernières références locales ou AideDD consultées.
> • Retour à la liste restauré, avec position et nombre de résultats conservés.
> • Nouveau raccourci Ctrl/Cmd + K et navigation progressive avec Échap.
> • Ajout de compteurs de filtres actifs dans toutes les catégories concernées.
> • Améliorations du clavier, des petites largeurs et des thèmes clair/sombre.

## Déclarations à préparer dans l’onglet Confidentialité

### Objectif unique

> Améliorer l’utilisation en français de la feuille D&D 2024 sur Roll20 grâce à une traduction locale, un compendium DRS hors ligne et des outils de jets destinés aux joueurs et au MJ.

### Justification des permissions

- **storage** : mémoriser les préférences d’interface, les identifiants des favoris et ceux des dix références récentes, dans le stockage local du navigateur.
- **contextMenus** : proposer la commande « Traduire cette fiche D&D 2024 » dans le menu contextuel du navigateur.
- **Accès aux domaines Roll20 et à ses hébergeurs de fiches** : traduire et enrichir la feuille D&D 2024 lorsqu’elle est intégrée à la table, dans une iframe ou dans une fenêtre détachée.
- **Code distant** : non. Tout le code exécutable et le catalogue SRD sont inclus dans l’archive.

### Traitement des données

Par prudence, déclarer le traitement local du **contenu de sites web** si ce choix apparaît dans le formulaire du Store. Préciser que les libellés visibles de la feuille sont traités uniquement sur l’appareil pour fournir la traduction et les références, sans collecte, conservation, vente ou transmission à un tiers. Certifier que les données ne servent qu’à l’objectif unique de l’extension.

## Instructions destinées aux examinateurs

> 1. Ouvrir une table Roll20 utilisant la feuille D&D 2024 moderne.
> 2. Ouvrir une fiche de personnage ou cliquer sur le bouton « D&D 5.5 FR ».
> 3. Vérifier la traduction des libellés et ouvrir le compendium.
> 4. Choisir l’onglet « Monstres », rechercher « Aboleth » puis ouvrir sa fiche.
> 5. Cliquer sur le bouton Roll20 de l’action « Tentacule » : la macro privée est préparée sans être envoyée.
> 6. Dans Réglages, choisir « Demander à chaque jet » pour vérifier la fenêtre Normal / Avantage / Désavantage.
> 7. Le réglage d’envoi automatique est désactivé par défaut.
>
> Aucun compte propre à l’extension et aucun achat ne sont nécessaires. Un compte Roll20 et une table compatible sont requis pour reproduire l’intégration complète.

## Ordre recommandé des captures

1. Feuille Roll20 traduite.
2. Vue générale du compendium avec les onglets actuels.
3. Fiche complète d’un monstre en mode grand avec le bouton Roll20.
4. Résultats des jets du monstre dans le chat Roll20.
5. Fenêtre Normal / Avantage / Désavantage.

Les cinq captures sont prêtes en `1280×800` dans `store-assets/screenshots/`.

## Références officielles

- Chrome — mise à jour d’une extension : https://developer.chrome.com/docs/webstore/update
- Chrome — fiche Store : https://developer.chrome.com/docs/webstore/cws-dashboard-listing
- Chrome — images : https://developer.chrome.com/docs/webstore/images
- Chrome — déclarations de confidentialité : https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
- Edge — publication d’une extension : https://learn.microsoft.com/microsoft-edge/extensions/publish/publish-extension
