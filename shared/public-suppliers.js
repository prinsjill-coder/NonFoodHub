import { getSuppliers, sortSuppliers } from "./supplier-model.js";
import {
  createPublicDataset,
  isPublicContentItem,
  pickPublicFields,
  PUBLIC_DATASET_CONFIG
} from "./public-content.js";

export const PUBLIC_SUPPLIER_DATASET = PUBLIC_DATASET_CONFIG.suppliers;
export const PUBLIC_SUPPLIER_KEYS = PUBLIC_SUPPLIER_DATASET.itemKeys;

function publicSupplier(supplier) {
  return pickPublicFields(supplier, PUBLIC_SUPPLIER_KEYS);
}

export function projectPublicSuppliers(supplierData = {}) {
  const items = sortSuppliers(getSuppliers(supplierData).filter(isPublicContentItem)).map(publicSupplier);

  return createPublicDataset(items);
}
