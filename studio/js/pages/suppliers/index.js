import { renderNotFoundState } from "../../shared/not-found.js";
import { renderSupplierDetail } from "./detail.js";
import { renderSupplierForm, setupSupplierForm } from "./form.js";
import { renderSuppliersList, setupSupplierList } from "./list.js";

export function renderSuppliersRoute(route, supplierSession, brochureSession, articleSession) {
  const supplierData = supplierSession.getWorkingData();
  const brochureData = brochureSession?.getWorkingData();
  const articleData = articleSession?.getWorkingData();

  if (route.id === "suppliers") {
    return renderSuppliersList({ supplierData, sessionSnapshot: supplierSession.snapshot() });
  }

  if (route.id === "supplierNew") {
    return renderSupplierForm({ supplierData, mode: "create" });
  }

  const supplier = supplierSession.findBySlug(route.params?.slug);

  if (!supplier) {
    return renderNotFoundState({
      title: "Leverancier niet gevonden",
      message:
        "Deze leverancier staat niet in de bewerkversie. Mogelijk is de URL-naam gewijzigd of staat de leverancier niet in het laatst geladen bestand.",
      label: "Niet gevonden",
      backHref: "#/leveranciers",
      backLabel: "Terug naar leveranciers"
    });
  }

  if (route.id === "supplierEdit") {
    return renderSupplierForm({ supplierData, supplier, mode: "edit" });
  }

  return renderSupplierDetail({ supplierData, brochureData, articleData, supplier });
}

export function setupSuppliersRoute(route, supplierSession, options = {}) {
  if (route.id === "suppliers") {
    setupSupplierList({ supplierSession, rerender: options.rerender });
  }

  if (route.id === "supplierNew" || route.id === "supplierEdit") {
    setupSupplierForm({ route, supplierSession, formDirtyGuard: options.formDirtyGuard });
  }
}
