import { confirmStudioAction } from "../../../../components/confirm-dialog.js";
import { renderButton } from "../../../../components/button.js";
import { renderDetailList } from "../../../../components/detail-list.js";
import { renderNotice } from "../../../../components/notice.js";
import { renderPageHeader } from "../../../../components/page-header.js";
import { renderReadinessCard } from "../../../../components/readiness-card.js";
import { renderStatusBadge } from "../../../../components/status-badge.js";
import { renderWorkflowActionCard, renderWorkflowStatusAction } from "../../../../components/workflow-panel.js";
import { getArticleStatusLabel } from "../../../../shared/article-model.js";
import { getBrochureStatusLabel } from "../../../../shared/brochure-model.js";
import { findSupplierArticles, findSupplierBrochures } from "../../../../shared/content-relations.js";
import { findReadinessByRoute, getContentReadinessReport } from "../../../../shared/content-readiness.js";
import { getSupplierStatusLabel, getSupplierTypeLabel, getSuppliers } from "../../../../shared/supplier-model.js";
import { validateSupplier } from "../../../../shared/supplier-validation.js";
import { escapeHtml } from "../../../../shared/utils.js";

let supplierActionFeedback = null;

function mediaPath(path) {
  return path ? `../${path}` : "";
}

function renderMediaPreview(label, path, alt) {
  if (!path) {
    const message = label === "Logo" ? "Nog geen logo gekoppeld." : "Nog geen headerafbeelding gekoppeld.";
    const example = label === "Logo" ? "Voorbeeld: assets/images/logos/amefa.svg" : "Voorbeeld: assets/images/supplier-amefa.jpg";
    return `
      <article class="studio-card">
        <h3>${escapeHtml(label)}</h3>
        <p class="studio-muted">${escapeHtml(message)}</p>
        <p class="studio-meta">${escapeHtml(example)}</p>
      </article>
    `;
  }

  return `
    <article class="studio-card studio-media-reference">
      <h3>${escapeHtml(label)}</h3>
      <img src="${escapeHtml(mediaPath(path))}" alt="${escapeHtml(alt)}" loading="lazy">
      <p class="studio-meta">${escapeHtml(path)}</p>
    </article>
  `;
}

function renderRelationList(items, { emptyText, hrefForItem, labelForItem, statusForItem, statusLabelForItem, actionLabel }) {
  if (!items.length) {
    return `<p class="studio-muted">${escapeHtml(emptyText)}</p>`;
  }

  return `
    <ul class="studio-relation-list">
      ${items
        .map((item) => `
          <li>
            <span>
              <strong>${escapeHtml(labelForItem(item))}</strong>
              ${renderStatusBadge(statusForItem(item), statusLabelForItem(item))}
            </span>
            <a href="${escapeHtml(hrefForItem(item))}">${escapeHtml(actionLabel)}</a>
          </li>
        `)
        .join("")}
    </ul>
  `;
}

function renderBrochureRelationCards(brochures, supplier) {
  const addButton = renderButton({
    label: "Nieuwe brochure toevoegen",
    href: "#/brochures/nieuw",
    variant: "secondary"
  });

  if (!brochures.length) {
    return `
      <p class="studio-muted">
        Nog geen brochure gekoppeld. Voeg minimaal een brochure toe zodat bezoekers een collectie kunnen bekijken of downloaden.
      </p>
      <div class="studio-actions">${addButton}</div>
    `;
  }

  return `
    <div class="studio-relation-cards">
      ${brochures
        .map((brochure) => `
          <article class="studio-relation-card">
            <div>
              <h3>${escapeHtml(brochure.title)}</h3>
              <p class="studio-meta">${escapeHtml(brochure.year ? String(brochure.year) : "Geen jaar ingevuld")}</p>
            </div>
            ${renderStatusBadge(brochure.status, getBrochureStatusLabel(brochure.status))}
            ${renderButton({
              label: "Brochure bekijken",
              href: `#/brochures/${brochure.slug}`,
              variant: "outline"
            })}
          </article>
        `)
        .join("")}
    </div>
    <div class="studio-actions">${addButton}</div>
    <p class="studio-meta">
      Nieuwe brochures kies je op het brochureformulier bij leverancier ${escapeHtml(supplier.name)}.
    </p>
  `;
}

function validationMessages(errors) {
  return Object.values(errors || {}).filter(Boolean);
}

function validationForStatus({ supplier, status, supplierData }) {
  return validateSupplier(
    { ...supplier, status },
    getSuppliers(supplierData),
    { originalSlug: supplier.slug }
  );
}

function renderStatusAction({ label, targetStatus, disabled = false, reason = "", variant = "secondary" }) {
  return renderWorkflowStatusAction({
    label,
    targetStatus,
    disabled,
    reason,
    variant,
    actionAttribute: "data-supplier-status-action"
  });
}

