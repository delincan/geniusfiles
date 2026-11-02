<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

## Interaction boundaries

- Pull-to-refresh animates only its shared overlay indicator and awaits the page's real refresh; page content is never transformed, preserving virtual-list coordinates.
- Pages with a self-inset header opt into AppShell header inset ownership; the safe-area inset must be applied exactly once.
- Multi-root file lists provide a root-qualified entry key; cached search rows are replaced by a fresh deduplicated scan, never appended to it.

- Keep input-modality tracking in the existing native web-behavior installer and gate shared focus styles with it; one source avoids contradictory touch and keyboard rules.
- Preserve browser-generated click events and native scrolling; global touch-end cancellation can swallow rapid actions and must not be used for zoom prevention.

## Règle obligatoire de vérification (GeniusFiles)

**À la fin de CHAQUE modification de code, avant de répondre à l'utilisateur, exécuter :**

```bash
bun run verify
```

Ce script enchaîne, dans cet ordre : `tsc --noEmit` (typecheck) → `eslint .` →
`prettier --check .` → `vite build`.

Conditions non négociables :

- La tâche n'est **pas terminée** tant que `bun run verify` ne passe pas.
- Zéro erreur TypeScript, zéro erreur ESLint, zéro fichier mal formaté, build vert.
- `react-hooks/exhaustive-deps` est configurée en **erreur** dans `eslint.config.js`
  car elle peut causer des bugs en production (closures périmées). Toute nouvelle
  erreur de cette règle bloque `verify` et la CI Android.
- Corriger tout avertissement d'une règle ayant un impact fonctionnel ou visuel
  (même minime) sur l'APK/AAB, en montant la règle en erreur ou en corrigeant le code.
- Les avertissements `react-refresh/only-export-components` ne concernent que le
  rechargement à chaud en développement ; ils ne bloquent pas la vérification car
  ils n'ont aucun impact sur l'APK/AAB final.
- Ne jamais désactiver une règle, ajouter `eslint-disable`, ni ajouter
  `continue-on-error` dans la CI pour faire passer la vérification.
- Cette règle s'applique aussi après un remix du projet, pour toute session
  Lovable ou tout agent travaillant sur ce dépôt.

La CI Android (`.github/workflows/android-build.yml`) applique la même barrière :
le job `validate` échoue et bloque la génération de l'APK/AAB si `verify` échoue.

## Test config

- `vitest.config.ts` must define `__APP_VERSION__` like `vite.config.ts`; route modules read it at import time and the routing test imports every route.
- Shared hooks that return arrays or callbacks (e.g. `useRoots`) keep the same identity while content is unchanged; callers list them in effect dependencies, and a fresh array each render restarts those effects in a loop.

## Analytics (Firebase)

- Screen views come only from `src/lib/native/analytics.ts` (route + `useAnalyticsScreen` layers); Firebase automatic screen reporting stays disabled in the manifest, otherwise reports show MainActivity/AdActivity and duplicate `screen_view`.
- User-facing screens/routes record one event per user action after it completes; shared lib operations (file ops, archive, search engine) stay untracked because AI, automations and multi-folder selections reuse them.
- Event names, param keys and screen names are whitelisted in both `analytics.ts` and `GeniusFilesAnalyticsPlugin.kt`; `analytics.test.ts` enforces they match.
