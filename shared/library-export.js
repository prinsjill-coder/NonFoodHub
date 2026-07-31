import { validateLibraryFile } from "./library-file-validation.js";
import { getLibraryItems } from "./library-model.js";
import {
  LIBRARY_EXPORT_FILENAME,
  normalizeLibraryFileForExport,
  stringifyLibraryExport
} from "./library-normalizer.js";

export function createLibraryExport(
  libraryData,
  supplierData = {},
  brochureData = {},
  articleData = {},
  mediaData = {}
) {
  const report = {
    ...validateLibraryFile(libraryData, supplierData, brochureData, articleData, mediaData),
    action: "export",
    sourceFileName: LIBRARY_EXPORT_FILENAME,
    itemCount: getLibraryItems(libraryData).length
  };

  if (!report.valid) {
    return {
      ok: false,
      report,
      fileName: LIBRARY_EXPORT_FILENAME,
      data: null,
      json: ""
    };
  }

  return {
    ok: true,
    report,
    fileName: LIBRARY_EXPORT_FILENAME,
    data: normalizeLibraryFileForExport(libraryData),
    json: stringifyLibraryExport(libraryData)
  };
}
