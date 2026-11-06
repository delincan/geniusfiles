package app.geniusfiles.mobile

import android.os.Bundle
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.firebase.analytics.FirebaseAnalytics

/**
 * Second verrou de confidentialité, appliqué dans le processus Android.
 *
 * Les chaînes ne sont jamais transformées en jetons : une valeur absente des
 * listes blanches est ignorée. Un nom de fichier ou une recherche ne peut
 * donc pas réapparaître sous une forme normalisée. Seuls des identifiants
 * techniques et des nombres agrégés atteignent Firebase Analytics.
 */
@CapacitorPlugin(name = "GeniusFilesAnalytics")
class GeniusFilesAnalyticsPlugin : Plugin() {
    private val analytics: FirebaseAnalytics?
        get() = try {
            FirebaseAnalytics.getInstance(context)
        } catch (_: Throwable) {
            null
        }

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

    private val allowedEvents = setOf(
        "app_opened",
        "category_opened",
        "recent_files_opened",
        "favorites_opened",
        "trash_opened",
        "search_performed",
        "file_opened",
        "media_player_used",
        "document_viewer_used",
        "file_shared",
        "folder_created",
        "file_copied",
        "file_moved",
        "file_renamed",
        "file_deleted",
        "file_restored",
        "files_compressed",
        "files_extracted",
        "cleaner_completed",
        "organization_completed",
        "application_action_completed",
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
        "vault_operation_completed",
        "automation_created",
        "automation_enabled",
        "automation_disabled",
        "automation_executed",
        "automation_completed",
        "editor_used",
    )

    private val allowedOperations = setOf(
        "cold_start", "resume", "open", "setup", "unlock", "folder",
        "all_storage", "one_storage", "permanent", "trash", "encrypted",
        "standard", "partial_selection", "all", "from_trash",
        "permanent_from_trash", "empty_trash", "message", "retry", "manual",
        "ai", "template", "recommendation", "ok", "partial", "failed",
        "simulated", "save_new", "save_replace", "save_split", "add",
        "restore", "delete", "execute", "cleanup", "apply_plan", "settings",
        "backup", "uninstall_request", "unknown", "list_storage_roots", "list",
        "search", "analyze", "properties", "create", "rename", "copy", "move",
        "organize", "compress", "extract", "share", "sort", "filter",
    )
    private val allowedResults = setOf("success", "failure", "cancelled")
    private val allowedFileTypes = setOf(
        "folder", "image", "video", "audio", "document", "pdf", "archive",
        "apk", "other", "mixed",
    )
    private val allowedSourceScreens = setOf(
        "home", "file_manager", "recent_files", "category_images",
        "category_videos", "category_audio", "category_documents",
        "category_downloads", "search", "trash", "vault", "genius_ai",
        "automations", "automation_history", "settings", "pdf_tools",
        "photo_editor", "audio_editor", "document_editor", "image_viewer",
        "video_player", "audio_player", "pdf_reader", "document_reader",
        "app_manager", "cleaner", "organizer", "other",
    )
    private val allowedToolTypes = setOf(
        "home", "file_manager", "recent_files", "category_images",
        "category_videos", "category_audio", "category_documents",
        "category_downloads", "search", "trash", "vault", "genius_ai",
        "automations", "automation_history", "settings", "pdf_tools",
        "photo_editor", "audio_editor", "document_editor", "image_viewer",
        "video_player", "audio_player", "pdf_reader", "document_reader",
        "app_manager", "cleaner", "organizer", "other", "images_to_pdf", "scan",
        "text_to_pdf", "merge", "compress", "files_to_pdf", "pdf_to_images",
        "signature", "extract", "extract_text", "split", "delete_pages",
        "reorder", "rotate", "watermark", "add_text", "add_image", "fill_form",
        "duplicate", "info", "scheduled_time", "daily", "weekly", "app_open",
        "file_added", "folder_changed", "storage_low", "device_connected", "zip",
        "7z", "tar", "gz", "tgz", "rar", "archive",
    )
    private val allowedActionCategories = setOf(
        "navigation", "file_management", "browse", "search", "analyze", "archive",
        "pdf", "ai", "vault", "automation", "editor", "media", "document",
        "cleaner", "application", "mixed", "none", "other", "copy", "move",
        "rename", "trash", "compress", "extract", "backup", "mkdir", "organize",
        "cleaner_scan", "notify", "open_module",
    )
    private val allowedErrorCategories = setOf(
        "network_error", "permission_error", "storage_error", "processing_error",
        "quota_exceeded", "invalid_input", "unsupported_format", "cancelled",
        "unknown_error",
    )

