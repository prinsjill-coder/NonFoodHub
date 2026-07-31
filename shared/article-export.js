import { validateArticleFile } from "./article-file-validation.js";
import { getArticles } from "./article-model.js";
import {
  ARTICLES_EXPORT_FILENAME,
  normalizeArticleFileForExport,
  stringifyArticleExport
} from "./article-normalizer.js";

export function createArticleExport(articleData, supplierData = {}, brochureData = {}, mediaData = {}) {
  const report = {
    ...validateArticleFile(articleData, supplierData, brochureData, mediaData),
    action: "export",
    sourceFileName: ARTICLES_EXPORT_FILENAME,
    itemCount: getArticles(articleData).length
  };

  if (!report.valid) {
    return {
      ok: false,
      report,
      fileName: ARTICLES_EXPORT_FILENAME,
      data: null,
      json: ""
    };
  }

  return {
    ok: true,
    report,
    fileName: ARTICLES_EXPORT_FILENAME,
    data: normalizeArticleFileForExport(articleData),
    json: stringifyArticleExport(articleData)
  };
}
