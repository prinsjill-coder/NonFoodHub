import { findBrochureById, findBrochureBySlug, getBrochures, sortBrochures } from "../../../shared/brochure-model.js";
import { validateBrochureFile } from "../../../shared/brochure-file-validation.js";
import { deepClone, stableStringify } from "../../../shared/brochure-normalizer.js";

function createHash(value) {
  return stableStringify(value);
}

function createInitialReport(data, supplierData) {
  return {
    ...validateBrochureFile(data, supplierData),
    action: "load",
    sourceFileName: "data/brochures.json"
  };
}

export function createBrochureSession(initialData, supplierDataSource) {
  const getSupplierData =
    typeof supplierDataSource === "function"
      ? supplierDataSource
      : () => supplierDataSource;
  let sourceData = deepClone(initialData);
  let workingData = deepClone(initialData);
  let sourceHash = createHash(sourceData);
  let sourceFileName = "data/brochures.json";
  let sourceType = "bundled";
  let lastValidationReport = createInitialReport(workingData, getSupplierData());

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
      hasUnexportedChanges: dirty,
      lastValidationReport: deepClone(lastValidationReport),
      brochureCount: getBrochures(workingData).length
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
    lastValidationReport = deepClone({
      ...validateBrochureFile(workingData, getSupplierData()),
      action: "restore",
      sourceFileName
    });
  }

  function applyBrochure(brochure, originalSlug = "") {
    const brochures = getBrochures(workingData);
    const existingIndex = originalSlug ? brochures.findIndex((item) => item.slug === originalSlug) : -1;

    if (existingIndex >= 0) {
      brochures[existingIndex] = {
        ...brochures[existingIndex],
        ...brochure
      };
    } else {
      brochures.push(brochure);
    }

    workingData.items = sortBrochures(brochures);
    lastValidationReport = deepClone({
      ...validateBrochureFile(workingData, getSupplierData()),
      action: "session",
      sourceFileName
    });
  }

  function findBySlug(slug) {
    const brochure = findBrochureBySlug(workingData, slug);
    return brochure ? deepClone(brochure) : null;
  }

  function findById(id) {
    const brochure = findBrochureById(workingData, id);
    return brochure ? deepClone(brochure) : null;
  }

  return {
    snapshot,
    getWorkingData,
    getSourceData,
    setValidationReport,
    restoreSource,
    applyBrochure,
    findBySlug,
    findById
  };
}
