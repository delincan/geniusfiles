package app.geniusfiles.mobile

import android.os.Bundle
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.firebase.analytics.FirebaseAnalytics

/**
 * Pont entre la WebView et Google Analytics for Firebase.
 *
 *  - `logScreenView` : seul émetteur de `screen_view`. Le suivi automatique
 *    du SDK est désactivé dans le manifeste
 *    (`google_analytics_automatic_screen_reporting_enabled=false`) : il ne
 *    voyait que MainActivity / AdActivity. Seuls les noms d'écran de
 *    `ALLOWED_SCREENS` sont acceptés.
 *  - `logEvent` : noms d'événements et clés de paramètres en liste blanche,
 *    valeurs réduites à des jetons courts, plus un compteur `item_count`.
 *  - sessions, engagement, versions d'app, appareil, OS, pays, langue :
 *    collectés automatiquement par le SDK, aucun code requis.
 *
 * Confidentialité — ne transitent JAMAIS par ce pont : contenu ou nom ou
 * chemin de fichier, terme de recherche, données du coffre-fort, PIN / mot
 * de passe, texte Genius AI. `setUserId` n'est volontairement pas exposé.
 *
 * Coût : écritures en file d'attente asynchrone du SDK, aucune I/O
 * bloquante côté WebView.
 *
 * Les listes ci-dessous doivent rester alignées avec
 * `src/lib/native/analytics.ts` (vérifié par `analytics.test.ts`).
 */
@CapacitorPlugin(name = "GeniusFilesAnalytics")
class GeniusFilesAnalyticsPlugin : Plugin() {
    private val analytics: FirebaseAnalytics?
        get() = try {
            FirebaseAnalytics.getInstance(context)
        } catch (_: Throwable) {
            null
        }

    /** Jetons techniques uniquement : lettres minuscules, chiffres, `_`. */
    private fun token(raw: String?, max: Int): String {
        val value = raw ?: return ""
        val cleaned = value.lowercase().filter { (it in 'a'..'z') || (it in '0'..'9') || it == '_' }
        return if (cleaned.length > max) cleaned.take(max) else cleaned
    }

    /** Noms d'écran autorisés (identiques à `SCREENS` côté WebView). */
    private val allowedScreens = setOf(
        "Accueil",
        "Gestionnaire de fichiers",
        "Fichiers récents",
        "Images",
        "Vidéos",
        "Audio",
        "Documents",
        "Téléchargements",
        "Recherche",
        "Corbeille",
        "Coffre-fort",
        "Genius AI",
        "Automatisations",
        "Historique des automatisations",
        "Paramètres",
        "Outils PDF",
        "Éditeur photo",
        "Éditeur audio",
        "Éditeur de documents",
        "Visionneuse d'images",
        "Lecteur vidéo",
        "Lecteur audio",
        "Lecteur PDF",
        "Lecteur de documents",
        "Gestionnaire d'applications",
        "Nettoyeur",
        "Organisation",
        "Autre écran",
    )

    /** Vue d'écran : seul le nom logique et lisible de l'écran est transmis. */
    @PluginMethod
    fun logScreenView(call: PluginCall) {
        val screen = call.getString("screen") ?: ""
        val fa = analytics
        if (fa == null || screen !in allowedScreens) {
            call.resolve()
            return
        }
        val params = Bundle()
        params.putString(FirebaseAnalytics.Param.SCREEN_NAME, screen)
        // La classe porte le même nom lisible : le rapport « Titre de la
        // page et classe de l'écran » n'affiche plus « GeniusFiles ».
        params.putString(FirebaseAnalytics.Param.SCREEN_CLASS, screen)
        fa.logEvent(FirebaseAnalytics.Event.SCREEN_VIEW, params)
        call.resolve()
    }

    /** Clés de paramètres texte autorisées : aucune autre n'est transmise. */
    private val allowedKeys = setOf(
        "operation",
        "result",
        "file_type",
        "source_screen",
        "tool_type",
        "action_category",
    )

    /** Événements autorisés : toute autre valeur est ignorée. */
    private val allowedEvents = setOf(
        "application_opened",
        "search_performed",
        "file_opened",
        "file_shared",
        "folder_created",
        "file_copied",
        "file_moved",
        "file_renamed",
        "file_deleted",
        "file_restored",
        "file_compressed",
        "file_extracted",
        "pdf_tool_used",
        "pdf_created",
        "pdf_merged",
        "pdf_compressed",
        "pdf_converted",
        "pdf_signed",
        "pdf_extracted",
        "pdf_edited",
        "ai_conversation_started",
        "ai_request_completed",
        "ai_command_executed",
        "vault_opened",
        "vault_file_added",
        "vault_file_restored",
        "vault_file_deleted",
        "automation_created",
        "automation_enabled",
        "automation_disabled",
        "automation_executed",
        "editor_used",
    )

    @PluginMethod
    fun logEvent(call: PluginCall) {
        val name = token(call.getString("name"), 40)
        val fa = analytics
        if (fa == null || name.isEmpty() || name !in allowedEvents) {
            call.resolve()
            return
        }
        val bundle = Bundle()
        val params = call.getObject("params")
        if (params != null) {
            for (key in allowedKeys) {
                val value = token(params.optString(key, ""), 40)
                if (value.isNotEmpty()) bundle.putString(key, value)
            }
        }
        val count = call.getInt("count")
        if (count != null && count > 0) bundle.putLong("item_count", count.coerceAtMost(100000).toLong())
        fa.logEvent(name, bundle)
        call.resolve()
    }

    /** Propriétés utilisateur autorisées (valeur vide = suppression). */
    private val allowedUserProperties = setOf("app_language", "app_version")

    @PluginMethod
    fun setUserProperty(call: PluginCall) {
        val name = call.getString("name") ?: ""
        val raw = call.getString("value") ?: ""
        val value = raw.filter { it.isLetterOrDigit() || it == '_' || it == '-' || it == '.' }.take(36)
        val fa = analytics
        if (fa == null || name !in allowedUserProperties) {
            call.resolve()
            return
        }
        fa.setUserProperty(name, value.ifEmpty { null })
        call.resolve()
    }

    @PluginMethod
    fun setEnabled(call: PluginCall) {
        val enabled = call.getBoolean("enabled", true) ?: true
        analytics?.setAnalyticsCollectionEnabled(enabled)
        call.resolve()
    }

    @PluginMethod
    fun isAvailable(call: PluginCall) {
        val result = JSObject()
        result.put("available", analytics != null)
        call.resolve(result)
    }
}
