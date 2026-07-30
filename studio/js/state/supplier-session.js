import { findSupplierBySlug, getSuppliers, sortSuppliers } from "../../../shared/supplier-model.js";
import { validateSupplierFile } from "../../../shared/supplier-file-validation.js";
import {
  SUPPLIERS_EXPORT_FILENAME,
  deepClone,
  normalizeSupplierFileForExport,
  stableStringify,
  stringifySupplierExport
} from "../../../shared/supplier-normalizer.js";

function createHash(value) {
  return stableStringify(value);
}

function createInitialReport(data) {
  return {
    ...validateSupplierFile(data),
    action: "load",
    sourceFileName: "data/suppliers.json"
  };
}

export function createSupplierSession(initialData) {
  let sourceData = deepClone(initialData);
  let workingData = deepClone(initialData);
  let sourceHash = createHash(sourceData);
  let sourceFileName = "data/suppliers.json";
  let sourceType = "bundled";
  let lastValidationReport = createInitialReport(workingData);
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
      supplierCount: getSuppliers(workingData).length
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

  function importSource(nextData, fileName, report = validateSupplierFile(nextData)) {
    sourceData = deepClone(nextData);
    workingData = deepClone(nextData);
    sourceHash = createHash(sourceData);
    sourceFileName = fileName || "geimporteerd suppliers.json";
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
      ...validateSupplierFile(workingData),
      action: "restore",
      sourceFileName
    });
    lastExport = null;
  }

  function applySupplier(supplier, originalSlug = "") {
    const suppliers = getSuppliers(workingData);
    const existingIndex = originalSlug ? suppliers.findIndex((item) => item.slug === originalSlug) : -1;

    if (existingIndex >= 0) {
      suppliers[existingIndex] = {
        ...suppliers[existingIndex],
        ...supplier
      };
    } else {
      suppliers.push(supplier);
    }

    workingData.items = sortSuppliers(suppliers);
    lastValidationReport = deepClone({
      ...validateSupplierFile(workingData),
      action: "session",
      sourceFileName
    });
  }

  function findBySlug(slug) {
    const supplier = findSupplierBySlug(workingData, slug);
    return supplier ? deepClone(supplier) : null;
  }

  function prepareExport() {
    const report = {
      ...validateSupplierFile(workingData),
      action: "export",
      sourceFileName: SUPPLIERS_EXPORT_FILENAME
    };
    lastValidationReport = deepClone(report);

    if (!report.valid) {
      return { ok: false, report: deepClone(report), fileName: SUPPLIERS_EXPORT_FILENAME, json: "" };
    }

    return {
      ok: true,
      report: deepClone(report),
      fileName: SUPPLIERS_EXPORT_FILENAME,
      data: normalizeSupplierFileForExport(workingData),
      json: stringifySupplierExport(workingData)
    };
  }

  function markExported(report = lastValidationReport) {
    lastExport = {
      at: new Date().toISOString(),
      fileName: SUPPLIERS_EXPORT_FILENAME,
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
    applySupplier,
    findBySlug,
    prepareExport,
    markExported
  };
}
