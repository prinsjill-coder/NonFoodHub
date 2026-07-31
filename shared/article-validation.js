import { isContentStatus } from "./content-status.js";
import { getBrochures } from "./brochure-model.js";
import { getMediaAssets } from "./media-model.js";
import { getSuppliers } from "./supplier-model.js";
import { normalizeSlug } from "./article-model.js";

function hasValue(value) {
  return String(value ?? "").trim().length > 0;
}

function isRelativeProjectPath(value) {
  if (!value) return true;
  return (
    !value.startsWith("/") &&
    !value.startsWith("\\") &&
    !value.startsWith("~") &&
    !value.startsWith("file://") &&
    !/^[a-zA-Z]:[\\/]/.test(value) &&
    !value.includes("/Users/") &&
    !value.includes("\\Users\\") &&
    !value.includes("/home/") &&
    !value.includes("\\home\\")
  );
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function stringsFromForm(formData, name) {
  return formData.getAll(name).map((value) => String(value || "").trim()).filter(Boolean);
}

function knownIds(items) {
  return new Set(items.map((item) => item.id));
}

function hasMediaPath(mediaData, filePath) {
  if (!filePath) return true;
  return getMediaAssets(mediaData).some((asset) => asset.file === filePath);
}

function arrayValues(value) {
  return Array.isArray(value) ? value : [];
}

export function articleFromForm(form) {
  const formData = new FormData(form);
  const slug = normalizeSlug(formData.get("slug"));

  return {
    id: String(formData.get("id") || "").trim() || `article-${slug || normalizeSlug(formData.get("title"))}`,
    title: String(formData.get("title") || "").trim(),
    slug,
    status: String(formData.get("status") || "").trim(),
    summary: String(formData.get("summary") || "").trim(),
    body: String(formData.get("body") || "").trim(),
    categories: stringsFromForm(formData, "categories"),
    heroImage: String(formData.get("heroImage") || "").trim(),
    supplierIds: stringsFromForm(formData, "supplierIds"),
    brochureIds: stringsFromForm(formData, "brochureIds"),
    updatedAt: String(formData.get("updatedAt") || "").trim(),
    sortOrder: Number(formData.get("sortOrder") || 0)
  };
}

export function validateArticle(article, existingArticles, supplierData, brochureData, articleData, mediaData = {}, options = {}) {
  const errors = {};
  const warnings = {};
  const originalSlug = options.originalSlug || "";
  const originalId = options.originalId || "";

  if (!hasValue(article.id)) {
    errors.id = "Vul een id in.";
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.id)) {
    errors.id = "Gebruik alleen kleine letters, cijfers en koppeltekens.";
  } else {
    const duplicateId = existingArticles.some((item) => item.id === article.id && item.id !== originalId);
    if (duplicateId) {
      errors.id = "Deze id is al in gebruik.";
    }
  }

  if (!hasValue(article.title)) {
    errors.title = "Vul een titel in.";
  }

  if (!hasValue(article.slug)) {
    errors.slug = "Vul een slug in.";
  } else if (article.slug !== normalizeSlug(article.slug)) {
    errors.slug = "Gebruik een lowercase slug met koppeltekens.";
  } else {
    const duplicateSlug = existingArticles.some((item) => item.slug === article.slug && item.slug !== originalSlug);
    if (duplicateSlug) {
      errors.slug = "Deze slug is al in gebruik.";
    }
  }

  if (!isContentStatus(article.status)) {
    errors.status = "Kies een geldige status.";
  }

  if (!hasValue(article.summary)) {
    errors.summary = "Vul een samenvatting in.";
  }

  if (!hasValue(article.body)) {
    errors.body = "Vul de artikelinhoud in.";
  }

  if (!Array.isArray(article.categories) || article.categories.length === 0) {
    errors.categories = "Kies minimaal een categorie.";
  } else {
    const allowedCategories = new Set(articleData.categories || []);
    const invalidCategory = article.categories.find((category) => !allowedCategories.has(category));
    if (invalidCategory) {
      errors.categories = `Onbekende categorie: ${invalidCategory}.`;
    }
  }

  if (!hasValue(article.heroImage)) {
    warnings.heroImage = "Er is nog geen hero afbeelding gekoppeld.";
  } else if (!isRelativeProjectPath(article.heroImage)) {
    errors.heroImage = "Gebruik een relatief projectpad, geen lokaal pad of file-url.";
  } else if (!hasMediaPath(mediaData, article.heroImage)) {
    warnings.heroImage = "Hero afbeelding staat niet geregistreerd in media.json";
  }

  const supplierIds = knownIds(getSuppliers(supplierData));
  const unknownSupplier = arrayValues(article.supplierIds).find((supplierId) => !supplierIds.has(supplierId));
  if (unknownSupplier) {
    errors.supplierIds = `Onbekende leverancier: ${unknownSupplier}.`;
  }

  const brochureIds = knownIds(getBrochures(brochureData));
  const unknownBrochure = arrayValues(article.brochureIds).find((brochureId) => !brochureIds.has(brochureId));
  if (unknownBrochure) {
    errors.brochureIds = `Onbekende brochure: ${unknownBrochure}.`;
  }

  if (!validDate(article.updatedAt)) {
    errors.updatedAt = "Gebruik een geldige datum in formaat YYYY-MM-DD.";
  }

  if (!Number.isInteger(article.sortOrder) || article.sortOrder < 0) {
    errors.sortOrder = "Gebruik een positief geheel getal of 0.";
  }

  return { errors, warnings };
}

export function hasValidationErrors(result) {
  return Object.keys(result?.errors || result || {}).length > 0;
}
