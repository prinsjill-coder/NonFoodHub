import { getArticles, sortArticles } from "./article-model.js";
import { getSuppliers, sortSuppliers } from "./supplier-model.js";
import {
  createPublicDataset,
  isPublicContentItem,
  pickPublicFields,
  PUBLIC_DATASET_CONFIG
} from "./public-content.js";

export const PUBLIC_SUPPLIER_DATASET = PUBLIC_DATASET_CONFIG.suppliers;
export const PUBLIC_SUPPLIER_KEYS = PUBLIC_SUPPLIER_DATASET.itemKeys;

function firstCategory(article) {
  return Array.isArray(article?.categories) && article.categories.length ? article.categories[0] : "Inspiratie";
}

function publicRelatedArticle(article) {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    summary: article.summary,
    category: firstCategory(article),
    heroImage: article.heroImage,
    updatedAt: article.updatedAt
  };
}

function publicRelatedArticles(supplier, articleData = {}) {
  return sortArticles(
    getArticles(articleData).filter((article) => {
      const supplierIds = Array.isArray(article?.supplierIds) ? article.supplierIds : [];
      return isPublicContentItem(article) && supplierIds.includes(supplier.id);
    })
  ).map(publicRelatedArticle);
}

function publicSupplier(supplier, articleData = {}) {
  return pickPublicFields(
    {
      ...supplier,
      relatedArticles: publicRelatedArticles(supplier, articleData)
    },
    PUBLIC_SUPPLIER_KEYS
  );
}

export function projectPublicSuppliers(supplierData = {}, articleData = {}) {
  const items = sortSuppliers(getSuppliers(supplierData).filter(isPublicContentItem)).map((supplier) =>
    publicSupplier(supplier, articleData)
  );

  return createPublicDataset(items);
}
