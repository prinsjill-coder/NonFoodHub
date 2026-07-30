import { renderNotFoundState } from "../../shared/not-found.js";
import { renderBrochureDetail } from "./detail.js";
import { renderBrochureForm, setupBrochureForm } from "./form.js";
import { renderBrochuresList, setupBrochureList } from "./list.js";

export function renderBrochuresRoute(route, brochureSession, supplierSession) {
  const brochureData = brochureSession.getWorkingData();
  const supplierData = supplierSession.getWorkingData();

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
        "Deze brochure staat niet in de actieve Studio-werksessie. Mogelijk is de slug gewijzigd of is de brochure niet aanwezig in de laatst geladen bron.",
      label: "Niet gevonden",
      backHref: "#/brochures",
      backLabel: "Terug naar brochures"
    });
  }

  if (route.id === "brochureEdit") {
    return renderBrochureForm({ brochureData, supplierData, brochure, mode: "edit" });
  }

  return renderBrochureDetail({ brochureData, supplierData, brochure });
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
}
