export const PUBLIC_CONTENT_STATUS = "published";

export const PUBLIC_DATASET_ROOT_KEYS = ["items"];

export const PUBLIC_DATASET_CONFIG = {
  articles: {
    label: "Kennisbankartikelen",
    sourcePath: "data/articles.json",
    publicPath: "data/public/articles.json",
    itemKeys: ["id", "slug", "title", "summary", "body", "category", "heroImage", "updatedAt", "suppliers"]
  },
  suppliers: {
    label: "Leveranciers",
    sourcePath: "data/suppliers.json",
    publicPath: "data/public/suppliers.json",
    itemKeys: ["id", "slug", "name", "type", "summary", "description", "categories", "logo", "image", "relatedArticles"]
  }
};

export const PUBLIC_SUPPLIER_PROJECTION_PROPOSAL = {
  label: "Leveranciers",
  sourcePath: "data/suppliers.json",
  publicPath: "data/public/suppliers.json",
  publicFields: PUBLIC_DATASET_CONFIG.suppliers.itemKeys,
  internalFields: ["status", "brochureIds", "relatedArticleIds", "featured", "sortOrder", "governance", "readiness"],
  publicationCriteria: "Gebruik de bestaande contentstatus en neem alleen published leveranciers op."
};

export function isPublicContentItem(item) {
  return item?.status === PUBLIC_CONTENT_STATUS;
}

export function pickPublicFields(item, keys) {
  return keys.reduce((publicItem, key) => {
    publicItem[key] = item?.[key] ?? "";
    return publicItem;
  }, {});
}

export function createPublicDataset(items) {
  return { items: Array.isArray(items) ? items : [] };
}
