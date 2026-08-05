import { getArticles, sortArticles } from "./article-model.js";
import { getBrochures, sortBrochures } from "./brochure-model.js";
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

function publicBrochureCategories(brochure) {
  return Array.isArray(brochure?.categories) ? brochure.categories.filter(Boolean) : [];
}

function publicRelatedBrochure(brochure, options = {}) {
  const publicItem = {
    id: brochure.id,
    slug: brochure.slug,
    title: brochure.title,
    summary: brochure.description,
    categories: publicBrochureCategories(brochure),
    thumbnail: brochure.thumbnail,
    updatedAt: brochure.updatedAt
  };

  if (options.isPublicDownload?.(brochure.pdfFile)) {
    publicItem.downloadUrl = brochure.pdfFile;
  }

  return publicItem;
}

function publicRelatedBrochures(supplier, brochureData = {}, options = {}) {
  return sortBrochures(
    getBrochures(brochureData).filter((brochure) => isPublicContentItem(brochure) && brochure.supplierId === supplier.id)
  ).map((brochure) => publicRelatedBrochure(brochure, options));
}

function publicSupplier(supplier, articleData = {}, brochureData = {}, options = {}) {
  return pickPublicFields(
    {
      ...supplier,
      relatedArticles: publicRelatedArticles(supplier, articleData),
      relatedBrochures: publicRelatedBrochures(supplier, brochureData, options)
    },
    PUBLIC_SUPPLIER_KEYS
  );
}

export function projectPublicSuppliers(supplierData = {}, articleData = {}, brochureData = {}, options = {}) {
  const items = sortSuppliers(getSuppliers(supplierData).filter(isPublicContentItem)).map((supplier) =>
    publicSupplier(supplier, articleData, brochureData, options)
  );

  return createPublicDataset(items);
}
