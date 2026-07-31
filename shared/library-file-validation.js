import { CONTENT_STATUSES } from "./content-status.js";
import { getLibraryItems, normalizeSlug } from "./library-model.js";
import { LIBRARY_CATEGORIES, LIBRARY_TYPES } from "./library-model.js";
import { LIBRARY_FILE_KEYS, LIBRARY_ITEM_KEYS } from "./library-normalizer.js";
import { validateLibraryItem } from "./library-validation.js";

function createIssue(path, message) {
  return { path, message };
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function arrayValues(value) {
  return Array.isArray(value) ? value : [];
}

function optionIds(options) {
  return arrayValues(options).map((option) => (typeof option === "string" ? option : option?.id)).filter(Boolean);
}

function collectUnknownKeys(value, allowedKeys, path, warnings) {
  Object.keys(value).forEach((key) => {
    if (!allowedKeys.includes(key)) {
      warnings.push(createIssue(`${path}.${key}`, "Onbekend veld; wordt genegeerd bij genormaliseerde verwerking."));
    }
  });
}

function collectDuplicateIssues(items, key, path, errors, normalizer = (value) => value) {
  const seen = new Map();
  items.forEach((item, index) => {
    const value = normalizer(item?.[key]);
    if (!value) return;
    if (seen.has(value)) {
      errors.push(createIssue(`items[${index}].${path}`, `Dubbele ${path}: ${value}.`));
      return;
    }
    seen.set(value, index);
  });
}

function collectPhysicalPathWarning(item, index, key, warnings, fileExists) {
  const value = item?.[key];
  if (!value || typeof fileExists !== "function") return;
  if (!fileExists(value)) {
    warnings.push(createIssue(`items[${index}].${key}`, "Bestand bestaat niet fysiek binnen het project."));
  }
}

export function validateLibraryFile(libraryData, supplierData = {}, brochureData = {}, articleData = {}, mediaData = {}, options = {}) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(libraryData)) {
    return {
      valid: false,
      errors: [createIssue("root", "Bibliotheekdata moet een JSON-object zijn.")],
      warnings
    };
  }

  collectUnknownKeys(libraryData, LIBRARY_FILE_KEYS, "root", warnings);

  if (!libraryData.schemaVersion) {
    errors.push(createIssue("schemaVersion", "schemaVersion is verplicht."));
  }

  if (!Array.isArray(libraryData.statuses)) {
    errors.push(createIssue("statuses", "statuses moet een lijst zijn."));
  } else if (JSON.stringify(libraryData.statuses) !== JSON.stringify(CONTENT_STATUSES)) {
    errors.push(createIssue("statuses", "Bibliotheekstatussen moeten de centrale contentstatussen volgen."));
  }

  const configuredTypes = optionIds(libraryData.types);
  if (!Array.isArray(libraryData.types) || configuredTypes.length === 0) {
    errors.push(createIssue("types", "types moet minimaal een bibliotheektype bevatten."));
  } else {
    LIBRARY_TYPES.forEach((type) => {
      if (!configuredTypes.includes(type)) {
        errors.push(createIssue("types", `Bibliotheektype ontbreekt: ${type}.`));
      }
    });
  }

  if (!Array.isArray(libraryData.categories) || libraryData.categories.length === 0) {
    errors.push(createIssue("categories", "categories moet minimaal een categorie bevatten."));
  } else {
    LIBRARY_CATEGORIES.forEach((category) => {
      if (!libraryData.categories.includes(category)) {
        errors.push(createIssue("categories", `Bibliotheekcategorie ontbreekt: ${category}.`));
      }
    });
  }

  if (!Array.isArray(libraryData.items)) {
    errors.push(createIssue("items", "items moet een lijst zijn."));
  }

  const items = getLibraryItems(libraryData);
  collectDuplicateIssues(items, "id", "id", errors);
  collectDuplicateIssues(items, "slug", "slug", errors, normalizeSlug);

  items.forEach((item, index) => {
    if (!isPlainObject(item)) {
      errors.push(createIssue(`items[${index}]`, "Bibliotheekitem moet een object zijn."));
      return;
    }

    collectUnknownKeys(item, LIBRARY_ITEM_KEYS, `items[${index}]`, warnings);
    const result = validateLibraryItem(item, items, supplierData, brochureData, articleData, libraryData, mediaData, {
      skipDuplicateChecks: true
    });

    Object.entries(result.errors).forEach(([field, message]) => {
      errors.push(createIssue(`items[${index}].${field}`, message));
    });
    Object.entries(result.warnings).forEach(([field, message]) => {
      warnings.push(createIssue(`items[${index}].${field}`, message));
    });

    collectPhysicalPathWarning(item, index, "filePath", warnings, options.fileExists);
    collectPhysicalPathWarning(item, index, "thumbnailPath", warnings, options.fileExists);
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
