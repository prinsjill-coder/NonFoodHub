import { renderButton } from "../../../../components/button.js";
import {
  renderSelectField,
  renderTextAreaField,
  renderTextField
} from "../../../../components/form-field.js";
import { renderNotice } from "../../../../components/notice.js";
import { renderPageHeader } from "../../../../components/page-header.js";
import {
  createEmptyMediaAsset,
  getMediaRightsStatusLabel,
  getMediaStatusLabel,
  getMediaTypeLabel,
  getMediaUsageTypeLabel,
  normalizeMediaId
} from "../../../../shared/media-model.js";
import { hasValidationErrors, mediaAssetFromForm, validateMediaAsset } from "../../../../shared/media-validation.js";
import { escapeHtml } from "../../../../shared/utils.js";
import { clearFieldErrors, renderFormValidationErrors, setupErrorLinkFocus } from "../../shared/form-errors.js";

function optionsFromList(items, labelGetter) {
  return (items || []).map((item) => ({
    value: item.id,
    label: labelGetter(item.id)
  }));
}

function getStatusOptions(mediaData) {
  return (mediaData.statuses || []).map((status) => ({
    value: status,
    label: getMediaStatusLabel(status)
  }));
}

export function renderMediaForm({ mediaData, asset = createEmptyMediaAsset(), mode }) {
  const isEdit = mode === "edit";
  const title = isEdit ? `${asset.title} bewerken` : "Nieuw media-asset";
  const description = isEdit
    ? "Pas de mediagegevens aan in deze Studio-sessie. Dit uploadt, verplaatst of publiceert geen bestanden."
    : "Registreer een bestaand bestand in deze Studio-sessie. Dit uploadt, verplaatst of publiceert geen bestanden.";

  return `
    ${renderPageHeader({
      eyebrow: "Mediaregister",
      title,
      description
    })}

    <div class="studio-actions studio-page-actions">
      ${renderButton({ label: "Terug naar media", href: "#/media", variant: "secondary" })}
      ${isEdit ? renderButton({ label: "Bekijken", href: `#/media/${asset.id}`, variant: "secondary" }) : ""}
    </div>

    ${renderNotice({
      title: "Opslaan in deze sessie",
      message:
        mediaData.storage?.message ||
        "Opslaan past alleen deze Studio-sessie aan. Het beheerbestand en de website veranderen pas na handmatige overdracht.",
      tone: "warning"
    })}

    <form
      class="studio-form"
      data-media-form
      data-original-id="${escapeHtml(isEdit ? asset.id : "")}"
      novalidate
    >
      <div id="media-form-feedback" class="studio-form-feedback"></div>

      <section class="studio-form-section">
        <h2>Basisgegevens</h2>
        <div class="studio-form-grid">
          ${renderTextField({
            name: "title",
            label: "Titel",
            value: asset.title,
            required: true,
            help: "Interne Studio-titel voor het media-asset."
          })}
          ${renderTextField({
            name: "id",
            label: "ID",
            value: asset.id,
            required: true,
            help: "Uniek, lowercase en met koppeltekens. Bijvoorbeeld media-brochures-overview."
          })}
          ${renderTextField({
            name: "file",
            label: "Bestandspad",
            value: asset.file,
            required: true,
            help: "Relatief projectpad, bijvoorbeeld assets/images/brochures.png. Geen lokaal pad of file-url."
          })}
          ${renderSelectField({
            name: "type",
            label: "Type",
            value: asset.type,
            options: optionsFromList(mediaData.types, (type) => getMediaTypeLabel(type, mediaData)),
            required: true
          })}
          ${renderSelectField({
            name: "usageType",
            label: "Gebruik",
            value: asset.usageType,
            options: optionsFromList(mediaData.usageTypes, (usageType) => getMediaUsageTypeLabel(usageType, mediaData)),
            required: true
          })}
          ${renderSelectField({
            name: "status",
            label: "Status",
            value: asset.status,
            options: getStatusOptions(mediaData),
            required: true,
            help: "Contentstatus; dit publiceert niets automatisch naar de publieke website."
          })}
          ${renderSelectField({
            name: "rightsStatus",
            label: "Rechtenstatus",
            value: asset.rightsStatus,
            options: optionsFromList(mediaData.rightsStatuses, (rightsStatus) =>
              getMediaRightsStatusLabel(rightsStatus, mediaData)
            ),
            required: true
          })}
          ${renderTextField({
            name: "sortOrder",
            label: "Sortering",
            type: "number",
            value: String(asset.sortOrder ?? 0),
            required: true,
            help: "Lager getal komt eerder in overzichten."
          })}
        </div>
      </section>

      <section class="studio-form-section">
        <h2>Metadata</h2>
        <div class="studio-form-grid">
          ${renderTextField({
            name: "alt",
            label: "Alt-tekst",
            value: asset.alt,
            help: "Verplicht voor afbeeldingsassets met status Ter controle of Gepubliceerd."
          })}
          ${renderTextField({
            name: "fileSize",
            label: "Bestandsgrootte",
            value: asset.fileSize,
            help: "Vrij tekstveld, bijvoorbeeld 240 KB of Onbekend."
          })}
          ${renderTextField({
            name: "width",
            label: "Breedte",
            type: "number",
            value: asset.width === "" ? "" : String(asset.width),
            help: "Optioneel aantal pixels."
          })}
          ${renderTextField({
            name: "height",
            label: "Hoogte",
            type: "number",
            value: asset.height === "" ? "" : String(asset.height),
            help: "Optioneel aantal pixels."
          })}
        </div>
        ${renderTextAreaField({
          name: "caption",
          label: "Caption",
          value: asset.caption,
          rows: 4,
          help: "Korte beschrijving of interne toelichting bij het asset."
        })}
      </section>

      <p class="studio-form-state" data-form-dirty-notice role="status" aria-live="polite" hidden>
        Niet-opgeslagen formulierwijzigingen. Kies Opslaan in deze sessie om ze toe te passen, of Annuleren om ze te verwerpen.
      </p>

      <div class="studio-form-actions">
        <button class="studio-button studio-button-primary" type="submit">Opslaan in deze sessie</button>
        ${renderButton({
          label: "Annuleren",
          href: "#/media",
          variant: "secondary",
          attributes: { "data-media-form-cancel": true }
        })}
      </div>
    </form>
  `;
}

export function setupMediaForm({ mediaSession, formDirtyGuard }) {
  const form = document.querySelector("[data-media-form]");
  if (!form) return;

  const mediaData = mediaSession.getWorkingData();
  const feedback = form.querySelector("#media-form-feedback");
  const dirtyNotice = form.querySelector("[data-form-dirty-notice]");
  const titleInput = form.elements.title;
  const idInput = form.elements.id;
  let idTouched = Boolean(idInput.value);
  const dirtyRegistration = formDirtyGuard?.registerForm(form, { dirtyNotice });

  setupErrorLinkFocus(feedback, form);

  idInput.addEventListener("input", () => {
    idTouched = true;
    idInput.value = normalizeMediaId(idInput.value);
  });

  titleInput.addEventListener("input", () => {
    if (!idTouched) {
      idInput.value = `media-${normalizeMediaId(titleInput.value)}`.replace(/-+$/g, "");
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearFieldErrors(form);

    const asset = mediaAssetFromForm(form);
    const errors = validateMediaAsset(asset, mediaData.items || [], {
      originalId: form.dataset.originalId || ""
    });

    if (hasValidationErrors(errors)) {
      renderFormValidationErrors(form, feedback, errors, {
        headingId: "media-form-validation-summary-title"
      });
      return;
    }

    mediaSession.applyMediaAsset(asset, form.dataset.originalId || "");
    dirtyRegistration?.markClean();
    feedback.innerHTML = renderNotice({
      title: "Opgeslagen in deze sessie",
      message:
        "Het media-asset is toegepast in deze Studio-sessie. Uploads, bestandsplaatsing en publicatie zijn niet actief.",
      tone: "success"
    });
    window.location.hash = `#/media/${asset.id}`;
  });
}
