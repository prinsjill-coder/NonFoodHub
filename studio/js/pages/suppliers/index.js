import { renderEmptyState } from "../../../../components/empty-state.js";
import { renderSupplierDetail } from "./detail.js";
import { renderSupplierForm, setupSupplierForm } from "./form.js";
import { renderSuppliersList, setupSupplierList } from "./list.js";

export function renderSuppliersRoute(route, supplierSession) {
  const supplierData = supplierSession.getWorkingData();

  if (route.id === "suppliers") {
    return renderSuppliersList({ supplierData, sessionSnapshot: supplierSession.snapshot() });
  }

  if (route.id === "supplierNew") {
    return renderSupplierForm({ supplierData, mode: "create" });
  }

  const supplier = supplierSession.findBySlug(route.params?.slug);

  if (!supplier) {
    return renderEmptyState({
      title: "Leverancier niet gevonden",
      message: "Deze leverancier staat niet in de actieve Studio-werksessie.",
      label: "Niet gevonden"
    });
  }

  if (route.id === "supplierEdit") {
    return renderSupplierForm({ supplierData, supplier, mode: "edit" });
  }

  return renderSupplierDetail({ supplierData, supplier });
}

export function setupSuppliersRoute(route, supplierSession, options = {}) {
  if (route.id === "suppliers") {
    setupSupplierList({ supplierSession, rerender: options.rerender });
  }

  if (route.id === "supplierNew" || route.id === "supplierEdit") {
    setupSupplierForm({ route, supplierSession });
  }
}
