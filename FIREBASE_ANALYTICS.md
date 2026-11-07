# GeniusFiles — Firebase Analytics et Crashlytics

## 1. Résultat de l’audit du code

### Causes identifiées et corrections

- **« MainActivity », « AdActivity » et « GeniusFiles »** : le suivi automatique des activités Android est désactivé dans les deux manifestes. Le seul émetteur manuel utilise le même nom français pour `screen_name` et `screen_class`. Ces anciens libellés peuvent donc encore venir de l’historique Firebase ou d’un APK antérieur ; ils ne sont plus produits par le code actuel.
- **Premier écran parfois absent** : l’écran était marqué comme envoyé avant même que le pont Capacitor soit disponible. L’envoi est maintenant confirmé par Android, avec nouvelle tentative lors d’une navigation ou d’un retour au premier plan.
- **Actions perdues au démarrage** : les événements réels sont placés dans une file bornée tant que Capacitor n’est pas prêt. Aucun événement artificiel n’est créé pour remplacer un événement perdu.
- **Temps réel à zéro** : Firebase Analytics est maintenant initialisé nativement dans `GeniusFilesApplication`, avant la WebView. Les signaux automatiques `app_open`, `session_start` et `user_engagement` ne dépendent donc plus du chargement du pont JavaScript. La réception effective reste à vérifier sur téléphone avec DebugView.
- **`file_open` et `file_opened`** : le code actuel n’émet que `file_opened`. L’ancien `file_open` n’est pas supprimé de l’historique Firebase.
- **Recherche déclarée réussie trop tôt** : l’événement est maintenant envoyé à la fin réelle du scan. Zéro résultat est conservé (`item_count=0`) et un échec de fournisseur produit `result=failure`.
- **Valeurs privées normalisées mais encore lisibles** : l’ancien nettoyage transformait une chaîne libre en jeton. Désormais, toute valeur absente des listes blanches JavaScript et Kotlin est abandonnée. Aucun nom de fichier, chemin, terme de recherche, prompt, réponse IA, code PIN, mot de passe ou donnée biométrique n’est accepté.
- **Exceptions non comptées** : les opérations IA et du coffre-fort enregistrent aussi les exceptions, avec une catégorie d’erreur générale et sans son message brut.
- **Fonctionnalités manquantes** : ajout du nettoyeur, de l’organisation, des actions sur applications installées, des lecteurs médias/documents, des favoris et des achèvements d’automatisation.
- **Crashlytics au démarrage** : le pont est retenté lorsque Capacitor apparaît tard. Les erreurs JS utilisent des contextes fixes (`window_onerror`, `unhandledrejection`) et uniquement les cadres techniques de leur pile ; le message brut n’est pas transmis.

Le fichier `google-services.json` déclare bien le package `app.geniusfiles.mobile`, identique à `applicationId`. Les dépendances Analytics et Crashlytics et leurs plug-ins Gradle sont présents.

### Politique de collecte

La collecte est activée nativement et dans le pont JavaScript. Le projet ne contient actuellement ni réglage de consentement ni mécanisme de refus dans ce parcours. Ce constat technique ne constitue pas une validation juridique du consentement.

Les données historiques ne sont ni supprimées ni réinitialisées. Les anciens noms peuvent rester visibles pendant la période de conservation des rapports.

## 2. Écrans suivis

Une vue est envoyée après 400 ms d’affichage stable. Deux vues identiques consécutives sont supprimées. Les dialogues, menus, feuilles, miniatures et filtres ne sont pas des écrans. Les changements Accueil ↔ Gestionnaire de fichiers, les lecteurs et les éditeurs passent par la même pile que les routes, sans second émetteur Android.

- Accueil
- Gestionnaire de fichiers
- Fichiers récents
- Images, Vidéos, Audio, Documents, Téléchargements
- Recherche
- Corbeille
- Coffre-fort
- Genius AI
- Automatisations et Historique des automatisations
- Paramètres
- Outils PDF
- Éditeur photo, Éditeur audio, Éditeur de documents
- Visionneuse d’images, Lecteur vidéo, Lecteur audio, Lecteur PDF, Lecteur de documents
- Gestionnaire d’applications
- Nettoyeur
- Organisation

