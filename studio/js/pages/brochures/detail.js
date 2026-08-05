import { confirmStudioAction } from "../../../../components/confirm-dialog.js";
import { renderButton } from "../../../../components/button.js";
import { renderDetailList } from "../../../../components/detail-list.js";
import { renderNotice } from "../../../../components/notice.js";
import { renderPageHeader } from "../../../../components/page-header.js";
import { renderReadinessCard } from "../../../../components/readiness-card.js";
import { renderStatusBadge } from "../../../../components/status-badge.js";
import { renderWorkflowActionCard, renderWorkflowStatusAction } from "../../../../components/workflow-panel.js";
import { getArticleStatusLabel } from "../../../../shared/article-model.js";
import {
  createBrochureEditionDraft,
  getBrochureLanguageLabel,
  getBrochureStatusLabel,
  getBrochures
} from "../../../../shared/brochure-model.js";
import { validateBrochure } from "../../../../shared/brochure-validation.js";
import { findBrochureArticles } from "../../../../shared/content-relations.js";
import { findReadinessByRoute, getContentReadinessReport } from "../../../../shared/content-readiness.js";
import { getMediaAssets } from "../../../../shared/media-model.js";
import { getSuppliers } from "../../../../shared/supplier-model.js";
import { escapeHtml } from "../../../../shared/utils.js";

let brochureActionFeedback = null;

function supplierForId(supplierData, supplierId) {
  return getSuppliers(supplierData).find((supplier) => supplier.id === supplierId) || null;
}

function renderSupplierReference(supplier) {
  if (!supplier) {
    return "Onbekende leverancier";
  }

  return `<a class="studio-inline-link" href="#/leveranciers/${escapeHtml(supplier.slug)}">${escapeHtml(supplier.name)}</a>`;
}

function fileNameFromPath(path) {
  return String(path || "").split(/[\\/]/).filter(Boolean).at(-1) || "";
}

function renderPresenceBadge(path, label, mediaRegistered, canOpen, openSource) {
  if (!path) {
    return `<span class="studio-badge is-review">${escapeHtml(label)} aanwezig: Nee, nog geen bestand ingevuld</span>`;
  }

  const state = canOpen ? "is-success" : "is-review";
  const text = canOpen
    ? openSource === "local"
      ? `${label} status: Lokaal gekozen bestand en Media zijn gecontroleerd`
      : `${label} status: Projectbestand en Media zijn gecontroleerd`
    : mediaRegistered
      ? openSource === "local"
        ? `${label} status: Lokaal gekozen bestand beschikbaar; controleer Media`
        : `${label} status: Projectbestand nog plaatsen of controleren in Media`
      : `${label} status: Mediaregistratie ontbreekt`;

  return `<span class="studio-badge ${state}" data-file-presence data-file-path="${escapeHtml(path)}" data-file-label="${escapeHtml(label)}" data-file-media-registered="${mediaRegistered ? "true" : "false"}" data-file-can-open="${canOpen ? "true" : "false"}" data-file-open-source="${escapeHtml(openSource)}">${escapeHtml(text)}</span>`;
}

function renderFileStatusCard({
  title,
  path,
  fileLabel,
  emptyText,
  actionLabel,
  mediaRegistered,
  canOpen,
  openSource = "",
  openUrl = ""
}) {
  const fileName = fileNameFromPath(path);

  return `
    <article class="studio-card studio-file-status-card">
      <h2>${escapeHtml(title)}</h2>
      <dl class="studio-file-status-list">
        <div>
          <dt>Ingevuld bestand</dt>
          <dd class="${path ? "studio-meta" : "studio-muted"}">${escapeHtml(path || emptyText)}</dd>
        </div>
        <div>
          <dt>Verwachte bestandsnaam</dt>
          <dd class="${fileName ? "studio-meta" : "studio-muted"}">${escapeHtml(fileName || "Nog niet bekend")}</dd>
        </div>
        <div>
          <dt>Bestandscontrole</dt>
          <dd>${renderPresenceBadge(path, fileLabel, mediaRegistered, canOpen, openSource)}</dd>
        </div>
        <div>
          <dt>Mediaregistratie</dt>
          <dd>
            <span class="studio-badge ${mediaRegistered ? "is-success" : "is-review"}">
              ${escapeHtml(mediaRegistered ? "Aanwezig" : "Ontbreekt nog")}
            </span>
          </dd>
        </div>
        <div>
          <dt>Actie</dt>
          <dd
            data-file-action
            data-file-action-label="${escapeHtml(actionLabel)}"
            data-file-path="${escapeHtml(path)}"
            data-file-media-registered="${mediaRegistered ? "true" : "false"}"
            data-file-can-open="${canOpen ? "true" : "false"}"
            data-file-open-source="${escapeHtml(openSource)}"
            data-file-open-url="${escapeHtml(openUrl)}"
          >
            ${path ? "Bestandsstatus wordt gecontroleerd." : "Koppel eerst een projectbestand."}
          </dd>
        </div>
      </dl>
    </article>
  `;
}

