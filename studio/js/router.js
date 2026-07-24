import { routeFromHash } from "../../shared/routes.js";
import { renderDashboard, renderRoutePlaceholder } from "./pages/dashboard.js";

export function getCurrentRoute() {
  return routeFromHash(window.location.hash);
}

export function renderRoute(route, dashboardData) {
  if (route.id === "dashboard") {
    return renderDashboard(dashboardData);
  }

  return renderRoutePlaceholder(route);
}
