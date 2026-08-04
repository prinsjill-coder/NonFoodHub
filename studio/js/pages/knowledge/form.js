import { renderButton } from "../../../../components/button.js";
import {
  renderCheckboxGroup,
  renderSelectField,
  renderTextAreaField,
  renderTextField
} from "../../../../components/form-field.js";
import { renderNotice } from "../../../../components/notice.js";
import { renderPageHeader } from "../../../../components/page-header.js";
import {
  createEmptyArticle,
  getArticleStatusLabel,
  normalizeSlug
} from "../../../../shared/article-model.js";
import { getBrochures, sortBrochures } from "../../../../shared/brochure-model.js";
import { getSuppliers, sortSuppliers } from "../../../../shared/supplier-model.js";
import { articleFromForm, hasValidationErrors, validateArticle } from "../../../../shared/article-validation.js";
import { escapeHtml } from "../../../../shared/utils.js";
import { clearFieldErrors, renderFormValidationErrors, setupErrorLinkFocus } from "../../shared/form-errors.js";

function optionList(items, labelGetter) {
  return (items || []).map((item) => ({
    value: item,
    label: labelGetter(item)
  }));
}

function getStatusOptions(articleData) {
  return optionList(articleData.statuses || [], getArticleStatusLabel);
}

function renderRelationCheckboxGroup({ name, label, values = [], options = [], help = "" }) {
  const selected = new Set(values);
  const helpHtml = help ? `<p class="studio-field-help">${escapeHtml(help)}</p>` : "";
  const items = options
    .map((option) => {
      const id = `article-${name}-${option.value}`.replace(/[^a-zA-Z0-9_-]/g, "-");
      return `
        <label class="studio-check-pill" for="${escapeHtml(id)}">
          <input id="${escapeHtml(id)}" name="${escapeHtml(name)}" type="checkbox" value="${escapeHtml(option.value)}" ${selected.has(option.value) ? "checked" : ""}>
          <span>${escapeHtml(option.label)}</span>
        </label>
      `;
    })
    .join("");

  return `
    <fieldset class="studio-fieldset" data-field="${escapeHtml(name)}">
      <legend>${escapeHtml(label)}</legend>
      ${helpHtml}
      <div class="studio-check-grid">${items}</div>
      <p class="studio-field-error" data-field-error="${escapeHtml(name)}" aria-live="polite"></p>
    </fieldset>
  `;
}

function supplierOptions(supplierData) {
  return sortSuppliers(getSuppliers(supplierData)).map((supplier) => ({
    value: supplier.id,
    label: supplier.name
  }));
}

function brochureOptions(brochureData) {
  return sortBrochures(getBrochures(brochureData)).map((brochure) => ({
    value: brochure.id,
    label: brochure.title
  }));
}

