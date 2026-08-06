import { getArticles } from "./article-model.js";
import { getBrochures } from "./brochure-model.js";
import { isReadyForPublicationStatus } from "./content-status.js";
import { getMediaAssets } from "./media-model.js";
import { getSuppliers } from "./supplier-model.js";

function createIssue(path, message) {
  return { path, message };
}

function hasValue(value) {
  return String(value ?? "").trim().length > 0;
}

function idsFor(items) {
  return new Set(items.map((item) => item.id));
}

function mediaFiles(mediaData) {
  return new Set(getMediaAssets(mediaData).map((asset) => asset.file));
}

function arrayValues(value) {
  return Array.isArray(value) ? value : [];
}

function addRequiredIssue({ article, index, field, label, errors, warnings, requiredForReady = false }) {
  const status = article.status;
  const missing = field === "categories" ? !Array.isArray(article.categories) || article.categories.length === 0 : !hasValue(article[field]);
  if (!missing) return;

  const path = `items[${index}].${field}`;
  if (isReadyForPublicationStatus(status) && requiredForReady) {
    errors.push(createIssue(path, `${label} is verplicht voor artikelen die gereed zijn voor publicatie.`));
    return;
  }

  warnings.push(createIssue(path, `${label} ontbreekt nog.`));
}

function validateArticleQuality(article, index, supplierIds, brochureIds, registeredMedia, errors, warnings) {
  addRequiredIssue({ article, index, field: "title", label: "Titel", errors, warnings, requiredForReady: true });
  addRequiredIssue({ article, index, field: "slug", label: "URL-naam", errors, warnings, requiredForReady: true });
  addRequiredIssue({ article, index, field: "summary", label: "Samenvatting", errors, warnings, requiredForReady: true });
  addRequiredIssue({ article, index, field: "body", label: "Inhoud", errors, warnings, requiredForReady: true });
  addRequiredIssue({ article, index, field: "categories", label: "Categorie", errors, warnings, requiredForReady: true });
  addRequiredIssue({ article, index, field: "updatedAt", label: "Bijgewerkt op", errors, warnings, requiredForReady: true });

  if (isReadyForPublicationStatus(article.status) && !hasValue(article.heroImage)) {
    errors.push(createIssue(`items[${index}].heroImage`, "Headerafbeelding is verplicht voor artikelen die gereed zijn voor publicatie."));
  }

  if (hasValue(article.heroImage) && !registeredMedia.has(article.heroImage)) {
    warnings.push(createIssue(`items[${index}].heroImage`, "Headerafbeelding staat nog niet in Media."));
  }

  arrayValues(article.supplierIds).forEach((supplierId, relationIndex) => {
    if (!supplierIds.has(supplierId)) {
      warnings.push(createIssue(`items[${index}].supplierIds[${relationIndex}]`, `Artikel verwijst naar onbekende leverancier: ${supplierId}.`));
    }
  });

  arrayValues(article.brochureIds).forEach((brochureId, relationIndex) => {
    if (!brochureIds.has(brochureId)) {
      warnings.push(createIssue(`items[${index}].brochureIds[${relationIndex}]`, `Artikel verwijst naar onbekende brochure: ${brochureId}.`));
    }
  });
}

function validateSupplierArticleRelations(supplierData, articleIds, warnings) {
  getSuppliers(supplierData).forEach((supplier, supplierIndex) => {
    arrayValues(supplier.relatedArticleIds).forEach((articleId, relationIndex) => {
      if (!articleIds.has(articleId)) {
        warnings.push(
          createIssue(
            `suppliers.items[${supplierIndex}].relatedArticleIds[${relationIndex}]`,
            `Leverancier verwijst naar onbekend kennisbankartikel: ${articleId}.`
          )
        );
      }
    });
  });
}

export function getArticleQualityReport(articleData = {}, supplierData = {}, brochureData = {}, mediaData = {}) {
  const errors = [];
  const warnings = [];
  const articles = getArticles(articleData);
  const supplierIds = idsFor(getSuppliers(supplierData));
  const brochureIds = idsFor(getBrochures(brochureData));
  const articleIds = idsFor(articles);
  const registeredMedia = mediaFiles(mediaData);

  articles.forEach((article, index) => {
    validateArticleQuality(article, index, supplierIds, brochureIds, registeredMedia, errors, warnings);
  });
  validateSupplierArticleRelations(supplierData, articleIds, warnings);

  const statusCounts = articles.reduce((counts, article) => {
    counts[article.status] = (counts[article.status] || 0) + 1;
    return counts;
  }, {});
  const missingMediaRegistrations = warnings.filter((warning) => warning.path.includes(".heroImage")).length;

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      total: articles.length,
      published: statusCounts.published || 0,
      ready: statusCounts.ready || 0,
      concept: statusCounts.concept || 0,
      review: statusCounts.review || 0,
      warnings: warnings.length,
      missingMediaRegistrations,
      missingPublishedHeroImages: errors.filter((error) => error.path.includes(".heroImage")).length
    },
    statusCounts
  };
}
