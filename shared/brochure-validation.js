import { isContentStatus } from "./content-status.js";
import { getSuppliers } from "./supplier-model.js";
import { BROCHURE_LANGUAGES, normalizeSlug } from "./brochure-model.js";

function hasValue(value) {
  return String(value ?? "").trim().length > 0;
}

function isRelativeProjectPath(value) {
  if (!value) return true;
  return !value.startsWith("/") && !value.startsWith("file://") && !value.includes("/Users/");
}

function supplierExists(supplierId, supplierData) {
  return getSuppliers(supplierData).some((supplier) => supplier.id === supplierId);
}

function validDate(value) {
  if (!hasValue(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validYear(value) {
  if (value === "" || value === null || typeof value === "undefined") return true;
  return Number.isInteger(value) && value >= 1900 && value <= 2100;
}

function allowedLanguages(brochureData) {
  const fromData = Array.isArray(brochureData?.languages)
    ? brochureData.languages.map((language) => String(language?.id ?? "").trim()).filter(Boolean)
    : [];
  return fromData.length ? fromData : BROCHURE_LANGUAGES;
}

export function brochureFromForm(form) {
  const formData = new FormData(form);
  const slug = normalizeSlug(formData.get("slug"));
  const yearValue = String(formData.get("year") || "").trim();
  const sortOrderValue = String(formData.get("sortOrder") || "").trim();

  return {
    id: String(formData.get("id") || `brochure-${slug}`).trim(),
    title: String(formData.get("title") || "").trim(),
    supplierId: String(formData.get("supplierId") || "").trim(),
    slug,
    year: yearValue ? Number(yearValue) : "",
    categories: formData.getAll("categories").map((category) => String(category).trim()).filter(Boolean),
    pdfFile: String(formData.get("pdfFile") || "").trim(),
    pdfSize: String(formData.get("pdfSize") || "").trim(),
    thumbnail: String(formData.get("thumbnail") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    language: String(formData.get("language") || "").trim(),
    status: String(formData.get("status") || "").trim(),
    sortOrder: sortOrderValue ? Number(sortOrderValue) : NaN,
    updatedAt: String(formData.get("updatedAt") || "").trim()
  };
}

export function validateBrochure(brochure, existingBrochures, supplierData, brochureData = {}, options = {}) {
  const errors = {};
  const originalSlug = options.originalSlug || "";
  const originalId = options.originalId || "";

  if (!hasValue(brochure.id)) {
    errors.id = "Vul een id in.";
  } else {
    const duplicateId = existingBrochures.some((item) => item.id === brochure.id && item.id !== originalId);
    if (duplicateId) {
      errors.id = "Deze id is al in gebruik.";
    }
  }

  if (!hasValue(brochure.title)) {
    errors.title = "Vul een brochuretitel in.";
  }

  if (!hasValue(brochure.supplierId)) {
    errors.supplierId = "Kies een leverancier.";
  } else if (!supplierExists(brochure.supplierId, supplierData)) {
    errors.supplierId = "Kies een bestaande leverancier.";
  }

  if (!hasValue(brochure.slug)) {
    errors.slug = "Vul een slug in.";
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(brochure.slug)) {
    errors.slug = "Gebruik alleen kleine letters, cijfers en koppeltekens.";
  } else {
    const duplicate = existingBrochures.some((item) => item.slug === brochure.slug && item.slug !== originalSlug);
    if (duplicate) {
      errors.slug = "Deze slug is al in gebruik.";
    }
  }

  if (!isContentStatus(brochure.status)) {
    errors.status = "Kies een geldige status.";
  }

  if (!hasValue(brochure.language)) {
    errors.language = "Kies een taal.";
  } else if (!allowedLanguages(brochureData).includes(brochure.language)) {
    errors.language = "Kies een geldige taal.";
  }

  if (!Number.isInteger(brochure.sortOrder) || brochure.sortOrder < 0) {
    errors.sortOrder = "Gebruik een positief geheel getal of 0.";
  }

  if (!validDate(brochure.updatedAt)) {
    errors.updatedAt = "Gebruik een geldige datum in de vorm jjjj-mm-dd.";
  }

  if (!validYear(brochure.year)) {
    errors.year = "Gebruik een geldig jaartal tussen 1900 en 2100, of laat het veld leeg.";
  }

  if (!Array.isArray(brochure.categories)) {
    errors.categories = "Categorieen moeten een lijst zijn.";
  } else if (brochure.categories.some((category) => !hasValue(category))) {
    errors.categories = "Categorieen mogen niet leeg zijn.";
  }

  if (!isRelativeProjectPath(brochure.pdfFile)) {
    errors.pdfFile = "Gebruik een relatief projectpad, geen lokaal Mac-pad of file-url.";
  } else if (brochure.pdfFile && !String(brochure.pdfFile).toLowerCase().endsWith(".pdf")) {
    errors.pdfFile = "Gebruik een relatief pad naar een PDF-bestand.";
  }

  if (!isRelativeProjectPath(brochure.thumbnail)) {
    errors.thumbnail = "Gebruik een relatief projectpad, geen lokaal Mac-pad of file-url.";
  }

  if ((brochure.status === "review" || brochure.status === "published") && !hasValue(brochure.pdfFile)) {
    errors.pdfFile = "Een brochure ter controle of gepubliceerd heeft een PDF-pad nodig.";
  }

  if (brochure.status === "published" && !hasValue(brochure.thumbnail)) {
    errors.thumbnail = "Een gepubliceerde brochure heeft een thumbnailpad nodig.";
  }

  return errors;
}

export function hasValidationErrors(errors) {
  return Object.keys(errors).length > 0;
}
