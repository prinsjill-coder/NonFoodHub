import { getArticles, sortArticles } from "./article-model.js";
import {
  createPublicDataset,
  isPublicContentItem,
  pickPublicFields,
  PUBLIC_DATASET_CONFIG
} from "./public-content.js";

export const PUBLIC_ARTICLE_DATASET = PUBLIC_DATASET_CONFIG.articles;
export const PUBLIC_ARTICLE_KEYS = PUBLIC_ARTICLE_DATASET.itemKeys;

function firstCategory(article) {
  return Array.isArray(article?.categories) && article.categories.length ? article.categories[0] : "Inspiratie";
}

function publicArticle(article) {
  return pickPublicFields({ ...article, category: firstCategory(article) }, PUBLIC_ARTICLE_KEYS);
}

export function projectPublicArticles(articleData = {}) {
  const items = sortArticles(getArticles(articleData).filter(isPublicContentItem)).map(publicArticle);

  return createPublicDataset(items);
}
