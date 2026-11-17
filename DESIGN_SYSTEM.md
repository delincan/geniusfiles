# GeniusFiles — Système de design

Toutes les valeurs vivent dans `src/styles.css` (jetons). Aucun composant ne code de couleur en dur.

## Couleurs (thème sombre)

| Rôle                                       | Jeton                             | Valeur  |
| ------------------------------------------ | --------------------------------- | ------- |
| Fond principal                             | `background`                      | #090B0F |
| Cartes principales et champs               | `surface`, `card`, `input`        | #141820 |
| Surfaces secondaires et survol             | `surface-2`, `secondary`, `muted` | #1C222C |
| Menus et fenêtres                          | `surface-elevated`, `popover`     | #262D38 |
| Bordures                                   | `border`                          | #252B35 |
| Texte principal                            | `foreground`                      | #F3F5F7 |
| Texte secondaire                           | `muted-foreground`                | #A6AFBA |
| Bleu signature (actions, focus, sélection) | `primary`                         | #0068F8 |

Le bleu #0068F8 provient du groupe de pixels bleus saturés dominant de la mascotte fournie (quantification RGB par pas de 8). Les couleurs principales sont définies en OKLCH dans les jetons. Le noir donne la profondeur ; les cartes et menus se distinguent par leur niveau de surface, sans halo ni dégradé décoratif. Le bleu signale, il ne colore pas de grandes surfaces.

## Rayons (8–16 px)

`rounded-sm` 8 · `rounded-md` 10 · `rounded-lg`/`rounded-xl` 12 (champs, boutons) · `rounded-2xl` 14 (cartes) · `rounded-3xl`/`rounded-4xl` 16 (fenêtres, feuilles). `rounded-xs` 6 réservé aux badges.

## Typographie

`type-display` 24/600 · `type-title` 18/600 · `type-subtitle` 15/600 · `type-body` 14/400 · `type-label` 13/500 · `type-meta` 12 secondaire · `type-overline` 11 majuscules. **Taille minimale : 11 px.**

## Espacements

Grille de 4 px : `--space-1` 4 → `--space-12` 48. Marges d'écran 16 px, écart entre cartes 12 px.

## Composants

- Boutons / champs : hauteur `--control-height` (52 px), rayon 12 px, bordure 1 px `border`.
- Boutons secondaires : surface neutre `secondary`, texte `secondary-foreground`. Boutons sans fond : texte neutre, sauf liens et actions explicitement accentuées.
- Cartes : `surface-card` (fond `card`, bordure `border`, rayon 14 px), pas d'ombre.
- Menus et fenêtres : fond `popover`, bordure `border`, rayon 16 px.
- Zone tactile minimale : 48 px (`touch-target`).

## Icônes

Source unique : `@/components/icons`. Trait 1,75 forcé partout (1,5 pour les grandes illustrations), terminaisons arrondies, `currentColor`. Une action = une icône exportée, jamais redessinée localement. Tailles : 20 px (barres, menus), 24 px (navigation), 40+ px (états vides).

## Accueil — première étape

En-tête compact avec logo officiel, nom et salutation. Sections titrées à 15/600, séparées par 24 px. Stockage sur une carte unique avec barre pleine largeur ; catégories en deux colonnes sous 480 px, trois au-delà ; libellés sur plusieurs lignes plutôt que tronqués. Fichiers récents et outils en listes ouvertes, sans cartes imbriquées. Métadonnées à 12 px. Navigation neutre, seule la destination active porte le bleu signature.

## Genius AI — deuxième étape

Accueil avec la mascotte officielle, titre 24/600, introduction 14 px et confidentialité dépliable. Conversation ouverte : réponses sans carte à 15 px/1,75, titres 16/600, listes numérotées conservées ; messages utilisateur sur `surface-2`, texte `foreground`. Copier reste une icône avec nom accessible et infobulle. Saisie sur `surface-2`, envoi en `primary`, arrêt neutre. Suggestions défilables au doigt, jamais animées automatiquement. Menu de conversations sur `surface`, sélection neutre avec icône bleue.

Progression : pourcentage des jalons terminés, non une estimation du temps restant. Aucun compteur temporel artificiel ; la barre reste au dernier jalon connu pendant un travail sans total mesurable. 100 % uniquement à la fin réussie du traitement ; échec et annulation ne valent jamais 100 %. La réponse en cours reste masquée jusqu'à la fin réelle. Les quotas et annonces restent contextuels.
