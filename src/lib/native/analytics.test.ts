import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./platform", () => ({
  isNativeRuntime: () => true,
  nativePlatform: () => "android",
}));

import {
  ANALYTICS_EVENTS,
  EVENT_PARAM_KEYS,
  EVENT_PARAM_VALUES,
  SCREENS,
  SCREEN_SETTLE_MS,
  __resetAnalyticsForTests,
  buildEventParams,
  fileTypeOf,
  installAnalytics,
  pushScreen,
  screenForPath,
  trackEvent,
  trackRoute,
} from "./analytics";

const ROOT = path.resolve(__dirname, "../../..");
const KOTLIN = readFileSync(
  path.join(
    ROOT,
    "android-overrides/app/src/main/java/app/geniusfiles/mobile/GeniusFilesAnalyticsPlugin.kt",
  ),
  "utf8",
);

function kotlinSet(name: string): string[] {
  const match = KOTLIN.match(new RegExp(`val ${name} = setOf\\(([\\s\\S]*?)\\)`));
  if (!match) throw new Error(`set ${name} not found`);
  return [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]);
}

type Bridge = {
  logScreenView: ReturnType<typeof vi.fn>;
  logEvent: ReturnType<typeof vi.fn>;
  setUserProperty: ReturnType<typeof vi.fn>;
  setEnabled: ReturnType<typeof vi.fn>;
  isAvailable: ReturnType<typeof vi.fn>;
};

function installBridge(): Bridge {
  const bridge = {
    logScreenView: vi.fn(() => Promise.resolve()),
    logEvent: vi.fn(() => Promise.resolve()),
    setUserProperty: vi.fn(() => Promise.resolve()),
    setEnabled: vi.fn(() => Promise.resolve()),
    isAvailable: vi.fn(() => Promise.resolve({ available: true })),
  };
  (window as unknown as { Capacitor: unknown }).Capacitor = {
    Plugins: { GeniusFilesAnalytics: bridge },
  };
  return bridge;
}

const loggedScreens = (bridge: Bridge) =>
  bridge.logScreenView.mock.calls.map((call) => (call[0] as { screen: string }).screen);

beforeEach(() => {
  vi.useFakeTimers();
  __resetAnalyticsForTests();
  delete (window as unknown as { Capacitor?: unknown }).Capacitor;
});

afterEach(() => {
  __resetAnalyticsForTests();
  vi.useRealTimers();
});

