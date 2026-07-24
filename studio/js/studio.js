import { STUDIO_CONFIG } from "../../shared/config.js";
import { fetchJson } from "../../shared/utils.js";
import { getAuthPlaceholder } from "./auth.js";
import { renderLayout } from "./layout.js";
import { getCurrentRoute, renderRoute } from "./router.js";

const app = document.querySelector("#studio-app");

async function loadStudioData() {
  const [navigation, dashboard] = await Promise.all([
    fetchJson(STUDIO_CONFIG.data.navigation),
    fetchJson(STUDIO_CONFIG.data.dashboard)
  ]);

  return { navigation, dashboard };
}

function renderStudio(state) {
  const currentRoute = getCurrentRoute();
  const content = renderRoute(currentRoute, state.dashboard);
  const authState = getAuthPlaceholder();

  app.innerHTML = renderLayout({
    navigation: state.navigation,
    currentRoute,
    authState,
    content
  });
}

async function initStudio() {
  try {
    const state = await loadStudioData();
    renderStudio(state);
    window.addEventListener("hashchange", () => renderStudio(state));
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
