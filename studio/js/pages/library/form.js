import { renderButton } from "../../../../components/button.js";
import {
  renderSelectField,
  renderTextAreaField,
  renderTextField
} from "../../../../components/form-field.js";
import { renderNotice } from "../../../../components/notice.js";
import { renderPageHeader } from "../../../../components/page-header.js";
import { getArticles, sortArticles } from "../../../../shared/article-model.js";
import { getBrochures, sortBrochures } from "../../../../shared/brochure-model.js";
import {
  createEmptyLibraryItem,
  getLibraryStatusLabel,
  getLibraryTypeLabel,
  normalizeSlug
} from "../../../../shared/library-model.js";
import { hasValidationErrors, libraryItemFromForm, validateLibraryItem } from "../../../../shared/library-validation.js";
import { getSuppliers, sortSuppliers } from "../../../../shared/supplier-model.js";
import { escapeHtml } from "../../../../shared/utils.js";
import { clearFieldErrors, renderFormValidationErrors, setupErrorLinkFocus } from "../../shared/form-errors.js";

function optionList(values, labelGetter = (value) => value) {
  return (values || []).map((value) => ({
    value,
    label: labelGetter(value)
  }));
}

function getStatusOptions(libraryData) {
  return optionList(libraryData.statuses || [], getLibraryStatusLabel);
}

function getTypeOptions(libraryData) {
  return optionList(libraryData.types || [], (type) => getLibraryTypeLabel(type, libraryData));
}

