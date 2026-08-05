import { confirmStudioAction } from "../../../../components/confirm-dialog.js";
import { renderButton } from "../../../../components/button.js";
import { renderDetailList } from "../../../../components/detail-list.js";
import { renderNotice } from "../../../../components/notice.js";
import { renderPageHeader } from "../../../../components/page-header.js";
import { renderReadinessCard } from "../../../../components/readiness-card.js";
import { renderStatusBadge } from "../../../../components/status-badge.js";
import { renderWorkflowActionCard, renderWorkflowStatusAction } from "../../../../components/workflow-panel.js";
import { getArticles, getArticleStatusLabel } from "../../../../shared/article-model.js";
import { validateArticle } from "../../../../shared/article-validation.js";
import { getBrochureStatusLabel } from "../../../../shared/brochure-model.js";
import {
  findArticleBrochures,
  findArticleSuppliers,
  findMediaAssetByPath
} from "../../../../shared/content-relations.js";
import { findReadinessByRoute, getContentReadinessReport } from "../../../../shared/content-readiness.js";
import { getSupplierStatusLabel, getSuppliers } from "../../../../shared/supplier-model.js";
import { escapeHtml } from "../../../../shared/utils.js";

let articleActionFeedback = null;

function bodyHtml(body) {
  return escapeHtml(body)
    .split("\n")
    .filter((paragraph) => paragraph.trim())
    .map((paragraph) => `<p>${paragraph}</p>`)
    .join("");
}

function renderRelationList(items, { emptyText, hrefForItem, labelForItem, statusForItem, statusLabelForItem }) {
  if (!items.length) {
    return `<p class="studio-muted">${escapeHtml(emptyText)}</p>`;
  }

  return `
    <ul class="studio-relation-list">
      ${items
        .map((item) => `
          <li>
            <a href="${escapeHtml(hrefForItem(item))}">${escapeHtml(labelForItem(item))}</a>
            ${renderStatusBadge(statusForItem(item), statusLabelForItem(item))}
          </li>
        `)
        .join("")}
    </ul>
  `;
}

function mediaDetailHref(asset) {
  return `#/media/${escapeHtml(asset.id)}`;
}

function mediaPath(path) {
  return path ? `../${path}` : "";
}

function renderHeroImageValue(article, asset) {
  if (!asset) {
    return article.heroImage;
  }

  return `<a class="studio-inline-link" href="${mediaDetailHref(asset)}"><code>${escapeHtml(article.heroImage)}</code></a>`;
}

function renderHeroPath(article, asset) {
  const value = asset
    ? `<a class="studio-inline-link" href="${mediaDetailHref(asset)}"><code>${escapeHtml(article.heroImage)}</code></a>`
    : `<code>${escapeHtml(article.heroImage)}</code>`;

  return `<p class="studio-meta">${value}</p>`;
}

function renderHeroPreview(article, preview) {
  if (preview?.canPreview) {
    return `<img src="${escapeHtml(preview.url || mediaPath(article.heroImage))}" alt="${escapeHtml(preview.alt || `${article.title} headerafbeelding`)}" loading="lazy">`;
  }

  return `<p class="studio-muted">Afbeeldingsbestand nog niet beschikbaar in de projectmap.</p>`;
}

function renderHeroMedia(article, asset, preview = {}) {
  if (!article.heroImage) {
    return `
      <article class="studio-card">
        <h2>Headerafbeelding</h2>
        <p class="studio-muted">Nog geen headerafbeelding gekoppeld.</p>
        <p class="studio-meta">Voorbeeld: assets/images/blog-terrace.png</p>
      </article>
    `;
  }

  if (!asset) {
    return `
      <article class="studio-card studio-media-reference" data-article-hero-preview>
        <h2>Headerafbeelding</h2>
        ${renderHeroPreview(article, preview)}
        ${renderHeroPath(article, asset)}
        <p class="studio-meta">Dit bestand staat nog niet geregistreerd in Media.</p>
      </article>
    `;
  }

  return `
    <article class="studio-card studio-media-reference" data-article-hero-preview>
      <div class="studio-card-head">
        <h2>Headerafbeelding</h2>
        ${renderStatusBadge(asset.status)}
      </div>
      ${renderHeroPreview(article, { ...preview, alt: asset.alt || preview.alt })}
      ${renderHeroPath(article, asset)}
    </article>
  `;
}

