import {
  contentStatusListIssues,
  isContentStatus,
  isReadyForPublicationStatus
} from "./content-status.js";
import { getMediaAssets, isImageLikeMedia } from "./media-model.js";
import { MEDIA_ASSET_KEYS, MEDIA_FILE_KEYS } from "./media-normalizer.js";

function createIssue(path, message) {
  return { path, message };
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

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

function validateArray(value, path, errors) {
  if (!Array.isArray(value)) {
    errors.push(createIssue(path, "Moet een array zijn."));
    return false;
  }
  return true;
}

function reportUnknownKeys(value, allowedKeys, path, warnings) {
  Object.keys(value).forEach((key) => {
    if (!allowedKeys.includes(key)) {
      warnings.push(createIssue(`${path}.${key}`, "Onbekend veld. Dit blokkeert laden niet, maar hoort niet in het genormaliseerde mediamodel."));
    }
  });
}

function idsFromList(values) {
  if (!Array.isArray(values)) return [];
  return values.map((value) => String(value?.id ?? "").trim()).filter(Boolean);
}

function validateOptionList(values, path, errors) {
  if (!validateArray(values, path, errors)) return;

  values.forEach((value, index) => {
    if (!isPlainObject(value)) {
      errors.push(createIssue(`${path}[${index}]`, "Optie moet een object zijn."));
      return;
    }

    if (!hasValue(value.id)) {
      errors.push(createIssue(`${path}[${index}].id`, "id is verplicht."));
    }

    if (!hasValue(value.label)) {
      errors.push(createIssue(`${path}[${index}].label`, "label is verplicht."));
    }
  });
}

function validIntegerOrEmpty(value) {
  if (value === "" || value === null || typeof value === "undefined") return true;
  return Number.isInteger(value) && value >= 0;
}

function fileExtension(value) {
  return String(value || "").toLowerCase().split(".").pop() || "";
}

function validateExtension(asset, path, errors) {
  if (!asset.file) return;

  const extension = fileExtension(asset.file);
  const imageExtensions = ["jpg", "jpeg", "png", "webp", "svg"];

  if (asset.type === "pdf" && extension !== "pdf") {
    errors.push(createIssue(`${path}.file`, "PDF-assets moeten eindigen op .pdf."));
  }

  if (["image", "logo", "thumbnail"].includes(asset.type) && !imageExtensions.includes(extension)) {
    errors.push(createIssue(`${path}.file`, "Afbeeldingsassets moeten eindigen op .jpg, .jpeg, .png, .webp of .svg."));
  }
}

function validateMediaAsset(asset, index, mediaData, errors, warnings) {
  const path = `items[${index}]`;
  if (!isPlainObject(asset)) {
    errors.push(createIssue(path, "Media-asset moet een object zijn."));
    return;
  }

  reportUnknownKeys(asset, MEDIA_ASSET_KEYS, path, warnings);

  if (!hasValue(asset.id)) {
    errors.push(createIssue(`${path}.id`, "id is verplicht."));
  }

  if (!hasValue(asset.title)) {
    errors.push(createIssue(`${path}.title`, "title is verplicht."));
  }

  if (!hasValue(asset.file)) {
    errors.push(createIssue(`${path}.file`, "file is verplicht."));
  } else if (!isRelativeProjectPath(String(asset.file))) {
    errors.push(createIssue(`${path}.file`, "Gebruik een bestand binnen het project, geen lokaal computerpad."));
  }

  const typeIds = idsFromList(mediaData.types);
  if (!hasValue(asset.type)) {
    errors.push(createIssue(`${path}.type`, "type is verplicht."));
  } else if (typeIds.length && !typeIds.includes(asset.type)) {
    errors.push(createIssue(`${path}.type`, "type staat niet in de top-level types-lijst."));
  }

  const usageTypeIds = idsFromList(mediaData.usageTypes);
  if (!hasValue(asset.usageType)) {
    errors.push(createIssue(`${path}.usageType`, "usageType is verplicht."));
  } else if (usageTypeIds.length && !usageTypeIds.includes(asset.usageType)) {
    errors.push(createIssue(`${path}.usageType`, "usageType staat niet in de top-level usageTypes-lijst."));
  }

  const rightsStatusIds = idsFromList(mediaData.rightsStatuses);
  if (!hasValue(asset.rightsStatus)) {
    errors.push(createIssue(`${path}.rightsStatus`, "rightsStatus is verplicht."));
  } else if (rightsStatusIds.length && !rightsStatusIds.includes(asset.rightsStatus)) {
    errors.push(createIssue(`${path}.rightsStatus`, "rightsStatus staat niet in de top-level rightsStatuses-lijst."));
  }

  const status = String(asset.status || "").trim();

  if (!isContentStatus(status)) {
    errors.push(createIssue(`${path}.status`, "status is ongeldig."));
  }

  if (!Number.isInteger(asset.sortOrder) || asset.sortOrder < 0) {
    errors.push(createIssue(`${path}.sortOrder`, "sortOrder moet een positief geheel getal of 0 zijn."));
  }

  if (!validIntegerOrEmpty(asset.width)) {
    errors.push(createIssue(`${path}.width`, "width moet een positief geheel getal, 0 of leeg zijn."));
  }

  if (!validIntegerOrEmpty(asset.height)) {
    errors.push(createIssue(`${path}.height`, "height moet een positief geheel getal, 0 of leeg zijn."));
  }

  validateExtension(asset, path, errors);

  if (isReadyForPublicationStatus(status) && isImageLikeMedia(asset) && !hasValue(asset.alt)) {
    errors.push(createIssue(`${path}.alt`, "Afbeeldingsassets die gereed zijn voor publicatie hebben alt-tekst nodig."));
  }

  if (isReadyForPublicationStatus(status) && asset.rightsStatus !== "approved") {
    errors.push(createIssue(`${path}.rightsStatus`, "Controleer de beeldrechten voordat dit media-item gereed is voor publicatie."));
  }
}

export function validateMediaFile(mediaData) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(mediaData)) {
    return {
      valid: false,
      errors: [createIssue("root", "media.json moet een JSON-object als root hebben.")],
      warnings
    };
  }

  reportUnknownKeys(mediaData, MEDIA_FILE_KEYS, "root", warnings);

  if (!hasValue(mediaData.schemaVersion)) {
    errors.push(createIssue("schemaVersion", "schemaVersion is verplicht."));
  }

  if (validateArray(mediaData.statuses, "statuses", errors)) {
    contentStatusListIssues(mediaData.statuses).forEach((message) => {
      errors.push(createIssue("statuses", message));
    });
  }

  validateOptionList(mediaData.types, "types", errors);
  validateOptionList(mediaData.usageTypes, "usageTypes", errors);
  validateOptionList(mediaData.rightsStatuses, "rightsStatuses", errors);

  if (!validateArray(mediaData.items, "items", errors)) {
    return { valid: false, errors, warnings };
  }

  const ids = new Map();
  getMediaAssets(mediaData).forEach((asset, index) => {
    validateMediaAsset(asset, index, mediaData, errors, warnings);

    const id = String(asset?.id ?? "").trim();
    if (id) {
      if (ids.has(id)) {
        errors.push(createIssue(`items[${index}].id`, `Dubbele id: ${id}.`));
      }
      ids.set(id, index);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
