import { isContentStatus, isReadyForPublicationStatus, normalizeContentStatus } from "./content-status.js";
import { SUPPLIER_TYPES, normalizeSlug } from "./supplier-model.js";

function isRelativeProjectPath(value) {
  if (!value) return true;
  return (
    !value.startsWith("/") &&
    !value.startsWith("\\") &&
    !value.startsWith("~") &&
    !value.toLowerCase().startsWith("file:") &&
    !/^[a-zA-Z]:[\\/]/.test(value)
  );
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
    status: normalizeContentStatus(formData.get("status"))
  };
}

export function validateSupplier(supplier, existingSuppliers, options = {}) {
  const errors = {};
  const originalSlug = options.originalSlug || "";

  if (!hasValue(supplier.name)) {
    errors.name = "Vul een leveranciersnaam in.";
  }

  if (!hasValue(supplier.slug)) {
    errors.slug = "Vul een URL-naam in.";
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(supplier.slug)) {
    errors.slug = "Gebruik kleine letters, cijfers en koppeltekens, bijvoorbeeld amefa.";
  } else {
    const duplicate = existingSuppliers.some((item) => item.slug === supplier.slug && item.slug !== originalSlug);
    if (duplicate) {
      errors.slug = "Deze URL-naam is al in gebruik.";
    }
  }

  if (!SUPPLIER_TYPES.includes(supplier.type)) {
    errors.type = "Kies een geldig type.";
  }

  if (!isContentStatus(supplier.status)) {
    errors.status = "Kies een geldige status.";
  }

  if (!Number.isInteger(supplier.sortOrder) || supplier.sortOrder < 0) {
    errors.sortOrder = "Gebruik een positief geheel getal of 0.";
  }

  if (!isRelativeProjectPath(supplier.logo)) {
    errors.logo = "Gebruik een bestand binnen het project, bijvoorbeeld assets/images/logos/amefa.svg. Gebruik geen lokaal computerpad.";
  }

  if (!isRelativeProjectPath(supplier.image)) {
    errors.image = "Gebruik een bestand binnen het project, bijvoorbeeld assets/images/supplier-amefa.jpg. Gebruik geen lokaal computerpad.";
  }

  if (isReadyForPublicationStatus(supplier.status)) {
    if (!hasValue(supplier.summary)) {
      errors.summary = "Een leverancier die gereed is voor publicatie heeft een samenvatting nodig.";
    }

    if (!hasValue(supplier.description)) {
      errors.description = "Een leverancier die gereed is voor publicatie heeft een omschrijving nodig.";
    }

    if (!supplier.categories.length) {
      errors.categories = "Kies minimaal een categorie voor Gereed voor publicatie.";
    }

    if (!hasValue(supplier.logo)) {
      errors.logo = "Een leverancier die gereed is voor publicatie heeft een logoreferentie nodig.";
    }

    if (!hasValue(supplier.image)) {
      errors.image = "Een leverancier die gereed is voor publicatie heeft een afbeeldingsreferentie nodig.";
    }
  }

  return errors;
}

export function hasValidationErrors(errors) {
  return Object.keys(errors).length > 0;
}
