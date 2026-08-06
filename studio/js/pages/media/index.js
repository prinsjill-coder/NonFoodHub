import { renderNotFoundState } from "../../shared/not-found.js";
import { projectFileAvailabilityForPath } from "../../shared/project-file-availability.js";
import { renderMediaDetail, setupMediaWorkflowActions } from "./detail.js";
import { renderMediaForm, setupMediaForm } from "./form.js";
import { renderMediaList, setupMediaList } from "./list.js";

export function renderMediaRoute(route, mediaSession, supplierSession, brochureSession, articleSession) {
  const mediaData = mediaSession.getWorkingData();
  const supplierData = supplierSession?.getWorkingData();
  const brochureData = brochureSession?.getWorkingData();
  const articleData = articleSession?.getWorkingData();

  if (route.id === "media") {
    return renderMediaList({
      mediaData,
      supplierData,
      brochureData,
      articleData,
      mediaSession,
      sessionSnapshot: mediaSession.snapshot()
    });
  }

  if (route.id === "mediaNew") {
    return renderMediaForm({ mediaData, mode: "create" });
  }

  const asset = mediaSession.findById(route.params?.id);

  if (!asset) {
    return renderNotFoundState({
      title: "Media-asset niet gevonden",
      message:
        "Dit bestand staat niet in de bewerkversie. Mogelijk is het id gewijzigd of staat het bestand niet in het laatst geladen bestand.",
      label: "Niet gevonden",
      backHref: "#/media",
      backLabel: "Terug naar media"
    });
  }

  if (route.id === "mediaEdit") {
    return renderMediaForm({ mediaData, asset, mode: "edit" });
  }

  return renderMediaDetail({
    mediaData,
    supplierData,
    brochureData,
    articleData,
    asset,
    fileAvailability: projectFileAvailabilityForPath(asset.file, mediaSession)
  });
}

export function setupMediaRoute(route, mediaSession, options = {}) {
  if (route.id === "media") {
    setupMediaList({ mediaSession, rerender: options.rerender, restoreDraft: options.restoreDraft });
  }

  if (route.id === "mediaNew" || route.id === "mediaEdit") {
    setupMediaForm({
      route,
      mediaSession,
      formDirtyGuard: options.formDirtyGuard
    });
  }

  if (route.id === "mediaDetail") {
    const asset = mediaSession.findById(route.params?.id);
    if (asset) {
      setupMediaWorkflowActions({
        mediaSession,
        asset,
        rerender: options.rerender
      });
    }
  }
}
