# GeniusFiles — Système de design

Toutes les valeurs vivent dans `src/styles.css` (jetons). Aucun composant ne code de couleur en dur.

## Couleurs (thème sombre)

| Rôle                                          | Jeton                           | Valeur  |
| --------------------------------------------- | ------------------------------- | ------- |
| Fond principal                                | `background`                    | #090B0F |
| Surface secondaire (cartes, champs)           | `surface`, `card`, `input`      | #12161D |
| Surface tertiaire (menus, fenêtres, survol)   | `surface-2`, `popover`, `muted` | #171C24 |
| Bordures                                      | `border`                        | #252B35 |
| Texte principal                               | `foreground`                    | #F3F5F7 |
| Texte secondaire                              | `muted-foreground`              | #A6AFBA |
| Accent (actions, focus, sélection uniquement) | `primary`                       | #4F82D9 |

Le noir domine ; l'accent signale, il ne colore pas de grandes surfaces.

## Rayons (8–16 px)

`rounded-sm` 8 · `rounded-md` 10 · `rounded-lg`/`rounded-xl` 12 (champs, boutons) · `rounded-2xl` 14 (cartes) · `rounded-3xl`/`rounded-4xl` 16 (fenêtres, feuilles). `rounded-xs` 6 réservé aux badges.

## Typographie

`type-display` 24/600 · `type-title` 18/600 · `type-subtitle` 15/600 · `type-body` 14/400 · `type-label` 13/500 · `type-meta` 12 secondaire · `type-overline` 11 majuscules. **Taille minimale : 11 px.**

## Espacements

Grille de 4 px : `--space-1` 4 → `--space-12` 48. Marges d'écran 16 px, écart entre cartes 12 px.

## Composants

- Boutons / champs : hauteur `--control-height` (52 px), rayon 12 px, bordure 1 px `border`.
- Cartes : `surface-card` (fond `card`, bordure `border`, rayon 14 px), pas d'ombre.
- Menus et fenêtres : fond `popover`, bordure `border`, rayon 16 px.
- Zone tactile minimale : 48 px (`touch-target`).

## Icônes

Source unique : `@/components/icons`. Trait 1,75 forcé partout (1,5 pour les grandes illustrations), terminaisons arrondies, `currentColor`. Une action = une icône exportée, jamais redessinée localement. Tailles : 20 px (barres, menus), 24 px (navigation), 40+ px (états vides).