describe("screen names and native configuration", () => {
  it("maps every real route to a stable French screen", () => {
    const expected: Array<[string, string]> = [
      ["/", "Accueil"],
      ["/fichiers-recents", "Fichiers récents"],
      ["/categorie/images", "Images"],
      ["/categorie/videos", "Vidéos"],
      ["/categorie/audio", "Audio"],
      ["/categorie/documents", "Documents"],
      ["/categorie/downloads", "Téléchargements"],
      ["/recherche", "Recherche"],
      ["/corbeille", "Corbeille"],
      ["/coffre-fort", "Coffre-fort"],
      ["/assistant", "Genius AI"],
      ["/automatisations", "Automatisations"],
      ["/automatisations/historique", "Historique des automatisations"],
      ["/parametres", "Paramètres"],
      ["/pdf-outils", "Outils PDF"],
      ["/editeur-audio?path=/storage/x.mp3", "Éditeur audio"],
      ["/applications", "Gestionnaire d'applications"],
      ["/nettoyeur", "Nettoyeur"],
      ["/organisation", "Organisation"],
    ];
    for (const [route, name] of expected) expect(SCREENS[screenForPath(route)]).toBe(name);
  });

  it("never turns a dynamic path or file name into a screen", () => {
    expect(screenForPath("/categorie/MesVacances2024")).toBe("other");
    expect(screenForPath("/storage/emulated/0/secret.pdf")).toBe("other");
  });

  it("matches every native event, key, value and screen whitelist", () => {
    expect(new Set(kotlinSet("allowedScreens"))).toEqual(new Set(Object.values(SCREENS)));
    expect(new Set(kotlinSet("allowedEvents"))).toEqual(new Set(ANALYTICS_EVENTS));
    expect(new Set(kotlinSet("allowedKeys"))).toEqual(new Set(EVENT_PARAM_KEYS));
    const nativeNames = {
      operation: "allowedOperations",
      result: "allowedResults",
      file_type: "allowedFileTypes",
      source_screen: "allowedSourceScreens",
      tool_type: "allowedToolTypes",
      action_category: "allowedActionCategories",
      error_category: "allowedErrorCategories",
    } as const;
    for (const key of EVENT_PARAM_KEYS) {
      expect(new Set(kotlinSet(nativeNames[key])), key).toEqual(
        new Set(EVENT_PARAM_VALUES[key] as readonly string[]),
      );
    }
  });

  it("disables automatic activity screens in both Android manifests", () => {
    for (const relative of [
      "android-overrides/app/src/main/AndroidManifest.xml",
      "android/app/src/main/AndroidManifest.xml",
    ]) {
      expect(readFileSync(path.join(ROOT, relative), "utf8")).toMatch(
        /android:name="google_analytics_automatic_screen_reporting_enabled"\s+android:value="false"/,
      );
    }
  });

  it("initializes Firebase natively before the WebView and uses the matching app id", () => {
    const application = readFileSync(
      path.join(
        ROOT,
        "android-overrides/app/src/main/java/app/geniusfiles/mobile/GeniusFilesApplication.kt",
      ),
      "utf8",
    );
    expect(application).toContain("FirebaseAnalytics.getInstance(this)");
    expect(application).toContain("setSessionTimeoutDuration(30 * 60 * 1000L)");
    const services = JSON.parse(
      readFileSync(path.join(ROOT, "android-overrides/app/google-services.json"), "utf8"),
    ) as { client: Array<{ client_info: { android_client_info: { package_name: string } } }> };
    expect(services.client.map((client) => client.client_info.android_client_info.package_name)).toContain(
      "app.geniusfiles.mobile",
    );
  });
});

describe("screen_view delivery", () => {
  it("logs one view per settled screen and suppresses consecutive duplicates", async () => {
    const bridge = installBridge();
    trackRoute("/");
    const releaseSection = pushScreen("file_manager", "section");
    await vi.advanceTimersByTimeAsync(SCREEN_SETTLE_MS);
    expect(loggedScreens(bridge)).toEqual(["Gestionnaire de fichiers"]);

    trackRoute("/");
    await vi.advanceTimersByTimeAsync(SCREEN_SETTLE_MS);
    expect(loggedScreens(bridge)).toEqual(["Gestionnaire de fichiers"]);

    releaseSection();
    await vi.advanceTimersByTimeAsync(SCREEN_SETTLE_MS);
    expect(loggedScreens(bridge)).toEqual(["Gestionnaire de fichiers", "Accueil"]);
  });

  it("does not count a viewer closed immediately", async () => {
    const bridge = installBridge();
    trackRoute("/corbeille");
    await vi.advanceTimersByTimeAsync(SCREEN_SETTLE_MS);
    const release = pushScreen("image_viewer", "viewer");
    await vi.advanceTimersByTimeAsync(50);
    release();
    await vi.advanceTimersByTimeAsync(SCREEN_SETTLE_MS);
    expect(loggedScreens(bridge)).toEqual(["Corbeille"]);
  });

  it("tracks an editor above its viewer, then the return to that viewer", async () => {
    const bridge = installBridge();
    trackRoute("/");
    const viewer = pushScreen("image_viewer", "viewer");
    await vi.advanceTimersByTimeAsync(SCREEN_SETTLE_MS);
    const editor = pushScreen("photo_editor", "editor");
    await vi.advanceTimersByTimeAsync(SCREEN_SETTLE_MS);
    editor();
    await vi.advanceTimersByTimeAsync(SCREEN_SETTLE_MS);
    viewer();
    await vi.advanceTimersByTimeAsync(SCREEN_SETTLE_MS);
    expect(loggedScreens(bridge)).toEqual([
      "Visionneuse d'images",
      "Éditeur photo",
      "Visionneuse d'images",
      "Accueil",
    ]);
  });

  it("delivers the first screen when Capacitor becomes available late", async () => {
    trackRoute("/pdf-outils");
    await vi.advanceTimersByTimeAsync(SCREEN_SETTLE_MS);
    const bridge = installBridge();
    installAnalytics();
    await vi.advanceTimersByTimeAsync(SCREEN_SETTLE_MS);
    expect(loggedScreens(bridge)).toEqual(["Outils PDF"]);
  });

  it("does not mark a rejected native screen call as delivered", async () => {
    const bridge = installBridge();
    bridge.logScreenView.mockRejectedValueOnce(new Error("unavailable"));
    trackRoute("/recherche");
    await vi.advanceTimersByTimeAsync(SCREEN_SETTLE_MS);
    trackRoute("/recherche");
    await vi.advanceTimersByTimeAsync(SCREEN_SETTLE_MS);
    expect(loggedScreens(bridge)).toEqual(["Recherche", "Recherche"]);
  });
});

