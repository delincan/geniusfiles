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
  SCREENS,
  SCREEN_SETTLE_MS,
  __resetAnalyticsForTests,
  buildEventParams,
  fileTypeOf,
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

/** Extrait les chaînes d'un `setOf(...)` Kotlin nommé. */
function kotlinSet(name: string): string[] {
  const m = KOTLIN.match(new RegExp(`val ${name} = setOf\\(([\\s\\S]*?)\\n\\s*\\)`));
  if (!m) throw new Error(`set ${name} not found`);
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

type Bridge = {
  logScreenView: ReturnType<typeof vi.fn>;
  logEvent: ReturnType<typeof vi.fn>;
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

const loggedScreens = (b: Bridge) =>
  b.logScreenView.mock.calls.map((c) => (c[0] as { screen: string }).screen);

describe("screen names", () => {
  it("maps routes to readable, stable names (never Android activity names)", () => {
    expect(SCREENS[screenForPath("/")]).toBe("Accueil");
    expect(SCREENS[screenForPath("/fichiers-recents")]).toBe("Fichiers récents");
    expect(SCREENS[screenForPath("/categorie/images")]).toBe("Images");
    expect(SCREENS[screenForPath("/categorie/videos")]).toBe("Vidéos");
    expect(SCREENS[screenForPath("/categorie/audio")]).toBe("Audio");
    expect(SCREENS[screenForPath("/categorie/documents")]).toBe("Documents");
    expect(SCREENS[screenForPath("/recherche")]).toBe("Recherche");
    expect(SCREENS[screenForPath("/corbeille")]).toBe("Corbeille");
    expect(SCREENS[screenForPath("/coffre-fort")]).toBe("Coffre-fort");
    expect(SCREENS[screenForPath("/assistant")]).toBe("Genius AI");
    expect(SCREENS[screenForPath("/automatisations")]).toBe("Automatisations");
    expect(SCREENS[screenForPath("/automatisations/historique")]).toBe(
      "Historique des automatisations",
    );
    expect(SCREENS[screenForPath("/parametres")]).toBe("Paramètres");
    expect(SCREENS[screenForPath("/pdf-outils")]).toBe("Outils PDF");
    expect(SCREENS[screenForPath("/editeur-audio?path=/storage/x.mp3")]).toBe("Éditeur audio");
  });

  it("never turns a dynamic segment into a screen name", () => {
    expect(screenForPath("/categorie/MesVacances2024")).toBe("other");
    expect(screenForPath("/storage/emulated/0/secret.pdf")).toBe("other");
  });

  it("matches the native whitelist exactly", () => {
    expect(new Set(kotlinSet("allowedScreens"))).toEqual(new Set(Object.values(SCREENS)));
    expect(new Set(kotlinSet("allowedEvents"))).toEqual(new Set(ANALYTICS_EVENTS));
    expect(new Set(kotlinSet("allowedKeys"))).toEqual(new Set(EVENT_PARAM_KEYS));
  });

  it("disables Firebase automatic screen reporting (MainActivity / AdActivity)", () => {
    for (const rel of [
      "android-overrides/app/src/main/AndroidManifest.xml",
      "android/app/src/main/AndroidManifest.xml",
    ]) {
      const manifest = readFileSync(path.join(ROOT, rel), "utf8");
      expect(manifest).toMatch(
        /android:name="google_analytics_automatic_screen_reporting_enabled"\s+android:value="false"/,
      );
    }
  });
});

describe("screen_view timing", () => {
  let bridge: Bridge;
  beforeEach(() => {
    vi.useFakeTimers();
    __resetAnalyticsForTests();
    bridge = installBridge();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("logs one screen_view per real screen, after it settles", () => {
    trackRoute("/");
    const releaseSection = pushScreen("file_manager", "section");
    vi.advanceTimersByTime(SCREEN_SETTLE_MS);
    expect(loggedScreens(bridge)).toEqual(["Gestionnaire de fichiers"]);

    // Re-render / same route again: nothing new.
    trackRoute("/");
    vi.advanceTimersByTime(SCREEN_SETTLE_MS);
    expect(loggedScreens(bridge)).toEqual(["Gestionnaire de fichiers"]);

    releaseSection();
    vi.advanceTimersByTime(SCREEN_SETTLE_MS);
    expect(loggedScreens(bridge)).toEqual(["Gestionnaire de fichiers", "Accueil"]);
  });

  it("does not count a viewer opened and closed immediately", () => {
    trackRoute("/corbeille");
    vi.advanceTimersByTime(SCREEN_SETTLE_MS);
    const release = pushScreen("image_viewer", "viewer");
    vi.advanceTimersByTime(50);
    release();
    vi.advanceTimersByTime(SCREEN_SETTLE_MS);
    expect(loggedScreens(bridge)).toEqual(["Corbeille"]);
  });

  it("an editor on top of a viewer wins, and closing it returns to the viewer", () => {
    trackRoute("/");
    const viewer = pushScreen("image_viewer", "viewer");
    vi.advanceTimersByTime(SCREEN_SETTLE_MS);
    const editor = pushScreen("photo_editor", "editor");
    vi.advanceTimersByTime(SCREEN_SETTLE_MS);
    editor();
    vi.advanceTimersByTime(SCREEN_SETTLE_MS);
    viewer();
    vi.advanceTimersByTime(SCREEN_SETTLE_MS);
    expect(loggedScreens(bridge)).toEqual([
      "Visionneuse d'images",
      "Éditeur photo",
      "Visionneuse d'images",
      "Accueil",
    ]);
  });

  it("attaches the current screen to events", () => {
    trackRoute("/pdf-outils");
    trackEvent("pdf_merged", { tool_type: "merge", result: "success", item_count: 3 });
    expect(bridge.logEvent).toHaveBeenCalledWith({
      name: "pdf_merged",
      params: { result: "success", source_screen: "pdf_tools", tool_type: "merge" },
      count: 3,
    });
  });
});

describe("event params", () => {
  beforeEach(() => __resetAnalyticsForTests());

  it("keeps only whitelisted keys and short neutral tokens", () => {
    const built = buildEventParams({
      operation: "Mes Photos/Été 2024.jpg",
      result: "success",
      ...({ query: "contrat secret", file_name: "cv.pdf" } as object),
    });
    expect(Object.keys(built.params).sort()).toEqual(["operation", "result", "source_screen"]);
    expect(built.params.operation).toMatch(/^[a-z0-9_]+$/);
    expect(JSON.stringify(built)).not.toContain("contrat");
    expect(JSON.stringify(built)).not.toContain("cv");
  });

  it("sends the real item count of the global operation, capped", () => {
    expect(buildEventParams({ item_count: 37 }).count).toBe(37);
    expect(buildEventParams({ item_count: 0 }).count).toBeUndefined();
    expect(buildEventParams({ item_count: 5_000_000 }).count).toBe(100000);
  });

  it("summarises a multi-type selection as mixed", () => {
    expect(fileTypeOf([{ kind: "image" }, { kind: "image" }])).toBe("image");
    expect(fileTypeOf([{ kind: "image" }, { kind: "pdf" }])).toBe("mixed");
    expect(fileTypeOf([{ kind: "code" }])).toBe("document");
  });
});
