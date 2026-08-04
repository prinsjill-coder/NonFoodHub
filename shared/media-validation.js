import { isContentStatus } from "./content-status.js";
import {
  MEDIA_RIGHTS_STATUSES,
  MEDIA_TYPES,
  MEDIA_USAGE_TYPES,
  isImageLikeMedia,
  normalizeMediaId
} from "./media-model.js";

function hasValue(value) {
  return String(value ?? "").trim().length > 0;
}

function isRelativeProjectPath(value) {
  if (!value) return true;
  return (
    !value.startsWith("/") &&
    !value.startsWith("\\") &&
    !value.startsWith("~") &&
    !value.toLowerCase().startsWith("file:") &&
    !/^[a-zA-Z]:[\\/]/.test(value)
  );
}

function toOptionalNumber(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed ? Number(trimmed) : "";
}

function fileExtension(value) {
  return String(value || "").toLowerCase().split(".").pop() || "";
}

function validateExtension(asset, errors) {
  if (!asset.file) return;

  const extension = fileExtension(asset.file);
  const imageExtensions = ["jpg", "jpeg", "png", "webp", "svg"];

  if (asset.type === "pdf" && extension !== "pdf") {
    errors.file = "PDF-assets moeten eindigen op .pdf.";
  }

  if (["image", "logo", "thumbnail"].includes(asset.type) && !imageExtensions.includes(extension)) {
    errors.file = "Afbeeldingsassets moeten eindigen op .jpg, .jpeg, .png, .webp of .svg.";
  }
}

export function mediaAssetFromForm(form) {
  const formData = new FormData(form);
  const id = normalizeMediaId(formData.get("id"));

  return {
    id: id || `media-${normalizeMediaId(formData.get("title"))}`,
    title: String(formData.get("title") || "").trim(),
    file: String(formData.get("file") || "").trim(),
    type: String(formData.get("type") || "").trim(),
    alt: String(formData.get("alt") || "").trim(),
    caption: String(formData.get("caption") || "").trim(),
    width: toOptionalNumber(formData.get("width")),
    height: toOptionalNumber(formData.get("height")),
    fileSize: String(formData.get("fileSize") || "").trim(),
    usageType: String(formData.get("usageType") || "").trim(),
    rightsStatus: String(formData.get("rightsStatus") || "").trim(),
    status: String(formData.get("status") || "").trim(),
    sortOrder: Number(formData.get("sortOrder") || 0)
  };
}

export function validateMediaAsset(asset, existingAssets, options = {}) {
  const errors = {};
  const originalId = options.originalId || "";

  if (!hasValue(asset.id)) {
    errors.id = "Vul een id in.";
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(asset.id)) {
    errors.id = "Gebruik alleen kleine letters, cijfers en koppeltekens.";
  } else {
    const duplicateId = existingAssets.some((item) => item.id === asset.id && item.id !== originalId);
    if (duplicateId) {
      errors.id = "Deze id is al in gebruik.";
    }
  }

  if (!hasValue(asset.title)) {
    errors.title = "Vul een titel in.";
  }

  if (!hasValue(asset.file)) {
    errors.file = "Vul een bestand in, bijvoorbeeld assets/images/brochures.png.";
  } else if (!isRelativeProjectPath(asset.file)) {
    errors.file = "Gebruik een bestand binnen het project, bijvoorbeeld assets/images/brochures.png. Gebruik geen lokaal computerpad.";
  }

  if (!MEDIA_TYPES.includes(asset.type)) {
    errors.type = "Kies een geldig mediatype.";
  }

  if (!MEDIA_USAGE_TYPES.includes(asset.usageType)) {
    errors.usageType = "Kies een geldig gebruikstype.";
  }

  if (!MEDIA_RIGHTS_STATUSES.includes(asset.rightsStatus)) {
    errors.rightsStatus = "Kies een geldige rechtenstatus.";
  }

  if (!isContentStatus(asset.status)) {
    errors.status = "Kies een geldige status.";
  }

  if (!Number.isInteger(asset.sortOrder) || asset.sortOrder < 0) {
    errors.sortOrder = "Gebruik een positief geheel getal of 0.";
  }

  if (asset.width !== "" && (!Number.isInteger(asset.width) || asset.width < 0)) {
    errors.width = "Gebruik een positief geheel getal, 0 of laat het veld leeg.";
  }

  if (asset.height !== "" && (!Number.isInteger(asset.height) || asset.height < 0)) {
    errors.height = "Gebruik een positief geheel getal, 0 of laat het veld leeg.";
  }

  validateExtension(asset, errors);

  if ((asset.status === "review" || asset.status === "published") && isImageLikeMedia(asset) && !hasValue(asset.alt)) {
    errors.alt = "Afbeeldingsassets met status review of published hebben alt-tekst nodig.";
  }

  if (asset.status === "published" && asset.rightsStatus === "unknown") {
    errors.rightsStatus = "Gepubliceerde media-assets hebben een bekende rechtenstatus nodig.";
  }

  return errors;
}

export function hasValidationErrors(errors) {
  return Object.keys(errors).length > 0;
}
