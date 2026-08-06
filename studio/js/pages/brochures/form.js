import { confirmStudioAction } from "../../../../components/confirm-dialog.js";
import { renderButton } from "../../../../components/button.js";
import { renderProjectFileChoice } from "../../../../components/project-file-picker.js";
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
import { markContentUpdated, updatedAtDateInputValue } from "../../../../shared/content-dates.js";
import { canDeleteContentStatus, getBrochureDeleteBlocker } from "../../../../shared/delete-guards.js";
import { getMediaAssets, normalizeMediaId } from "../../../../shared/media-model.js";
import { formatFileSize, projectFileNameFromChoice } from "../../../../shared/project-files.js";
import { getSuppliers, sortSuppliers } from "../../../../shared/supplier-model.js";
import { escapeHtml } from "../../../../shared/utils.js";
import { clearFieldErrors, renderFormValidationErrors, setupErrorLinkFocus, setupLiveValidation } from "../../shared/form-errors.js";
import { setupProjectFileChoices } from "../../shared/project-file-choice.js";

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

function renderDeleteFormAction({ brochure, articleData = {} }) {
  if (!canDeleteContentStatus(brochure.status)) return "";

  const reason = getBrochureDeleteBlocker({ brochure, articleData });
  return `
    ${renderButton({
      label: "Definitief verwijderen",
      variant: "danger",
      disabled: Boolean(reason),
      attributes: { "data-brochure-form-delete": true, "data-disabled-reason": reason }
    })}
    ${reason ? `<p class="studio-meta studio-action-hint">${escapeHtml(reason)}</p>` : ""}
  `;
}

function renderSupplierCreateAction() {
  return `
    <div class="studio-field-helper-card">
      <p class="studio-muted">
        Staat de leverancier nog niet in de lijst? Voeg deze in een nieuw tabblad toe, zodat de ingevulde brochuregegevens hier blijven staan.
      </p>
      ${renderButton({
        label: "Nieuwe leverancier toevoegen",
        href: "#/leveranciers/nieuw",
        variant: "secondary",
        attributes: {
          target: "_blank",
          rel: "noopener",
          "data-new-supplier-from-brochure": true
        }
      })}
      <p class="studio-meta">
        Beperking: na het toevoegen moet deze pagina opnieuw geladen worden voordat de nieuwe leverancier in de keuzelijst staat.
      </p>
    </div>
  `;
}

function expectedPdfPath(brochure) {
  const slug = normalizeSlug(brochure.slug || brochure.title || "nieuwe-brochure");
  return slug ? `assets/downloads/brochures/${slug}.pdf` : "";
}

function expectedImagePath(brochure) {
  const slug = normalizeSlug(brochure.slug || brochure.title || "nieuwe-brochure");
  return slug ? `assets/images/brochures/${slug}.jpg` : "";
}

