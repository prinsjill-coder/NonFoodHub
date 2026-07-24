import { routeFromHash } from "../../shared/routes.js";
import { renderDashboard, renderRoutePlaceholder } from "./pages/dashboard.js";
import { renderSuppliersRoute, setupSuppliersRoute } from "./pages/suppliers/index.js";

export function getCurrentRoute() {
  return routeFromHash(window.location.hash);
}

export function renderRoute(route, state) {
  if (route.id === "dashboard") {
    return renderDashboard(state.dashboard, state.suppliers);
  }

  if (route.sectionId === "suppliers") {
    return renderSuppliersRoute(route, state.suppliers);
  }

  return renderRoutePlaceholder(route);
}

export function setupRoute(route, state) {
  if (route.sectionId === "suppliers") {
    setupSuppliersRoute(route, state.suppliers);
  }
}
