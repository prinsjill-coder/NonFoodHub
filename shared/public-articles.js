import { getArticles, sortArticles } from "./article-model.js";
import { getSuppliers, sortSuppliers } from "./supplier-model.js";
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

function publicSupplierRef(supplier) {
  return {
    id: supplier.id,
    slug: supplier.slug,
    name: supplier.name
  };
}

function publicSuppliersById(supplierData = {}) {
  return new Map(
    sortSuppliers(getSuppliers(supplierData).filter(isPublicContentItem)).map((supplier) => [supplier.id, publicSupplierRef(supplier)])
  );
}

function publicArticleSuppliers(article, supplierData = {}) {
  const suppliersById = publicSuppliersById(supplierData);
  const supplierIds = Array.isArray(article?.supplierIds) ? article.supplierIds : [];

  return supplierIds.map((supplierId) => suppliersById.get(supplierId)).filter(Boolean);
}

function publicArticle(article, supplierData = {}) {
  return pickPublicFields(
    {
      ...article,
      category: firstCategory(article),
      suppliers: publicArticleSuppliers(article, supplierData)
    },
    PUBLIC_ARTICLE_KEYS
  );
}

export function projectPublicArticles(articleData = {}, supplierData = {}) {
  const items = sortArticles(getArticles(articleData).filter(isPublicContentItem)).map((article) =>
    publicArticle(article, supplierData)
  );

  return createPublicDataset(items);
}
