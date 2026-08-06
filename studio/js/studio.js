import { STUDIO_CONFIG } from "../../shared/config.js";
import { fetchJson } from "../../shared/utils.js";
import { getAuthPlaceholder } from "./auth.js";
import { createFormDirtyGuard } from "./form-dirty-guard.js";
import { renderLayout } from "./layout.js";
import { focusRouteContent, applyRouteTitle } from "./route-focus.js";
import { getCurrentRoute, getRouteTitle, renderRoute, setupRoute } from "./router.js";
import { createArticleSession } from "./state/article-session.js";
import { createBrochureSession } from "./state/brochure-session.js";
import { createLibrarySession } from "./state/library-session.js";
import { createMediaSession } from "./state/media-session.js";
import { createSupplierSession } from "./state/supplier-session.js";
import {
  clearStudioDraft,
  createStudioDraftPayload,
  loadStudioDraft,
  saveStudioDraft
} from "./state/studio-draft-store.js";

const app = document.querySelector("#studio-app");

const STUDIO_DATA_PATHS = {
  navigation: "../data/studio-navigation.json",
  dashboard: "../data/studio-dashboard.json",
  suppliers: "../data/suppliers.json",
  brochures: "../data/brochures.json",
  media: "../data/media.json",
  articles: "../data/articles.json",
  library: "../data/library.json",
  publicSuppliers: "../data/public/suppliers.json",
  publicBrochures: "../data/public/brochures.json",
  publicArticles: "../data/public/articles.json"
};

function getStudioDataPath(key) {
  return STUDIO_CONFIG.data?.[key] || STUDIO_DATA_PATHS[key];
}

async function loadStudioShellData() {
  const [navigation, dashboard] = await Promise.all([
    fetchJson(getStudioDataPath("navigation")),
    fetchJson(getStudioDataPath("dashboard"))
  ]);

  return { navigation, dashboard };
}

async function loadBundledContentData() {
  const [suppliers, brochures, media, articles, library] = await Promise.all([
    fetchJson(getStudioDataPath("suppliers")),
    fetchJson(getStudioDataPath("brochures")),
    fetchJson(getStudioDataPath("media")),
    fetchJson(getStudioDataPath("articles")),
    fetchJson(getStudioDataPath("library"))
  ]);

  return { suppliers, brochures, media, articles, library };
}

async function loadPublicContentData() {
  const [suppliers, brochures, articles] = await Promise.all([
    fetchJson(getStudioDataPath("publicSuppliers")).catch(() => ({ items: [] })),
    fetchJson(getStudioDataPath("publicBrochures")).catch(() => ({ items: [] })),
    fetchJson(getStudioDataPath("publicArticles")).catch(() => ({ items: [] }))
  ]);

  return { suppliers, brochures, articles };
}

function draftOptions(draft, moduleKey) {
  const moduleDraft = draft?.modules?.[moduleKey];
  if (!moduleDraft) return {};

  return {
    sourceData: moduleDraft.sourceData,
    workingData: moduleDraft.workingData,
    sourceFileName: moduleDraft.sourceFileName,
    sourceType: moduleDraft.sourceType,
    lastExport: moduleDraft.lastExport
  };
}

function contentSource(contentData, draft, moduleKey) {
  return draft?.modules?.[moduleKey]?.sourceData || contentData?.[moduleKey] || {};
}

function createStudioSessions({ contentData = {}, draft = null } = {}) {
  const supplierSession = createSupplierSession(
    contentSource(contentData, draft, "suppliers"),
    draftOptions(draft, "suppliers")
  );
  const brochureSession = createBrochureSession(
    contentSource(contentData, draft, "brochures"),
    () => supplierSession.getWorkingData(),
    draftOptions(draft, "brochures")
  );
  const mediaSession = createMediaSession(
    contentSource(contentData, draft, "media"),
    draftOptions(draft, "media")
  );
  const articleSession = createArticleSession(
    contentSource(contentData, draft, "articles"),
    () => supplierSession.getWorkingData(),
    () => brochureSession.getWorkingData(),
    () => mediaSession.getWorkingData(),
    draftOptions(draft, "articles")
  );
  const librarySession = createLibrarySession(
    contentSource(contentData, draft, "library"),
    {
      suppliers: () => supplierSession.getWorkingData(),
      brochures: () => brochureSession.getWorkingData(),
      articles: () => articleSession.getWorkingData(),
      media: () => mediaSession.getWorkingData()
    },
    draftOptions(draft, "library")
  );

  return {
    supplierSession,
    brochureSession,
    mediaSession,
    articleSession,
    librarySession
  };
}

function replaceStudioSessions(state, sessions) {
  state.supplierSession = sessions.supplierSession;
  state.brochureSession = sessions.brochureSession;
  state.mediaSession = sessions.mediaSession;
  state.articleSession = sessions.articleSession;
  state.librarySession = sessions.librarySession;
}

