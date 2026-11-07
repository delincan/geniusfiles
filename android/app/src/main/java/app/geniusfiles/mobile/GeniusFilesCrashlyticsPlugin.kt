package app.geniusfiles.mobile

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.firebase.crashlytics.FirebaseCrashlytics

/** Pont Crashlytics strict : codes techniques, clés et cadres autorisés seulement. */
@CapacitorPlugin(name = "GeniusFilesCrashlytics")
class GeniusFilesCrashlyticsPlugin : Plugin() {
    private val crashlytics: FirebaseCrashlytics?
        get() = try {
            FirebaseCrashlytics.getInstance()
        } catch (_: Throwable) {
            null
        }

    private val errorNames = setOf(
        "Error", "TypeError", "ReferenceError", "SyntaxError", "RangeError",
        "EvalError", "URIError", "DOMException", "AbortError", "NetworkError",
    )
    private val errorContexts = setOf("window_onerror", "unhandledrejection")
    private val allowedKeys = setOf("app_version", "language", "webview_screen")

    private fun jsFrames(stack: String): Array<StackTraceElement> {
        val frame = Regex("""(?:at\s+)?(?:([\w$.<>\[\] ]+?)\s*[@(]\s*)?([\w.\-]+\.m?js):(\d+)(?::\d+)?\)?""")
        return stack.split(" | ", "\n")
            .mapNotNull { line ->
                val match = frame.find(line.trim()) ?: return@mapNotNull null
                val function = match.groupValues[1].trim().ifEmpty { "<anonymous>" }.take(80)
                StackTraceElement(
                    "WebView",
                    function,
                    match.groupValues[2],
                    match.groupValues[3].toIntOrNull() ?: 0,
                )
            }
            .take(12)
            .toTypedArray()
    }

    @PluginMethod
    fun log(call: PluginCall) {
        val message = call.getString("message") ?: ""
        if (message.matches(Regex("screen:[a-z0-9_-]{1,40}"))) crashlytics?.log(message)
        call.resolve()
    }

    @PluginMethod
    fun recordError(call: PluginCall) {
        val requestedName = call.getString("name") ?: "Error"
        val name = if (requestedName in errorNames) requestedName else "Error"
        val context = call.getString("message") ?: ""
        if (context !in errorContexts) {
            call.resolve()
            return
        }
        val fc = crashlytics
        if (fc == null) {
            call.resolve()
            return
        }
        val error = WebViewJsException("$name: $context")
        val frames = jsFrames(call.getString("stack") ?: "")
        if (frames.isNotEmpty()) error.stackTrace = frames
        fc.recordException(error)
        call.resolve()
    }

    @PluginMethod
    fun setKeys(call: PluginCall) {
        val keys: JSObject = call.getObject("keys") ?: JSObject()
        val fc = crashlytics ?: run {
            call.resolve()
            return
        }
        val iterator = keys.keys()
        while (iterator.hasNext()) {
            val key = iterator.next()
            if (key !in allowedKeys) continue
            val value = keys.optString(key).take(40)
            val valid = when (key) {
                "webview_screen" -> value.matches(Regex("[a-z0-9_-]{1,40}"))
                "language" -> value.matches(Regex("[A-Za-z0-9_-]{1,12}"))
                else -> value.matches(Regex("[A-Za-z0-9._-]{1,40}"))
            }
            if (valid) fc.setCustomKey(key, value)
        }
        call.resolve()
    }

    @PluginMethod
    fun isAvailable(call: PluginCall) {
        val result = JSObject()
        result.put("available", crashlytics != null)
        call.resolve(result)
    }
}

class WebViewJsException(message: String) : RuntimeException(message)
