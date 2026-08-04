import { isContentStatus } from "./content-status.js";
import { getArticles } from "./article-model.js";
import { getBrochures } from "./brochure-model.js";
import { getMediaAssets } from "./media-model.js";
import { getSuppliers } from "./supplier-model.js";
import { normalizeSlug } from "./library-model.js";

function hasValue(value) {
  return String(value ?? "").trim().length > 0;
}

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

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function stringsFromForm(formData, name) {
  return formData.getAll(name).map((value) => String(value || "").trim()).filter(Boolean);
}

function tagsFromValue(value) {
  return String(value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function knownIds(items) {
  return new Set(items.map((item) => item.id));
}

function arrayValues(value) {
  return Array.isArray(value) ? value : [];
}

function optionIds(options) {
  return new Set(
    (options || [])
      .map((option) => (typeof option === "string" ? option : option?.id))
      .filter(Boolean)
  );
}

function hasMediaPath(mediaData, path) {
  if (!path) return true;
  return getMediaAssets(mediaData).some((asset) => asset.file === path);
}

export function libraryItemFromForm(form) {
  const formData = new FormData(form);
  const slug = normalizeSlug(formData.get("slug"));

  return {
    id: String(formData.get("id") || "").trim() || `library-${slug || normalizeSlug(formData.get("title"))}`,
    title: String(formData.get("title") || "").trim(),
    slug,
    status: String(formData.get("status") || "").trim(),
    type: String(formData.get("type") || "").trim(),
    category: String(formData.get("category") || "").trim(),
    summary: String(formData.get("summary") || "").trim(),
    filePath: String(formData.get("filePath") || "").trim(),
    thumbnailPath: String(formData.get("thumbnailPath") || "").trim(),
    supplierIds: stringsFromForm(formData, "supplierIds"),
    brochureIds: stringsFromForm(formData, "brochureIds"),
    articleIds: stringsFromForm(formData, "articleIds"),
    tags: tagsFromValue(formData.get("tags")),
    updatedAt: String(formData.get("updatedAt") || "").trim(),
    sortOrder: Number(formData.get("sortOrder") || 0)
  };
}

export function validateLibraryItem(
  item,
  existingItems,
  supplierData,
  brochureData,
  articleData,
  libraryData,
  mediaData = {},
  options = {}
) {
  const errors = {};
  const warnings = {};
  const originalSlug = options.originalSlug || "";
  const originalId = options.originalId || "";

  if (!hasValue(item.id)) {
    errors.id = "Vul een id in.";
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id)) {
    errors.id = "Gebruik alleen kleine letters, cijfers en koppeltekens.";
  } else if (!options.skipDuplicateChecks) {
    const duplicateId = existingItems.some((existingItem) => existingItem.id === item.id && existingItem.id !== originalId);
    if (duplicateId) {
      errors.id = "Deze id is al in gebruik.";
    }
  }

  if (!hasValue(item.title)) {
    errors.title = "Vul een titel in.";
  }

  if (!hasValue(item.slug)) {
    errors.slug = "Vul een URL-naam in.";
  } else if (item.slug !== normalizeSlug(item.slug)) {
    errors.slug = "Gebruik kleine letters, cijfers en koppeltekens, bijvoorbeeld terras-outdoor-gids.";
  } else if (!options.skipDuplicateChecks) {
    const duplicateSlug = existingItems.some((existingItem) => existingItem.slug === item.slug && existingItem.slug !== originalSlug);
    if (duplicateSlug) {
      errors.slug = "Deze URL-naam is al in gebruik.";
    }
  }

  if (!isContentStatus(item.status)) {
    errors.status = "Kies een geldige status.";
  }

  const typeIds = optionIds(libraryData.types);
  if (!typeIds.has(item.type)) {
    errors.type = "Kies een geldig bibliotheektype.";
  }

  const categories = new Set(libraryData.categories || []);
  if (!categories.has(item.category)) {
    errors.category = "Kies een geldige categorie.";
  }

  if (!hasValue(item.summary)) {
    errors.summary = "Vul een samenvatting in.";
  }

  if (item.filePath && !isRelativeProjectPath(item.filePath)) {
    errors.filePath = "Gebruik een bestand binnen het project, bijvoorbeeld assets/downloads/library/terras-outdoor-gids.pdf. Gebruik geen lokaal computerpad.";
  } else if (item.filePath && !hasMediaPath(mediaData, item.filePath)) {
    warnings.filePath = "Dit bestand staat nog niet geregistreerd in Media.";
  }

  if (item.thumbnailPath && !isRelativeProjectPath(item.thumbnailPath)) {
    errors.thumbnailPath = "Gebruik een afbeelding binnen het project, bijvoorbeeld assets/images/library/terras-outdoor-gids.jpg. Gebruik geen lokaal computerpad.";
  } else if (item.thumbnailPath && !hasMediaPath(mediaData, item.thumbnailPath)) {
    warnings.thumbnailPath = "Deze afbeelding staat nog niet geregistreerd in Media.";
  }

  const supplierIds = knownIds(getSuppliers(supplierData));
  const unknownSupplier = arrayValues(item.supplierIds).find((supplierId) => !supplierIds.has(supplierId));
  if (unknownSupplier) {
    errors.supplierIds = `Onbekende leverancier: ${unknownSupplier}.`;
  }

  const brochureIds = knownIds(getBrochures(brochureData));
  const unknownBrochure = arrayValues(item.brochureIds).find((brochureId) => !brochureIds.has(brochureId));
  if (unknownBrochure) {
    errors.brochureIds = `Onbekende brochure: ${unknownBrochure}.`;
  }

  const articleIds = knownIds(getArticles(articleData));
  const unknownArticle = arrayValues(item.articleIds).find((articleId) => !articleIds.has(articleId));
  if (unknownArticle) {
    errors.articleIds = `Onbekend kennisbankartikel: ${unknownArticle}.`;
  }

  if (!Array.isArray(item.tags)) {
    errors.tags = "Tags moeten een lijst zijn.";
  } else if (item.tags.some((tag) => !hasValue(tag))) {
    errors.tags = "Tags mogen niet leeg zijn.";
  }

  if (!validDate(item.updatedAt)) {
    errors.updatedAt = "Gebruik een geldige datum in formaat YYYY-MM-DD.";
  }

  if (!Number.isInteger(item.sortOrder) || item.sortOrder < 0) {
    errors.sortOrder = "Gebruik een positief geheel getal of 0.";
  }

  return { errors, warnings };
}

export function hasValidationErrors(result) {
  return Object.keys(result?.errors || result || {}).length > 0;
}
