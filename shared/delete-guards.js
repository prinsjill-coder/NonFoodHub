import { getArticles } from "./article-model.js";
import { getBrochures } from "./brochure-model.js";
import { findMediaUsage, findSupplierArticles, findSupplierBrochures } from "./content-relations.js";
import { normalizeContentStatus } from "./content-status.js";
import { getSuppliers } from "./supplier-model.js";

export function canDeleteContentStatus(status) {
  const normalizedStatus = normalizeContentStatus(status);
  return normalizedStatus === "concept" || normalizedStatus === "archived";
}

export function getStatusDeleteBlocker(status) {
  return canDeleteContentStatus(status)
    ? ""
    : "Definitief verwijderen kan alleen bij Concept of Gearchiveerd.";
}

export function getSupplierDeleteBlocker({ supplier, brochureData = {}, articleData = {} }) {
  const statusBlocker = getStatusDeleteBlocker(supplier?.status);
  if (statusBlocker) return statusBlocker;

  if (findSupplierBrochures(supplier, brochureData).length) {
    return "Verwijder of verplaats eerst gekoppelde brochures.";
  }

  if (findSupplierArticles(supplier, articleData).length) {
    return "Verwijder of verplaats eerst gekoppelde kennisbankartikelen.";
  }

  return "";
}

export function getBrochureDeleteBlocker({ brochure, articleData = {} }) {
  const statusBlocker = getStatusDeleteBlocker(brochure?.status);
  if (statusBlocker) return statusBlocker;

  const relatedArticles = getArticles(articleData).filter((article) =>
    Array.isArray(article.brochureIds) && article.brochureIds.includes(brochure.id)
  );
  if (relatedArticles.length) {
    return "Verwijder of verplaats eerst gekoppelde kennisbankartikelen.";
  }

  return "";
}

export function getArticleDeleteBlocker({ article, supplierData = {} }) {
  const statusBlocker = getStatusDeleteBlocker(article?.status);
  if (statusBlocker) return statusBlocker;

  const incomingSupplierLinks = getSuppliers(supplierData).filter((supplier) =>
    Array.isArray(supplier.relatedArticleIds) && supplier.relatedArticleIds.includes(article.id)
  );
  if (incomingSupplierLinks.length) {
    return "Verwijder eerst de handmatige koppeling bij gekoppelde leveranciers.";
  }

  return "";
}

export function getMediaDeleteBlocker({ asset, supplierData = {}, brochureData = {}, articleData = {} }) {
  const statusBlocker = getStatusDeleteBlocker(asset?.status);
  if (statusBlocker) return statusBlocker;

  const usage = findMediaUsage(asset, supplierData, brochureData, articleData);
  const usageCount = usage.suppliers.length + usage.brochures.length + usage.articles.length;
  if (usageCount) {
    return "Verwijder eerst de koppelingen bij leveranciers, brochures of kennisbankartikelen.";
  }

  return "";
}

export function getLibraryDeleteBlocker({ item }) {
  return getStatusDeleteBlocker(item?.status);
}
