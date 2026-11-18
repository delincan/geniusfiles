# GeniusFiles — Système de design

Toutes les valeurs vivent dans `src/styles.css` (jetons). Aucun composant ne code de couleur en dur.

## Couleurs (thème sombre)

| Rôle                                               | Jeton                             | Valeur            |
| -------------------------------------------------- | --------------------------------- | ----------------- |
| Fond principal (L0)                                | `background`, `nav-bar`, `media`  | #000000           |
| Sections, cartes, champs (L1)                      | `surface`, `card`, `input`        | #16171A           |
| Panneaux, boutons secondaires, survol (L2)         | `surface-2`, `secondary`, `muted` | #20201E           |
| Menus, feuilles, surfaces interactives (L3)        | `surface-elevated`, `popover`     | #282826           |
| Appui sur une surface L3                           | `surface-3`                       | #323232           |
| Bordures et séparateurs                            | `border`                          | #353639           |
| Contours de contrôle, pistes inactives, poignées   | `handle`                          | #484848           |
| Pictogrammes désactivés                            | `disabled`                        | #585857           |
| Texte principal                                    | `foreground`                      | #ECECEC           |
| Texte secondaire / tertiaire                       | `muted-foreground` / `-2`         | #ABABAB / #858585 |
| Accent (actions, onglet actif, liens, progression) | `primary`                         | #4EA2FE           |

Le noir domine ; la profondeur vient des niveaux L0 → L3, jamais d'un halo, d'un dégradé ou d'une ombre décorative. Les cartes n'ont pas de bordure ; les bordures sont réservées aux menus, champs et contrôles. Le bleu signale une action ou un état actif, il ne remplit jamais une surface décorative : pictogrammes ordinaires en gris clair ou blanc, pastilles d'icône neutres (`surface-2`). Texte sombre sur le bleu (contraste suffisant). Les couleurs de catégorie (désaturées) colorent uniquement le pictogramme du type de fichier.

## Rayons (8–16 px)

`rounded-sm` 8 · `rounded-md` 10 · `rounded-lg`/`rounded-xl` 12 (champs, boutons) · `rounded-2xl` 12 (cartes) · `rounded-3xl`/`rounded-4xl` 16 (fenêtres, feuilles). `rounded-xs` 6 réservé aux badges.

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

## Gestionnaire de fichiers

- Vignettes : `.gf-file-tile` (`data-kind`, `data-size`), teinte du type sur le pictogramme uniquement, fond neutre ; dossiers neutres.
- Lignes : 72 px, séparateur aligné sur le texte, nom sur deux lignes au plus, date et type à gauche, taille ou nombre d'éléments à droite.
- Sélection : `.gf-select-mark` bleu plein, fond de ligne `primary-soft`, aucun aplat bleu plus large.
- Menus d'actions : `SheetActionRow`, pictogramme sans pastille, rouge réservé à Supprimer.
- Confirmations : action principale pleine largeur, Annuler en dessous.

## Automatisations et Paramètres

- Automatisations : cartes compactes (nom, objectif, statut à pastille, déclencheur, dernière exécution), interrupteur, Exécuter, menu « … » ; Supprimer protégé par confirmation.
- Création et modification : page immersive en cinq étapes (Déclencheur, Conditions, Actions, Réglages, Vérification), barre d'étapes bleue, pied Retour / Suivant fixe ; aucune exécution à l'enregistrement.
- Historique : regroupé par date, détail dépliable, couleurs de statut sobres (vert réussi, orange partiel, rouge échec).
- Paramètres : sections titrées (Général, Apparence, Stockage, Gestion des fichiers, Automatisations, Notifications, Confidentialité et sécurité, À propos), lignes `.gf-settings-row`, choix dans une feuille `.gf-option` avec coche bleue.
- Boutons secondaires sur `secondary`, Annuler en texte neutre ; champs et boutons au rayon `--radius-xl`.

## Finitions globales

- Retour : flèche seule 44 px (`BackButton`), sans pastille ; sous-écrans en titre compact 20 px.
- Titres de page sur deux lignes au plus, jamais coupés au milieu d'un mot.
- Chiffres clés : valeur 17/600 au-dessus, libellé 12 px gris dessous, tuile `surface-2` sans bordure.
- Lecteurs : chargement et erreur centrés (`ReaderState`), jamais de texte rouge brut.
- Cases à cocher natives : 20 px, bleu `primary`.
- États : « aucun résultat » distinct de « aucun stockage accessible », chacun avec une action utile.

## Raffinement noir et charbon

- Titres de page 22 px semi-gras (19 px en sous-écran), sans bordure sous l'en-tête ; titres de section 15/600.
- Navigation basse sur fond noir, pictogrammes neutres, onglet actif : pastille `surface-2` et bleu.
- Puces et segments actifs : surface `surface-elevated` et texte bleu, jamais d'aplat bleu.
- Interrupteurs : piste `handle` éteinte, bleue allumée. Curseurs : piste `border`, pouce blanc.
- Voiles modaux opaques (`scrim` 70 %) et en-têtes collants opaques, sans flou (fluidité sur appareils modestes).
- Lecteurs : bouton Lecture blanc sur fond média, progression bleue.

## Interactions tactiles

- **État pressé** : voile `--state-pressed` (texte à 10 %) posé dès le contact du doigt via `data-gf-pressed`. Les éléments compacts (`gf-press`, `gf-chip`) s'enfoncent aussi légèrement (`scale(0.97)`). Dans la barre de navigation, le voile se pose sur la pastille de l'onglet.
- **Panneaux inférieurs** (`BottomSheet sheet`) : menus d'actions et listes de choix. Poignée, ✕, appui sur le fond ou glissement vers le bas pour fermer. Les confirmations restent des dialogues centrés.
- **Appui long** : démarre la sélection (un tic de vibration bref si les vibrations sont activées), jamais une action destructive. Chaque fichier et dossier a aussi un bouton ⋮ en liste comme en grille.
