import { renderNotFoundState } from "../../shared/not-found.js";
import { renderLibraryDetail } from "./detail.js";
import { renderLibraryExportPage, setupLibraryExport } from "./export.js";
import { renderLibraryForm, setupLibraryForm } from "./form.js";
import { renderLibraryImportPage, setupLibraryImport } from "./import.js";
import { renderLibraryList, setupLibraryList } from "./list.js";

export function renderLibraryRoute(route, librarySession, supplierSession, brochureSession, articleSession, mediaSession) {
  const libraryData = librarySession.getWorkingData();
  const supplierData = supplierSession.getWorkingData();
  const brochureData = brochureSession.getWorkingData();
  const articleData = articleSession.getWorkingData();
  const mediaData = mediaSession.getWorkingData();

  if (route.id === "library") {
    return renderLibraryList({
      libraryData,
      supplierData,
      brochureData,
      articleData,
      mediaData,
      sessionSnapshot: librarySession.snapshot()
    });
  }

  if (route.id === "libraryImport") {
    return renderLibraryImportPage({
      sessionSnapshot: librarySession.snapshot()
    });
  }

  if (route.id === "libraryExport") {
    return renderLibraryExportPage({
      sessionSnapshot: librarySession.snapshot()
    });
  }

  if (route.id === "libraryNew") {
    return renderLibraryForm({ libraryData, supplierData, brochureData, articleData, mode: "create" });
  }

  const item = librarySession.findBySlug(route.params?.slug);

  if (!item) {
    return renderNotFoundState({
      title: "Bibliotheekitem niet gevonden",
      message:
        "Dit bibliotheekitem staat niet in de bewerkversie. Mogelijk is de URL-naam gewijzigd of staat het item niet in het laatst geladen bestand.",
      label: "Niet gevonden",
      backHref: "#/bibliotheek",
      backLabel: "Terug naar bibliotheek"
    });
  }

  if (route.id === "libraryEdit") {
    return renderLibraryForm({ libraryData, supplierData, brochureData, articleData, item, mode: "edit" });
  }

  return renderLibraryDetail({ libraryData, supplierData, brochureData, articleData, mediaData, item });
}

export function setupLibraryRoute(route, librarySession, supplierSession, brochureSession, articleSession, mediaSession, options = {}) {
  if (route.id === "library") {
    setupLibraryList({
      librarySession,
      supplierSession,
      brochureSession,
      articleSession,
      mediaSession,
      rerender: options.rerender,
      restoreDraft: options.restoreDraft,
      persistDraft: options.persistDraft
    });
  }

  if (route.id === "libraryImport") {
    setupLibraryImport({
      librarySession,
      supplierSession,
      brochureSession,
      articleSession,
      mediaSession,
      rerender: options.rerender,
      restoreDraft: options.restoreDraft
    });
  }

  if (route.id === "libraryExport") {
    setupLibraryExport({
      librarySession,
      rerender: options.rerender,
      restoreDraft: options.restoreDraft
    });
  }

  if (route.id === "libraryNew" || route.id === "libraryEdit") {
    setupLibraryForm({
      route,
      librarySession,
      supplierSession,
      brochureSession,
      articleSession,
      mediaSession,
      formDirtyGuard: options.formDirtyGuard
    });
  }
}
