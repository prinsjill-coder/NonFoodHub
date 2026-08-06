import { validateArticleFile } from "./article-file-validation.js";
import { getArticles } from "./article-model.js";
import { normalizeArticleFileForSession } from "./article-normalizer.js";

export function validateArticleImportData(
  articleData,
  supplierData = {},
  brochureData = {},
  mediaData = {},
  sourceFileName = "onbekend bestand"
) {
  const normalizedData = normalizeArticleFileForSession(articleData);
  const report = validateArticleFile(normalizedData, supplierData, brochureData, mediaData);

  return {
    ...report,
    action: "import",
    sourceFileName,
    itemCount: getArticles(normalizedData).length
  };
}
