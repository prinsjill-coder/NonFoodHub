import { findSupplierBySlug } from "../../../../shared/supplier-model.js";
import { renderEmptyState } from "../../../../components/empty-state.js";
import { renderSupplierDetail } from "./detail.js";
import { renderSupplierForm, setupSupplierForm } from "./form.js";
import { renderSuppliersList, setupSupplierList } from "./list.js";

export function renderSuppliersRoute(route, supplierData) {
  if (route.id === "suppliers") {
    return renderSuppliersList(supplierData);
  }

  if (route.id === "supplierNew") {
    return renderSupplierForm({ supplierData, mode: "create" });
  }

  const supplier = findSupplierBySlug(supplierData, route.params?.slug);

  if (!supplier) {
    return renderEmptyState({
      title: "Leverancier niet gevonden",
      message: "Deze leverancier staat niet in data/suppliers.json.",
      label: "Niet gevonden"
    });
  }

  if (route.id === "supplierEdit") {
    return renderSupplierForm({ supplierData, supplier, mode: "edit" });
  }

  return renderSupplierDetail({ supplierData, supplier });
}

export function setupSuppliersRoute(route, supplierData) {
  if (route.id === "suppliers") {
    setupSupplierList();
  }

  if (route.id === "supplierNew" || route.id === "supplierEdit") {
    setupSupplierForm({ route, supplierData });
  }
}