function canDeleteStatus(status) {
  return status === "concept" || status === "archived";
}

function deleteBlocker({ supplier, brochureData, articleData }) {
  if (!canDeleteStatus(supplier.status)) return "";

  const relatedBrochures = findSupplierBrochures(supplier, brochureData);
  if (relatedBrochures.length) {
    return "Verwijder of verplaats eerst gekoppelde brochures.";
  }

  const relatedArticles = findSupplierArticles(supplier, articleData);
  if (relatedArticles.length) {
    return "Verwijder of verplaats eerst gekoppelde kennisbankartikelen.";
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
        attributes: { "data-supplier-delete": true, "data-disabled-reason": reason }
      })}
      <p class="studio-meta studio-action-hint">${escapeHtml(reason)}</p>
    `;
  }

  return renderButton({
    label: "Definitief verwijderen",
    variant: "secondary",
    attributes: { "data-supplier-delete": true }
  });
}

function renderSupplierWorkflowActions({ supplier, supplierData, brochureData = {}, articleData = {} }) {
  const reviewErrors = validationMessages(validationForStatus({ supplier, status: "review", supplierData }));
  const publishErrors = validationMessages(validationForStatus({ supplier, status: "published", supplierData }));
  const actions = [];

  if (supplier.status === "concept") {
    actions.push(
      renderStatusAction({
        label: "Naar review",
        targetStatus: "review",
        disabled: Boolean(reviewErrors.length),
        reason: reviewErrors[0] || ""
      })
    );
  }

  if (supplier.status === "review") {
    actions.push(renderStatusAction({ label: "Terug naar concept", targetStatus: "concept" }));
  }

  if (supplier.status === "concept" || supplier.status === "review" || supplier.status === "hidden") {
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

  if (supplier.status === "published") {
    actions.push(
      renderButton({
        label: "Archiveren",
        variant: "secondary",
        attributes: { "data-supplier-archive": true }
      })
    );
  }

  if (supplier.status === "archived") {
    actions.push(renderStatusAction({ label: "Terug naar concept", targetStatus: "concept" }));
  }

  if (canDeleteStatus(supplier.status)) {
    actions.push(renderDeleteAction(deleteBlocker({ supplier, brochureData, articleData })));
  }

  return renderWorkflowActionCard({
    status: supplier.status,
    statusLabel: getSupplierStatusLabel(supplier.status),
    actions
  });
}

function renderFeedbackForSupplier(supplier) {
  if (!supplierActionFeedback || supplierActionFeedback.slug !== supplier.slug) return "";
  return supplierActionFeedback.html;
}

export function renderSupplierDetail({ supplierData, brochureData = {}, articleData = {}, supplier }) {
  const relatedBrochures = findSupplierBrochures(supplier, brochureData);
  const relatedArticles = findSupplierArticles(supplier, articleData);
  const readinessReport = getContentReadinessReport({
    suppliers: supplierData,
    brochures: brochureData,
    articles: articleData
  });
  const readiness = findReadinessByRoute(readinessReport, "suppliers", `#/leveranciers/${supplier.slug}`);

  return `
    ${renderPageHeader({
      eyebrow: "Leverancier bekijken",
      title: supplier.name,
      description: supplier.summary || "Geen samenvatting ingevuld."
    })}

    <div class="studio-actions studio-page-actions">
      ${renderButton({ label: "Terug naar overzicht", href: "#/leveranciers", variant: "secondary" })}
      ${renderButton({ label: "Bewerken", href: `#/leveranciers/${supplier.slug}/bewerken`, variant: "primary" })}
    </div>

    ${renderNotice({
      title: "Alleen bewerkversie",
      message:
        "Deze detailweergave leest de bewerkversie. Het beheerbestand en de publieke website veranderen pas na Gegevens exporteren en Website bijwerken.",
      tone: "info"
    })}

    <div data-supplier-action-feedback>${renderFeedbackForSupplier(supplier)}</div>

    <section class="studio-section">
      ${renderReadinessCard(readiness)}
    </section>

    ${renderSupplierWorkflowActions({ supplier, supplierData, brochureData, articleData })}

    <section class="studio-section">
      <div class="studio-grid studio-grid-2">
        <article class="studio-card">
          <div class="studio-card-head">
            <h2>Basisgegevens</h2>
            ${renderStatusBadge(supplier.status, getSupplierStatusLabel(supplier.status))}
          </div>
          ${renderDetailList([
            { label: "Naam", value: supplier.name },
            { label: "URL-naam", value: supplier.slug },
            { label: "Type", value: getSupplierTypeLabel(supplier.type) },
            { label: "Categorieen", value: (supplier.categories || []).join(", ") },
            { label: "Uitgelicht", value: supplier.featured ? "Ja" : "Nee" },
            { label: "Sortering", value: String(supplier.sortOrder ?? 0) }
          ])}
        </article>
        <article class="studio-card">
          <h2>Omschrijving</h2>
          <p>${escapeHtml(supplier.description || "Geen omschrijving ingevuld.")}</p>
        </article>
      </div>
    </section>

    <section class="studio-section">
      <div class="studio-grid studio-grid-2">
        ${renderMediaPreview("Logo", supplier.logo, `${supplier.name} logo`)}
        ${renderMediaPreview("Afbeelding", supplier.image, `${supplier.name} afbeelding`)}
      </div>
    </section>

    <section class="studio-section">
      <div class="studio-grid studio-grid-2">
        <article class="studio-card">
          <h2>Brochures</h2>
          ${renderBrochureRelationCards(relatedBrochures, supplier)}
        </article>
        <article class="studio-card">
          <h2>Kennisbank</h2>
          ${renderRelationList(relatedArticles, {
            emptyText: "Nog geen kennisbankartikel gekoppeld. Koppel inspiratiecontent zodat bezoekers deze leverancier in context zien.",
            hrefForItem: (article) => `#/kennisbank/${article.slug}`,
            labelForItem: (article) => article.title,
            statusForItem: (article) => article.status,
            statusLabelForItem: (article) => getArticleStatusLabel(article.status),
            actionLabel: "Artikel bekijken"
          })}
        </article>
      </div>
    </section>
  `;
}

function nextStepsMessage(actionLabel) {
  return `${actionLabel} staat klaar in de bewerkversie. Volgende stappen: Gegevens exporteren, Publieke website bijwerken, controleren in GitHub Desktop, committen en pushen.`;
}

function setActionFeedback(slug, title, message, tone = "success") {
  supplierActionFeedback = {
    slug,
    html: renderNotice({ title, message, tone })
  };
}

async function confirmStatusChange(targetStatus) {
  if (targetStatus === "published") {
    return confirmStudioAction({
      title: "Leverancier publiceren?",
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
        "De leverancier blijft in de bewerkversie en wordt gemarkeerd als klaar om inhoudelijk te controleren.",
      confirmLabel: "Naar review",
      cancelLabel: "Annuleren",
      tone: "info"
    });
  }

  return confirmStudioAction({
    title: "Terug naar concept?",
    message:
      "De leverancier blijft bewaard in Studio en wordt opnieuw een concept in de bewerkversie.",
    confirmLabel: "Terug naar concept",
    cancelLabel: "Annuleren",
    tone: "warning"
  });
}

export function setupSupplierWorkflowActions({ supplierSession, brochureData = {}, articleData = {}, supplier, rerender }) {
  document.querySelector("[data-supplier-delete]")?.addEventListener("click", async (event) => {
    if (event.currentTarget.disabled) return;

    const confirmed = await confirmStudioAction({
      title: "Leverancier definitief verwijderen?",
      message:
        "Deze leverancier wordt verwijderd uit de bewerkversie. Dit kan alleen voor concepten of gearchiveerde items en verandert de publieke website pas na export en Website bijwerken.",
      confirmLabel: "Definitief verwijderen",
      cancelLabel: "Annuleren",
      tone: "warning"
    });
    if (!confirmed) return;

    await supplierSession.deleteSupplier(supplier.slug);
    window.location.hash = "#/leveranciers";
    rerender?.();
  });

  document.querySelector("[data-supplier-archive]")?.addEventListener("click", async () => {
    const confirmed = await confirmStudioAction({
      title: "Leverancier archiveren?",
      message:
        "Deze leverancier blijft bewaard in Studio, maar verschijnt niet meer op de website zodra de publieke website is bijgewerkt.",
      confirmLabel: "Archiveren",
      cancelLabel: "Annuleren",
      tone: "warning"
    });
    if (!confirmed) return;

    await supplierSession.applySupplier({ ...supplier, status: "archived" }, supplier.slug);
    setActionFeedback(supplier.slug, "Gearchiveerd in bewerkversie", nextStepsMessage("Archiveren"));
    rerender?.();
  });

  document.querySelectorAll("[data-supplier-status-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (button.disabled) return;
      const targetStatus = button.dataset.supplierStatusAction || "";
      const confirmed = await confirmStatusChange(targetStatus);
      if (!confirmed) return;

      await supplierSession.applySupplier({ ...supplier, status: targetStatus }, supplier.slug);
      const label = targetStatus === "published" ? "Publiceren" : getSupplierStatusLabel(targetStatus);
      setActionFeedback(supplier.slug, "Status aangepast in bewerkversie", nextStepsMessage(label));
      rerender?.();
    });
  });
}