function renderArticleRelations(articles) {
  if (!articles.length) {
    return `<p class="studio-muted">Nog geen kennisbankartikel gekoppeld. Koppel inspiratiecontent zodat bezoekers vanuit advies naar deze brochure kunnen doorklikken.</p>`;
  }

  return `
    <ul class="studio-relation-list">
      ${articles
        .map((article) => `
          <li>
            <span>
              <strong>${escapeHtml(article.title)}</strong>
              ${renderStatusBadge(article.status, getArticleStatusLabel(article.status))}
            </span>
            <a class="studio-inline-link" href="#/kennisbank/${escapeHtml(article.slug)}">Artikel bekijken</a>
          </li>
        `)
        .join("")}
    </ul>
  `;
}

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function validationMessages(errors) {
  return Object.values(errors || {}).filter(Boolean);
}

function validationForStatus({ brochure, status, brochureData, supplierData }) {
  return validateBrochure(
    { ...brochure, status },
    getBrochures(brochureData),
    supplierData,
    brochureData,
    {
      originalSlug: brochure.slug,
      originalId: brochure.id
    }
  );
}

function renderStatusAction({ label, targetStatus, disabled = false, reason = "", variant = "secondary" }) {
  return renderWorkflowStatusAction({
    label,
    targetStatus,
    disabled,
    reason,
    variant,
    actionAttribute: "data-brochure-status-action"
  });
}

function renderBrochureWorkflowActions({ brochure, brochureData, supplierData }) {
  const reviewErrors = validationMessages(validationForStatus({ brochure, status: "review", brochureData, supplierData }));
  const publishErrors = validationMessages(validationForStatus({ brochure, status: "published", brochureData, supplierData }));
  const canReview = !reviewErrors.length;
  const canPublish = !publishErrors.length;
  const actions = [];

  actions.push(
    renderButton({
      label: "Nieuwe jaargang toevoegen",
      variant: "secondary",
      attributes: { "data-brochure-new-edition": true }
    })
  );

  if (brochure.status === "concept") {
    actions.push(
      renderStatusAction({
        label: "Naar review",
        targetStatus: "review",
        disabled: !canReview,
        reason: reviewErrors[0] || ""
      })
    );
  }

  if (brochure.status === "review") {
    actions.push(renderStatusAction({ label: "Terug naar concept", targetStatus: "concept" }));
  }

  if (brochure.status === "concept" || brochure.status === "review" || brochure.status === "hidden") {
    actions.push(
      renderStatusAction({
        label: "Publiceren",
        targetStatus: "published",
        variant: "primary",
        disabled: !canPublish,
        reason: publishErrors[0] || ""
      })
    );
  }

  if (brochure.status === "published") {
    actions.push(renderStatusAction({ label: "Terug naar concept", targetStatus: "concept" }));
    actions.push(
      renderButton({
        label: "Archiveren",
        variant: "secondary",
        attributes: { "data-brochure-archive": true }
      })
    );
  }

  if (brochure.status === "archived") {
    actions.push(renderStatusAction({ label: "Terug naar concept", targetStatus: "concept" }));
  }

  return renderWorkflowActionCard({
    status: brochure.status,
    statusLabel: getBrochureStatusLabel(brochure.status),
    actions
  });
}

