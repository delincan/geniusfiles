# Rapport de clonage — GeniusFiles (source : AlphaFxStudio/geniusfiles105)

## Méthode
Le dépôt source utilise exactement la même pile que ce projet (TanStack Start + Vite + React 19 + Tailwind v4 + Capacitor 8). La reproduction a donc été faite par report intégral et à l'identique de l'ensemble des fichiers suivis du dépôt, sans réécriture, réinterprétation ni refactorisation.

## Reproduit avec succès
- Toutes les vues et routes : accueil, recherche, catégories (`categorie/$kind`), fichiers récents, applications, nettoyeur, coffre-fort, corbeille, organisation, outils PDF, éditeur audio, assistant (Genius AI), automatisations + historique, paramètres, routes API.
- Tous les composants (fichiers, lecteurs audio/vidéo/image, visionneuse universelle, éditeur photo, éditeur audio, PDF, coffre-fort, widgets d'assistant, UI shadcn, icônes).
- Toute la logique métier locale : analyse, automatisations, jobs/transferts, quotas, publicités, préférences, stockage local, persistance, tri, navigation, états (chargement, vide, erreur, succès), animations, onboarding, splash.
- Design system, polices, thèmes et assets (`src/assets`, `public/`, `resources/`) identiques.
- Configuration Android complète : `capacitor.config.ts`, `android/`, `android-overrides/` (manifeste, plugins Kotlin, services, widgets, ressources, keystore de debug, google-services.json), `dist-mobile/`, `scripts/build-mobile.mjs`, `scripts/apply-android-overrides.mjs`, `scripts/generate-app-icons.mjs`, `ANDROID_BUILD.md`, workflow `.github/workflows/android-build.yml`.
- Fichiers de contexte/mémoire du dépôt : `AGENTS.md`, `.lovable/` (plans archivés), `README.md`, `.env.example`, configs (`tsconfig`, `eslint`, `prettier`, `vitest`, `bunfig`, `components.json`, `bun.lock`).

## Vérifications effectuées
- Dépendances installées (1082 paquets) — OK.
- Application démarrée : l'écran d'accueil, le splash de marque et l'onboarding s'affichent, navigation basse fonctionnelle, aucune erreur console.
- Vérification des types (`tsc`) : aucune erreur.
- Build de production complet : réussi.

## Différences détectées
- Aucune différence volontaire de code, de design ou de comportement par rapport à la source.
- Un test unitaire échoue (`src/lib/files/restore-date.test.ts`, appel à `document` hors environnement DOM dans `src/lib/files/fs.ts`). Ce comportement provient du dépôt source et n'a pas été « corrigé » afin de préserver la fidélité.

## Éléments non reproductibles ici / actions manuelles
- **Génération APK/AAB** : impossible dans cet environnement (pas de SDK Android ni de Gradle/JDK). La chaîne complète est présente et intacte ; la génération se fait via `bun run android:build` en local ou via le workflow GitHub Actions `android-build.yml`.
- **Aucune base de données ni backend distant n'a été créé** : la persistance repose, comme dans la source, sur le stockage local (Capacitor Preferences / Filesystem / stockage navigateur).

## Dépendances externes identifiées (présentes dans la source)
- Passerelle IA distante pour l'assistant Genius AI (`VITE_API_BASE_URL`, par défaut `https://geniusfiles.lovable.app`) : nécessite un réseau et une clé côté serveur ; non simulée.
- Publicités et services Google (AdMob, Firebase/Crashlytics via `google-services.json`) : actifs uniquement dans le build natif Android.
- Plugins natifs Kotlin (accès stockage, biométrie, lecture audio en arrière-plan, widgets, intents) : fonctionnels seulement dans l'APK, pas dans l'aperçu web.

## État final
Clone local complet, stable et exécutable, fidèle au dépôt source, sans ajout fonctionnel, sans base de données ni backend distant.
