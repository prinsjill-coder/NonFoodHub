import { findMediaAssetById, getMediaAssets, sortMediaAssets } from "../../../shared/media-model.js";
import { validateMediaFile } from "../../../shared/media-file-validation.js";
import { deepClone, normalizeMediaFileForSession, stableStringify } from "../../../shared/media-normalizer.js";

function createHash(value) {
  return stableStringify(value);
}

function createInitialReport(data) {
  return {
    ...validateMediaFile(data),
    action: "load",
    sourceFileName: "data/media.json"
  };
}

export function createMediaSession(initialData) {
  let sourceData = deepClone(initialData);
  let workingData = deepClone(initialData);
  let sourceHash = createHash(sourceData);
  let sourceFileName = "data/media.json";
  let sourceType = "bundled";
  let lastValidationReport = createInitialReport(workingData);

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
      mediaCount: getMediaAssets(workingData).length
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
      ...validateMediaFile(workingData),
      action: "restore",
      sourceFileName
    });
  }

  function applyMediaAsset(asset, originalId = "") {
    const assets = getMediaAssets(workingData);
    const existingIndex = originalId ? assets.findIndex((item) => item.id === originalId) : -1;

    if (existingIndex >= 0) {
      assets[existingIndex] = {
        ...assets[existingIndex],
        ...asset
      };
    } else {
      assets.push(asset);
    }

    workingData.items = sortMediaAssets(assets);
    workingData = normalizeMediaFileForSession(workingData);
    lastValidationReport = deepClone({
      ...validateMediaFile(workingData),
      action: "session",
      sourceFileName
    });
  }

  function findById(id) {
    const asset = findMediaAssetById(workingData, id);
    return asset ? deepClone(asset) : null;
  }

  return {
    snapshot,
    getWorkingData,
    getSourceData,
    setValidationReport,
    restoreSource,
    applyMediaAsset,
    findById
  };
}
