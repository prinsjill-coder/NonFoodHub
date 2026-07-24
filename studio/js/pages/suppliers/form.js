import { renderButton } from "../../../../components/button.js";
import {
  renderCheckboxField,
  renderCheckboxGroup,
  renderSelectField,
  renderTextAreaField,
  renderTextField
} from "../../../../components/form-field.js";
import { renderNotice } from "../../../../components/notice.js";
import { renderPageHeader } from "../../../../components/page-header.js";
import { renderValidationSummary } from "../../../../components/validation-summary.js";
import { createEmptySupplier, normalizeSlug } from "../../../../shared/supplier-model.js";
import { hasValidationErrors, supplierFromForm, validateSupplier } from "../../../../shared/supplier-validation.js";
import { escapeHtml } from "../../../../shared/utils.js";

function optionList(items, labelMap = {}) {
  return items.map((item) => ({ value: item, label: labelMap[item] || item }));
}

function getTypeOptions(supplierData) {
  return (supplierData.types || []).map((type) => ({ value: type.id, label: type.label }));
}

function getStatusOptions(supplierData) {
  const labels = {
    concept: "Concept",
    review: "Ter controle",
    published: "Gepubliceerd",
    hidden: "Verborgen",
    archived: "Gearchiveerd"
  };
  return optionList(supplierData.statuses || [], labels);
}

