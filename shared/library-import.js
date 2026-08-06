import { getLibraryItems } from "./library-model.js";
import { validateLibraryFile } from "./library-file-validation.js";
import {
  normalizeLibraryFileForSession,
  normalizeLibraryItemForSession,
  stableStringify
} from "./library-normalizer.js";

function normalizedItemHash(item) {
  return stableStringify(normalizeLibraryItemForSession(item));
}

function compareLibraryItems(nextData, currentData) {
  const currentItemsById = new Map(getLibraryItems(currentData).map((item) => [item.id, normalizedItemHash(item)]));
  let newItems = 0;
  let changedItems = 0;
  let unchangedItems = 0;

  getLibraryItems(nextData).forEach((item) => {
    const currentHash = currentItemsById.get(item.id);
    if (!currentHash) {
      newItems += 1;
      return;
    }

    if (currentHash !== normalizedItemHash(item)) {
      changedItems += 1;
      return;
    }

    unchangedItems += 1;
  });

  return {
    newItems,
    changedItems,
    unchangedItems
  };
}

export function validateLibraryImportData(
  libraryData,
  supplierData = {},
  brochureData = {},
  articleData = {},
  mediaData = {},
  sourceFileName = "onbekend bestand",
  currentData = {}
) {
  const normalizedData = normalizeLibraryFileForSession(libraryData);
  const report = validateLibraryFile(normalizedData, supplierData, brochureData, articleData, mediaData);
  const comparison = compareLibraryItems(normalizedData, currentData);

  return {
    ...report,
    ...comparison,
    action: "import",
    sourceFileName,
    itemCount: getLibraryItems(normalizedData).length
  };
}
