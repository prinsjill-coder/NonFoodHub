export const SUPPLIER_STATUSES = ["concept", "review", "published", "hidden", "archived"];

export const SUPPLIER_STATUS_LABELS = {
  concept: "Concept",
  review: "Ter controle",
  published: "Gepubliceerd",
  hidden: "Verborgen",
  archived: "Gearchiveerd"
};

export const SUPPLIER_TYPES = ["leverancier", "partner", "servicepartner"];

export const SUPPLIER_TYPE_LABELS = {
  leverancier: "Leverancier",
  partner: "Partner",
  servicepartner: "Servicepartner"
};

export function normalizeSlug(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function createEmptySupplier() {
  return {
    id: "",
    name: "",
    slug: "",
    type: "leverancier",
    summary: "",
    description: "",
    categories: [],
    logo: "",
    image: "",
    brochureIds: [],
    relatedArticleIds: [],
    featured: false,
    sortOrder: 0,
    status: "concept"
  };
}

export function getSuppliers(supplierData) {
  return Array.isArray(supplierData?.items) ? supplierData.items : [];
}

export function findSupplierBySlug(supplierData, slug) {
  return getSuppliers(supplierData).find((supplier) => supplier.slug === slug);
}

export function sortSuppliers(suppliers) {
  return [...suppliers].sort((first, second) => {
    const order = Number(first.sortOrder ?? 0) - Number(second.sortOrder ?? 0);
    if (order !== 0) return order;
    return String(first.name).localeCompare(String(second.name), "nl");
  });
}

export function getSupplierStatusLabel(status) {
  return SUPPLIER_STATUS_LABELS[status] || status;
}

export function getSupplierTypeLabel(type) {
  return SUPPLIER_TYPE_LABELS[type] || type;
}

export function getSupplierCounts(supplierData) {
  const suppliers = getSuppliers(supplierData);
  return suppliers.reduce(
    (counts, supplier) => {
      counts.total += 1;
      counts.statuses[supplier.status] = (counts.statuses[supplier.status] || 0) + 1;
      return counts;
    },
    { total: 0, statuses: {} }
  );
}

