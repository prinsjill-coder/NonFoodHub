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
  createEmptyBrochure,
  getBrochureLanguageLabel,
  getBrochureStatusLabel,
  normalizeSlug
} from "../../../../shared/brochure-model.js";
import { brochureFromForm, hasValidationErrors, validateBrochure } from "../../../../shared/brochure-validation.js";
import { getSuppliers, sortSuppliers } from "../../../../shared/supplier-model.js";
import { escapeHtml } from "../../../../shared/utils.js";
import { clearFieldErrors, renderFormValidationErrors, setupErrorLinkFocus } from "../../shared/form-errors.js";

function optionList(items, labelMap = {}) {
  return items.map((item) => ({ value: item, label: labelMap[item] || item }));
}

function getSupplierOptions(supplierData) {
  return [
    { value: "", label: "Kies een leverancier" },
    ...sortSuppliers(getSuppliers(supplierData)).map((supplier) => ({ value: supplier.id, label: supplier.name }))
  ];
}

function getStatusOptions(brochureData) {
  return optionList(
    brochureData.statuses || [],
    Object.fromEntries((brochureData.statuses || []).map((status) => [status, getBrochureStatusLabel(status)]))
  );
}

function getLanguageOptions(brochureData) {
  return (brochureData.languages || []).map((language) => ({
    value: language.id,
    label: getBrochureLanguageLabel(language.id, brochureData)
  }));
}

