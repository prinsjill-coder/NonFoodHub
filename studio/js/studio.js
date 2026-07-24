import { STUDIO_CONFIG } from "../../shared/config.js";
import { fetchJson } from "../../shared/utils.js";
import { getAuthPlaceholder } from "./auth.js";
import { renderLayout } from "./layout.js";
import { getCurrentRoute, renderRoute, setupRoute } from "./router.js";
import { createSupplierSession } from "./state/supplier-session.js";

const app = document.querySelector("#studio-app");

async function loadStudioData() {
  const [navigation, dashboard, suppliers] = await Promise.all([
    fetchJson(STUDIO_CONFIG.data.navigation),
    fetchJson(STUDIO_CONFIG.data.dashboard),
    fetchJson(STUDIO_CONFIG.data.suppliers)
  ]);

  return { navigation, dashboard, supplierSession: createSupplierSession(suppliers) };
}

function renderStudio(state) {
  const currentRoute = getCurrentRoute();
  const content = renderRoute(currentRoute, state);
  const authState = getAuthPlaceholder();

  app.innerHTML = renderLayout({
    navigation: state.navigation,
    currentRoute,
    authState,
    content
  });
  setupRoute(currentRoute, state, { rerender: () => renderStudio(state) });
}

async function initStudio() {
  try {
    const state = await loadStudioData();
    renderStudio(state);
    window.addEventListener("hashchange", () => renderStudio(state));
    window.addEventListener("beforeunload", (event) => {
      if (!state.supplierSession?.snapshot().hasUnexportedChanges) return;
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
