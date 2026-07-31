import { validateArticleFile } from "./article-file-validation.js";
import { getArticles } from "./article-model.js";

export function validateArticleImportData(
  articleData,
  supplierData = {},
  brochureData = {},
  mediaData = {},
  sourceFileName = "onbekend bestand"
) {
  const report = validateArticleFile(articleData, supplierData, brochureData, mediaData);

  return {
    ...report,
    action: "import",
    sourceFileName,
    itemCount: getArticles(articleData).length
  };
}
