import { routeFromHash } from "../../shared/routes.js";
import { renderBrochuresRoute, setupBrochuresRoute } from "./pages/brochures/index.js";
import { renderDashboard, renderRouteNotFound, renderRoutePlaceholder } from "./pages/dashboard.js";
import { renderKnowledgeRoute, setupKnowledgeRoute } from "./pages/knowledge/index.js";
import { renderLibraryRoute, setupLibraryRoute } from "./pages/library/index.js";
import { renderMediaRoute, setupMediaRoute } from "./pages/media/index.js";
import { renderSuppliersRoute, setupSuppliersRoute } from "./pages/suppliers/index.js";
import { getBaseRouteTitle, getItemRouteTitle } from "./shared/route-metadata.js";

export function getCurrentRoute() {
  return routeFromHash(window.location.hash);
}

export function getRouteTitle(route, state) {
  if (route.id === "supplierNew") return "Nieuwe leverancier";
  if (route.id === "brochureNew") return "Nieuwe brochure";
  if (route.id === "mediaNew") return "Nieuw media-asset";
  if (route.id === "articleNew") return "Nieuw kennisbankartikel";
  if (route.id === "libraryNew") return "Nieuw bibliotheekitem";

  if (route.id === "supplierEdit" || route.id === "supplierDetail") {
    const supplier = state.supplierSession.findBySlug(route.params?.slug);
    return getItemRouteTitle({
      route,
      item: supplier,
      detailRouteId: "supplierDetail",
      editRouteId: "supplierEdit",
      missingTitle: "Leverancier niet gevonden",
      detailTitle: (item) => item.name,
      editTitle: (item) => `${item.name} bewerken`
    });
  }

  if (route.id === "brochureEdit" || route.id === "brochureDetail") {
    const brochure = state.brochureSession?.findBySlug(route.params?.slug);
    return getItemRouteTitle({
      route,
      item: brochure,
      detailRouteId: "brochureDetail",
      editRouteId: "brochureEdit",
      missingTitle: "Brochure niet gevonden",
      detailTitle: (item) => item.title,
      editTitle: (item) => `${item.title} bewerken`
    });
  }

  if (route.id === "mediaEdit" || route.id === "mediaDetail") {
    const asset = state.mediaSession?.findById(route.params?.id);
    return getItemRouteTitle({
      route,
      item: asset,
      detailRouteId: "mediaDetail",
      editRouteId: "mediaEdit",
      missingTitle: "Media-asset niet gevonden",
      detailTitle: (item) => item.title,
      editTitle: (item) => `${item.title} bewerken`
    });
  }

  if (route.id === "articleEdit" || route.id === "articleDetail") {
    const article = state.articleSession?.findBySlug(route.params?.slug);
    return getItemRouteTitle({
      route,
      item: article,
      detailRouteId: "articleDetail",
      editRouteId: "articleEdit",
      missingTitle: "Kennisbankartikel niet gevonden",
      detailTitle: (item) => item.title,
      editTitle: (item) => `${item.title} bewerken`
    });
  }

  if (route.id === "libraryEdit" || route.id === "libraryDetail") {
    const item = state.librarySession?.findBySlug(route.params?.slug);
    return getItemRouteTitle({
      route,
      item,
      detailRouteId: "libraryDetail",
      editRouteId: "libraryEdit",
      missingTitle: "Bibliotheekitem niet gevonden",
      detailTitle: (libraryItem) => libraryItem.title,
      editTitle: (libraryItem) => `${libraryItem.title} bewerken`
    });
  }

  return getBaseRouteTitle(route);
}

export function renderRoute(route, state) {
  if (route.id === "notFound") {
    return renderRouteNotFound(route);
  }

  if (route.id === "dashboard") {
    return renderDashboard(
      state.dashboard,
      state.supplierSession.getWorkingData(),
      state.brochureSession?.getWorkingData(),
      state.mediaSession?.getWorkingData(),
      state.articleSession?.getWorkingData(),
      state.librarySession?.getWorkingData()
    );
  }

  if (route.sectionId === "suppliers") {
    return renderSuppliersRoute(route, state.supplierSession, state.brochureSession, state.articleSession);
  }

  if (route.sectionId === "brochures") {
    return renderBrochuresRoute(route, state.brochureSession, state.supplierSession, state.articleSession);
  }

  if (route.sectionId === "media") {
    return renderMediaRoute(route, state.mediaSession, state.supplierSession, state.brochureSession, state.articleSession);
  }

  if (route.sectionId === "knowledge") {
    return renderKnowledgeRoute(route, state.articleSession, state.supplierSession, state.brochureSession, state.mediaSession);
  }

  if (route.sectionId === "library") {
    return renderLibraryRoute(
      route,
      state.librarySession,
      state.supplierSession,
      state.brochureSession,
      state.articleSession,
      state.mediaSession
    );
  }

  return renderRoutePlaceholder(route);
}

export function setupRoute(route, state, options = {}) {
  if (route.sectionId === "suppliers") {
    setupSuppliersRoute(route, state.supplierSession, options);
  }

  if (route.sectionId === "brochures") {
    setupBrochuresRoute(route, state.brochureSession, state.supplierSession, options);
  }

  if (route.sectionId === "media") {
    setupMediaRoute(route, state.mediaSession, options);
  }

  if (route.sectionId === "knowledge") {
    setupKnowledgeRoute(
      route,
      state.articleSession,
      state.supplierSession,
      state.brochureSession,
      state.mediaSession,
      options
    );
  }

  if (route.sectionId === "library") {
    setupLibraryRoute(
      route,
      state.librarySession,
      state.supplierSession,
      state.brochureSession,
      state.articleSession,
      state.mediaSession,
      options
    );
  }
}
