import { renderNotFoundState } from "../../shared/not-found.js";
import { renderBrochureDetail, setupBrochureFileStatus } from "./detail.js";
import { renderBrochureForm, setupBrochureForm } from "./form.js";
import { renderBrochuresList, setupBrochureList } from "./list.js";

export function renderBrochuresRoute(route, brochureSession, supplierSession, articleSession) {
  const brochureData = brochureSession.getWorkingData();
  const supplierData = supplierSession.getWorkingData();
  const articleData = articleSession?.getWorkingData();

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

  return renderBrochureDetail({ brochureData, supplierData, articleData, brochure });
}

export function setupBrochuresRoute(route, brochureSession, supplierSession, options = {}) {
  if (route.id === "brochures") {
    setupBrochureList({ brochureSession, supplierSession, rerender: options.rerender });
  }

  if (route.id === "brochureNew" || route.id === "brochureEdit") {
    setupBrochureForm({
      route,
      brochureSession,
      supplierSession,
      formDirtyGuard: options.formDirtyGuard
    });
  }

  if (route.id === "brochureDetail") {
    setupBrochureFileStatus();
  }
}