export function renderSupplierForm({ supplierData, supplier = createEmptySupplier(), mode }) {
  const isEdit = mode === "edit";
  const title = isEdit ? `${supplier.name} bewerken` : "Nieuwe leverancier";
  const description = isEdit
    ? "Pas leveranciersdata aan en controleer de validatie. Opslaan naar bestanden is nog niet actief."
    : "Maak een nieuwe leverancier klaar als prototype. De invoer wordt gevalideerd, maar nog niet opgeslagen.";

  return `
    ${renderPageHeader({
      eyebrow: "Leveranciersbeheer",
      title,
      description
    })}

    <div class="studio-actions studio-page-actions">
      ${renderButton({ label: "Terug naar overzicht", href: "#/leveranciers", variant: "secondary" })}
      ${isEdit ? renderButton({ label: "Bekijken", href: `#/leveranciers/${supplier.slug}`, variant: "secondary" }) : ""}
    </div>

    ${renderNotice({
      title: "Opslaan nog niet beschikbaar",
      message: supplierData.storage?.message || "Dit formulier schrijft nog niet naar data/suppliers.json.",
      tone: "warning"
    })}

    <form class="studio-form" data-supplier-form data-original-slug="${escapeHtml(isEdit ? supplier.slug : "")}" novalidate>
      <div id="supplier-form-feedback" class="studio-form-feedback"></div>
      <input type="hidden" name="id" value="${escapeHtml(supplier.id)}">

      <section class="studio-form-section">
        <h2>Basisgegevens</h2>
        <div class="studio-form-grid">
          ${renderTextField({
            name: "name",
            label: "Naam",
            value: supplier.name,
            required: true,
            help: "De officiele leveranciers- of partnernaam."
          })}
          ${renderTextField({
            name: "slug",
            label: "Slug",
            value: supplier.slug,
            required: true,
            help: "Uniek, lowercase en met koppeltekens. Bijvoorbeeld amefa."
          })}
          ${renderSelectField({
            name: "type",
            label: "Type",
            value: supplier.type,
            options: getTypeOptions(supplierData),
            required: true
          })}
          ${renderSelectField({
            name: "status",
            label: "Status",
            value: supplier.status,
            options: getStatusOptions(supplierData),
            required: true,
            help: "Contentstatus; dit publiceert nog niets naar de publieke website."
          })}
          ${renderTextField({
            name: "sortOrder",
            label: "Sortering",
            type: "number",
            value: String(supplier.sortOrder ?? 0),
            help: "Lager getal komt eerder in overzichten."
          })}
          ${renderCheckboxField({
            name: "featured",
            label: "Uitgelichte leverancier",
            checked: Boolean(supplier.featured),
            help: "Voorbereid voor homepage- en overzichtsselecties."
          })}
        </div>
      </section>

      <section class="studio-form-section">
        <h2>Content</h2>
        ${renderTextAreaField({
          name: "summary",
          label: "Samenvatting",
          value: supplier.summary,
          rows: 3,
          help: "Korte tekst voor kaartweergaven en overzichten."
        })}
        ${renderTextAreaField({
          name: "description",
          label: "Omschrijving",
          value: supplier.description,
          rows: 7,
          help: "Uitgebreidere tekst voor detailweergaven."
        })}
        ${renderCheckboxGroup({
          name: "categories",
          label: "Categorieen",
          values: supplier.categories,
          options: supplierData.categories || [],
          help: "Relaties met echte categoriedata kunnen later worden toegevoegd."
        })}
      </section>

      <section class="studio-form-section">
        <h2>Mediareferenties</h2>
        <div class="studio-form-grid">
          ${renderTextField({
            name: "logo",
            label: "Logopad",
            value: supplier.logo,
            help: "Voorlopig alleen een relatief pad, bijvoorbeeld assets/images/supplier-amefa.jpg."
          })}
          ${renderTextField({
            name: "image",
            label: "Afbeeldingspad",
            value: supplier.image,
            help: "Media-upload en rechtencontrole worden later toegevoegd."
          })}
        </div>
      </section>

      <section class="studio-form-section">
        <h2>Relaties</h2>
        <div class="studio-grid studio-grid-2">
          <article class="studio-card">
            <h3>Brochures</h3>
            <p class="studio-muted">Voorbereid via <code>brochureIds</code>. Koppelen valt buiten Sprint 2.</p>
          </article>
          <article class="studio-card">
            <h3>Kennisbankartikelen</h3>
            <p class="studio-muted">Voorbereid via <code>relatedArticleIds</code>. Koppelen valt buiten Sprint 2.</p>
          </article>
        </div>
      </section>

      <div class="studio-form-actions">
        <button class="studio-button studio-button-primary" type="submit">Valideer formulier</button>
        ${renderButton({ label: "Annuleren", href: "#/leveranciers", variant: "secondary" })}
      </div>
    </form>
  `;
}

function clearErrors(form) {
  form.querySelectorAll("[data-field-error]").forEach((node) => {
    node.textContent = "";
  });
  form.querySelectorAll("[aria-invalid='true']").forEach((field) => {
    field.removeAttribute("aria-invalid");
  });
}

function showErrors(form, errors) {
  Object.entries(errors).forEach(([fieldName, message]) => {
    const errorNode = form.querySelector(`[data-field-error="${fieldName}"]`);
    const field = form.elements[fieldName];

    if (errorNode) {
      errorNode.textContent = message;
    }

    if (field) {
      if (field instanceof RadioNodeList) {
        Array.from(field).forEach((input) => input.setAttribute("aria-invalid", "true"));
      } else {
        field.setAttribute("aria-invalid", "true");
      }
    }
  });
}

export function setupSupplierForm({ supplierData }) {
  const form = document.querySelector("[data-supplier-form]");
  if (!form) return;

  const feedback = form.querySelector("#supplier-form-feedback");
  const nameInput = form.elements.name;
  const slugInput = form.elements.slug;
  let slugTouched = Boolean(slugInput.value);

  slugInput.addEventListener("input", () => {
    slugTouched = true;
    slugInput.value = normalizeSlug(slugInput.value);
  });

  nameInput.addEventListener("input", () => {
    if (!slugTouched) {
      slugInput.value = normalizeSlug(nameInput.value);
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearErrors(form);

    const supplier = supplierFromForm(form);
    const errors = validateSupplier(supplier, supplierData.items || [], {
      originalSlug: form.dataset.originalSlug || ""
    });

    if (hasValidationErrors(errors)) {
      feedback.innerHTML = renderValidationSummary(errors);
      showErrors(form, errors);
      feedback.querySelector(".studio-validation-summary")?.focus();
      return;
    }

    feedback.innerHTML = renderNotice({
      title: "Validatie geslaagd",
      message:
        "De leveranciersdata is geldig, maar wordt nog niet opgeslagen. Sprint 2 gebruikt alleen data/suppliers.json als leesbare prototypebron.",
      tone: "success"
    });
  });
}