Les aperçus du coffre-fort restent attribués au Coffre-fort : aucun nom, contenu ou type de fichier protégé n’est ajouté à Analytics.

## 3. Événements canoniques

Tous les événements sont en `snake_case`. Les opérations terminées portent, selon le cas :

- `result` : `success`, `failure` ou `cancelled` ;
- `operation` : variante technique de l’action ;
- `source_screen` : écran d’origine, ajouté automatiquement ;
- `action_category` : grande famille fonctionnelle ;
- `tool_type`, `file_type` : type général autorisé ;
- `item_count` : nombre d’éléments de la sélection globale, zéro compris ;
- `duration_ms` : durée réelle de l’opération ;
- `error_category` : catégorie générale, jamais le message d’erreur.

### Navigation et lecteurs

- `app_opened` (`cold_start` ou reprise après au moins 30 minutes)
- `category_opened`
- `recent_files_opened`
- `favorites_opened`
- `trash_opened`
- `search_performed`
- `file_opened`
- `media_player_used`
- `document_viewer_used`

Les événements `app_open`, `session_start`, `first_open` et `user_engagement` restent des signaux automatiques du SDK. Ils ne sont pas fabriqués par l’application.

### Fichiers et modules

- `file_shared`, `folder_created`
- `file_copied`, `file_moved`, `file_renamed`, `file_deleted`, `file_restored`
- `files_compressed`, `files_extracted`
- `cleaner_completed`
- `organization_completed`
- `application_action_completed`

Pour une sélection de cinq éléments, une seule opération est enregistrée avec `item_count=5`, y compris en cas d’échec ou d’annulation. Les fonctions partagées réutilisées par Genius AI et les automatisations ne recomptent pas ces opérations comme des gestes manuels.

### PDF

- Ouverture : `pdf_tool_used`
- Résultats : `pdf_created`, `pdf_merged`, `pdf_compressed`, `pdf_converted`, `pdf_signed`, `pdf_extracted`, `pdf_edited`

L’ouverture de l’outil et le résultat de l’opération mesurent deux moments différents ; ce ne sont pas deux résultats pour une même exécution.

### Genius AI

- `ai_conversation_started`
- `ai_request_completed`
- `ai_command_executed`

Seuls la famille de commande, le résultat, la durée et la catégorie d’erreur sont transmis. Jamais la demande, la réponse, les noms, chemins, contenus ou termes recherchés.

### Coffre-fort

- `vault_opened` après configuration ou déverrouillage réussi
- `vault_operation_completed` avec `operation=add|restore|delete`

Aucun nom, contenu, type de fichier protégé, PIN, mot de passe ou résultat biométrique n’est transmis.

### Automatisations et éditeurs

- `automation_created`, `automation_enabled`, `automation_disabled`
- `automation_executed` au démarrage réel
- `automation_completed` une fois à la fin, avec résultat agrégé
- `editor_used` pour l’ouverture et chaque enregistrement

Une simulation d’automatisation ne produit aucun événement d’exécution réelle.

## 4. Configuration dans Google Analytics 4

Ces réglages sont manuels : le code ne crée pas automatiquement les rapports personnalisés.

### Dimensions personnalisées

Dans **Administration → Affichage des données → Définitions personnalisées → Dimensions**, créer :

| Nom                | Paramètre         | Portée      |
| ------------------ | ----------------- | ----------- |
| Résultat           | `result`          | Événement   |
| Opération          | `operation`       | Événement   |
| Type de fichier    | `file_type`       | Événement   |
| Écran source       | `source_screen`   | Événement   |
| Type d’outil       | `tool_type`       | Événement   |
| Catégorie d’action | `action_category` | Événement   |
| Catégorie d’erreur | `error_category`  | Événement   |
| Langue de l’app    | `app_language`    | Utilisateur |

### Métriques personnalisées

Dans **Définitions personnalisées → Métriques**, créer :

| Nom                | Paramètre     | Unité                                      |
| ------------------ | ------------- | ------------------------------------------ |
| Éléments concernés | `item_count`  | Standard                                   |
| Durée opération    | `duration_ms` | Standard, valeur exprimée en millisecondes |

