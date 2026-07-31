import { STUDIO_CONFIG } from "../../shared/config.js";
import { fetchJson } from "../../shared/utils.js";
import { getAuthPlaceholder } from "./auth.js";
import { createFormDirtyGuard } from "./form-dirty-guard.js";
import { renderLayout } from "./layout.js";
import { focusRouteContent, applyRouteTitle } from "./route-focus.js";
import { getCurrentRoute, getRouteTitle, renderRoute, setupRoute } from "./router.js";
import { createArticleSession } from "./state/article-session.js";
import { createBrochureSession } from "./state/brochure-session.js";
import { createMediaSession } from "./state/media-session.js";
import { createSupplierSession } from "./state/supplier-session.js";

const app = document.querySelector("#studio-app");

const STUDIO_DATA_PATHS = {
  navigation: "../data/studio-navigation.json",
  dashboard: "../data/studio-dashboard.json",
  suppliers: "../data/suppliers.json",
  brochures: "../data/brochures.json",
  media: "../data/media.json",
  articles: "../data/articles.json"
};

function getStudioDataPath(key) {
  return STUDIO_CONFIG.data?.[key] || STUDIO_DATA_PATHS[key];
}

async function loadStudioData() {
  const [navigation, dashboard, suppliers, brochures, media, articles] = await Promise.all([
    fetchJson(getStudioDataPath("navigation")),
    fetchJson(getStudioDataPath("dashboard")),
    fetchJson(getStudioDataPath("suppliers")),
    fetchJson(getStudioDataPath("brochures")),
    fetchJson(getStudioDataPath("media")),
    fetchJson(getStudioDataPath("articles"))
  ]);
  const supplierSession = createSupplierSession(suppliers);
  const brochureSession = createBrochureSession(brochures, () => supplierSession.getWorkingData());
  const mediaSession = createMediaSession(media);

  return {
    navigation,
    dashboard,
    supplierSession,
    brochureSession,
    mediaSession,
    articleSession: createArticleSession(
      articles,
      () => supplierSession.getWorkingData(),
      () => brochureSession.getWorkingData(),
      () => mediaSession.getWorkingData()
    ),
    formDirtyGuard: createFormDirtyGuard()
  };
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
  setupRoute(currentRoute, state, { rerender: () => renderStudio(state), formDirtyGuard: state.formDirtyGuard });
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
        "Er staan niet-toegepaste wijzigingen in het formulier. Als je doorgaat, worden deze formulierwijzigingen niet opgeslagen in de werksessie."
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
            "Er staan niet-toegepaste wijzigingen in het formulier. Als je doorgaat, worden deze formulierwijzigingen niet opgeslagen in de werksessie."
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
      const supplierDirty = state.supplierSession?.snapshot().hasUnexportedChanges;
      const brochureDirty = state.brochureSession?.snapshot().hasUnexportedChanges;
      const mediaDirty = state.mediaSession?.snapshot().hasUnexportedChanges;
      const articleDirty = state.articleSession?.snapshot().hasUnexportedChanges;
      if (!supplierDirty && !brochureDirty && !mediaDirty && !articleDirty && !state.formDirtyGuard.isDirty()) return;
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
