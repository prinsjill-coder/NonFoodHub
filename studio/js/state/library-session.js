import { findLibraryItemBySlug, getLibraryItems, sortLibraryItems } from "../../../shared/library-model.js";
import { validateLibraryFile } from "../../../shared/library-file-validation.js";
import { deepClone, normalizeLibraryFileForSession, stableStringify } from "../../../shared/library-normalizer.js";

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

export function createLibrarySession(initialData, sources = {}) {
  let sourceData = normalizeLibraryFileForSession(initialData);
  let workingData = deepClone(sourceData);
  let sourceHash = createHash(sourceData);
  let sourceFileName = "data/library.json";
  let sourceType = "bundled";
  let lastValidationReport = createValidationReport(workingData, sources, "load", sourceFileName);

  function workingHash() {
    return createHash(workingData);
  }

  function snapshot() {
    const currentHash = workingHash();
    const dirty = currentHash !== sourceHash;
    return {
      sourceFileName,
      sourceType,
      dirty,
      exportedCurrent: false,
      hasUnexportedChanges: dirty,
      exportStatus: "not_available",
      lastExport: null,
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
  }

  function findBySlug(slug) {
    const item = findLibraryItemBySlug(workingData, slug);
    return item ? deepClone(item) : null;
  }

  return {
    snapshot,
    getWorkingData,
    getSourceData,
    setValidationReport,
    restoreSource,
    applyLibraryItem,
    findBySlug
  };
}