function validationMessages(errors) {
  return Object.values(errors || {}).filter(Boolean);
}

function validationForStatus({ article, status, articleData, supplierData, brochureData, mediaData }) {
  return validateArticle(
    { ...article, status },
    getArticles(articleData),
    supplierData,
    brochureData,
    articleData,
    mediaData,
    {
      originalSlug: article.slug,
      originalId: article.id
    }
  ).errors;
}

function renderStatusAction({ label, targetStatus, disabled = false, reason = "", variant = "secondary" }) {
  return renderWorkflowStatusAction({
    label,
    targetStatus,
    disabled,
    reason,
    variant,
    actionAttribute: "data-article-status-action"
  });
}

function canDeleteStatus(status) {
  return status === "concept" || status === "archived";
}

function deleteBlocker({ article, supplierData }) {
  if (!canDeleteStatus(article.status)) return "";

  const incomingSupplierLinks = getSuppliers(supplierData).filter((supplier) =>
    Array.isArray(supplier.relatedArticleIds) && supplier.relatedArticleIds.includes(article.id)
  );
  if (incomingSupplierLinks.length) {
    return "Verwijder eerst de handmatige koppeling bij gekoppelde leveranciers.";
  }

  return "";
}

function renderDeleteAction(reason = "") {
  if (reason) {
    return `
      ${renderButton({
        label: "Definitief verwijderen",
        variant: "secondary",
        disabled: true,
        attributes: { "data-article-delete": true, "data-disabled-reason": reason }
      })}
      <p class="studio-meta studio-action-hint">${escapeHtml(reason)}</p>
    `;
  }

  return renderButton({
    label: "Definitief verwijderen",
    variant: "secondary",
    attributes: { "data-article-delete": true }
  });
}

function renderArticleWorkflowActions({ article, articleData, supplierData, brochureData, mediaData }) {
  const reviewErrors = validationMessages(
    validationForStatus({ article, status: "review", articleData, supplierData, brochureData, mediaData })
  );
  const publishErrors = validationMessages(
    validationForStatus({ article, status: "published", articleData, supplierData, brochureData, mediaData })
  );
  const actions = [];

  if (article.status === "concept") {
    actions.push(
      renderStatusAction({
        label: "Naar review",
        targetStatus: "review",
        disabled: Boolean(reviewErrors.length),
        reason: reviewErrors[0] || ""
      })
    );
  }

  if (article.status === "review") {
    actions.push(renderStatusAction({ label: "Terug naar concept", targetStatus: "concept" }));
  }

  if (article.status === "concept" || article.status === "review" || article.status === "hidden") {
    actions.push(
      renderStatusAction({
        label: "Publiceren",
        targetStatus: "published",
        variant: "primary",
        disabled: Boolean(publishErrors.length),
        reason: publishErrors[0] || ""
      })
    );
  }

  if (article.status === "published") {
    actions.push(renderStatusAction({ label: "Terug naar concept", targetStatus: "concept" }));
    actions.push(
      renderButton({
        label: "Archiveren",
        variant: "secondary",
        attributes: { "data-article-archive": true }
      })
    );
  }

  if (article.status === "archived") {
    actions.push(renderStatusAction({ label: "Terug naar concept", targetStatus: "concept" }));
  }

  if (canDeleteStatus(article.status)) {
    actions.push(renderDeleteAction(deleteBlocker({ article, supplierData })));
  }

  return renderWorkflowActionCard({
    status: article.status,
    statusLabel: getArticleStatusLabel(article.status),
    actions
  });
}

function renderFeedbackForArticle(article) {
  if (!articleActionFeedback || articleActionFeedback.slug !== article.slug) return "";
  return articleActionFeedback.html;
}

