import { renderNotFoundState } from "../../shared/not-found.js";
import { getArticles } from "../../../../shared/article-model.js";
import { getMediaAssets } from "../../../../shared/media-model.js";
import { renderArticleDetail, setupArticleWorkflowActions } from "./detail.js";
import { renderArticleForm, setupArticleForm } from "./form.js";
import { renderArticlesList, setupArticleList } from "./list.js";

function isImageProjectPath(path) {
  return /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(String(path || ""));
}

function knownPreviewPaths(articleSession, mediaSession) {
  const articlePaths = getArticles(articleSession.getSourceData())
    .map((article) => article.heroImage)
    .filter(Boolean);
  const mediaPaths = getMediaAssets(mediaSession.getSourceData())
    .filter((asset) => ["image", "logo", "thumbnail"].includes(asset.type))
    .map((asset) => asset.file)
    .filter(Boolean);

  return new Set([...articlePaths, ...mediaPaths].filter(isImageProjectPath));
}

function heroImagePreviewForArticle(article, articleSession, mediaSession) {
  const path = article.heroImage || "";
  const localFile = mediaSession.findLocalProjectFile?.(path);

  if (localFile?.url) {
    return { canPreview: true, url: localFile.url, alt: `${article.title} headerafbeelding` };
  }

  return {
    canPreview: knownPreviewPaths(articleSession, mediaSession).has(path),
    url: path ? `../${path}` : "",
    alt: `${article.title} headerafbeelding`
  };
}

export function renderKnowledgeRoute(route, articleSession, supplierSession, brochureSession, mediaSession, publicData = {}) {
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
      publicData,
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

  return renderArticleDetail({
    article,
    articleData,
    supplierData,
    brochureData,
    mediaData,
    heroImagePreview: heroImagePreviewForArticle(article, articleSession, mediaSession),
    publicData
  });
}

export function setupKnowledgeRoute(route, articleSession, supplierSession, brochureSession, mediaSession, options = {}) {
  if (route.id === "articleNew") {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  if (route.id === "knowledge") {
    setupArticleList({
      articleSession,
      supplierSession,
      brochureSession,
      mediaSession,
      rerender: options.rerender,
      restoreDraft: options.restoreDraft
    });
  }

  if (route.id === "articleNew" || route.id === "articleEdit") {
    setupArticleForm({
      route,
      articleSession,
      supplierSession,
      brochureSession,
      mediaSession,
      formDirtyGuard: options.formDirtyGuard,
      rerender: options.rerender
    });
  }

  if (route.id === "articleDetail") {
    const article = articleSession.findBySlug(route.params?.slug);
    if (article) {
      setupArticleWorkflowActions({
        articleSession,
        supplierSession,
        brochureSession,
        mediaSession,
        article,
        rerender: options.rerender
      });
    }
  }
}
