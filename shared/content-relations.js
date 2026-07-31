import { getArticles } from "./article-model.js";
import { getBrochures } from "./brochure-model.js";
import { getLibraryItems } from "./library-model.js";
import { getMediaAssets } from "./media-model.js";
import { getSuppliers } from "./supplier-model.js";

function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function hasId(ids, id) {
  return Array.isArray(ids) && ids.includes(id);
}

export function findSupplierBrochures(supplier, brochureData) {
  const brochures = getBrochures(brochureData);
  return uniqueById([
    ...brochures.filter((brochure) => brochure.supplierId === supplier.id),
    ...brochures.filter((brochure) => hasId(supplier.brochureIds, brochure.id))
  ]);
}

export function findSupplierArticles(supplier, articleData) {
  const articles = getArticles(articleData);
  return uniqueById([
    ...articles.filter((article) => hasId(article.supplierIds, supplier.id)),
    ...articles.filter((article) => hasId(supplier.relatedArticleIds, article.id))
  ]);
}

export function findArticleSuppliers(article, supplierData) {
  return getSuppliers(supplierData).filter((supplier) => hasId(article.supplierIds, supplier.id));
}

export function findArticleBrochures(article, brochureData) {
  return getBrochures(brochureData).filter((brochure) => hasId(article.brochureIds, brochure.id));
}

export function findBrochureArticles(brochure, articleData) {
  return getArticles(articleData).filter((article) => hasId(article.brochureIds, brochure.id));
}

export function findLibrarySuppliers(libraryItem, supplierData) {
  return getSuppliers(supplierData).filter((supplier) => hasId(libraryItem.supplierIds, supplier.id));
}

export function findLibraryBrochures(libraryItem, brochureData) {
  return getBrochures(brochureData).filter((brochure) => hasId(libraryItem.brochureIds, brochure.id));
}

export function findLibraryArticles(libraryItem, articleData) {
  return getArticles(articleData).filter((article) => hasId(libraryItem.articleIds, article.id));
}

export function findArticleLibraryItems(article, libraryData) {
  return getLibraryItems(libraryData).filter((item) => hasId(item.articleIds, article.id));
}

export function findMediaAssetByPath(mediaData, path) {
  if (!path) return null;
  return getMediaAssets(mediaData).find((asset) => asset.file === path) || null;
}

export function findMediaUsage(asset, supplierData, brochureData, articleData) {
  const path = asset?.file;
  if (!path) {
    return {
      suppliers: [],
      brochures: [],
      articles: []
    };
  }

  return {
    suppliers: getSuppliers(supplierData).filter((supplier) => supplier.logo === path || supplier.image === path),
    brochures: getBrochures(brochureData).filter((brochure) => brochure.pdfFile === path || brochure.thumbnail === path),
    articles: getArticles(articleData).filter((article) => article.heroImage === path)
  };
}

export function getContentRelationStats(supplierData, brochureData, mediaData, articleData) {
  const articles = getArticles(articleData);
  const suppliers = getSuppliers(supplierData);
  const media = getMediaAssets(mediaData);

  return {
    articlesWithoutSupplier: articles.filter((article) => !Array.isArray(article.supplierIds) || article.supplierIds.length === 0).length,
    suppliersWithoutBrochures: suppliers.filter((supplier) => findSupplierBrochures(supplier, brochureData).length === 0).length,
    mediaWithoutUsage: media.filter((asset) => {
      const usage = findMediaUsage(asset, supplierData, brochureData, articleData);
      return usage.suppliers.length + usage.brochures.length + usage.articles.length === 0;
    }).length
  };
}
