import { getBrochures, sortBrochures } from "./brochure-model.js";
import { getSuppliers } from "./supplier-model.js";
import {
  createPublicDataset,
  isPublicContentItem,
  pickPublicFields,
  PUBLIC_DATASET_CONFIG
} from "./public-content.js";

export const PUBLIC_BROCHURE_DATASET = PUBLIC_DATASET_CONFIG.brochures;
export const PUBLIC_BROCHURE_KEYS = PUBLIC_BROCHURE_DATASET.itemKeys;
export const PUBLIC_BROCHURE_OPTIONAL_KEYS = PUBLIC_BROCHURE_DATASET.optionalItemKeys || [];

function firstCategory(brochure) {
  return Array.isArray(brochure?.categories) && brochure.categories.length ? brochure.categories[0] : "Brochure";
}

function publicSupplierIds(supplierData = {}) {
  return new Set(getSuppliers(supplierData).filter(isPublicContentItem).map((supplier) => supplier.id));
}

export function publicBrochureSummary(brochure, options = {}) {
  const publicItem = pickPublicFields(
    {
      ...brochure,
      summary: brochure.description,
      category: firstCategory(brochure)
    },
    PUBLIC_BROCHURE_KEYS
  );

  if (options.isPublicDownload?.(brochure.pdfFile)) {
    publicItem.downloadUrl = brochure.pdfFile;
  }

  return publicItem;
}

export function projectPublicBrochures(brochureData = {}, supplierData = {}, options = {}) {
  const supplierIds = publicSupplierIds(supplierData);
  const items = sortBrochures(
    getBrochures(brochureData).filter((brochure) => isPublicContentItem(brochure) && supplierIds.has(brochure.supplierId))
  ).map((brochure) => publicBrochureSummary(brochure, options));

  return createPublicDataset(items);
}
