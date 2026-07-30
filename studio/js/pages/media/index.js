import { renderNotFoundState } from "../../shared/not-found.js";
import { renderMediaDetail } from "./detail.js";
import { renderMediaForm, setupMediaForm } from "./form.js";
import { renderMediaList, setupMediaList } from "./list.js";

export function renderMediaRoute(route, mediaSession) {
  const mediaData = mediaSession.getWorkingData();

  if (route.id === "media") {
    return renderMediaList({
      mediaData,
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
        "Dit asset staat niet in de actieve Studio-werksessie. Mogelijk is het id gewijzigd of is het asset niet aanwezig in de laatst geladen bron.",
      label: "Niet gevonden",
      backHref: "#/media",
      backLabel: "Terug naar media"
    });
  }

  if (route.id === "mediaEdit") {
    return renderMediaForm({ mediaData, asset, mode: "edit" });
  }

  return renderMediaDetail({ mediaData, asset });
}

export function setupMediaRoute(route, mediaSession, options = {}) {
  if (route.id === "media") {
    setupMediaList({ mediaSession, rerender: options.rerender });
  }

  if (route.id === "mediaNew" || route.id === "mediaEdit") {
    setupMediaForm({
      route,
      mediaSession,
      formDirtyGuard: options.formDirtyGuard
    });
  }
}
