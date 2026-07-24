import { routeFromHash } from "../../shared/routes.js";
import { renderDashboard, renderRoutePlaceholder } from "./pages/dashboard.js";
import { renderSuppliersRoute, setupSuppliersRoute } from "./pages/suppliers/index.js";

export function getCurrentRoute() {
  return routeFromHash(window.location.hash);
}

export function renderRoute(route, state) {
  if (route.id === "dashboard") {
    return renderDashboard(state.dashboard, state.supplierSession.getWorkingData());
  }

  if (route.sectionId === "suppliers") {
    return renderSuppliersRoute(route, state.supplierSession);
  }

  return renderRoutePlaceholder(route);
}

export function setupRoute(route, state, options = {}) {
  if (route.sectionId === "suppliers") {
    setupSuppliersRoute(route, state.supplierSession, options);
  }
}
