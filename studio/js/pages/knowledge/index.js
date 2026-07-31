import { renderNotFoundState } from "../../shared/not-found.js";
import { renderArticleDetail } from "./detail.js";
import { renderArticleForm, setupArticleForm } from "./form.js";
import { renderArticlesList, setupArticleList } from "./list.js";

export function renderKnowledgeRoute(route, articleSession, supplierSession, brochureSession) {
  const articleData = articleSession.getWorkingData();
  const supplierData = supplierSession.getWorkingData();
  const brochureData = brochureSession.getWorkingData();

  if (route.id === "knowledge") {
    return renderArticlesList({
      articleData,
      supplierData,
      sessionSnapshot: articleSession.snapshot()
    });
  }

  if (route.id === "articleNew") {
    return renderArticleForm({ articleData, supplierData, brochureData, mode: "create" });
  }

  const article = articleSession.findBySlug(route.params?.slug);

  if (!article) {
    return renderNotFoundState({
      title: "Kennisbankartikel niet gevonden",
      message:
        "Dit artikel staat niet in de actieve Studio-werksessie. Mogelijk is de slug gewijzigd of is het artikel niet aanwezig in de laatst geladen bron.",
      label: "Niet gevonden",
      backHref: "#/kennisbank",
      backLabel: "Terug naar kennisbank"
    });
  }

  if (route.id === "articleEdit") {
    return renderArticleForm({ articleData, supplierData, brochureData, article, mode: "edit" });
  }

  return renderArticleDetail({ article, supplierData, brochureData });
}

export function setupKnowledgeRoute(route, articleSession, supplierSession, brochureSession, mediaSession, options = {}) {
  if (route.id === "knowledge") {
    setupArticleList({ articleSession, rerender: options.rerender });
  }

  if (route.id === "articleNew" || route.id === "articleEdit") {
    setupArticleForm({
      route,
      articleSession,
      supplierSession,
      brochureSession,
      mediaSession,
      formDirtyGuard: options.formDirtyGuard
    });
  }
}