Les nouvelles définitions ne recalculent pas les anciennes données. Les rapports standard peuvent prendre de 24 à 48 heures.

### Explorations à créer

1. **Écrans et parcours** : nom d’écran, vues, utilisateurs, chemin précédent/suivant.
2. **Fonctionnalités** : événement, `action_category`, `tool_type`, nombre d’événements et d’utilisateurs.
3. **Réussites et échecs** : `result` et `error_category` en lignes, événement et `operation` en colonnes.
4. **Fichiers groupés** : événement, `file_type`, somme de `item_count`, moyenne de `duration_ms`.
5. **Genius AI** : `ai_request_completed` et `ai_command_executed`, catégorie, résultat, durée et erreurs.
6. **Automatisations** : démarrages, achèvements, déclencheur (`tool_type`), catégorie, résultat et éléments traités.
7. **Qualité PDF et éditeurs** : outil, opération, résultat, erreur et durée.

Les utilisateurs actifs/nouveaux, sessions, durée d’engagement, pays, langue, appareils et versions utilisent d’abord les dimensions et rapports intégrés de GA4. Aucun identifiant utilisateur personnalisé n’est nécessaire.

## 5. Protocole DebugView sur Android réel

Cette procédure reste à effectuer sur un téléphone ; aucune validation Firebase en direct n’est déduite des tests du dépôt.

1. Générer et installer le nouvel APK contenant ces corrections.
2. Activer le mode debug pour cette application seulement :
   ```bash
   adb shell setprop debug.firebase.analytics.app app.geniusfiles.mobile
   ```
3. Forcer l’arrêt de GeniusFiles, rouvrir l’application avec une connexion réseau active, puis ouvrir **Firebase Console → Analytics → DebugView** et choisir l’appareil.
4. Vérifier l’arrivée de `app_opened`, `screen_view`, `app_open` et `session_start`. Dans chaque `screen_view`, contrôler que `firebase_screen` et `firebase_screen_class` affichent le même nom français, jamais MainActivity.
5. Effectuer ce parcours réel :
   - ouvrir chaque onglet principal, une catégorie, Récents, Corbeille et Favoris du coffre ;
   - ouvrir une image, une vidéo, un PDF et chaque éditeur ;
   - compresser une sélection de cinq fichiers et vérifier un seul `files_compressed` avec `item_count=5` ;
   - réussir une fusion PDF, provoquer un échec avec une entrée invalide, puis annuler une opération ;
   - envoyer une demande Genius AI et vérifier qu’aucun texte de la conversation n’apparaît dans les paramètres ;
   - ajouter, restaurer et supprimer un élément du coffre sans jamais voir son nom ni son contenu ;
   - exécuter une automatisation et vérifier un `automation_executed` puis un seul `automation_completed` ;
   - nettoyer une sélection, appliquer une organisation et sauvegarder une application.
6. Vérifier **Temps réel** pendant ces actions. Si DebugView reçoit les événements mais que le compteur reste à zéro, contrôler dans la console le flux Android, la date/l’heure de l’appareil, la connectivité et les éventuels filtres de rapport.
7. Ouvrir **Crashlytics** et vérifier la version, l’appareil, Android, les erreurs non fatales et la clé `webview_screen`. Ne provoquer un crash de test que sur un appareil de test.
8. Désactiver le mode debug après le test :
   ```bash
   adb shell setprop debug.firebase.analytics.app ""
   ```

## 6. Vérifications automatisées et limites

Les tests vérifient les routes et noms d’écrans, les listes blanches JavaScript/Kotlin, les doublons de vues, le démarrage tardif et les échecs du pont, les valeurs privées refusées, les comptes et durées, les résultats PDF (succès/échec/annulation), les automatisations (succès/échec/simulation) et la confidentialité Crashlytics. La CI Android exécute ces tests avant `bun run verify` et avant la génération des APK/AAB.

Restent nécessairement manuels : DebugView, Temps réel, la réception Crashlytics, les ANR et la consultation des rapports GA4. Aucun téléphone physique n’est accessible depuis l’environnement de développement.