describe("event taxonomy, privacy and delivery", () => {
  it("uses the canonical names and never reintroduces legacy duplicates", () => {
    for (const required of [
      "app_opened",
      "category_opened",
      "favorites_opened",
      "recent_files_opened",
      "trash_opened",
      "files_compressed",
      "files_extracted",
      "media_player_used",
      "document_viewer_used",
      "automation_executed",
      "automation_completed",
      "vault_operation_completed",
    ]) {
      expect(ANALYTICS_EVENTS).toContain(required);
    }
    for (const legacy of [
      "application_opened",
      "file_open",
      "file_compressed",
      "file_extracted",
      "vault_file_added",
      "vault_file_restored",
      "vault_file_deleted",
    ]) {
      expect(ANALYTICS_EVENTS).not.toContain(legacy);
    }
  });

  it("drops private free text instead of transforming it into a token", () => {
    const built = buildEventParams({
      operation: "Mes Photos/Été 2024.jpg",
      tool_type: "contrat secret.pdf",
      action_category: "ma recherche privée",
      result: "success",
      ...({ query: "contrat secret", file_name: "cv.pdf" } as object),
    });
    expect(built.params.operation).toBeUndefined();
    expect(built.params.tool_type).toBeUndefined();
    expect(built.params.action_category).toBeUndefined();
    expect(JSON.stringify(built)).not.toMatch(/Mes|Photos|contrat|secret|cv|recherche privée/i);
  });

  it("keeps concrete aggregate counts, zero results and durations", () => {
    expect(buildEventParams({ item_count: 5 }).count).toBe(5);
    expect(buildEventParams({ item_count: 0 }).count).toBe(0);
    expect(buildEventParams({ item_count: 5_000_000 }).count).toBe(100000);
    expect(buildEventParams({ duration_ms: 1250 }).duration).toBe(1250);
    expect(buildEventParams({ duration_ms: -1 }).duration).toBeUndefined();
  });

  it("adds the source, feature category and a non-private failure category", () => {
    const bridge = installBridge();
    trackRoute("/pdf-outils");
    trackEvent("pdf_merged", {
      tool_type: "merge",
      result: "failure",
      item_count: 3,
      duration_ms: 42,
    });
    expect(bridge.logEvent).toHaveBeenCalledWith({
      name: "pdf_merged",
      params: {
        action_category: "pdf",
        error_category: "unknown_error",
        result: "failure",
        source_screen: "pdf_tools",
        tool_type: "merge",
      },
      count: 3,
      duration: 42,
    });
  });

  it("queues a real event until the native bridge is ready", async () => {
    trackEvent("pdf_created", { result: "success", item_count: 2 });
    const bridge = installBridge();
    installAnalytics();
    await vi.advanceTimersByTimeAsync(0);
    const names = bridge.logEvent.mock.calls.map((call) => (call[0] as { name: string }).name);
    expect(names).toContain("pdf_created");
    expect(names).toContain("app_opened");
  });

  it("summarises file types without exposing their names", () => {
    expect(fileTypeOf([{ kind: "image" }, { kind: "image" }])).toBe("image");
    expect(fileTypeOf([{ kind: "image" }, { kind: "pdf" }])).toBe("mixed");
    expect(fileTypeOf([{ kind: "code" }])).toBe("document");
  });
});
