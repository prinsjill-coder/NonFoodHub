import { findBrochureById, findBrochureBySlug, getBrochures, sortBrochures } from "../../../shared/brochure-model.js";
import { validateBrochureFile } from "../../../shared/brochure-file-validation.js";
import {
  BROCHURES_EXPORT_FILENAME,
  deepClone,
  normalizeBrochureFileForExport,
  normalizeBrochureFileForSession,
  stableStringify,
  stringifyBrochureExport
} from "../../../shared/brochure-normalizer.js";

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
  let lastExport = null;

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

  function importSource(nextData, fileName, report = validateBrochureFile(nextData, getSupplierData())) {
    const normalizedData = normalizeBrochureFileForSession(nextData);
    sourceData = deepClone(normalizedData);
    workingData = deepClone(normalizedData);
    sourceHash = createHash(sourceData);
    sourceFileName = fileName || "geimporteerd brochures.json";
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
    lastValidationReport = deepClone({
      ...validateBrochureFile(workingData, getSupplierData()),
      action: "restore",
      sourceFileName
    });
    lastExport = null;
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

  function prepareExport() {
    const report = {
      ...validateBrochureFile(workingData, getSupplierData()),
      action: "export",
      sourceFileName: BROCHURES_EXPORT_FILENAME
    };
    lastValidationReport = deepClone(report);

    if (!report.valid) {
      return { ok: false, report: deepClone(report), fileName: BROCHURES_EXPORT_FILENAME, json: "" };
    }

    return {
      ok: true,
      report: deepClone(report),
      fileName: BROCHURES_EXPORT_FILENAME,
      data: normalizeBrochureFileForExport(workingData),
      json: stringifyBrochureExport(workingData)
    };
  }

  function markExported(report = lastValidationReport) {
    lastExport = {
      at: new Date().toISOString(),
      fileName: BROCHURES_EXPORT_FILENAME,
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
    applyBrochure,
    findBySlug,
    findById,
    prepareExport,
    markExported
  };
}
