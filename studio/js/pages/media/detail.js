import { renderButton } from "../../../../components/button.js";
import { renderDetailList } from "../../../../components/detail-list.js";
import { renderNotice } from "../../../../components/notice.js";
import { renderPageHeader } from "../../../../components/page-header.js";
import { renderReadinessCard } from "../../../../components/readiness-card.js";
import { renderStatusBadge } from "../../../../components/status-badge.js";
import { getArticleStatusLabel } from "../../../../shared/article-model.js";
import { getBrochureStatusLabel } from "../../../../shared/brochure-model.js";
import { findMediaUsage } from "../../../../shared/content-relations.js";
import { findReadinessByRoute, getContentReadinessReport } from "../../../../shared/content-readiness.js";
import {
  getMediaAssets,
  getMediaStatusLabel,
  getMediaTypeLabel,
  getMediaUsageTypeLabel
} from "../../../../shared/media-model.js";
import { validateMediaAsset } from "../../../../shared/media-validation.js";
import { getSupplierStatusLabel } from "../../../../shared/supplier-model.js";
import { escapeHtml } from "../../../../shared/utils.js";

let mediaActionFeedback = null;

function renderUsageList(items, { emptyText, hrefForItem, labelForItem, statusForItem, statusLabelForItem }) {
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

function renderRightsCheckLabel(asset) {
  return asset.rightsStatus === "approved" ? "Beeldrechten gecontroleerd" : "Nog controleren";
}

function validationMessages(errors) {
  return Object.values(errors || {}).filter(Boolean);
}

function validationForStatus({ asset, status, mediaData }) {
  return validateMediaAsset({ ...asset, status }, getMediaAssets(mediaData), {
    originalId: asset.id
  });
}

function renderMediaStatusAction({ label, targetStatus, disabled = false, reason = "", variant = "secondary" }) {
  return `
    ${renderButton({
      label,
      variant,
      disabled,
      attributes: {
        "data-media-status-action": targetStatus,
        "data-disabled-reason": reason
      }
    })}
    ${disabled && reason ? `<p class="studio-meta studio-action-hint">${escapeHtml(reason)}</p>` : ""}
  `;
}

function renderMediaWorkflowActions({ asset, mediaData }) {
  const conceptErrors = validationMessages(validationForStatus({ asset, status: "concept", mediaData }));
  const reviewErrors = validationMessages(validationForStatus({ asset, status: "review", mediaData }));
  const publishErrors = validationMessages(validationForStatus({ asset, status: "published", mediaData }));
  const actions = [];

  if (asset.status === "concept") {
    actions.push(
      renderMediaStatusAction({
        label: "Naar Review",
        targetStatus: "review",
        disabled: reviewErrors.length > 0,
        reason: reviewErrors[0] || ""
      })
    );
  }

  if (asset.status === "review") {
    actions.push(
      renderMediaStatusAction({
        label: "Terug naar Concept",
        targetStatus: "concept",
        disabled: conceptErrors.length > 0,
        reason: conceptErrors[0] || ""
      })
    );
    actions.push(
      renderMediaStatusAction({
        label: "Publiceren",
        targetStatus: "published",
        variant: "primary",
        disabled: publishErrors.length > 0,
        reason: publishErrors[0] || ""
      })
    );
  }

  if (asset.status === "published") {
    actions.push(
      renderMediaStatusAction({
        label: "Terug naar Review",
        targetStatus: "review",
        disabled: reviewErrors.length > 0,
        reason: reviewErrors[0] || ""
      })
    );
    actions.push(
      renderMediaStatusAction({
        label: "Terug naar Concept",
        targetStatus: "concept",
        disabled: conceptErrors.length > 0,
        reason: conceptErrors[0] || ""
      })
    );
  }

  if ((asset.status === "hidden" || asset.status === "archived") && !actions.length) {
    actions.push(
      renderMediaStatusAction({
        label: "Terug naar Concept",
        targetStatus: "concept",
        disabled: conceptErrors.length > 0,
        reason: conceptErrors[0] || ""
      })
    );
  }

  return `
    <section class="studio-section">
      <article class="studio-card studio-workflow-action-card">
        <div class="studio-card-head">
          <div>
            <h2>Klaarzetten voor gebruik</h2>
            <p class="studio-muted">
              Deze acties wijzigen alleen de status van dit media-item. Studio uploadt of verplaatst het bestand niet.
            </p>
          </div>
          ${renderStatusBadge(asset.status, getMediaStatusLabel(asset.status))}
        </div>
        <div class="studio-actions">${actions.join("")}</div>
        <p class="studio-meta">
          Metadata zoals titel, alt-tekst, caption en beeldrechten beheer je via Bewerken.
        </p>
      </article>
    </section>
  `;
}

function renderFeedbackForMedia(asset) {
  if (!mediaActionFeedback || mediaActionFeedback.id !== asset.id) return "";
  return mediaActionFeedback.html;
}

export function renderMediaDetail({ mediaData, supplierData = {}, brochureData = {}, articleData = {}, asset }) {
  const usage = findMediaUsage(asset, supplierData, brochureData, articleData);
  const readinessReport = getContentReadinessReport({
    suppliers: supplierData,
    brochures: brochureData,
    media: mediaData,
    articles: articleData
  });
  const readiness = findReadinessByRoute(readinessReport, "media", `#/media/${asset.id}`);

  return `
    ${renderPageHeader({
      eyebrow: "Mediaregister",
      title: asset.title,
      description: "Bekijk gegevens van een geregistreerd mediabestand binnen de bewerkversie."
    })}

    <div class="studio-actions studio-page-actions">
      ${renderButton({ label: "Terug naar media", href: "#/media", variant: "secondary" })}
      ${renderButton({ label: "Bewerken", href: `#/media/${asset.id}/bewerken`, variant: "primary" })}
    </div>

    ${renderNotice({
      title: "Geen uploadfunctie",
      message:
        "Deze detailweergave registreert alleen gegevens en een bestand. Studio uploadt of verplaatst geen bestanden.",
      tone: "info"
    })}

    <div data-media-action-feedback>${renderFeedbackForMedia(asset)}</div>

    <section class="studio-section">
      ${renderReadinessCard(readiness)}
    </section>

    ${renderMediaWorkflowActions({ asset, mediaData })}

    <section class="studio-section">
      <div class="studio-section-head">
        <h2>Gegevens</h2>
        ${renderStatusBadge(asset.status, getMediaStatusLabel(asset.status))}
      </div>
      ${renderDetailList([
        { label: "ID", value: asset.id },
        { label: "Bestand", value: asset.file },
        { label: "Type", value: getMediaTypeLabel(asset.type, mediaData) },
        { label: "Gebruik", value: getMediaUsageTypeLabel(asset.usageType, mediaData) },
        { label: "Beeldrechten", value: renderRightsCheckLabel(asset) },
        { label: "Alt-tekst", value: asset.alt },
        { label: "Caption", value: asset.caption },
        { label: "Afmetingen", value: asset.width && asset.height ? `${asset.width} x ${asset.height}` : "Niet ingevuld" },
        { label: "Bestandsgrootte", value: asset.fileSize },
        { label: "Sortering", value: String(asset.sortOrder ?? 0) }
      ])}
    </section>

    <section class="studio-section">
      <div class="studio-section-head">
        <h2>Bestandscontrole</h2>
      </div>
      <article class="studio-card">
        <p class="studio-muted">Ingevuld bestand</p>
        <p><code>${escapeHtml(asset.file)}</code></p>
        <p class="studio-meta">Bestandscontrole gebeurt via checks en handmatige QA, niet via upload in Studio.</p>
      </article>
    </section>

    <section class="studio-section">
      <div class="studio-section-head">
        <h2>Gebruikt door</h2>
      </div>
      <div class="studio-grid studio-grid-3">
        <article class="studio-card">
          <h3>Leveranciers</h3>
          ${renderUsageList(usage.suppliers, {
            emptyText: "Nog geen leveranciers gebruiken dit bestand.",
            hrefForItem: (supplier) => `#/leveranciers/${supplier.slug}`,
            labelForItem: (supplier) => supplier.name,
            statusForItem: (supplier) => supplier.status,
            statusLabelForItem: (supplier) => getSupplierStatusLabel(supplier.status)
          })}
        </article>
        <article class="studio-card">
          <h3>Brochures</h3>
          ${renderUsageList(usage.brochures, {
            emptyText: "Nog geen brochures gebruiken dit bestand.",
            hrefForItem: (brochure) => `#/brochures/${brochure.slug}`,
            labelForItem: (brochure) => brochure.title,
            statusForItem: (brochure) => brochure.status,
            statusLabelForItem: (brochure) => getBrochureStatusLabel(brochure.status)
          })}
        </article>
        <article class="studio-card">
          <h3>Artikelen</h3>
          ${renderUsageList(usage.articles, {
            emptyText: "Nog geen artikelen gebruiken dit bestand.",
            hrefForItem: (article) => `#/kennisbank/${article.slug}`,
            labelForItem: (article) => article.title,
            statusForItem: (article) => article.status,
            statusLabelForItem: (article) => getArticleStatusLabel(article.status)
          })}
        </article>
      </div>
    </section>
  `;
}

function setActionFeedback(id, title, message, tone = "success") {
  mediaActionFeedback = {
    id,
    html: renderNotice({ title, message, tone })
  };
}

export function setupMediaWorkflowActions({ mediaSession, asset, rerender }) {
  document.querySelectorAll("[data-media-status-action]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled) return;

      const targetStatus = button.dataset.mediaStatusAction || "";
      const mediaData = mediaSession.getWorkingData();
      const currentAsset = mediaSession.findById(asset.id) || asset;
      const errors = validationForStatus({ asset: currentAsset, status: targetStatus, mediaData });
      const messages = validationMessages(errors);

      if (messages.length) {
        setActionFeedback(currentAsset.id, "Status niet aangepast", messages[0], "warning");
        rerender?.();
        return;
      }

      mediaSession.applyMediaAsset({ ...currentAsset, status: targetStatus }, currentAsset.id);
      setActionFeedback(
        currentAsset.id,
        "Status aangepast in bewerkversie",
        `${getMediaStatusLabel(targetStatus)} is ingesteld. Studio uploadt of verplaatst het bestand niet.`
      );
      rerender?.();
    });
  });
}
