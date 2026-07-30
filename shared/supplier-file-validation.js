import { CONTENT_STATUSES, isContentStatus } from "./content-status.js";
import { SUPPLIER_TYPES, normalizeSlug } from "./supplier-model.js";
import { SUPPLIER_FILE_KEYS, SUPPLIER_KEYS } from "./supplier-normalizer.js";

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
  return !value.startsWith("/") && !value.startsWith("file://") && !value.includes("/Users/");
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
      warnings.push(createIssue(`${path}.${key}`, "Onbekend veld. Dit blokkeert import niet, maar wordt bij export gestript."));
    }
  });
}

function typeIdsFromFile(supplierData) {
  if (!Array.isArray(supplierData.types)) return SUPPLIER_TYPES;
  const ids = supplierData.types.map((type) => String(type?.id ?? "").trim()).filter(Boolean);
  return ids.length ? ids : SUPPLIER_TYPES;
}

function validateSupplierRecord(supplier, index, supplierData, errors, warnings) {
  const path = `items[${index}]`;
  if (!isPlainObject(supplier)) {
    errors.push(createIssue(path, "Leverancier moet een object zijn."));
    return;
  }

  reportUnknownKeys(supplier, SUPPLIER_KEYS, path, warnings);

  if (!hasValue(supplier.id)) {
    errors.push(createIssue(`${path}.id`, "id is verplicht."));
  }

  if (!hasValue(supplier.name)) {
    errors.push(createIssue(`${path}.name`, "name is verplicht."));
  }

  if (!hasValue(supplier.slug)) {
    errors.push(createIssue(`${path}.slug`, "slug is verplicht."));
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(supplier.slug))) {
    errors.push(createIssue(`${path}.slug`, "slug moet lowercase kebab-case zijn."));
  }

  const allowedTypes = typeIdsFromFile(supplierData);
  if (!allowedTypes.includes(supplier.type)) {
    errors.push(createIssue(`${path}.type`, "type is ongeldig."));
  }

  if (!isContentStatus(supplier.status)) {
    errors.push(createIssue(`${path}.status`, "status is ongeldig."));
  }

  if (!Array.isArray(supplier.categories)) {
    errors.push(createIssue(`${path}.categories`, "categories moet een array zijn."));
  } else {
    const knownCategories = new Set(Array.isArray(supplierData.categories) ? supplierData.categories : []);
    supplier.categories.forEach((category, categoryIndex) => {
      if (!hasValue(category)) {
        errors.push(createIssue(`${path}.categories[${categoryIndex}]`, "categorie mag niet leeg zijn."));
      } else if (knownCategories.size && !knownCategories.has(category)) {
        errors.push(createIssue(`${path}.categories[${categoryIndex}]`, "categorie staat niet in de top-level categories-lijst."));
      }
    });
  }

  ["brochureIds", "relatedArticleIds"].forEach((field) => {
    if (!Array.isArray(supplier[field])) {
      errors.push(createIssue(`${path}.${field}`, `${field} moet een array zijn.`));
    }
  });

  if (typeof supplier.featured !== "boolean") {
    errors.push(createIssue(`${path}.featured`, "featured moet true of false zijn."));
  }

  if (!Number.isInteger(supplier.sortOrder) || supplier.sortOrder < 0) {
    errors.push(createIssue(`${path}.sortOrder`, "sortOrder moet een positief geheel getal of 0 zijn."));
  }

  ["logo", "image"].forEach((field) => {
    if (supplier[field] && !isRelativeProjectPath(String(supplier[field]))) {
      errors.push(createIssue(`${path}.${field}`, "Gebruik een relatief projectpad, geen lokaal Mac-pad of file-url."));
    }
  });

  if (supplier.status === "published") {
    if (!hasValue(supplier.summary)) {
      errors.push(createIssue(`${path}.summary`, "Gepubliceerde leveranciers hebben een samenvatting nodig."));
    }
    if (!hasValue(supplier.description)) {
      errors.push(createIssue(`${path}.description`, "Gepubliceerde leveranciers hebben een omschrijving nodig."));
    }
    if (!Array.isArray(supplier.categories) || !supplier.categories.length) {
      errors.push(createIssue(`${path}.categories`, "Gepubliceerde leveranciers hebben minimaal een categorie nodig."));
    }
    if (!hasValue(supplier.logo)) {
      errors.push(createIssue(`${path}.logo`, "Gepubliceerde leveranciers hebben een logoreferentie nodig."));
    }
    if (!hasValue(supplier.image)) {
      errors.push(createIssue(`${path}.image`, "Gepubliceerde leveranciers hebben een afbeeldingsreferentie nodig."));
    }
  }
}

export function validateSupplierFile(supplierData) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(supplierData)) {
    return {
      valid: false,
      errors: [createIssue("root", "suppliers.json moet een JSON-object als root hebben.")],
      warnings
    };
  }

  reportUnknownKeys(supplierData, SUPPLIER_FILE_KEYS, "root", warnings);

  if (!hasValue(supplierData.schemaVersion)) {
    errors.push(createIssue("schemaVersion", "schemaVersion is verplicht."));
  }

  if (validateArray(supplierData.statuses, "statuses", errors)) {
    CONTENT_STATUSES.forEach((status) => {
      if (!supplierData.statuses.includes(status)) {
        errors.push(createIssue("statuses", `Status ${status} ontbreekt.`));
      }
    });
  }

  if (validateArray(supplierData.types, "types", errors)) {
    supplierData.types.forEach((type, index) => {
      if (!isPlainObject(type)) {
        errors.push(createIssue(`types[${index}]`, "type moet een object zijn."));
        return;
      }
      if (!hasValue(type.id)) {
        errors.push(createIssue(`types[${index}].id`, "type id is verplicht."));
      }
      if (!hasValue(type.label)) {
        errors.push(createIssue(`types[${index}].label`, "type label is verplicht."));
      }
    });
  }

  validateArray(supplierData.categories, "categories", errors);

  if (!validateArray(supplierData.items, "items", errors)) {
    return { valid: false, errors, warnings };
  }

  const ids = new Map();
  const slugs = new Map();
  supplierData.items.forEach((supplier, index) => {
    validateSupplierRecord(supplier, index, supplierData, errors, warnings);

    const id = String(supplier?.id ?? "").trim();
    if (id) {
      if (ids.has(id)) {
        errors.push(createIssue(`items[${index}].id`, `Dubbele id: ${id}.`));
      }
      ids.set(id, index);
    }

    const normalizedSlug = normalizeSlug(supplier?.slug);
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
