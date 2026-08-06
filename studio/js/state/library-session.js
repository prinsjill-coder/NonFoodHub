import { createLibraryExport } from "../../../shared/library-export.js";
import { findLibraryItemById, findLibraryItemBySlug, getLibraryItems, sortLibraryItems } from "../../../shared/library-model.js";
import { validateLibraryFile } from "../../../shared/library-file-validation.js";
import {
  LIBRARY_EXPORT_FILENAME,
  deepClone,
  normalizeLibraryFileForSession,
  stableStringify
} from "../../../shared/library-normalizer.js";

function createHash(value) {
  return stableStringify(value);
}

function resolveData(source) {
  return typeof source === "function" ? source() : source || {};
}

function createValidationReport(data, sources, action, sourceFileName) {
  return {
    ...validateLibraryFile(
      data,
      resolveData(sources.suppliers),
      resolveData(sources.brochures),
      resolveData(sources.articles),
      resolveData(sources.media)
    ),
    action,
    sourceFileName
  };
}

export function createLibrarySession(initialData, sources = {}, options = {}) {
  let sourceData = normalizeLibraryFileForSession(options.sourceData || initialData);
  let workingData = normalizeLibraryFileForSession(options.workingData || sourceData);
  let sourceHash = createHash(sourceData);
  let sourceFileName = options.sourceFileName || "data/library.json";
  let sourceType = options.sourceType || "bundled";
  let lastValidationReport = createValidationReport(workingData, sources, "load", sourceFileName);
  let lastExport = deepClone(options.lastExport || null);

  function workingHash() {
    return createHash(workingData);
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
      libraryCount: getLibraryItems(workingData).length
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

  function restoreSource() {
    workingData = deepClone(sourceData);
    lastValidationReport = createValidationReport(workingData, sources, "restore", sourceFileName);
    lastExport = null;
  }

  function importSource(nextData, fileName, report = createValidationReport(nextData, sources, "import", fileName || "library.json")) {
    const normalizedData = normalizeLibraryFileForSession(nextData);
    sourceData = deepClone(normalizedData);
    workingData = deepClone(normalizedData);
    sourceHash = createHash(sourceData);
    sourceFileName = fileName || "geimporteerd library.json";
    sourceType = "imported";
    lastValidationReport = deepClone({
      ...report,
      action: "import",
      sourceFileName
    });
    lastExport = null;
  }

  function applyLibraryItem(item, originalSlug = "") {
    const items = getLibraryItems(workingData);
    const existingIndex = originalSlug ? items.findIndex((existingItem) => existingItem.slug === originalSlug) : -1;

    if (existingIndex >= 0) {
      items[existingIndex] = {
        ...items[existingIndex],
        ...item
      };
    } else {
      items.push(item);
    }

    workingData.items = sortLibraryItems(items);
    workingData = normalizeLibraryFileForSession(workingData);
    lastValidationReport = createValidationReport(workingData, sources, "session", sourceFileName);
    lastExport = null;
  }

  function deleteLibraryItem(slug) {
    const items = getLibraryItems(workingData);
    workingData.items = sortLibraryItems(items.filter((item) => item.slug !== slug));
    workingData = normalizeLibraryFileForSession(workingData);
    lastValidationReport = createValidationReport(workingData, sources, "session", sourceFileName);
    lastExport = null;
  }

  function findBySlug(slug) {
    const item = findLibraryItemBySlug(workingData, slug);
    return item ? deepClone(item) : null;
  }

  function findById(id) {
    const item = findLibraryItemById(workingData, id);
    return item ? deepClone(item) : null;
  }

  function prepareExport() {
    const exportResult = createLibraryExport(
      workingData,
      resolveData(sources.suppliers),
      resolveData(sources.brochures),
      resolveData(sources.articles),
      resolveData(sources.media)
    );
    lastValidationReport = deepClone(exportResult.report);
    return deepClone(exportResult);
  }

  function markExported(report = lastValidationReport) {
    lastExport = {
      at: new Date().toISOString(),
      fileName: LIBRARY_EXPORT_FILENAME,
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
    restoreSource,
    importSource,
    applyLibraryItem,
    deleteLibraryItem,
    findBySlug,
    findById,
    prepareExport,
    markExported
  };
}