function renderFeedbackForBrochure(brochure) {
  if (!brochureActionFeedback || brochureActionFeedback.slug !== brochure.slug) return "";
  return brochureActionFeedback.html;
}

function registeredMediaByPath(mediaData = {}) {
  return new Map(getMediaAssets(mediaData).filter((asset) => asset.file).map((asset) => [asset.file, asset]));
}

function mediaRegistrationForPath(path, mediaData = {}) {
  return registeredMediaByPath(mediaData).get(path) || null;
}

function fileOpenAvailability(path, availability = {}) {
  const item = path ? availability[path] : null;
  return item || { canOpen: false, source: "", url: "" };
}

function mediaReadyToOpen(asset, availability) {
  return Boolean(asset && pathIsSafeForLocalCheck(asset.file) && ["review", "published"].includes(asset.status) && availability.canOpen);
}

export function renderBrochureDetail({
  brochureData,
  supplierData,
  mediaData = {},
  articleData = {},
  brochure,
  fileAvailability = {}
}) {
  const supplier = supplierForId(supplierData, brochure.supplierId);
  const relatedArticles = findBrochureArticles(brochure, articleData);
  const pdfMedia = mediaRegistrationForPath(brochure.pdfFile, mediaData);
  const thumbnailMedia = mediaRegistrationForPath(brochure.thumbnail, mediaData);
  const pdfAvailability = fileOpenAvailability(brochure.pdfFile, fileAvailability);
  const thumbnailAvailability = fileOpenAvailability(brochure.thumbnail, fileAvailability);
  const readinessReport = getContentReadinessReport({
    suppliers: supplierData,
    brochures: brochureData,
    articles: articleData
  });
  const readiness = findReadinessByRoute(readinessReport, "brochures", `#/brochures/${brochure.slug}`);

  return `
    ${renderPageHeader({
      eyebrow: "Brochure bekijken",
      title: brochure.title,
      description: brochure.description || "Geen beschrijving ingevuld."
    })}

    <div class="studio-actions studio-page-actions">
      ${renderButton({ label: "Terug naar brochures", href: "#/brochures", variant: "secondary" })}
      ${renderButton({ label: "Bewerken", href: `#/brochures/${brochure.slug}/bewerken`, variant: "primary" })}
    </div>

    ${renderNotice({
      title: "Alleen bewerkversie",
      message:
        "Deze detailweergave leest de bewerkversie. Het beheerbestand en de publieke website veranderen pas na Gegevens exporteren en Website bijwerken.",
      tone: "info"
    })}

    <div data-brochure-action-feedback>${renderFeedbackForBrochure(brochure)}</div>

    <section class="studio-section">
      ${renderReadinessCard(readiness)}
    </section>

    ${renderBrochureWorkflowActions({ brochure, brochureData, supplierData })}

    <section class="studio-section">
      <div class="studio-grid studio-grid-2">
        <article class="studio-card">
          <div class="studio-card-head">
            <h2>Basisgegevens</h2>
            ${renderStatusBadge(brochure.status, getBrochureStatusLabel(brochure.status))}
          </div>
          ${renderDetailList([
            { label: "Titel", value: brochure.title },
            { label: "URL-naam", value: brochure.slug },
            { label: "Leverancier", value: renderSupplierReference(supplier), html: Boolean(supplier) },
            { label: "Jaar", value: brochure.year ? String(brochure.year) : "Geen jaar" },
            { label: "Categorieen", value: (brochure.categories || []).join(", ") || "Geen categorieen" },
            { label: "Taal", value: getBrochureLanguageLabel(brochure.language, brochureData) },
            { label: "Sortering", value: String(brochure.sortOrder ?? 0) },
            { label: "Bijgewerkt", value: brochure.updatedAt }
          ])}
        </article>
        <article class="studio-card">
          <h2>Beschrijving</h2>
          <p>${escapeHtml(brochure.description || "Geen beschrijving ingevuld.")}</p>
        </article>
      </div>
    </section>

    <section class="studio-section">
      <div class="studio-grid studio-grid-2">
        ${renderFileStatusCard({
          title: "Bestand van de PDF",
          path: brochure.pdfFile,
          fileLabel: "PDF",
          actionLabel: "PDF openen",
          mediaRegistered: Boolean(pdfMedia),
          canOpen: mediaReadyToOpen(pdfMedia, pdfAvailability),
          openSource: pdfAvailability.source,
          openUrl: pdfAvailability.url,
          emptyText: "Nog geen PDF gekoppeld. Gebruik bijvoorbeeld assets/downloads/brochures/amefa-2026.pdf."
        })}
        ${renderFileStatusCard({
          title: "Afbeelding van de brochure",
          path: brochure.thumbnail,
          fileLabel: "Thumbnail",
          actionLabel: "Afbeelding bekijken",
          mediaRegistered: Boolean(thumbnailMedia),
          canOpen: mediaReadyToOpen(thumbnailMedia, thumbnailAvailability),
          openSource: thumbnailAvailability.source,
          openUrl: thumbnailAvailability.url,
          emptyText: "Nog geen brochureafbeelding gekoppeld. Gebruik bijvoorbeeld assets/images/brochures/amefa-2026.jpg."
        })}
      </div>
    </section>

    <section class="studio-section">
      <div class="studio-section-head">
        <h2>Kennisbankartikelen</h2>
      </div>
      <article class="studio-card">
        ${renderArticleRelations(relatedArticles)}
      </article>
    </section>
  `;
}

function pathIsSafeForLocalCheck(path) {
  const value = String(path || "");
  return (
    value &&
    /^(assets|demo-assets)\//.test(value) &&
    !value.startsWith("/") &&
    !value.startsWith("\\") &&
    !value.startsWith("~") &&
    !value.toLowerCase().startsWith("file:") &&
    !/^[a-zA-Z]:[\\/]/.test(value)
  );
}

function studioRelativeAssetUrl(path) {
  if (!/^https?:$/.test(window.location.protocol)) return "";
  const pageUrl = window.location.href.split("#")[0];
  return new URL(`../${path}`, pageUrl).href;
}

function renderFileAction(path, label, { canOpen, mediaRegistered, openSource, openUrl }) {
  const url = canOpen ? openUrl || (openSource === "project" ? studioRelativeAssetUrl(path) : "") : "";
  if (url) {
    return `<a class="studio-inline-link" href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`;
  }

  if (!mediaRegistered) {
    return `<span class="studio-muted">Mediaregistratie ontbreekt. Staat het bestand al in de projectmap, sla de brochure op zodat Studio de basisregistratie in Media aanmaakt.</span>`;
  }

  if (openSource === "local") {
    return `<span class="studio-muted">Het lokaal gekozen bestand is beschikbaar in deze bewerkversie. Controleer de metadata in Media voordat je het opent.</span>`;
  }

  return `<span class="studio-muted">Plaats het bestand onder de verwachte projectbestandsnaam in de projectmap en controleer de metadata in Media voordat je het vanuit Studio opent.</span>`;
}

export function setupBrochureFileStatus() {
  document.querySelectorAll("[data-file-presence]").forEach((element) => {
    const path = element.dataset.filePath || "";
    const label = element.dataset.fileLabel || "Bestand";
    if (!path) return;

    const mediaRegistered = element.dataset.fileMediaRegistered === "true";
    const canOpen = element.dataset.fileCanOpen === "true";
    const openSource = element.dataset.fileOpenSource || "";

    element.classList.remove("is-foundation", "is-review", "is-success");
    element.classList.add(canOpen ? "is-success" : "is-review");
    element.textContent = canOpen
      ? openSource === "local"
        ? `${label} status: Lokaal gekozen bestand en Media zijn gecontroleerd`
        : `${label} status: Projectbestand en Media zijn gecontroleerd`
      : mediaRegistered
        ? openSource === "local"
          ? `${label} status: Lokaal gekozen bestand beschikbaar; controleer Media`
          : `${label} status: Projectbestand nog plaatsen of controleren in Media`
        : `${label} status: Mediaregistratie ontbreekt`;
  });

  document.querySelectorAll("[data-file-action]").forEach((element) => {
    const path = element.dataset.filePath || "";
    const label = element.dataset.fileActionLabel || "Bestand openen";
    const mediaRegistered = element.dataset.fileMediaRegistered === "true";
    const canOpen = element.dataset.fileCanOpen === "true";
    const openSource = element.dataset.fileOpenSource || "";
    const openUrl = element.dataset.fileOpenUrl || "";
    element.innerHTML = path
      ? renderFileAction(path, label, { canOpen, mediaRegistered, openSource, openUrl })
      : "Koppel eerst een projectbestand.";
  });
}

function nextStepsMessage(actionLabel) {
  return `${actionLabel} staat klaar in de bewerkversie. Volgende stappen: Gegevens exporteren, Publieke website bijwerken, controleren in GitHub Desktop, committen en pushen.`;
}

function setActionFeedback(slug, title, message, tone = "success") {
  brochureActionFeedback = {
    slug,
    html: renderNotice({ title, message, tone })
  };
}

async function confirmStatusChange(targetStatus) {
  if (targetStatus === "published") {
    return confirmStudioAction({
      title: "Brochure publiceren?",
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
        "De brochure blijft in de bewerkversie en wordt gemarkeerd als klaar om inhoudelijk te controleren.",
      confirmLabel: "Naar review",
      cancelLabel: "Annuleren",
      tone: "info"
    });
  }

  return confirmStudioAction({
    title: "Terug naar concept?",
    message:
      "De brochure blijft bewaard in Studio en wordt opnieuw een concept in de bewerkversie.",
    confirmLabel: "Terug naar concept",
    cancelLabel: "Annuleren",
    tone: "warning"
  });
}

export function setupBrochureWorkflowActions({ brochureSession, brochure, rerender }) {
  document.querySelector("[data-brochure-new-edition]")?.addEventListener("click", async () => {
    const confirmed = await confirmStudioAction({
      title: "Nieuwe jaargang toevoegen?",
      message:
        "Er wordt een nieuw concept gemaakt op basis van deze brochure. De huidige brochure, het bestaande PDF-bestand en historisch materiaal blijven bewaard.",
      confirmLabel: "Nieuwe jaargang maken",
      cancelLabel: "Annuleren",
      tone: "info"
    });
    if (!confirmed) return;

    const workingData = brochureSession.getWorkingData();
    const draft = createBrochureEditionDraft(brochure, getBrochures(workingData));
    brochureSession.applyBrochure(draft, "");
    window.location.hash = `#/brochures/${draft.slug}/bewerken`;
  });

  document.querySelector("[data-brochure-archive]")?.addEventListener("click", async () => {
    const confirmed = await confirmStudioAction({
      title: "Brochure archiveren?",
      message:
        "Deze brochure blijft bewaard in Studio, maar verschijnt niet meer op de website zodra de publieke website is bijgewerkt.",
      confirmLabel: "Archiveren",
      cancelLabel: "Annuleren",
      tone: "warning"
    });
    if (!confirmed) return;

    brochureSession.applyBrochure({ ...brochure, status: "archived", updatedAt: todayValue() }, brochure.slug);
    setActionFeedback(brochure.slug, "Gearchiveerd in bewerkversie", nextStepsMessage("Archiveren"));
    rerender?.();
  });

  document.querySelectorAll("[data-brochure-status-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (button.disabled) return;
      const targetStatus = button.dataset.brochureStatusAction || "";
      const confirmed = await confirmStatusChange(targetStatus);
      if (!confirmed) return;

      brochureSession.applyBrochure({ ...brochure, status: targetStatus, updatedAt: todayValue() }, brochure.slug);
      const label = targetStatus === "published" ? "Publiceren" : getBrochureStatusLabel(targetStatus);
      setActionFeedback(brochure.slug, "Status aangepast in bewerkversie", nextStepsMessage(label));
      rerender?.();
    });
  });
}