export function renderArticleForm({
  articleData,
  supplierData,
  brochureData,
  article = createEmptyArticle(),
  mode
}) {
  const isEdit = mode === "edit";
  const title = isEdit ? `${article.title} bewerken` : "Nieuw artikel";
  const description = isEdit
    ? "Pas het artikel aan in de bewerkversie. De website verandert pas na Gegevens exporteren en Website bijwerken."
    : "Maak een nieuw artikel klaar in de bewerkversie. De website verandert pas na Gegevens exporteren en Website bijwerken.";

  return `
    ${renderPageHeader({
      eyebrow: "Kennisbankbeheer",
      title,
      description
    })}

    <div class="studio-actions studio-page-actions">
      ${renderButton({ label: "Terug naar kennisbank", href: "#/kennisbank", variant: "secondary" })}
      ${isEdit ? renderButton({ label: "Bekijken", href: `#/kennisbank/${article.slug}`, variant: "secondary" }) : ""}
    </div>

    ${renderNotice({
      title: "Opslaan in bewerkversie",
      message:
        articleData.storage?.message ||
        "Opslaan bewaart de wijziging in de bewerkversie. Gebruik daarna Gegevens exporteren.",
      tone: "warning"
    })}

    <form
      class="studio-form"
      data-article-form
      data-original-slug="${escapeHtml(isEdit ? article.slug : "")}"
      data-original-id="${escapeHtml(isEdit ? article.id : "")}"
      novalidate
    >
      <div id="article-form-feedback" class="studio-form-feedback"></div>
      <input type="hidden" name="id" value="${escapeHtml(article.id)}">

      <section class="studio-form-section">
        <h2>Basisgegevens</h2>
        <div class="studio-form-grid">
          ${renderTextField({
            name: "title",
            label: "Titel",
            value: article.title,
            required: true,
            help: "Titel zoals deze in Studio en later op de publieke website wordt getoond."
          })}
          ${renderTextField({
            name: "slug",
            label: "URL-naam",
            value: article.slug,
            required: true,
            help: "Deze tekst komt in de link naar het artikel. Voorbeeld: professioneel-tafelconcept wordt #/inspiratie/professioneel-tafelconcept."
          })}
          ${renderSelectField({
            name: "status",
            label: "Status",
            value: article.status,
            options: getStatusOptions(articleData),
            required: true,
            help: "Concept is een bewerkversie. Review betekent controleren. Gepubliceerd betekent klaar voor Website bijwerken."
          })}
          ${renderTextField({
            name: "updatedAt",
            label: "Bijgewerkt op",
            type: "date",
            value: article.updatedAt,
            required: true
          })}
          ${renderTextField({
            name: "sortOrder",
            label: "Sortering",
            type: "number",
            value: String(article.sortOrder ?? 0),
            required: true,
            help: "Lager nummer = eerder zichtbaar. Hoogste waarde: geen vaste limiet; gebruik bij voorkeur stappen van 10."
          })}
          ${renderTextField({
            name: "heroImage",
            label: "Bestand van de headerafbeelding",
            value: article.heroImage,
            help:
              "Vul het beeldbestand in vanaf de projectmap. Gebruik bijvoorbeeld: assets/images/blog-terrace.png. Uploaden gebeurt nog niet."
          })}
        </div>
      </section>

      <section class="studio-form-section">
        <h2>Content</h2>
        ${renderTextAreaField({
          name: "summary",
          label: "Samenvatting",
          value: article.summary,
          rows: 4,
          help: "Verplicht voor Review en Gepubliceerd. Concepten mogen nog onvolledig zijn."
        })}
        ${renderTextAreaField({
          name: "body",
          label: "Inhoud",
          value: article.body,
          rows: 9,
          help: "Verplicht voor Gepubliceerd. Gebruik gewone tekst; uitgebreide tekstopmaak komt later."
        })}
        ${renderCheckboxGroup({
          name: "categories",
          label: "Categorieen",
          values: article.categories,
          options: articleData.categories || [],
          help: "Minimaal een categorie is verplicht voor Review en Gepubliceerd."
        })}
      </section>

      <section class="studio-form-section">
        <h2>Relaties</h2>
        ${renderRelationCheckboxGroup({
          name: "supplierIds",
          label: "Gekoppelde leveranciers",
          values: article.supplierIds,
          options: supplierOptions(supplierData),
          help: "Deze koppeling kan leveranciercontext op de publieke website tonen."
        })}
        ${renderRelationCheckboxGroup({
          name: "brochureIds",
          label: "Gekoppelde brochures",
          values: article.brochureIds,
          options: brochureOptions(brochureData),
          help: "Koppel brochures zodat bezoekers vanuit inspiratie kunnen doorklikken naar relevante collecties."
        })}
      </section>

      <p class="studio-form-state" data-form-dirty-notice role="status" aria-live="polite" hidden>
        Niet-opgeslagen formulierwijzigingen. Kies Opslaan in bewerkversie om ze vast te leggen, of Annuleren om ze te verwerpen.
      </p>

      <div class="studio-form-actions">
        <button class="studio-button studio-button-primary" type="submit">Opslaan in bewerkversie</button>
        ${renderButton({
          label: "Annuleren",
          href: "#/kennisbank",
          variant: "secondary",
          attributes: { "data-article-form-cancel": true }
        })}
      </div>
    </form>
  `;
}

export function setupArticleForm({ articleSession, supplierSession, brochureSession, mediaSession, formDirtyGuard }) {
  const form = document.querySelector("[data-article-form]");
  if (!form) return;

  const articleData = articleSession.getWorkingData();
  const supplierData = supplierSession.getWorkingData();
  const brochureData = brochureSession.getWorkingData();
  const mediaData = mediaSession.getWorkingData();
  const feedback = form.querySelector("#article-form-feedback");
  const dirtyNotice = form.querySelector("[data-form-dirty-notice]");
  const titleInput = form.elements.title;
  const slugInput = form.elements.slug;
  let slugTouched = Boolean(slugInput.value);
  const dirtyRegistration = formDirtyGuard?.registerForm(form, { dirtyNotice });

  setupErrorLinkFocus(feedback, form);

  slugInput.addEventListener("input", () => {
    slugTouched = true;
    slugInput.value = normalizeSlug(slugInput.value);
  });

  titleInput.addEventListener("input", () => {
    if (!slugTouched) {
      slugInput.value = normalizeSlug(titleInput.value);
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearFieldErrors(form);

    const article = articleFromForm(form);
    const result = validateArticle(article, articleData.items || [], supplierData, brochureData, articleData, mediaData, {
      originalSlug: form.dataset.originalSlug || "",
      originalId: form.dataset.originalId || ""
    });

    if (hasValidationErrors(result)) {
      renderFormValidationErrors(form, feedback, result.errors, {
        headingId: "article-form-validation-summary-title"
      });
      return;
    }

    articleSession.applyArticle(article, form.dataset.originalSlug || "");
    dirtyRegistration?.markClean();
    feedback.innerHTML = renderNotice({
      title: "Opgeslagen in bewerkversie",
      message:
        "Het artikel is tijdelijk opgeslagen. Gebruik Gegevens exporteren om de wijziging handmatig over te dragen.",
      tone: "success"
    });
    window.location.hash = `#/kennisbank/${article.slug}`;
  });
}
