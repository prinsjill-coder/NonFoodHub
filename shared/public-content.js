export const PUBLIC_CONTENT_STATUS = "published";

export const PUBLIC_DATASET_ROOT_KEYS = ["items"];

export const PUBLIC_DATASET_CONFIG = {
  articles: {
    label: "Kennisbankartikelen",
    sourcePath: "data/articles.json",
    publicPath: "data/public/articles.json",
    itemKeys: ["id", "slug", "title", "summary", "body", "category", "heroImage", "updatedAt"]
  }
};

export const PUBLIC_SUPPLIER_PROJECTION_PROPOSAL = {
  label: "Leveranciers",
  sourcePath: "data/suppliers.json",
  futurePublicPath: "data/public/suppliers.json",
  publicFields: ["id", "slug", "name", "type", "summary", "description", "categories", "logo", "image"],
  internalFields: ["status", "brochureIds", "relatedArticleIds", "featured", "sortOrder", "governance", "readiness"],
  publicationCriteria: "Gebruik de bestaande contentstatus en neem alleen published leveranciers op wanneer deze projectie wordt gebouwd."
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