export function renderBrochureForm({ brochureData, supplierData, brochure = createEmptyBrochure(), mode }) {
  const isEdit = mode === "edit";
  const title = isEdit ? `${brochure.title} bewerken` : "Nieuwe brochure";
  const description = isEdit
    ? "Pas de brochure aan in deze Studio-sessie. De website verandert pas na export en handmatige publicatie."
    : "Maak een nieuwe brochure klaar in deze Studio-sessie. De website verandert pas na export en handmatige publicatie.";

  return `
    ${renderPageHeader({
      eyebrow: "Brochurebeheer",
      title,
      description
    })}

    <div class="studio-actions studio-page-actions">
      ${renderButton({ label: "Terug naar brochures", href: "#/brochures", variant: "secondary" })}
      ${isEdit ? renderButton({ label: "Bekijken", href: `#/brochures/${brochure.slug}`, variant: "secondary" }) : ""}
    </div>

    ${renderNotice({
      title: "Opslaan in deze sessie",
      message:
        brochureData.storage?.message ||
        "Opslaan bewaart de wijziging tijdelijk in Studio. Gebruik daarna Gegevens exporteren.",
      tone: "warning"
    })}

    <form
      class="studio-form"
      data-brochure-form
      data-original-slug="${escapeHtml(isEdit ? brochure.slug : "")}"
      data-original-id="${escapeHtml(isEdit ? brochure.id : "")}"
      novalidate
    >
      <div id="brochure-form-feedback" class="studio-form-feedback"></div>
      <input type="hidden" name="id" value="${escapeHtml(brochure.id)}">

      <section class="studio-form-section">
        <h2>Basisgegevens</h2>
        <div class="studio-form-grid">
          ${renderTextField({
            name: "title",
            label: "Titel",
            value: brochure.title,
            required: true,
            help: "De brochuretitel zoals deze in Studio en later op kaarten wordt getoond."
          })}
          ${renderTextField({
            name: "slug",
            label: "URL-naam",
            value: brochure.slug,
            required: true,
            help: "Unieke korte naam voor routes en koppelingen, bijvoorbeeld amefa-for-professionals-2026."
          })}
          ${renderSelectField({
            name: "supplierId",
            label: "Leverancier",
            value: brochure.supplierId,
            options: getSupplierOptions(supplierData),
            required: true,
            help: "Een brochure verwijst verplicht naar een bestaande leverancier."
          })}
          ${renderTextField({
            name: "year",
            label: "Jaar",
            type: "number",
            value: brochure.year ? String(brochure.year) : "",
            help: "Optioneel. Gebruik een jaartal zoals 2026."
          })}
          ${renderSelectField({
            name: "language",
            label: "Taal",
            value: brochure.language,
            options: getLanguageOptions(brochureData),
            required: true
          })}
          ${renderSelectField({
            name: "status",
            label: "Status",
            value: brochure.status,
            options: getStatusOptions(brochureData),
            required: true,
            help: "Deze status helpt bij controle. De website wordt niet automatisch bijgewerkt."
          })}
          ${renderTextField({
            name: "sortOrder",
            label: "Sortering",
            type: "number",
            value: String(brochure.sortOrder ?? 0),
            required: true,
            help: "Lager getal komt eerder in overzichten."
          })}
          ${renderTextField({
            name: "updatedAt",
            label: "Bijgewerkt op",
            type: "date",
            value: brochure.updatedAt,
            required: true
          })}
        </div>
      </section>

      <section class="studio-form-section">
        <h2>Content</h2>
        ${renderTextAreaField({
          name: "description",
          label: "Beschrijving",
          value: brochure.description,
          rows: 5,
          help: "Korte inhoudelijke beschrijving voor Studio en toekomstige kaartweergaven."
        })}
        ${renderCheckboxGroup({
          name: "categories",
          label: "Categorieen",
          values: brochure.categories,
          options: brochureData.categories || [],
          help: "Gebruik een of meer bestaande brochurecategorieen."
        })}
      </section>

      <section class="studio-form-section">
        <h2>Bestanden en media</h2>
        <div class="studio-form-grid">
          ${renderTextField({
            name: "pdfFile",
            label: "PDF-pad",
            value: brochure.pdfFile,
            help: "Relatief pad, bijvoorbeeld assets/downloads/brochures/naam.pdf. Plaats het PDF-bestand handmatig op dit pad; verplicht bij Ter controle en Gepubliceerd."
          })}
          ${renderTextField({
            name: "pdfSize",
            label: "PDF-grootte",
            value: brochure.pdfSize,
            help: "Optionele tekst, bijvoorbeeld 12 MB. Automatische bestandscontrole komt later."
          })}
          ${renderTextField({
            name: "thumbnail",
            label: "Thumbnailpad",
            value: brochure.thumbnail,
            help: "Relatief pad, bijvoorbeeld assets/images/supplier-amefa.jpg. Plaats of registreer de thumbnail handmatig; verplicht bij Gepubliceerd."
          })}
        </div>
      </section>

      <p class="studio-form-state" data-form-dirty-notice role="status" aria-live="polite" hidden>
        Niet-opgeslagen formulierwijzigingen. Kies Opslaan in deze sessie om ze toe te passen, of Annuleren om ze te verwerpen.
      </p>

      <div class="studio-form-actions">
        <button class="studio-button studio-button-primary" type="submit">Opslaan in deze sessie</button>
        ${renderButton({
          label: "Annuleren",
          href: "#/brochures",
          variant: "secondary",
          attributes: { "data-brochure-form-cancel": true }
        })}
      </div>
    </form>
  `;
}

export function setupBrochureForm({ brochureSession, supplierSession, formDirtyGuard }) {
  const form = document.querySelector("[data-brochure-form]");
  if (!form) return;

  const brochureData = brochureSession.getWorkingData();
  const supplierData = supplierSession.getWorkingData();
  const feedback = form.querySelector("#brochure-form-feedback");
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

    const brochure = brochureFromForm(form);
    const errors = validateBrochure(brochure, brochureData.items || [], supplierData, brochureData, {
      originalSlug: form.dataset.originalSlug || "",
      originalId: form.dataset.originalId || ""
    });

    if (hasValidationErrors(errors)) {
      renderFormValidationErrors(form, feedback, errors, {
        headingId: "brochure-form-validation-summary-title"
      });
      return;
    }

    brochureSession.applyBrochure(brochure, form.dataset.originalSlug || "");
    dirtyRegistration?.markClean();
    feedback.innerHTML = renderNotice({
      title: "Opgeslagen in deze sessie",
      message:
        "De brochure is tijdelijk opgeslagen. Gebruik Gegevens exporteren; plaats PDF en thumbnail zelf op het ingevulde relatieve pad.",
      tone: "success"
    });
    window.location.hash = `#/brochures/${brochure.slug}`;
  });
}
