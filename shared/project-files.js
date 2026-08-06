import { normalizeMediaId } from "./media-model.js";

export function fileExtension(name, fallback = "") {
  const match = String(name || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? `.${match[1]}` : fallback;
}

export function formatFileSize(size) {
  if (!Number.isFinite(size) || size <= 0) return "Onbekend";
  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function projectFileNameFromChoice(file, fallbackExtension = "", fallbackBase = "bestand") {
  const originalName = String(file?.name || "");
  const extension = fileExtension(originalName, fallbackExtension).toLowerCase();
  const baseName = originalName.replace(/\.[^.]+$/, "");
  const safeName = normalizeMediaId(baseName) || fallbackBase;
  return `${safeName}${extension}`;
}

