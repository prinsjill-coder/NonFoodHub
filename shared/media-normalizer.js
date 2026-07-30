import { CONTENT_STATUSES } from "./content-status.js";
import {
  MEDIA_RIGHTS_STATUSES,
  MEDIA_TYPES,
  MEDIA_USAGE_TYPES,
  sortMediaAssets
} from "./media-model.js";

export const MEDIA_FILE_KEYS = [
  "schemaVersion",
  "prototype",
  "storage",
  "statuses",
  "types",
  "usageTypes",
  "rightsStatuses",
  "items"
];

export const MEDIA_ASSET_KEYS = [
  "id",
  "title",
  "file",
  "type",
  "alt",
  "caption",
  "width",
  "height",
  "fileSize",
  "usageType",
  "rightsStatus",
  "status",
  "sortOrder"
];

export const MEDIA_STORAGE_NOTICE =
  "Media-assets worden in Sprint 7A alleen in browsergeheugen als registry beheerd. Uploads, automatische bestandsplaatsing en publicatie zijn niet actief.";

export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function asString(value) {
  return String(value ?? "").trim();
}

function normalizeNumber(value) {
  if (value === "" || value === null || typeof value === "undefined") return "";
  const number = Number(value);
  return Number.isInteger(number) ? number : value;
}

function normalizeOption(value, fallback = "") {
  return asString(typeof value === "string" ? value : value?.id) || fallback;
}

function normalizeOptionList(values, fallbacks, defaultLabels = {}) {
  const sourceValues = Array.isArray(values) && values.length ? values : fallbacks;
  const mapped = sourceValues
    .map((value) => {
      const id = normalizeOption(value);
      return {
        id,
        label: asString(value?.label) || defaultLabels[id] || id
      };
    })
    .filter((value) => value.id);
  const seen = new Set();
  return mapped.filter((value) => {
    if (seen.has(value.id)) return false;
    seen.add(value.id);
    return true;
  });
}

export function normalizeMediaAssetForSession(asset) {
  return {
    id: asString(asset?.id),
    title: asString(asset?.title),
    file: asString(asset?.file),
    type: asString(asset?.type),
    alt: asString(asset?.alt),
    caption: asString(asset?.caption),
    width: normalizeNumber(asset?.width),
    height: normalizeNumber(asset?.height),
    fileSize: asString(asset?.fileSize),
    usageType: asString(asset?.usageType),
    rightsStatus: asString(asset?.rightsStatus),
    status: asString(asset?.status),
    sortOrder: Number.isInteger(Number(asset?.sortOrder)) ? Number(asset.sortOrder) : 0
  };
}

export function normalizeMediaFileForSession(mediaData) {
  const items = sortMediaAssets(Array.isArray(mediaData?.items) ? mediaData.items : []).map(normalizeMediaAssetForSession);

  return {
    schemaVersion: asString(mediaData?.schemaVersion) || "0.1.0",
    prototype: true,
    storage: {
      mode: "static-session",
      writeEnabled: false,
      message: MEDIA_STORAGE_NOTICE
    },
    statuses: Array.isArray(mediaData?.statuses) && mediaData.statuses.length ? mediaData.statuses : CONTENT_STATUSES,
    types: normalizeOptionList(mediaData?.types, MEDIA_TYPES),
    usageTypes: normalizeOptionList(mediaData?.usageTypes, MEDIA_USAGE_TYPES),
    rightsStatuses: normalizeOptionList(mediaData?.rightsStatuses, MEDIA_RIGHTS_STATUSES),
    items
  };
}

export function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}
