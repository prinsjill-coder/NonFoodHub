import { getArticles, sortArticles } from "./article-model.js";

export const PUBLIC_ARTICLE_KEYS = ["id", "slug", "title", "summary", "body", "category", "heroImage", "updatedAt"];

function firstCategory(article) {
  return Array.isArray(article?.categories) && article.categories.length ? article.categories[0] : "Inspiratie";
}

function publicArticle(article) {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    summary: article.summary,
    body: article.body,
    category: firstCategory(article),
    heroImage: article.heroImage,
    updatedAt: article.updatedAt
  };
}

export function projectPublicArticles(articleData = {}) {
  const items = sortArticles(getArticles(articleData).filter((article) => article.status === "published")).map(publicArticle);

  return { items };
}
