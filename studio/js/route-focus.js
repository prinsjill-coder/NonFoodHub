import { STUDIO_CONFIG } from "../../shared/config.js";

export function applyRouteTitle(routeTitle) {
  document.title = `${routeTitle} – ${STUDIO_CONFIG.appName}`;
}

export function focusRouteContent(root = document) {
  const heading = root.querySelector(".studio-content h1");
  const target = heading || root.querySelector("#studio-route-content");

  if (!target) return;

  if (!target.hasAttribute("tabindex")) {
    target.setAttribute("tabindex", "-1");
    target.dataset.routeFocusTarget = "true";
  }

  target.focus({ preventScroll: true });
}