    private val allowedKeys = setOf(
        "operation",
        "result",
        "file_type",
        "source_screen",
        "tool_type",
        "action_category",
        "error_category",
    )

    private val allowedValues = mapOf(
        "operation" to allowedOperations,
        "result" to allowedResults,
        "file_type" to allowedFileTypes,
        "source_screen" to allowedSourceScreens,
        "tool_type" to allowedToolTypes,
        "action_category" to allowedActionCategories,
        "error_category" to allowedErrorCategories,
    )

    @PluginMethod
    fun logScreenView(call: PluginCall) {
        val screen = call.getString("screen") ?: ""
        if (screen !in allowedScreens) {
            call.reject("Unknown screen")
            return
        }
        val fa = analytics
        if (fa == null) {
            call.reject("Firebase Analytics unavailable")
            return
        }
        val params = Bundle()
        params.putString(FirebaseAnalytics.Param.SCREEN_NAME, screen)
        // screen_class reçoit le même libellé : Pages et écrans ne peut plus
        // retomber sur MainActivity, quelle que soit la dimension affichée.
        params.putString(FirebaseAnalytics.Param.SCREEN_CLASS, screen)
        fa.logEvent(FirebaseAnalytics.Event.SCREEN_VIEW, params)
        call.resolve()
    }

    @PluginMethod
    fun logEvent(call: PluginCall) {
        val name = call.getString("name") ?: ""
        if (name !in allowedEvents) {
            call.reject("Unknown event")
            return
        }
        val fa = analytics
        if (fa == null) {
            call.reject("Firebase Analytics unavailable")
            return
        }
        val input: JSObject = call.getObject("params") ?: JSObject()
        val bundle = Bundle()
        val keys = input.keys()
        while (keys.hasNext()) {
            val key = keys.next()
            if (key !in allowedKeys) continue
            val value = input.getString(key) ?: continue
            if (allowedValues[key]?.contains(value) == true) bundle.putString(key, value)
        }
        if (call.data.has("count")) {
            val count = call.getInt("count") ?: 0
            if (count >= 0) bundle.putLong("item_count", count.toLong().coerceAtMost(100000L))
        }
        if (call.data.has("duration")) {
            val duration = call.getLong("duration") ?: 0L
            if (duration >= 0L) bundle.putLong("duration_ms", duration.coerceAtMost(86400000L))
        }
        fa.logEvent(name, bundle)
        call.resolve()
    }

    @PluginMethod
    fun setUserProperty(call: PluginCall) {
        val name = call.getString("name") ?: ""
        val value = call.getString("value") ?: ""
        val valid = when (name) {
            "app_language" -> value.matches(Regex("[A-Za-z0-9_-]{1,12}"))
            "app_version" -> value.isEmpty() // suppression de l'ancienne propriété
            else -> false
        }
        if (valid) analytics?.setUserProperty(name, value)
        call.resolve()
    }

    @PluginMethod
    fun setEnabled(call: PluginCall) {
        analytics?.setAnalyticsCollectionEnabled(call.getBoolean("enabled", true) ?: true)
        call.resolve()
    }

    @PluginMethod
    fun isAvailable(call: PluginCall) {
        val result = JSObject()
        result.put("available", analytics != null)
        call.resolve(result)
    }
}
