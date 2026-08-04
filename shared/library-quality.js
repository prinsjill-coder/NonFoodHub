import { getArticles } from "./article-model.js";
import { getBrochures } from "./brochure-model.js";
import { getMediaAssets } from "./media-model.js";
import { getSuppliers } from "./supplier-model.js";
import { validateLibraryFile } from "./library-file-validation.js";
import { getLibraryItems } from "./library-model.js";

function createIssue(path, message) {
  return { path, message };
}

function hasValue(value) {
  return String(value ?? "").trim().length > 0;
}

function idsFor(items) {
  return new Set(items.map((item) => item.id));
}

function arrayValues(value) {
  return Array.isArray(value) ? value : [];
}

function mediaFiles(mediaData) {
  return new Set(getMediaAssets(mediaData).map((asset) => asset.file));
}

function addUniqueIssue(list, issue) {
  if (list.some((existingIssue) => existingIssue.path === issue.path && existingIssue.message === issue.message)) {
    return;
  }

  list.push(issue);
}

function addMissingFileWarning({ item, index, key, label, registeredMedia, warnings, missingFiles }) {
  const path = `items[${index}].${key}`;
  const value = item[key];

  if (!hasValue(value)) {
    const issue = createIssue(path, `${label} ontbreekt.`);
    addUniqueIssue(warnings, issue);
    addUniqueIssue(missingFiles, issue);
    return;
  }

  if (!registeredMedia.has(value)) {
    const issue = createIssue(path, `${label} staat nog niet in Media.`);
    addUniqueIssue(warnings, issue);
    addUniqueIssue(missingFiles, issue);
  }
}

function collectBrokenRelations({ item, index, supplierIds, brochureIds, articleIds, brokenRelations, warnings }) {
  arrayValues(item.supplierIds).forEach((supplierId, relationIndex) => {
    if (!supplierIds.has(supplierId)) {
      const issue = createIssue(`items[${index}].supplierIds[${relationIndex}]`, `Onbekende leverancier: ${supplierId}.`);
      addUniqueIssue(warnings, issue);
      addUniqueIssue(brokenRelations, issue);
    }
  });

  arrayValues(item.brochureIds).forEach((brochureId, relationIndex) => {
    if (!brochureIds.has(brochureId)) {
      const issue = createIssue(`items[${index}].brochureIds[${relationIndex}]`, `Onbekende brochure: ${brochureId}.`);
      addUniqueIssue(warnings, issue);
      addUniqueIssue(brokenRelations, issue);
    }
  });

  arrayValues(item.articleIds).forEach((articleId, relationIndex) => {
    if (!articleIds.has(articleId)) {
      const issue = createIssue(`items[${index}].articleIds[${relationIndex}]`, `Onbekend kennisbankartikel: ${articleId}.`);
      addUniqueIssue(warnings, issue);
      addUniqueIssue(brokenRelations, issue);
    }
  });
}

function collectPublishedWarnings(item, index, warnings) {
  if (item.status !== "published") return;

  if (!hasValue(item.summary)) {
    addUniqueIssue(warnings, createIssue(`items[${index}].summary`, "Samenvatting is belangrijk voor gepubliceerde bibliotheekitems."));
  }

  if (!hasValue(item.filePath)) {
    addUniqueIssue(warnings, createIssue(`items[${index}].filePath`, "Bestand is belangrijk voor gepubliceerde bibliotheekitems."));
  }

  if (!hasValue(item.thumbnailPath)) {
    addUniqueIssue(warnings, createIssue(`items[${index}].thumbnailPath`, "Afbeelding is belangrijk voor gepubliceerde bibliotheekitems."));
  }
}

export function getLibraryQualityReport(libraryData = {}, supplierData = {}, brochureData = {}, articleData = {}, mediaData = {}) {
  const fileReport = validateLibraryFile(libraryData, supplierData, brochureData, articleData, mediaData);
  const errors = [...fileReport.errors];
  const warnings = [...fileReport.warnings];
  const missingFiles = [];
  const brokenRelations = [];
  const items = getLibraryItems(libraryData);
  const supplierIds = idsFor(getSuppliers(supplierData));
  const brochureIds = idsFor(getBrochures(brochureData));
  const articleIds = idsFor(getArticles(articleData));
  const registeredMedia = mediaFiles(mediaData);

  items.forEach((item, index) => {
    addMissingFileWarning({
      item,
      index,
      key: "filePath",
      label: "Bestand",
      registeredMedia,
      warnings,
      missingFiles
    });
    addMissingFileWarning({
      item,
      index,
      key: "thumbnailPath",
      label: "Afbeelding",
      registeredMedia,
      warnings,
      missingFiles
    });
    collectBrokenRelations({
      item,
      index,
      supplierIds,
      brochureIds,
      articleIds,
      brokenRelations,
      warnings
    });
    collectPublishedWarnings(item, index, warnings);
  });

  const statusCounts = items.reduce((counts, item) => {
    counts[item.status] = (counts[item.status] || 0) + 1;
    return counts;
  }, {});

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    missingFiles,
    brokenRelations,
    stats: {
      total: items.length,
      published: statusCounts.published || 0,
      concept: statusCounts.concept || 0,
      review: statusCounts.review || 0,
      warnings: warnings.length,
      missingFiles: missingFiles.length,
      brokenRelations: brokenRelations.length
    },
    statusCounts
  };
}
