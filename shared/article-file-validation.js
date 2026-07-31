import { CONTENT_STATUSES, isContentStatus } from "./content-status.js";
import { getBrochures } from "./brochure-model.js";
import { getMediaAssets } from "./media-model.js";
import { getSuppliers } from "./supplier-model.js";
import { ARTICLE_CATEGORIES, getArticles, normalizeSlug } from "./article-model.js";
import { ARTICLE_FILE_KEYS, ARTICLE_KEYS } from "./article-normalizer.js";

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
      warnings.push(createIssue(`${path}.${key}`, "Onbekend veld. Dit blokkeert laden niet, maar hoort niet in het genormaliseerde artikelmodel."));
    }
  });
}

function validateStringArray(value, path, errors) {
  if (!validateArray(value, path, errors)) return;
  value.forEach((item, index) => {
    if (!hasValue(item)) {
      errors.push(createIssue(`${path}[${index}]`, "Waarde mag niet leeg zijn."));
    }
  });
}

function arrayValues(value) {
  return Array.isArray(value) ? value : [];
}

function knownIds(items) {
  return new Set(items.map((item) => item.id));
}

function validateArticleRelations(article, path, supplierData, brochureData, errors) {
  const supplierIds = knownIds(getSuppliers(supplierData));
  arrayValues(article.supplierIds).forEach((supplierId, index) => {
    if (!supplierIds.has(supplierId)) {
      errors.push(createIssue(`${path}.supplierIds[${index}]`, `Onbekende leverancier: ${supplierId}.`));
    }
  });

  const brochureIds = knownIds(getBrochures(brochureData));
  arrayValues(article.brochureIds).forEach((brochureId, index) => {
    if (!brochureIds.has(brochureId)) {
      errors.push(createIssue(`${path}.brochureIds[${index}]`, `Onbekende brochure: ${brochureId}.`));
    }
  });
}

function validateHeroImage(article, path, mediaData, errors, warnings) {
  if (!hasValue(article.heroImage)) {
    warnings.push(createIssue(`${path}.heroImage`, "Er is nog geen hero afbeelding gekoppeld."));
    return;
  }

  if (!isRelativeProjectPath(String(article.heroImage))) {
    errors.push(createIssue(`${path}.heroImage`, "Gebruik een relatief projectpad, geen lokaal pad of file-url."));
    return;
  }

  const registered = getMediaAssets(mediaData).some((asset) => asset.file === article.heroImage);
  if (!registered) {
    warnings.push(createIssue(`${path}.heroImage`, "Hero afbeelding staat niet geregistreerd in media.json"));
  }
}

