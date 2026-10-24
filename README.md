# Compagnon D&D 5.5 FR

**[Installer l’extension depuis le Chrome Web Store](https://chromewebstore.google.com/detail/compagnon-dd-55-fr/hamfahkbjnljnmcofgefoimhaabmjalb)**

## Pourquoi ce compagnon ?

Compagnon D&D 5.5 FR s’adresse à tous les joueurs et meneurs francophones qui utilisent la feuille D&D 2024 de Roll20. L’idée est née des difficultés rencontrées par les joueurs de mon groupe face à la feuille et aux références de règles en anglais. L’extension traduit l’interface et met à disposition un compendium fondé sur le SRD 5.2.1 français, directement dans la table, pour faciliter l’accès aux règles sans interrompre la partie. Elle est publiée sur le Chrome Web Store.

Extension Chrome/Edge Manifest V3 pour la feuille **D&D 2024 de Roll20**. Elle traduit l’interface en français, enrichit les sorts, dons et aptitudes, et donne accès à un compendium et un bestiaire locaux fondés sur le SRD 5.2.1 français.

## Fonctionnalités

- traduction automatique des principaux libellés de la feuille D&D 2024 ;
- affichage optionnel des noms anglais à côté des traductions françaises ;
- détection des sorts, dons et aptitudes de classe dans les contenus dynamiques de Roll20 ;
- compendium local consultable hors ligne : règles, sorts, dons, classes, sous-classes, origines, équipement, objets magiques et tables de progression ;
- bestiaire DRS hors ligne de **330 profils** (235 monstres et 95 animaux), avec filtres simples par type et FP et filtres avancés repliables ;
- boutons de jet sur les attaques et actions mécaniques des monstres : un ou deux d20, choix Normal/Avantage/Désavantage à la demande, envoi automatique optionnel ou copie de la macro ;
- recherche, tri des sorts par nom ou niveau et filtres par classe et niveau, complétés par un panneau avancé repliable pour l’école, les rituels et la concentration ;
- bouton d’historique compact dans l’en-tête pour retrouver les 10 dernières fiches locales ou références AideDD consultées, sans ajouter une ligne aux catégories ;
- retour à la liste avec position et nombre de résultats restaurés, raccourci `Ctrl/Cmd + K` vers la recherche et navigation progressive avec Échap ;
- compteurs de filtres actifs dans chaque catégorie ;
- catalogue de 350 objets magiques avec filtres combinables par type et rareté ;
- catalogue d’armes, d’armures et de boucliers avec filtres par type et maîtrise d’arme, et accès direct à la règle de chaque botte d’arme ;
- catalogue de 10 espèces, dont les neuf espèces du SRD et une fiche Aasimar complémentaire clairement attribuée, ainsi que les historiques du SRD avec accès direct au don accordé ;
- catalogue complémentaire de **391 sorts** et **75 dons**, avec liens vers AideDD lorsque la fiche n’est pas disponible dans le SRD local ;
- menu contextuel **Traduire cette fiche D&D 2024** ;
- prise en charge des différentes frames et surfaces utilisées par Roll20.

## Installation locale

Prérequis : [Node.js](https://nodejs.org/) et npm.

```bash
npm install
npm run build
```

Dans Chrome ou Edge :

1. ouvrez `chrome://extensions` ou `edge://extensions` ;
2. activez le **Mode développeur** ;
3. choisissez **Charger l’extension non empaquetée** ;
4. sélectionnez le dossier `dist` généré par le build.

Après une modification du code, relancez `npm run build`, puis rechargez l’extension depuis la page des extensions.

## Utilisation

Ouvrez une table Roll20 utilisant la feuille officielle D&D 5 moderne (`dnd2024byroll20`). Le bouton **D&D 5.5 FR** donne accès au compendium dès l'arrivée sur la table :

- **Traduire la feuille** active ou désactive les enrichissements ;
- **Conserver les noms anglais** affiche les noms bilingues lorsqu’ils sont disponibles.

Faites glisser le bouton pour le placer où vous le souhaitez. Un clic sur l'icône de l'extension dans Chrome ou Edge permet de masquer ou réafficher ce bouton ; sa position et sa visibilité sont mémorisées.

Dans une fiche de monstre, le bouton **Roll20** prépare une carte privée pour le MJ avec le jet d’attaque, les dégâts, les sauvegardes et les effets disponibles. Le réglage **Mode des jets d’attaque** permet de toujours lancer deux d20 indépendants, de lancer un seul d20 ou de demander à chaque attaque entre Normal, Avantage et Désavantage. Dans ce dernier mode, l’Avantage conserve le meilleur de deux d20 et le Désavantage le moins bon. Par défaut, la commande est placée dans un chat Roll20 visible et vide sans être envoyée. Le réglage **Lancer automatiquement les jets** permet de l’envoyer immédiatement par le bouton officiel du chat. Si le chat est masqué, détaché ou contient déjà un brouillon, la macro est copiée dans le presse-papiers sans écraser le texte existant.

Vous pouvez également faire un clic droit dans la fiche et sélectionner **Traduire cette fiche D&D 2024**. Les références absentes du SRD local ne sont ouvertes sur AideDD qu’après une action explicite de votre part.

## Développement et vérifications

```bash
npm test
npm run typecheck
npm run build
npm run test:e2e
```

Pour reconstruire automatiquement pendant le développement :

```bash
npm run dev
```

## Régénérer le compendium

Le fichier `fr_srd_cc_v5.2.1.pdf` sert de source au compendium embarqué. La génération nécessite Python ainsi que `pypdf` et `pdfplumber`.

```bash
python scripts/extract-srd.py
python scripts/extract-class-tables.py
python scripts/build-compendium.py
python scripts/build-monsters.py
```

Pour actualiser les métadonnées École, Rituel et Concentration des 391 références AideDD, exécutez `npm run data:aidedd-spells`. Cette génération est la seule étape qui accède au réseau ; l’extension construite reste entièrement hors ligne.

Les scripts produisent les données structurées utilisées par l’extension dans `src/data/`.

## Paquet installable

```bash
npm run package
```

L'archive prête à distribuer est générée dans `releases/`. Consultez aussi [la checklist de publication](docs/RELEASE-CHECKLIST.md), [la politique de confidentialité](PRIVACY.md) et [les attributions](THIRD_PARTY_NOTICES.md).

## Confidentialité

L’extension ne collecte ni ne transmet les champs ou données du personnage. Elle traite localement les contenus visibles nécessaires à la traduction et conserve uniquement les préférences d’interface ainsi que les identifiants des 10 dernières références consultées dans le stockage local du navigateur. Le compendium SRD est embarqué dans l’extension et fonctionne hors ligne.

## Attribution

Cette œuvre inclut du matériel issu du System Reference Document 5.2.1 (« SRD 5.2.1 ») de Wizards of the Coast LLC, disponible sur [D&D Beyond](https://www.dndbeyond.com/srd), sous licence [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/deed.fr).

AideDD est utilisé comme destination pour certaines références françaises absentes du compendium local. Ce projet n’est affilié ni à Roll20, ni à Wizards of the Coast, ni à AideDD.
