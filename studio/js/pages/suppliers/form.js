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
import { createEmptySupplier, normalizeSlug } from "../../../../shared/supplier-model.js";
import { hasValidationErrors, supplierFromForm, validateSupplier } from "../../../../shared/supplier-validation.js";
import { escapeHtml } from "../../../../shared/utils.js";
import { clearFieldErrors, renderFormValidationErrors, setupErrorLinkFocus } from "../../shared/form-errors.js";

function optionList(items, labelMap = {}) {
  return items.map((item) => ({ value: item, label: labelMap[item] || item }));
}

function getTypeOptions(supplierData) {
  return (supplierData.types || []).map((type) => ({ value: type.id, label: type.label }));
}

function getStatusOptions(supplierData) {
  const labels = {
    concept: "Concept",
    review: "Review",
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
    ? "Pas de leverancier aan in de bewerkversie. De website verandert pas na Gegevens exporteren en Website bijwerken."
    : "Maak een nieuwe leverancier klaar in de bewerkversie. De website verandert pas na Gegevens exporteren en Website bijwerken.";

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
      title: "Opslaan in bewerkversie",
      message:
        supplierData.storage?.message ||
        "Opslaan bewaart de wijziging in de bewerkversie. Gebruik daarna Gegevens exporteren.",
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
            label: "URL-naam",
            value: supplier.slug,
            required: true,
            help: "Deze tekst komt in de link naar de leverancier. Voorbeeld: amefa wordt #/leveranciers/amefa. Pas dit alleen aan als de URL moet veranderen."
          })}
          ${renderSelectField({
            name: "type",
            label: "Type",
            value: supplier.type,
            options: getTypeOptions(supplierData),
            required: true,
            help: "Leverancier = merk of producent. Partner = samenwerkingspartij. Servicepartner = dienstverlener rondom assortiment of service."
          })}
          ${renderSelectField({
            name: "status",
            label: "Status",
            value: supplier.status,
            options: getStatusOptions(supplierData),
            required: true,
            help: "Concept is een bewerkversie. Review betekent controleren. Gepubliceerd betekent klaar voor Website bijwerken."
          })}
          ${renderTextField({
            name: "sortOrder",
            label: "Sortering",
            type: "number",
            value: String(supplier.sortOrder ?? 0),
            help: "Lager nummer = eerder zichtbaar. Hoogste waarde: geen vaste limiet; gebruik bij voorkeur stappen van 10."
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
          help: "Kies de productgroepen waarin deze leverancier zichtbaar moet zijn."
        })}
      </section>

      <section class="studio-form-section">
        <h2>Mediareferenties</h2>
        <div class="studio-form-grid">
          ${renderTextField({
            name: "logo",
            label: "Bestand van het logo",
            value: supplier.logo,
            help: "Vul het bestand in vanaf de projectmap. Gebruik bijvoorbeeld: assets/images/logos/amefa.svg."
          })}
          ${renderTextField({
            name: "image",
            label: "Bestand van de headerafbeelding",
            value: supplier.image,
            help: "Vul het beeldbestand in vanaf de projectmap. Gebruik bijvoorbeeld: assets/images/supplier-amefa.jpg. Uploaden gebeurt nog niet."
          })}
        </div>
      </section>

      <section class="studio-form-section">
        <h2>Relaties</h2>
        <div class="studio-grid studio-grid-2">
          <article class="studio-card">
            <h3>Brochures</h3>
            <p class="studio-muted">Gekoppelde brochures worden automatisch zichtbaar wanneer beide kanten publiek beschikbaar zijn.</p>
          </article>
          <article class="studio-card">
            <h3>Kennisbankartikelen</h3>
            <p class="studio-muted">Gekoppelde artikelen helpen bezoekers vanuit inspiratie naar deze leverancier te gaan.</p>
          </article>
        </div>
      </section>

      <p class="studio-form-state" data-form-dirty-notice role="status" aria-live="polite" hidden>
        Niet-opgeslagen formulierwijzigingen. Kies Opslaan in bewerkversie om ze vast te leggen, of Annuleren om ze te verwerpen.
      </p>

      <div class="studio-form-actions">
        <button class="studio-button studio-button-primary" type="submit">Opslaan in bewerkversie</button>
        ${renderButton({
          label: "Annuleren",
          href: "#/leveranciers",
          variant: "secondary",
          attributes: { "data-supplier-form-cancel": true }
        })}
      </div>
    </form>
  `;
}

export function setupSupplierForm({ supplierSession, formDirtyGuard }) {
  const form = document.querySelector("[data-supplier-form]");
  if (!form) return;

  const supplierData = supplierSession.getWorkingData();
  const feedback = form.querySelector("#supplier-form-feedback");
  const dirtyNotice = form.querySelector("[data-form-dirty-notice]");
  const nameInput = form.elements.name;
  const slugInput = form.elements.slug;
  let slugTouched = Boolean(slugInput.value);
  const dirtyRegistration = formDirtyGuard?.registerForm(form, { dirtyNotice });

  setupErrorLinkFocus(feedback, form);

  slugInput.addEventListener("input", () => {
    slugTouched = true;
    slugInput.value = normalizeSlug(slugInput.value);
  });

  nameInput.addEventListener("input", () => {
    if (!slugTouched) {
      slugInput.value = normalizeSlug(nameInput.value);
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearFieldErrors(form);

    const supplier = supplierFromForm(form);
    const errors = validateSupplier(supplier, supplierData.items || [], {
      originalSlug: form.dataset.originalSlug || ""
    });

    if (hasValidationErrors(errors)) {
      renderFormValidationErrors(form, feedback, errors, {
        headingId: "supplier-form-validation-summary-title"
      });
      return;
    }

    await supplierSession.applySupplier(supplier, form.dataset.originalSlug || "");
    dirtyRegistration?.markClean();
    feedback.innerHTML = renderNotice({
      title: "Opgeslagen in bewerkversie",
      message:
        "De leverancier is tijdelijk opgeslagen. Gebruik Gegevens exporteren om de wijziging handmatig over te dragen.",
      tone: "success"
    });
    window.location.hash = `#/leveranciers/${supplier.slug}`;
  });
}