export function renderArticleDetail({
  article,
  articleData = {},
  supplierData,
  brochureData,
  mediaData = {},
  heroImagePreview = {}
}) {
  const relatedSuppliers = findArticleSuppliers(article, supplierData);
  const relatedBrochures = findArticleBrochures(article, brochureData);
  const heroAsset = findMediaAssetByPath(mediaData, article.heroImage);
  const readinessReport = getContentReadinessReport({
    suppliers: supplierData,
    brochures: brochureData,
    media: mediaData,
    articles: articleData
  });
  const readiness = findReadinessByRoute(readinessReport, "articles", `#/kennisbank/${article.slug}`);

  return `
    ${renderPageHeader({
      eyebrow: "Kennisbankbeheer",
      title: article.title,
      description: "Bekijk gegevens, relaties en inhoud van een kennisbankartikel binnen de bewerkversie."
    })}

    <div class="studio-actions studio-page-actions">
      ${renderButton({ label: "Terug naar kennisbank", href: "#/kennisbank", variant: "secondary" })}
      ${renderButton({ label: "Bewerken", href: `#/kennisbank/${article.slug}/bewerken`, variant: "primary" })}
    </div>

    ${renderNotice({
      title: "Alleen bewerkversie",
      message:
        "Deze detailweergave leest de bewerkversie. Het beheerbestand en de publieke website veranderen pas na Gegevens exporteren en Website bijwerken.",
      tone: "info"
    })}

    <div data-article-action-feedback>${renderFeedbackForArticle(article)}</div>

    <section class="studio-section">
      ${renderReadinessCard(readiness)}
    </section>

    ${renderArticleWorkflowActions({ article, articleData, supplierData, brochureData, mediaData })}

    <section class="studio-section">
      <div class="studio-section-head">
        <h2>Gegevens</h2>
        ${renderStatusBadge(article.status, getArticleStatusLabel(article.status))}
      </div>
      ${renderDetailList([
        { label: "ID", value: article.id },
        { label: "URL-naam", value: article.slug },
        { label: "Categorieen", value: (article.categories || []).join(", ") },
        { label: "Samenvatting", value: article.summary },
        { label: "Headerafbeelding", value: renderHeroImageValue(article, heroAsset), html: Boolean(heroAsset) },
        { label: "Bijgewerkt op", value: article.updatedAt },
        { label: "Sortering", value: String(article.sortOrder ?? 0) }
      ])}
    </section>

    <section class="studio-section">
      <div class="studio-grid studio-grid-2">
        <article class="studio-card">
          <h2>Gekoppelde leveranciers</h2>
          ${renderRelationList(relatedSuppliers, {
            emptyText: "Nog geen leverancier gekoppeld. Koppel een leverancier zodat bezoekers kunnen doorklikken naar het assortiment.",
            hrefForItem: (supplier) => `#/leveranciers/${supplier.slug}`,
            labelForItem: (supplier) => supplier.name,
            statusForItem: (supplier) => supplier.status,
            statusLabelForItem: (supplier) => getSupplierStatusLabel(supplier.status)
          })}
        </article>
        <article class="studio-card">
          <h2>Gekoppelde brochures</h2>
          ${renderRelationList(relatedBrochures, {
            emptyText: "Nog geen brochure gekoppeld. Koppel een brochure zodat bezoekers een collectie kunnen bekijken.",
            hrefForItem: (brochure) => `#/brochures/${brochure.slug}`,
            labelForItem: (brochure) => brochure.title,
            statusForItem: (brochure) => brochure.status,
            statusLabelForItem: (brochure) => getBrochureStatusLabel(brochure.status)
          })}
        </article>
      </div>
    </section>

    <section class="studio-section">
      ${renderHeroMedia(article, heroAsset, heroImagePreview)}
    </section>

    <section class="studio-section">
      <div class="studio-section-head">
        <h2>Inhoud</h2>
      </div>
      <article class="studio-card studio-article-body">
        ${bodyHtml(article.body)}
      </article>
    </section>
  `;
}

function nextStepsMessage(actionLabel) {
  return `${actionLabel} staat klaar in de bewerkversie. Volgende stappen: Gegevens exporteren, Publieke website bijwerken, controleren in GitHub Desktop, committen en pushen.`;
}

function setActionFeedback(slug, title, message, tone = "success") {
  articleActionFeedback = {
    slug,
    html: renderNotice({ title, message, tone })
  };
}

async function confirmStatusChange(targetStatus) {
  if (targetStatus === "published") {
    return confirmStudioAction({
      title: "Artikel publiceren?",
      message:
        "Alles is gereed om klaar te zetten voor de website. Deze actie wijzigt alleen de status in de bewerkversie; de website verandert pas na export, Website bijwerken, commit en push.",
      confirmLabel: "Publiceren",
      cancelLabel: "Annuleren",
      tone: "info"
    });
  }

  if (targetStatus === "review") {
    return confirmStudioAction({
      title: "Naar review zetten?",
      message:
        "Het artikel blijft in de bewerkversie en wordt gemarkeerd als klaar om inhoudelijk te controleren.",
      confirmLabel: "Naar review",
      cancelLabel: "Annuleren",
      tone: "info"
    });
  }

  return confirmStudioAction({
    title: "Terug naar concept?",
    message:
      "Het artikel blijft bewaard in Studio en wordt opnieuw een concept in de bewerkversie.",
    confirmLabel: "Terug naar concept",
    cancelLabel: "Annuleren",
    tone: "warning"
  });
}

export function setupArticleWorkflowActions({
  articleSession,
  supplierSession,
  brochureSession,
  mediaSession,
  article,
  rerender
}) {
  document.querySelector("[data-article-delete]")?.addEventListener("click", async (event) => {
    if (event.currentTarget.disabled) return;

    const supplierData = supplierSession.getWorkingData();
    const reason = deleteBlocker({ article, supplierData });
    if (reason) {
      setActionFeedback(article.slug, "Artikel niet verwijderd", reason, "warning");
      rerender?.();
      return;
    }

    const confirmed = await confirmStudioAction({
      title: "Artikel definitief verwijderen?",
      message:
        "Dit artikel wordt verwijderd uit de bewerkversie. Dit kan alleen voor concepten of gearchiveerde items en verandert de publieke website pas na export en Website bijwerken.",
      confirmLabel: "Definitief verwijderen",
      cancelLabel: "Annuleren",
      tone: "warning"
    });
    if (!confirmed) return;

    await articleSession.deleteArticle(article.slug);
    window.location.hash = "#/kennisbank";
    rerender?.();
  });

  document.querySelector("[data-article-archive]")?.addEventListener("click", async () => {
    const confirmed = await confirmStudioAction({
      title: "Artikel archiveren?",
      message:
        "Dit artikel blijft bewaard in Studio, maar verschijnt niet meer op de website zodra de publieke website is bijgewerkt.",
      confirmLabel: "Archiveren",
      cancelLabel: "Annuleren",
      tone: "warning"
    });
    if (!confirmed) return;

    await articleSession.applyArticle({ ...article, status: "archived" }, article.slug);
    setActionFeedback(article.slug, "Gearchiveerd in bewerkversie", nextStepsMessage("Archiveren"));
    rerender?.();
  });

  document.querySelectorAll("[data-article-status-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (button.disabled) return;
      const targetStatus = button.dataset.articleStatusAction || "";
      const articleData = articleSession.getWorkingData();
      const supplierData = supplierSession.getWorkingData();
      const brochureData = brochureSession.getWorkingData();
      const mediaData = mediaSession.getWorkingData();
      const currentArticle = articleSession.findBySlug(article.slug) || article;
      const errors = validationForStatus({
        article: currentArticle,
        status: targetStatus,
        articleData,
        supplierData,
        brochureData,
        mediaData
      });
      const messages = validationMessages(errors);

      if (messages.length) {
        setActionFeedback(currentArticle.slug, "Status niet aangepast", messages[0], "warning");
        rerender?.();
        return;
      }

      const confirmed = await confirmStatusChange(targetStatus);
      if (!confirmed) return;

      await articleSession.applyArticle({ ...currentArticle, status: targetStatus }, currentArticle.slug);
      const label = targetStatus === "published" ? "Publiceren" : getArticleStatusLabel(targetStatus);
      setActionFeedback(currentArticle.slug, "Status aangepast in bewerkversie", nextStepsMessage(label));
      rerender?.();
    });
  });
}
