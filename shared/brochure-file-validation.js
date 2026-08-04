import { CONTENT_STATUSES, isContentStatus } from "./content-status.js";
import { normalizeSlug } from "./brochure-model.js";
import { BROCHURE_FILE_KEYS, BROCHURE_KEYS } from "./brochure-normalizer.js";
import { getSuppliers } from "./supplier-model.js";

function createIssue(path, message) {
  return { path, message };
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

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

function validateArray(value, path, errors) {
  if (!Array.isArray(value)) {
    errors.push(createIssue(path, "Moet een array zijn."));
    return false;
  }
  return true;
}

function reportUnknownKeys(value, allowedKeys, path, warnings) {
  Object.keys(value).forEach((key) => {
    if (!allowedKeys.includes(key)) {
      warnings.push(createIssue(`${path}.${key}`, "Onbekend veld. Dit blokkeert laden niet, maar hoort niet in het genormaliseerde brochuremodel."));
    }
  });
}

function languageIdsFromFile(brochureData) {
  if (!Array.isArray(brochureData.languages)) return [];
  return brochureData.languages.map((language) => String(language?.id ?? "").trim()).filter(Boolean);
}

function supplierIdsFromFile(supplierData) {
  return new Set(getSuppliers(supplierData).map((supplier) => supplier.id));
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

function validateBrochureRecord(brochure, index, brochureData, supplierData, errors, warnings) {
  const path = `items[${index}]`;
  if (!isPlainObject(brochure)) {
    errors.push(createIssue(path, "Brochure moet een object zijn."));
    return;
  }

  reportUnknownKeys(brochure, BROCHURE_KEYS, path, warnings);

  if (!hasValue(brochure.id)) {
    errors.push(createIssue(`${path}.id`, "id is verplicht."));
  }

  if (!hasValue(brochure.title)) {
    errors.push(createIssue(`${path}.title`, "title is verplicht."));
  }

  const supplierIds = supplierIdsFromFile(supplierData);
  if (!hasValue(brochure.supplierId)) {
    errors.push(createIssue(`${path}.supplierId`, "supplierId is verplicht."));
  } else if (!supplierIds.has(brochure.supplierId)) {
    errors.push(createIssue(`${path}.supplierId`, "supplierId verwijst niet naar een bestaande leverancier."));
  }

  if (!hasValue(brochure.slug)) {
    errors.push(createIssue(`${path}.slug`, "slug is verplicht."));
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(brochure.slug))) {
    errors.push(createIssue(`${path}.slug`, "slug moet lowercase kebab-case zijn."));
  }

  if (!isContentStatus(brochure.status)) {
    errors.push(createIssue(`${path}.status`, "status is ongeldig."));
  }

  const languages = languageIdsFromFile(brochureData);
  if (!hasValue(brochure.language)) {
    errors.push(createIssue(`${path}.language`, "language is verplicht."));
  } else if (languages.length && !languages.includes(brochure.language)) {
    errors.push(createIssue(`${path}.language`, "language staat niet in de top-level languages-lijst."));
  }

  if (!Number.isInteger(brochure.sortOrder) || brochure.sortOrder < 0) {
    errors.push(createIssue(`${path}.sortOrder`, "sortOrder moet een positief geheel getal of 0 zijn."));
  }

  if (!validDate(brochure.updatedAt)) {
    errors.push(createIssue(`${path}.updatedAt`, "updatedAt moet een geldige datum zijn in de vorm jjjj-mm-dd."));
  }

  if (!validYear(brochure.year)) {
    errors.push(createIssue(`${path}.year`, "year moet een geldig jaartal zijn of leeg blijven."));
  }

  if (!Array.isArray(brochure.categories)) {
    errors.push(createIssue(`${path}.categories`, "categories moet een array zijn."));
  } else {
    brochure.categories.forEach((category, categoryIndex) => {
      if (!hasValue(category)) {
        errors.push(createIssue(`${path}.categories[${categoryIndex}]`, "categorie mag niet leeg zijn."));
      }
    });
  }

  if (brochure.pdfFile) {
    if (!isRelativeProjectPath(String(brochure.pdfFile))) {
      errors.push(createIssue(`${path}.pdfFile`, "Gebruik een relatief projectpad, geen lokaal pad of file-url."));
    } else if (!String(brochure.pdfFile).toLowerCase().endsWith(".pdf")) {
      errors.push(createIssue(`${path}.pdfFile`, "pdfFile moet eindigen op .pdf."));
    }
  }

  if (brochure.thumbnail && !isRelativeProjectPath(String(brochure.thumbnail))) {
    errors.push(createIssue(`${path}.thumbnail`, "Gebruik een relatief projectpad, geen lokaal pad of file-url."));
  }

  if ((brochure.status === "review" || brochure.status === "published") && !hasValue(brochure.pdfFile)) {
    errors.push(createIssue(`${path}.pdfFile`, "Brochures met status review of published hebben een pdfFile nodig."));
  }

  if (brochure.status === "published" && !hasValue(brochure.thumbnail)) {
    errors.push(createIssue(`${path}.thumbnail`, "Gepubliceerde brochures hebben een thumbnail nodig."));
  }
}

export function validateBrochureFile(brochureData, supplierData) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(brochureData)) {
    return {
      valid: false,
      errors: [createIssue("root", "brochures.json moet een JSON-object als root hebben.")],
      warnings
    };
  }

  reportUnknownKeys(brochureData, BROCHURE_FILE_KEYS, "root", warnings);

  if (!hasValue(brochureData.schemaVersion)) {
    errors.push(createIssue("schemaVersion", "schemaVersion is verplicht."));
  }

  if (validateArray(brochureData.statuses, "statuses", errors)) {
    CONTENT_STATUSES.forEach((status) => {
      if (!brochureData.statuses.includes(status)) {
        errors.push(createIssue("statuses", `Status ${status} ontbreekt.`));
      }
    });
  }

  validateArray(brochureData.categories, "categories", errors);

  if (validateArray(brochureData.languages, "languages", errors)) {
    brochureData.languages.forEach((language, index) => {
      if (!isPlainObject(language)) {
        errors.push(createIssue(`languages[${index}]`, "language moet een object zijn."));
        return;
      }
      if (!hasValue(language.id)) {
        errors.push(createIssue(`languages[${index}].id`, "language id is verplicht."));
      }
      if (!hasValue(language.label)) {
        errors.push(createIssue(`languages[${index}].label`, "language label is verplicht."));
      }
    });
  }

  if (!validateArray(brochureData.items, "items", errors)) {
    return { valid: false, errors, warnings };
  }

  const ids = new Map();
  const slugs = new Map();
  brochureData.items.forEach((brochure, index) => {
    validateBrochureRecord(brochure, index, brochureData, supplierData, errors, warnings);

    const id = String(brochure?.id ?? "").trim();
    if (id) {
      if (ids.has(id)) {
        errors.push(createIssue(`items[${index}].id`, `Dubbele id: ${id}.`));
      }
      ids.set(id, index);
    }

    const normalizedSlug = normalizeSlug(brochure?.slug);
    if (normalizedSlug) {
      if (slugs.has(normalizedSlug)) {
        errors.push(createIssue(`items[${index}].slug`, `Dubbele genormaliseerde slug: ${normalizedSlug}.`));
      }
      slugs.set(normalizedSlug, index);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