export function renderBrochureForm({ brochureData, supplierData, articleData = {}, brochure = createEmptyBrochure(), mode }) {
  const isEdit = mode === "edit";
  const title = isEdit ? `${brochure.title} bewerken` : "Nieuwe brochure";
  const description = isEdit
    ? "Pas de brochure aan in de bewerkversie. De website verandert pas na Gegevens exporteren en Website bijwerken."
    : "Maak een nieuwe brochure klaar in de bewerkversie. De website verandert pas na Gegevens exporteren en Website bijwerken.";

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
      title: "Opslaan in bewerkversie",
      message:
        brochureData.storage?.message ||
        "Opslaan bewaart de wijziging in de bewerkversie. Gebruik daarna Gegevens exporteren.",
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
            help: "Deze tekst komt in de link naar de brochure. Voorbeeld: amefa-for-professionals-2026 wordt #/brochures/amefa-for-professionals-2026."
          })}
          ${renderSelectField({
            name: "supplierId",
            label: "Leverancier",
            value: brochure.supplierId,
            options: getSupplierOptions(supplierData),
            required: true,
            help: "Kies de leverancier waarbij bezoekers deze brochure terugvinden."
          })}
          ${renderSupplierCreateAction()}
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
            help: "Concept is nog in bewerking. Gereed voor publicatie betekent gecontroleerd. Gepubliceerd zie je pas wanneer de brochure in de publieke websitegegevens staat."
          })}
          ${renderTextField({
            name: "sortOrder",
            label: "Sortering",
            type: "number",
            value: String(brochure.sortOrder ?? 0),
            required: true,
            help: "Lager nummer = eerder zichtbaar. Hoogste waarde: geen vaste limiet; gebruik bij voorkeur stappen van 10."
          })}
          ${renderTextField({
            name: "updatedAt",
            label: "Bijgewerkt op",
            type: "date",
            value: updatedAtDateInputValue(brochure.updatedAt),
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
        <p class="studio-muted">
          Kies alleen een lokaal bestand wanneer je een projectbestand wilt toevoegen of vervangen. De browser kopieert niets naar de projectmap.
        </p>
        <div class="studio-form-grid">
          ${renderProjectFileChoice({
            id: "studio-field-pdf-choice",
            label: "PDF kiezen",
            accept: "application/pdf,.pdf",
            targetField: "pdfFile",
            currentPath: brochure.pdfFile,
            expectedPath: brochure.pdfFile || expectedPdfPath(brochure),
            help:
              "Selecteer het PDF-bestand vanaf je computer als je een nieuwe PDF wilt koppelen. Laat dit leeg bij een gewone tekstwijziging.",
            attributes: { "data-brochure-file-picker": true },
            inputAttributes: { "data-brochure-file-choice": true }
          })}
          ${renderProjectFileChoice({
            id: "studio-field-thumbnail-choice",
            label: "Afbeelding kiezen",
            accept: "image/jpeg,image/png,image/webp,image/svg+xml,.jpg,.jpeg,.png,.webp,.svg",
            targetField: "thumbnail",
            currentPath: brochure.thumbnail,
            expectedPath: brochure.thumbnail || expectedImagePath(brochure),
            help:
              "Selecteer de brochureafbeelding vanaf je computer als je een nieuwe afbeelding wilt koppelen. Laat dit leeg bij een gewone tekstwijziging.",
            attributes: { "data-brochure-file-picker": true },
            inputAttributes: { "data-brochure-file-choice": true }
          })}
          ${renderTextField({
            name: "pdfFile",
            label: "Verwachte bestandsnaam van de PDF",
            value: brochure.pdfFile,
            help: "Dit is het projectbestand dat na Website bijwerken moet bestaan. Voorbeeld: assets/downloads/brochures/amefa-2026.pdf. Sla hier geen lokaal Windows-pad op."
          })}
          ${renderTextField({
            name: "pdfSize",
            label: "PDF-grootte",
            value: brochure.pdfSize,
            help: "Optionele tekst voor de beheerder, bijvoorbeeld 12 MB."
          })}
          ${renderTextField({
            name: "thumbnail",
            label: "Verwachte bestandsnaam van de afbeelding",
            value: brochure.thumbnail,
            help: "Dit is het projectbestand dat na Website bijwerken moet bestaan. Voorbeeld: assets/images/brochures/amefa-2026.jpg. Gebruik geen lokaal computerpad."
          })}
        </div>
        ${renderNotice({
          title: "Lokaal gekozen bestand versus projectbestand",
          message:
            "Stap 1: kies lokaal een bestand. Stap 2: Studio neemt de bestandsnaam over en normaliseert deze. Stap 3: plaats het bestand zelf onder die projectbestandsnaam in de projectmap. Stap 4: bij opslaan maakt Studio de basisregistratie in Media aan als die nog ontbreekt.",
          tone: "info"
        })}
      </section>

      ${
        isEdit
          ? renderNotice({
              title: "Bestaande brochure wijzigen",
              message:
                "Je wijzigt deze bestaande brochure. Wil je een nieuwe jaargang maken, gebruik dan Nieuwe jaargang toevoegen op de detailpagina. De oude brochure blijft dan bewaard.",
              tone: "info"
            })
          : ""
      }

      <p class="studio-form-state" data-form-dirty-notice role="status" aria-live="polite" hidden>
        Niet-opgeslagen formulierwijzigingen. Kies Opslaan in bewerkversie om ze vast te leggen, of Annuleren om ze te verwerpen.
      </p>

      <div class="studio-form-actions">
        <button class="studio-button studio-button-primary" type="submit">Opslaan in bewerkversie</button>
        ${isEdit ? renderDeleteFormAction({ brochure, articleData }) : ""}
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

export function setupBrochureForm({ brochureSession, supplierSession, mediaSession, articleSession, formDirtyGuard, rerender }) {
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

  setupProjectFileChoices(form, { mediaSession, expectedPathForChoice });
  const liveValidation = setupLiveValidation(form, () =>
    validateBrochure(brochureFromForm(form), brochureData.items || [], supplierData, brochureData, {
      originalSlug: form.dataset.originalSlug || "",
      originalId: form.dataset.originalId || ""
    })
  );

  form.querySelector("[data-brochure-form-delete]")?.addEventListener("click", async (event) => {
    if (event.currentTarget.disabled) return;

    const originalSlug = form.dataset.originalSlug || "";
    const brochure = brochureSession.findBySlug(originalSlug);
    if (!brochure) return;

    const reason = getBrochureDeleteBlocker({
      brochure,
      articleData: articleSession?.getWorkingData()
    });
    if (reason) {
      feedback.innerHTML = renderNotice({
        title: "Brochure niet verwijderd",
        message: reason,
        tone: "warning"
      });
      return;
    }

    const confirmed = await confirmStudioAction({
      title: "Brochure definitief verwijderen?",
      message:
        "Deze brochure wordt verwijderd uit de bewerkversie. Dit kan alleen voor concepten of gearchiveerde items en verandert de publieke website pas na export en Website bijwerken.",
      confirmLabel: "Definitief verwijderen",
      cancelLabel: "Annuleren",
      tone: "warning"
    });
    if (!confirmed) return;

    await brochureSession.deleteBrochure(originalSlug);
    dirtyRegistration?.markClean();
    window.location.hash = "#/brochures";
    rerender?.();
  });

  slugInput.addEventListener("input", () => {
    slugTouched = true;
    slugInput.value = normalizeSlug(slugInput.value);
    liveValidation.validateFields(["slug"]);
  });

  titleInput.addEventListener("input", () => {
    if (!slugTouched) {
      slugInput.value = normalizeSlug(titleInput.value);
      liveValidation.validateFields(["title", "slug"]);
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearFieldErrors(form);

    const brochure = markContentUpdated(brochureFromForm(form));
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

    await brochureSession.applyBrochure(brochure, form.dataset.originalSlug || "");
    const createdMedia = await registerBrochureMedia({ brochure, mediaSession });
    dirtyRegistration?.markClean();
    feedback.innerHTML = renderNotice({
      title: "Opgeslagen in bewerkversie",
      message: [
        "Opgeslagen in de bewerkversie. De publieke website is nog niet bijgewerkt. Gebruik Gegevens exporteren en daarna Website bijwerken; plaats PDF en afbeelding op de ingevulde bestandslocatie.",
        createdMedia.length
          ? `${createdMedia.length} ontbrekende Media-basisregistratie${createdMedia.length === 1 ? " is" : "s zijn"} aangemaakt in de bewerkversie.`
          : "De gekoppelde bestanden hadden al een Media-basisregistratie of er is nog geen bestand gekoppeld."
      ].join(" "),
      tone: "success"
    });
    window.location.hash = `#/brochures/${brochure.slug}`;
  });
}

function mediaAssetForBrochureFile({ brochure, path, kind, sortOrder, existingAssets }) {
  const isPdf = kind === "pdf";
  const baseId = normalizeMediaId(`media-${brochure.slug}-${isPdf ? "pdf" : "thumbnail"}`);
  const existingIds = new Set(existingAssets.map((asset) => asset.id));
  let id = baseId;
  let suffix = 2;

  while (existingIds.has(id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return {
    id,
    title: `${brochure.title} ${isPdf ? "PDF" : "thumbnail"}`,
    file: path,
    type: isPdf ? "pdf" : "thumbnail",
    alt: "",
    caption: "Automatisch geregistreerd vanuit brochurebeheer. Controleer metadata in Media.",
    width: "",
    height: "",
    fileSize: isPdf ? brochure.pdfSize || "Onbekend" : "",
    usageType: isPdf ? "brochure-pdf" : "brochure-thumbnail",
    rightsStatus: "needs-review",
    status: "concept",
    sortOrder
  };
}

function nextMediaSortOrder(mediaData) {
  return getMediaAssets(mediaData).reduce((highest, asset) => Math.max(highest, Number(asset.sortOrder) || 0), 0) + 10;
}

async function registerBrochureMedia({ brochure, mediaSession }) {
  if (!mediaSession) return [];

  const specs = [
    { path: brochure.pdfFile, kind: "pdf" },
    { path: brochure.thumbnail, kind: "thumbnail" }
  ].filter((spec) => spec.path);
  const created = [];

  for (const spec of specs) {
    const mediaData = mediaSession.getWorkingData();
    const existingAssets = getMediaAssets(mediaData);
    const hasRegistration = existingAssets.some((asset) => asset.file === spec.path);
    if (hasRegistration) continue;

    const asset = markContentUpdated(mediaAssetForBrochureFile({
      brochure,
      path: spec.path,
      kind: spec.kind,
      sortOrder: nextMediaSortOrder(mediaData),
      existingAssets
    }));
    await mediaSession.applyMediaAsset(asset, "");
    created.push(asset);
  }

  return created;
}

function expectedPathForChoice(_form, targetField, file) {
  if (targetField === "pdfFile") {
    return `assets/downloads/brochures/${projectFileNameFromChoice(file, ".pdf", "brochure-bestand")}`;
  }

  return `assets/images/brochures/${projectFileNameFromChoice(file, ".jpg", "brochure-bestand")}`;
}