function wrapSessionDraftMutations(state, persistDraft) {
  [
    [state.supplierSession, ["applySupplier", "deleteSupplier", "importSource", "markExported"]],
    [state.brochureSession, ["applyBrochure", "deleteBrochure", "importSource", "markExported"]],
    [state.mediaSession, ["applyMediaAsset"]],
    [state.articleSession, ["applyArticle", "deleteArticle", "importSource", "markExported"]],
    [state.librarySession, ["applyLibraryItem", "importSource", "markExported"]]
  ].forEach(([session, methods]) => {
    methods.forEach((methodName) => {
      const original = session[methodName]?.bind(session);
      if (!original) return;
      session[methodName] = async (...args) => {
        const result = original(...args);
        await persistDraft();
        return result;
      };
    });
  });
}

function attachDraftPersistence(state) {
  const persistDraft = () => saveStudioDraft(createStudioDraftPayload(state));
  state.persistDraft = persistDraft;
  state.restoreDraft = async () => {
    await clearStudioDraft();
    replaceStudioSessions(state, createStudioSessions({ contentData: await loadBundledContentData() }));
    wrapSessionDraftMutations(state, persistDraft);
  };

  wrapSessionDraftMutations(state, persistDraft);
}

async function loadStudioData() {
  const [{ navigation, dashboard }, draft, publicData] = await Promise.all([
    loadStudioShellData(),
    loadStudioDraft(),
    loadPublicContentData()
  ]);
  const contentData = draft ? null : await loadBundledContentData();

  const state = {
    navigation,
    dashboard,
    publicData,
    ...createStudioSessions({ contentData, draft }),
    formDirtyGuard: createFormDirtyGuard()
  };

  attachDraftPersistence(state);
  return state;
}

function renderStudio(state, options = {}) {
  state.formDirtyGuard.clearActiveForm();
  const currentRoute = getCurrentRoute();
  const routeTitle = getRouteTitle(currentRoute, state);
  const displayRoute = { ...currentRoute, title: routeTitle };
  const content = renderRoute(currentRoute, state);
  const authState = getAuthPlaceholder();

  app.innerHTML = renderLayout({
    navigation: state.navigation,
    currentRoute: displayRoute,
    authState,
    content
  });
  setupRoute(currentRoute, state, {
    rerender: () => renderStudio(state),
    formDirtyGuard: state.formDirtyGuard,
    restoreDraft: state.restoreDraft
  });
  applyRouteTitle(routeTitle);

  if (options.focus !== false) {
    focusRouteContent(document);
  }
}

function setupHashLinkGuard(state) {
  document.addEventListener("click", async (event) => {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    const link = target?.closest('a[href^="#"]');
    if (!link || link.target || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const targetHash = link.getAttribute("href");
    if (!targetHash || targetHash === window.location.hash) return;
    if (!state.formDirtyGuard.isDirty()) return;

    event.preventDefault();
    const confirmed = await state.formDirtyGuard.confirmDiscard({
      title: "Formulier verlaten?",
      message:
        "Er staan niet-toegepaste wijzigingen in het formulier. Als je doorgaat, worden deze formulierwijzigingen niet opgeslagen in de bewerkversie."
    });

    if (!confirmed) return;

    state.formDirtyGuard.markClean();
    state.formDirtyGuard.allowNextHashNavigation();
    window.location.hash = targetHash;
  });
}

async function initStudio() {
  try {
    const state = await loadStudioData();
    let currentHash = window.location.hash || "#/dashboard";

    renderStudio(state);
    state.formDirtyGuard.setLastStableHash(currentHash);
    setupHashLinkGuard(state);

    window.addEventListener("hashchange", async () => {
      const targetHash = window.location.hash || "#/dashboard";

      if (state.formDirtyGuard.consumeIgnoredHashNavigation()) {
        return;
      }

      if (state.formDirtyGuard.consumeAllowedHashNavigation()) {
        currentHash = targetHash;
        state.formDirtyGuard.setLastStableHash(currentHash);
        renderStudio(state);
        return;
      }

      if (state.formDirtyGuard.isDirty()) {
        const confirmed = await state.formDirtyGuard.confirmDiscard({
          title: "Route wijzigen?",
          message:
            "Er staan niet-toegepaste wijzigingen in het formulier. Als je doorgaat, worden deze formulierwijzigingen niet opgeslagen in de bewerkversie."
        });

        if (!confirmed) {
          state.formDirtyGuard.ignoreNextHashNavigation();
          window.location.hash = currentHash;
          return;
        }

        state.formDirtyGuard.markClean();
      }

      currentHash = targetHash;
      state.formDirtyGuard.setLastStableHash(currentHash);
      renderStudio(state);
    });
    window.addEventListener("beforeunload", (event) => {
      if (!state.formDirtyGuard.isDirty()) return;
      event.preventDefault();
      event.returnValue = "";
    });
  } catch (error) {
    app.innerHTML = `
      <main class="studio-noscript">
        <h1>NonFood Hub Studio</h1>
        <p>De Studio-data kon niet worden geladen. Start de lokale preview vanuit de projectmap met <code>python3 -m http.server 8080</code>.</p>
      </main>
    `;
    console.error(error);
  }
}

initStudio();