function renderRelationCheckboxGroup({ name, label, values = [], options = [], help = "" }) {
  const selected = new Set(values);
  const helpHtml = help ? `<p class="studio-field-help">${escapeHtml(help)}</p>` : "";
  const items = options
    .map((option) => {
      const id = `library-${name}-${option.value}`.replace(/[^a-zA-Z0-9_-]/g, "-");
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

function articleOptions(articleData) {
  return sortArticles(getArticles(articleData)).map((article) => ({
    value: article.id,
    label: article.title
  }));
}

export function renderLibraryForm({
  libraryData,
  supplierData,
  brochureData,
  articleData,
  item = createEmptyLibraryItem(),
  mode
}) {
  const isEdit = mode === "edit";
  const title = isEdit ? `${item.title} bewerken` : "Nieuw bibliotheekitem";
  const description = isEdit
    ? "Pas het bibliotheekitem aan in de bewerkversie. Bestanden plaatsen en Website bijwerken blijven handmatige stappen."
    : "Registreer een nieuw document of bron in de bewerkversie. Bestanden plaatsen en Website bijwerken blijven handmatige stappen.";

  return `
    ${renderPageHeader({
      eyebrow: "Bibliotheekbeheer",
      title,
      description
    })}

    <div class="studio-actions studio-page-actions">
      ${renderButton({ label: "Terug naar bibliotheek", href: "#/bibliotheek", variant: "secondary" })}
      ${isEdit ? renderButton({ label: "Bekijken", href: `#/bibliotheek/${item.slug}`, variant: "secondary" }) : ""}
    </div>

    ${renderNotice({
      title: "Opslaan in bewerkversie",
      message:
        libraryData.storage?.message ||
        "Opslaan bewaart de wijziging in de bewerkversie. Gebruik daarna Gegevens exporteren.",
      tone: "warning"
    })}

    <form
      class="studio-form"
      data-library-form
      data-original-slug="${escapeHtml(isEdit ? item.slug : "")}"
      data-original-id="${escapeHtml(isEdit ? item.id : "")}"
      novalidate
    >
      <div id="library-form-feedback" class="studio-form-feedback"></div>
      <input type="hidden" name="id" value="${escapeHtml(item.id)}">

      <section class="studio-form-section">
        <h2>Basisgegevens</h2>
        <div class="studio-form-grid">
          ${renderTextField({
            name: "title",
            label: "Titel",
            value: item.title,
            required: true,
            help: "Titel zoals deze in Studio wordt getoond."
          })}
          ${renderTextField({
            name: "slug",
            label: "URL-naam",
            value: item.slug,
            required: true,
            help: "Deze tekst komt in de link naar dit bibliotheekitem. Voorbeeld: terras-outdoor-gids wordt #/bibliotheek/terras-outdoor-gids."
          })}
          ${renderSelectField({
            name: "status",
            label: "Status",
            value: item.status,
            options: getStatusOptions(libraryData),
            required: true,
            help: "Concept is een bewerkversie. Review betekent controleren. Gepubliceerd betekent klaar voor Website bijwerken."
          })}
          ${renderSelectField({
            name: "type",
            label: "Type",
            value: item.type,
            options: getTypeOptions(libraryData),
            required: true
          })}
          ${renderSelectField({
            name: "category",
            label: "Categorie",
            value: item.category,
            options: optionList(libraryData.categories || []),
            required: true
          })}
          ${renderTextField({
            name: "updatedAt",
            label: "Bijgewerkt op",
            type: "date",
            value: item.updatedAt,
            required: true
          })}
          ${renderTextField({
            name: "sortOrder",
            label: "Sortering",
            type: "number",
            value: String(item.sortOrder ?? 0),
            required: true,
            help: "Lager nummer = eerder zichtbaar. Hoogste waarde: geen vaste limiet; gebruik bij voorkeur stappen van 10."
          })}
        </div>
      </section>

      <section class="studio-form-section">
        <h2>Content en bestanden</h2>
        ${renderTextAreaField({
          name: "summary",
          label: "Samenvatting",
          value: item.summary,
          rows: 4,
          required: true
        })}
        <div class="studio-form-grid">
          ${renderTextField({
            name: "filePath",
            label: "Bestand",
            value: item.filePath,
            help: "Vul het bestand in vanaf de projectmap. Gebruik bijvoorbeeld: assets/downloads/library/terras-outdoor-gids.pdf. Uploaden gebeurt nog niet."
          })}
          ${renderTextField({
            name: "thumbnailPath",
            label: "Afbeelding",
            value: item.thumbnailPath,
            help: "Vul het beeldbestand in vanaf de projectmap. Gebruik bijvoorbeeld: assets/images/library/terras-outdoor-gids.jpg."
          })}
          ${renderTextField({
            name: "tags",
            label: "Tags",
            value: (item.tags || []).join(", "),
            help: "Optionele tags, gescheiden door komma's."
          })}
        </div>
      </section>

      <section class="studio-form-section">
        <h2>Relaties</h2>
        ${renderRelationCheckboxGroup({
          name: "supplierIds",
          label: "Gekoppelde leveranciers",
          values: item.supplierIds,
          options: supplierOptions(supplierData),
          help: "Koppel leveranciers zodat duidelijk is bij welk assortiment dit document hoort."
        })}
        ${renderRelationCheckboxGroup({
          name: "brochureIds",
          label: "Gekoppelde brochures",
          values: item.brochureIds,
          options: brochureOptions(brochureData),
          help: "Koppel brochures zodat bezoekers later vanuit collecties naar dit document kunnen gaan."
        })}
        ${renderRelationCheckboxGroup({
          name: "articleIds",
          label: "Gekoppelde kennisbankartikelen",
          values: item.articleIds,
          options: articleOptions(articleData),
          help: "Koppel kennisbankartikelen zodat inspiratie en documenten bij elkaar blijven."
        })}
      </section>

      <p class="studio-form-state" data-form-dirty-notice role="status" aria-live="polite" hidden>
        Niet-opgeslagen formulierwijzigingen. Kies Opslaan in bewerkversie om ze vast te leggen, of Annuleren om ze te verwerpen.
      </p>

      <div class="studio-form-actions">
        <button class="studio-button studio-button-primary" type="submit">Opslaan in bewerkversie</button>
        ${renderButton({
          label: "Annuleren",
          href: "#/bibliotheek",
          variant: "secondary",
          attributes: { "data-library-form-cancel": true }
        })}
      </div>
    </form>
  `;
}

export function setupLibraryForm({ librarySession, supplierSession, brochureSession, articleSession, mediaSession, formDirtyGuard }) {
  const form = document.querySelector("[data-library-form]");
  if (!form) return;

  const libraryData = librarySession.getWorkingData();
  const supplierData = supplierSession.getWorkingData();
  const brochureData = brochureSession.getWorkingData();
  const articleData = articleSession.getWorkingData();
  const mediaData = mediaSession.getWorkingData();
  const feedback = form.querySelector("#library-form-feedback");
  const dirtyNotice = form.querySelector("[data-form-dirty-notice]");
  const titleInput = form.elements.title;
  const slugInput = form.elements.slug;
  const idInput = form.elements.id;
  let slugTouched = Boolean(slugInput.value);
  const dirtyRegistration = formDirtyGuard?.registerForm(form, { dirtyNotice });

  setupErrorLinkFocus(feedback, form);

  slugInput.addEventListener("input", () => {
    slugTouched = true;
    slugInput.value = normalizeSlug(slugInput.value);
    if (!idInput.value) {
      idInput.value = `library-${slugInput.value}`.replace(/-+$/g, "");
    }
  });

  titleInput.addEventListener("input", () => {
    if (!slugTouched) {
      slugInput.value = normalizeSlug(titleInput.value);
    }
    if (!form.dataset.originalId) {
      idInput.value = `library-${normalizeSlug(titleInput.value)}`.replace(/-+$/g, "");
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearFieldErrors(form);

    const item = libraryItemFromForm(form);
    const result = validateLibraryItem(
      item,
      libraryData.items || [],
      supplierData,
      brochureData,
      articleData,
      libraryData,
      mediaData,
      {
        originalSlug: form.dataset.originalSlug || "",
        originalId: form.dataset.originalId || ""
      }
    );

    if (hasValidationErrors(result)) {
      renderFormValidationErrors(form, feedback, result.errors, {
        headingId: "library-form-validation-summary-title"
      });
      return;
    }

    librarySession.applyLibraryItem(item, form.dataset.originalSlug || "");
    dirtyRegistration?.markClean();
    feedback.innerHTML = renderNotice({
      title: "Opgeslagen in bewerkversie",
      message:
        "Het bibliotheekitem is tijdelijk opgeslagen. Gebruik Gegevens exporteren om de wijziging handmatig over te dragen.",
      tone: "success"
    });
    window.location.hash = `#/bibliotheek/${item.slug}`;
  });
}
