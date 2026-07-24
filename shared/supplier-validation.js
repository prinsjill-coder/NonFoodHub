import { SUPPLIER_STATUSES, SUPPLIER_TYPES, normalizeSlug } from "./supplier-model.js";

function isRelativeProjectPath(value) {
  if (!value) return true;
  return !value.startsWith("/") && !value.startsWith("file://") && !value.includes("/Users/");
}

function hasValue(value) {
  return String(value ?? "").trim().length > 0;
}

export function supplierFromForm(form) {
  const formData = new FormData(form);
  const slug = normalizeSlug(formData.get("slug"));

  return {
    id: String(formData.get("id") || `supplier-${slug}`).trim(),
    name: String(formData.get("name") || "").trim(),
    slug,
    type: String(formData.get("type") || "").trim(),
    summary: String(formData.get("summary") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    categories: formData.getAll("categories").map((category) => String(category).trim()).filter(Boolean),
    logo: String(formData.get("logo") || "").trim(),
    image: String(formData.get("image") || "").trim(),
    brochureIds: [],
    relatedArticleIds: [],
    featured: formData.get("featured") === "on",
    sortOrder: Number(formData.get("sortOrder") || 0),
    status: String(formData.get("status") || "").trim()
  };
}

export function validateSupplier(supplier, existingSuppliers, options = {}) {
  const errors = {};
  const originalSlug = options.originalSlug || "";

  if (!hasValue(supplier.name)) {
    errors.name = "Vul een leveranciersnaam in.";
  }

  if (!hasValue(supplier.slug)) {
    errors.slug = "Vul een slug in.";
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(supplier.slug)) {
    errors.slug = "Gebruik alleen kleine letters, cijfers en koppeltekens.";
  } else {
    const duplicate = existingSuppliers.some((item) => item.slug === supplier.slug && item.slug !== originalSlug);
    if (duplicate) {
      errors.slug = "Deze slug is al in gebruik.";
    }
  }

  if (!SUPPLIER_TYPES.includes(supplier.type)) {
    errors.type = "Kies een geldig type.";
  }

  if (!SUPPLIER_STATUSES.includes(supplier.status)) {
    errors.status = "Kies een geldige status.";
  }

  if (!Number.isInteger(supplier.sortOrder) || supplier.sortOrder < 0) {
    errors.sortOrder = "Gebruik een positief geheel getal of 0.";
  }

  if (!isRelativeProjectPath(supplier.logo)) {
    errors.logo = "Gebruik een relatief projectpad, geen lokaal Mac-pad of file-url.";
  }

  if (!isRelativeProjectPath(supplier.image)) {
    errors.image = "Gebruik een relatief projectpad, geen lokaal Mac-pad of file-url.";
  }

  if (supplier.status === "published") {
    if (!hasValue(supplier.summary)) {
      errors.summary = "Een gepubliceerde leverancier heeft een samenvatting nodig.";
    }

    if (!hasValue(supplier.description)) {
      errors.description = "Een gepubliceerde leverancier heeft een omschrijving nodig.";
    }

    if (!supplier.categories.length) {
      errors.categories = "Kies minimaal een categorie voor publicatie.";
    }

    if (!hasValue(supplier.logo)) {
      errors.logo = "Een gepubliceerde leverancier heeft een logoreferentie nodig.";
    }

    if (!hasValue(supplier.image)) {
      errors.image = "Een gepubliceerde leverancier heeft een afbeeldingsreferentie nodig.";
    }
  }

  return errors;
}

export function hasValidationErrors(errors) {
  return Object.keys(errors).length > 0;
}
