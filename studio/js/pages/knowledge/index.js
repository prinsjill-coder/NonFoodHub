import { renderNotFoundState } from "../../shared/not-found.js";
import { renderArticleDetail } from "./detail.js";
import { renderArticleForm, setupArticleForm } from "./form.js";
import { renderArticlesList, setupArticleList } from "./list.js";

export function renderKnowledgeRoute(route, articleSession, supplierSession, brochureSession, mediaSession) {
  const articleData = articleSession.getWorkingData();
  const supplierData = supplierSession.getWorkingData();
  const brochureData = brochureSession.getWorkingData();
  const mediaData = mediaSession.getWorkingData();

  if (route.id === "knowledge") {
    return renderArticlesList({
      articleData,
      supplierData,
      brochureData,
      mediaData,
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
        "Dit artikel staat niet in de bewerkversie. Mogelijk is de URL-naam gewijzigd of staat het artikel niet in het laatst geladen bestand.",
      label: "Niet gevonden",
      backHref: "#/kennisbank",
      backLabel: "Terug naar kennisbank"
    });
  }

  if (route.id === "articleEdit") {
    return renderArticleForm({ articleData, supplierData, brochureData, article, mode: "edit" });
  }

  return renderArticleDetail({ article, articleData, supplierData, brochureData, mediaData });
}

export function setupKnowledgeRoute(route, articleSession, supplierSession, brochureSession, mediaSession, options = {}) {
  if (route.id === "knowledge") {
    setupArticleList({
      articleSession,
      supplierSession,
      brochureSession,
      mediaSession,
      rerender: options.rerender
    });
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
