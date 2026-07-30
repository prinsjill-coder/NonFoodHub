import { routeFromHash } from "../../shared/routes.js";
import { renderDashboard, renderRouteNotFound, renderRoutePlaceholder } from "./pages/dashboard.js";
import { renderSuppliersRoute, setupSuppliersRoute } from "./pages/suppliers/index.js";

export function getCurrentRoute() {
  return routeFromHash(window.location.hash);
}

export function getRouteTitle(route, state) {
  if (route.id === "notFound") return "Pagina niet gevonden";
  if (route.id === "supplierNew") return "Nieuwe leverancier";

  if (route.id === "supplierEdit" || route.id === "supplierDetail") {
    const supplier = state.supplierSession.findBySlug(route.params?.slug);
    if (!supplier) return "Leverancier niet gevonden";
    return route.id === "supplierEdit" ? `${supplier.name} bewerken` : supplier.name;
  }

  return route.title || "Studio";
}

export function renderRoute(route, state) {
  if (route.id === "notFound") {
    return renderRouteNotFound(route);
  }

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
