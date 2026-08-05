import { renderNotFoundState } from "../../shared/not-found.js";
import { renderBrochureDetail, setupBrochureFileStatus, setupBrochureWorkflowActions } from "./detail.js";
import { renderBrochureForm, setupBrochureForm } from "./form.js";
import { renderBrochuresList, setupBrochureList } from "./list.js";

function fileAvailabilityForPath(path, mediaSession) {
  if (!path || !mediaSession) return { canOpen: false, source: "", url: "" };

  const localFile = mediaSession.findLocalProjectFile?.(path);
  if (localFile?.url) {
    return { canOpen: true, source: "local", url: localFile.url };
  }

  if (mediaSession.sourceHasProjectFile?.(path)) {
    return { canOpen: true, source: "project", url: "" };
  }

  return { canOpen: false, source: "", url: "" };
}

function fileAvailabilityForBrochure(brochure, mediaSession) {
  return Object.fromEntries(
    [brochure.pdfFile, brochure.thumbnail]
      .filter(Boolean)
      .map((path) => [path, fileAvailabilityForPath(path, mediaSession)])
  );
}

export function renderBrochuresRoute(route, brochureSession, supplierSession, articleSession, mediaSession) {
  const brochureData = brochureSession.getWorkingData();
  const supplierData = supplierSession.getWorkingData();
  const articleData = articleSession?.getWorkingData();
  const mediaData = mediaSession?.getWorkingData();

  if (route.id === "brochures") {
    return renderBrochuresList({
      brochureData,
      supplierData,
      sessionSnapshot: brochureSession.snapshot()
    });
  }

  if (route.id === "brochureNew") {
    return renderBrochureForm({ brochureData, supplierData, mode: "create" });
  }

  const brochure = brochureSession.findBySlug(route.params?.slug);

  if (!brochure) {
    return renderNotFoundState({
      title: "Brochure niet gevonden",
      message:
        "Deze brochure staat niet in de bewerkversie. Mogelijk is de URL-naam gewijzigd of staat de brochure niet in het laatst geladen bestand.",
      label: "Niet gevonden",
      backHref: "#/brochures",
      backLabel: "Terug naar brochures"
    });
  }

  if (route.id === "brochureEdit") {
    return renderBrochureForm({ brochureData, supplierData, brochure, mode: "edit" });
  }

  return renderBrochureDetail({
    brochureData,
    supplierData,
    mediaData,
    articleData,
    brochure,
    fileAvailability: fileAvailabilityForBrochure(brochure, mediaSession)
  });
}

export function setupBrochuresRoute(route, brochureSession, supplierSession, articleSession, mediaSession, options = {}) {
  if (route.id === "brochures") {
    setupBrochureList({ brochureSession, supplierSession, rerender: options.rerender, restoreDraft: options.restoreDraft });
  }

  if (route.id === "brochureNew" || route.id === "brochureEdit") {
    setupBrochureForm({
      route,
      brochureSession,
      supplierSession,
      mediaSession,
      formDirtyGuard: options.formDirtyGuard
    });
  }

  if (route.id === "brochureDetail") {
    const brochure = brochureSession.findBySlug(route.params?.slug);
    setupBrochureFileStatus();
    if (brochure) {
      setupBrochureWorkflowActions({
        brochureSession,
        supplierSession,
        articleSession,
        articleData: articleSession?.getWorkingData(),
        brochure,
        rerender: options.rerender
      });
    }
  }
}
