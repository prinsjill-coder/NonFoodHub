import { CONTENT_STATUSES, CONTENT_STATUS_LABELS, getContentStatusLabel } from "./content-status.js";

export const MEDIA_STATUSES = [...CONTENT_STATUSES];

export const MEDIA_STATUS_LABELS = CONTENT_STATUS_LABELS;

export const MEDIA_TYPES = ["image", "logo", "thumbnail", "pdf"];

export const MEDIA_TYPE_LABELS = {
  image: "Afbeelding",
  logo: "Logo",
  thumbnail: "Thumbnail",
  pdf: "PDF"
};

export const MEDIA_USAGE_TYPES = [
  "hero",
  "supplier-logo",
  "supplier-image",
  "brochure-thumbnail",
  "brochure-pdf",
  "page-image"
];

export const MEDIA_USAGE_TYPE_LABELS = {
  hero: "Hero",
  "supplier-logo": "Leverancierslogo",
  "supplier-image": "Leveranciersbeeld",
  "brochure-thumbnail": "Brochurethumbnail",
  "brochure-pdf": "Brochure PDF",
  "page-image": "Paginabeeld"
};

export const MEDIA_RIGHTS_STATUSES = ["approved", "needs-review", "restricted", "unknown"];

export const MEDIA_RIGHTS_STATUS_LABELS = {
  approved: "Goedgekeurd",
  "needs-review": "Te controleren",
  restricted: "Beperkt gebruik",
  unknown: "Onbekend"
};

export function normalizeMediaId(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function createEmptyMediaAsset() {
  return {
    id: "",
    title: "",
    file: "",
    type: "image",
    alt: "",
    caption: "",
    width: "",
    height: "",
    fileSize: "",
    usageType: "page-image",
    rightsStatus: "needs-review",
    status: "concept",
    sortOrder: 0
  };
}

export function getMediaAssets(mediaData) {
  return Array.isArray(mediaData?.items) ? mediaData.items : [];
}

export function findMediaAssetById(mediaData, id) {
  return getMediaAssets(mediaData).find((asset) => asset.id === id);
}

export function sortMediaAssets(assets) {
  return [...assets].sort((first, second) => {
    const order = Number(first.sortOrder ?? 0) - Number(second.sortOrder ?? 0);
    if (order !== 0) return order;
    return String(first.title).localeCompare(String(second.title), "nl");
  });
}

export function getMediaTypeLabel(type, mediaData = {}) {
  const typeFromData = Array.isArray(mediaData.types)
    ? mediaData.types.find((item) => item.id === type)
    : null;
  return typeFromData?.label || MEDIA_TYPE_LABELS[type] || type;
}

export function getMediaUsageTypeLabel(usageType, mediaData = {}) {
  const usageFromData = Array.isArray(mediaData.usageTypes)
    ? mediaData.usageTypes.find((item) => item.id === usageType)
    : null;
  return usageFromData?.label || MEDIA_USAGE_TYPE_LABELS[usageType] || usageType;
}

export function getMediaRightsStatusLabel(rightsStatus, mediaData = {}) {
  const rightsFromData = Array.isArray(mediaData.rightsStatuses)
    ? mediaData.rightsStatuses.find((item) => item.id === rightsStatus)
    : null;
  return rightsFromData?.label || MEDIA_RIGHTS_STATUS_LABELS[rightsStatus] || rightsStatus;
}

export function getMediaStatusLabel(status) {
  return getContentStatusLabel(status);
}

export function isImageLikeMedia(asset) {
  return ["image", "logo", "thumbnail"].includes(asset?.type);
}

export function getMediaCounts(mediaData) {
  const assets = getMediaAssets(mediaData);
  return assets.reduce(
    (counts, asset) => {
      counts.total += 1;
      counts.statuses[asset.status] = (counts.statuses[asset.status] || 0) + 1;
      counts.types[asset.type] = (counts.types[asset.type] || 0) + 1;
      if (!asset.file) counts.missingFilePath += 1;
      if (isImageLikeMedia(asset) && !asset.alt) counts.missingAlt += 1;
      if (asset.rightsStatus === "unknown" || asset.rightsStatus === "needs-review") counts.needsRightsReview += 1;
      return counts;
    },
    { total: 0, missingFilePath: 0, missingAlt: 0, needsRightsReview: 0, statuses: {}, types: {} }
  );
}