function validateArticleRecord(article, index, articleData, supplierData, brochureData, mediaData, errors, warnings) {
  const path = `items[${index}]`;
  if (!isPlainObject(article)) {
    errors.push(createIssue(path, "Artikel moet een object zijn."));
    return;
  }

  reportUnknownKeys(article, ARTICLE_KEYS, path, warnings);
  const status = String(article.status || "").trim();
  const requiresReviewFields = status === "review" || status === "published";
  const requiresPublishedFields = status === "published";

  if (!hasValue(article.id)) {
    errors.push(createIssue(`${path}.id`, "id is verplicht."));
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.id)) {
    errors.push(createIssue(`${path}.id`, "id moet lowercase kebab-case zijn."));
  }

  if (requiresReviewFields && !hasValue(article.title)) {
    errors.push(createIssue(`${path}.title`, "title is verplicht voor review en published."));
  }

  if (!hasValue(article.slug)) {
    errors.push(createIssue(`${path}.slug`, "slug is verplicht."));
  } else if (article.slug !== normalizeSlug(article.slug)) {
    errors.push(createIssue(`${path}.slug`, "slug moet lowercase kebab-case zijn."));
  }

  if (!isContentStatus(article.status)) {
    errors.push(createIssue(`${path}.status`, "status is ongeldig."));
  }

  if (requiresReviewFields && !hasValue(article.summary)) {
    errors.push(createIssue(`${path}.summary`, "summary is verplicht voor review en published."));
  }

  if (requiresPublishedFields && !hasValue(article.body)) {
    errors.push(createIssue(`${path}.body`, "body is verplicht voor published."));
  }

  if (!Array.isArray(article.categories)) {
    errors.push(createIssue(`${path}.categories`, "categories moet een array zijn."));
  } else if (requiresReviewFields && article.categories.length === 0) {
    errors.push(createIssue(`${path}.categories`, "Minimaal een categorie is verplicht voor review en published."));
  } else {
    validateStringArray(article.categories, `${path}.categories`, errors);
    const allowedCategories = new Set(articleData.categories || []);
    arrayValues(article.categories).forEach((category, categoryIndex) => {
      if (!allowedCategories.has(category)) {
        errors.push(createIssue(`${path}.categories[${categoryIndex}]`, `Onbekende categorie: ${category}.`));
      }
    });
  }

  if (requiresPublishedFields && !hasValue(article.heroImage)) {
    errors.push(createIssue(`${path}.heroImage`, "heroImage is verplicht voor published."));
  } else {
    validateHeroImage(article, path, mediaData, errors, warnings);
  }
  validateStringArray(article.supplierIds, `${path}.supplierIds`, errors);
  validateStringArray(article.brochureIds, `${path}.brochureIds`, errors);
  validateArticleRelations(article, path, supplierData, brochureData, errors);

  if (!validDate(article.updatedAt)) {
    errors.push(createIssue(`${path}.updatedAt`, "updatedAt moet een geldige datum in formaat YYYY-MM-DD zijn."));
  }

  if (!Number.isInteger(article.sortOrder) || article.sortOrder < 0) {
    errors.push(createIssue(`${path}.sortOrder`, "sortOrder moet een positief geheel getal of 0 zijn."));
  }
}

export function validateArticleFile(articleData, supplierData = {}, brochureData = {}, mediaData = {}) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(articleData)) {
    return {
      valid: false,
      errors: [createIssue("root", "articles.json moet een JSON-object als root hebben.")],
      warnings
    };
  }

  reportUnknownKeys(articleData, ARTICLE_FILE_KEYS, "root", warnings);

  if (!hasValue(articleData.schemaVersion)) {
    errors.push(createIssue("schemaVersion", "schemaVersion is verplicht."));
  } else if (articleData.schemaVersion !== "0.1.0") {
    errors.push(createIssue("schemaVersion", "schemaVersion moet 0.1.0 zijn."));
  }

  if ("metadata" in articleData && !isPlainObject(articleData.metadata)) {
    warnings.push(createIssue("metadata", "metadata moet een object zijn en wordt bij export genormaliseerd."));
  }

  if (validateArray(articleData.statuses, "statuses", errors)) {
    CONTENT_STATUSES.forEach((status) => {
      if (!articleData.statuses.includes(status)) {
        errors.push(createIssue("statuses", `Status ${status} ontbreekt.`));
      }
    });
  }

  validateStringArray(articleData.categories, "categories", errors);
  const configuredCategories = new Set(arrayValues(articleData.categories));
  ARTICLE_CATEGORIES.forEach((category) => {
    if (!configuredCategories.has(category)) {
      errors.push(createIssue("categories", `Categorie ${category} ontbreekt.`));
    }
  });

  if (!validateArray(articleData.items, "items", errors)) {
    return { valid: false, errors, warnings };
  }

  const ids = new Map();
  const slugs = new Map();
  getArticles(articleData).forEach((article, index) => {
    validateArticleRecord(article, index, articleData, supplierData, brochureData, mediaData, errors, warnings);

    const id = String(article?.id ?? "").trim();
    if (id) {
      if (ids.has(id)) {
        errors.push(createIssue(`items[${index}].id`, `Dubbele id: ${id}.`));
      }
      ids.set(id, index);
    }

    const normalizedSlug = normalizeSlug(article?.slug);
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
