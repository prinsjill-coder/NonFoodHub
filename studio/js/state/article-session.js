import { findArticleById, findArticleBySlug, getArticles, sortArticles } from "../../../shared/article-model.js";
import { validateArticleFile } from "../../../shared/article-file-validation.js";
import { createArticleExport } from "../../../shared/article-export.js";
import { ARTICLES_EXPORT_FILENAME, deepClone, normalizeArticleFileForSession, stableStringify } from "../../../shared/article-normalizer.js";

function createHash(value) {
  return stableStringify(value);
}

function resolveSource(source) {
  return typeof source === "function" ? source() : source;
}

function createInitialReport(data, supplierData, brochureData, mediaData) {
  return {
    ...validateArticleFile(data, supplierData, brochureData, mediaData),
    action: "load",
    sourceFileName: "data/articles.json"
  };
}

export function createArticleSession(initialData, supplierDataSource = {}, brochureDataSource = {}, mediaDataSource = {}) {
  let sourceData = deepClone(initialData);
  let workingData = deepClone(initialData);
  let sourceHash = createHash(sourceData);
  let sourceFileName = "data/articles.json";
  let sourceType = "bundled";
  let lastValidationReport = createInitialReport(
    workingData,
    resolveSource(supplierDataSource),
    resolveSource(brochureDataSource),
    resolveSource(mediaDataSource)
  );
  let lastExport = null;

  function workingHash() {
    return createHash(workingData);
  }

  function currentReport(action = "session") {
    return {
      ...validateArticleFile(
        workingData,
        resolveSource(supplierDataSource),
        resolveSource(brochureDataSource),
        resolveSource(mediaDataSource)
      ),
      action,
      sourceFileName
    };
  }

  function snapshot() {
    const currentHash = workingHash();
    const dirty = currentHash !== sourceHash;
    const exportedCurrent = Boolean(lastExport && lastExport.hash === currentHash);
    return {
      sourceFileName,
      sourceType,
      dirty,
      exportedCurrent,
      hasUnexportedChanges: dirty && !exportedCurrent,
      exportStatus: exportedCurrent ? "exported_unconfirmed" : "not_exported",
      lastExport: deepClone(lastExport),
      lastValidationReport: deepClone(lastValidationReport),
      articleCount: getArticles(workingData).length
    };
  }

  function getWorkingData() {
    return deepClone(workingData);
  }

  function getSourceData() {
    return deepClone(sourceData);
  }

  function setValidationReport(report) {
    lastValidationReport = deepClone(report);
  }

  function importSource(nextData, fileName, report = validateArticleFile(
    nextData,
    resolveSource(supplierDataSource),
    resolveSource(brochureDataSource),
    resolveSource(mediaDataSource)
  )) {
    const normalizedData = normalizeArticleFileForSession(nextData);
    sourceData = deepClone(normalizedData);
    workingData = deepClone(normalizedData);
    sourceHash = createHash(sourceData);
    sourceFileName = fileName || "geimporteerd articles.json";
    sourceType = "imported";
    lastValidationReport = deepClone({
      ...report,
      action: "import",
      sourceFileName
    });
    lastExport = null;
  }

  function restoreSource() {
    workingData = deepClone(sourceData);
    lastValidationReport = deepClone(currentReport("restore"));
    lastExport = null;
  }

  function applyArticle(article, originalSlug = "") {
    const articles = getArticles(workingData);
    const existingIndex = originalSlug ? articles.findIndex((item) => item.slug === originalSlug) : -1;

    if (existingIndex >= 0) {
      articles[existingIndex] = {
        ...articles[existingIndex],
        ...article
      };
    } else {
      articles.push(article);
    }

    workingData.items = sortArticles(articles);
    workingData = normalizeArticleFileForSession(workingData);
    lastValidationReport = deepClone(currentReport("session"));
  }

  function findBySlug(slug) {
    const article = findArticleBySlug(workingData, slug);
    return article ? deepClone(article) : null;
  }

  function findById(id) {
    const article = findArticleById(workingData, id);
    return article ? deepClone(article) : null;
  }

  function prepareExport() {
    const exportResult = createArticleExport(
      workingData,
      resolveSource(supplierDataSource),
      resolveSource(brochureDataSource),
      resolveSource(mediaDataSource)
    );
    lastValidationReport = deepClone(exportResult.report);
    return deepClone(exportResult);
  }

  function markExported(report = lastValidationReport) {
    lastExport = {
      at: new Date().toISOString(),
      fileName: ARTICLES_EXPORT_FILENAME,
      hash: workingHash(),
      status: "exported_unconfirmed"
    };
    lastValidationReport = deepClone(report);
  }

  return {
    snapshot,
    getWorkingData,
    getSourceData,
    setValidationReport,
    importSource,
    restoreSource,
    applyArticle,
    findBySlug,
    findById,
    prepareExport,
    markExported
  };
}
