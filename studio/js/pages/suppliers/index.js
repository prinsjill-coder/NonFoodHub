import { renderNotFoundState } from "../../shared/not-found.js";
import { renderSupplierDetail, setupSupplierWorkflowActions } from "./detail.js";
import { renderSupplierForm, setupSupplierForm } from "./form.js";
import { renderSuppliersList, setupSupplierList } from "./list.js";

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

function fileAvailabilityForSupplier(supplier, mediaSession) {
  return Object.fromEntries(
    [supplier.logo, supplier.image]
      .filter(Boolean)
      .map((path) => [path, fileAvailabilityForPath(path, mediaSession)])
  );
}

export function renderSuppliersRoute(route, supplierSession, brochureSession, articleSession, mediaSession, publicData = {}) {
  const supplierData = supplierSession.getWorkingData();
  const brochureData = brochureSession?.getWorkingData();
  const articleData = articleSession?.getWorkingData();

  if (route.id === "suppliers") {
    return renderSuppliersList({ supplierData, brochureData, articleData, publicData, sessionSnapshot: supplierSession.snapshot() });
  }

  if (route.id === "supplierNew") {
    return renderSupplierForm({ supplierData, brochureData, articleData, mode: "create" });
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
    return renderSupplierForm({ supplierData, brochureData, articleData, supplier, mode: "edit" });
  }

  return renderSupplierDetail({
    supplierData,
    brochureData,
    articleData,
    publicData,
    supplier,
    fileAvailability: fileAvailabilityForSupplier(supplier, mediaSession)
  });
}

export function setupSuppliersRoute(route, supplierSession, brochureSession, articleSession, mediaSession, options = {}) {
  if (route.id === "suppliers") {
    setupSupplierList({ supplierSession, rerender: options.rerender, restoreDraft: options.restoreDraft });
  }

  if (route.id === "supplierNew" || route.id === "supplierEdit") {
    setupSupplierForm({
      route,
      supplierSession,
      brochureSession,
      mediaSession,
      articleSession,
      formDirtyGuard: options.formDirtyGuard,
      rerender: options.rerender
    });
  }

  if (route.id === "supplierDetail") {
    const supplier = supplierSession.findBySlug(route.params?.slug);
    if (supplier) {
      setupSupplierWorkflowActions({
        supplierSession,
        brochureData: brochureSession?.getWorkingData(),
        articleData: articleSession?.getWorkingData(),
        supplier,
        rerender: options.rerender
      });
    }
  }
}
