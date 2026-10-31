# Catalogues AideDD — version 1.4.2

Vérification et import du 31 octobre 2026 depuis les listes françaises D&D 5.5 de [sorts](https://www.aidedd.org/spell/fr/) et de [dons](https://www.aidedd.org/feat/fr/). Toutes les sources publiées proposées par ces deux listes sont sélectionnées. Les Unearthed Arcana sont exclues à la requête et à la lecture des lignes.

## Références intégrées

| Source | Sorts | Dons |
| --- | ---: | ---: |
| Player’s Handbook 2024 | 391 | 75 |
| Arcana Unleashed | 33 | 25 |
| Forgotten Realms: Heroes of Faerûn | 19 | 34 |
| Eberron: Forge of the Artificer | 1 | 28 |
| Ravenloft: The Horrors Within | 0 | 2 |
| **Total** | **444** | **164** |

La version précédente contenait 391 sorts et 137 dons. L’extension gagne donc **53 sorts et 27 dons**, soit **80 références**. Arcana Unleashed est un supplément publié distinct des Unearthed Arcana ; il est inclus.

## Priorité au DRS local et compatibilité

- 339 sorts et 17 dons sont reliés explicitement à leur fiche DRS. Ils apparaissent une seule fois sous leur forme locale, sans seconde carte AideDD.
- Les 105 autres sorts et les 147 autres dons sont des références externes avec nom, source, métadonnées et URL. Leurs textes complets ne sont pas importés.
- Les 391 anciens identifiants de sorts et les 137 anciens identifiants de dons sont conservés. Les favoris et récents restent utilisables.
- Les 22 dons renommés dans le catalogue AideDD utilisent leur adresse actuelle. Leurs anciennes traductions françaises restent des alias de recherche.
- Le catalogue global atteint 1 447 références. Les objets magiques et les autres ressources locales sont inchangés.

## Reproduction de l’import

```bash
npm run data:aidedd-spells
npm run data:aidedd-feats
```

L’import lit le formulaire public, active les sources publiées et les catégories normalement décochées (dont les dracogrammes), puis soumet ces filtres. Le parseur lit la structure actuelle des tableaux, qui n’utilise plus toutes les anciennes classes CSS `.colV`, `.colE` ou `.colS`.

L’actualisation s’arrête avant d’écrire si le catalogue est vide, les métadonnées invalides, un identifiant/lien dupliqué ou une ancienne référence absente. Un changement de niveau d’un sort existant demande également une vérification. Les fiches DRS gardent leurs métadonnées de référence et leur contenu local.

## Contrôles

Les tests couvrent la sélection des sources sans UA, le parseur, la conservation des identifiants et alias, les liens DRS, les collisions et les échecs HTTP. Les identités antérieures sont conservées dans `tests/fixtures/aidedd-legacy-identities.json` pour prévenir une rupture des favoris.

Le test du catalogue complet vérifie que chaque fiche locale apparaît exactement une fois, que les URL externes sont uniques et qu’aucune référence liée au DRS n’est aussi affichée comme lien externe. Un scénario navigateur consulte les nouveaux suppléments, recherche un ancien nom de don et vérifie la priorité locale pour Boule de feu et Archerie.
