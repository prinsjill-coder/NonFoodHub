import { renderButton } from "../../../../components/button.js";
import {
  renderCheckboxField,
  renderSelectField,
  renderTextAreaField,
  renderTextField
} from "../../../../components/form-field.js";
import { renderNotice } from "../../../../components/notice.js";
import { renderPageHeader } from "../../../../components/page-header.js";
import {
  createEmptyMediaAsset,
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

function rightsStatusFromCheck(checked) {
  return checked ? "approved" : "needs-review";
}

function isRightsChecked(asset) {
  return asset.rightsStatus === "approved";
}

function renderRightsCheck(asset) {
  const checked = isRightsChecked(asset);

  return `
    ${renderCheckboxField({
      name: "rightsChecked",
      label: "Beeldrechten gecontroleerd",
      checked,
      help:
        "Vink dit aan wanneer de leverancier het beeld of bestand heeft aangeleverd voor gebruik op de website."
    })}
    <input type="hidden" name="rightsStatus" value="${rightsStatusFromCheck(checked)}" data-rights-status-value>
  `;
}

export function renderMediaForm({ mediaData, asset = createEmptyMediaAsset(), mode }) {
  const isEdit = mode === "edit";
  const title = isEdit ? `${asset.title} bewerken` : "Nieuw media-asset";
  const description = isEdit
    ? "Pas de mediagegevens aan in de bewerkversie. Dit uploadt, verplaatst of publiceert geen bestanden."
    : "Registreer een bestaand bestand in de bewerkversie. Dit uploadt, verplaatst of publiceert geen bestanden.";

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
      title: "Opslaan in bewerkversie",
      message:
        mediaData.storage?.message ||
        "Opslaan past alleen de bewerkversie aan. Het beheerbestand en de website veranderen pas na handmatige overdracht.",
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
            label: "Bestand",
            value: asset.file,
            required: true,
            help: "Vul het bestand in vanaf de projectmap. Gebruik bijvoorbeeld: assets/images/brochures.png. Uploaden gebeurt nog niet."
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
            help: "Concept is nog in bewerking. Gereed voor publicatie betekent dat metadata en rechten gecontroleerd zijn voor gebruik op de website."
          })}
          ${renderRightsCheck(asset)}
          ${renderTextField({
            name: "sortOrder",
            label: "Sortering",
            type: "number",
            value: String(asset.sortOrder ?? 0),
            required: true,
            help: "Lager nummer = eerder zichtbaar. Hoogste waarde: geen vaste limiet; gebruik bij voorkeur stappen van 10."
          })}
        </div>
      </section>

      <section class="studio-form-section">
        <h2>Gegevens</h2>
        <div class="studio-form-grid">
          ${renderTextField({
            name: "alt",
            label: "Alt-tekst",
            value: asset.alt,
            help: "Verplicht voor afbeeldingen met status Gereed voor publicatie. Beschrijf kort wat op de afbeelding staat."
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
        Niet-opgeslagen formulierwijzigingen. Kies Opslaan in bewerkversie om ze vast te leggen, of Annuleren om ze te verwerpen.
      </p>

      <div class="studio-form-actions">
        <button class="studio-button studio-button-primary" type="submit">Opslaan in bewerkversie</button>
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
  setupRightsStatusCheck(form);

  idInput.addEventListener("input", () => {
    idTouched = true;
    idInput.value = normalizeMediaId(idInput.value);
  });

  titleInput.addEventListener("input", () => {
    if (!idTouched) {
      idInput.value = `media-${normalizeMediaId(titleInput.value)}`.replace(/-+$/g, "");
    }
  });

  form.addEventListener("submit", async (event) => {
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

    await mediaSession.applyMediaAsset(asset, form.dataset.originalId || "");
    dirtyRegistration?.markClean();
    feedback.innerHTML = renderNotice({
      title: "Opgeslagen in bewerkversie",
      message:
        "Het media-asset is toegepast in de bewerkversie. Uploads, bestandsplaatsing en automatisch Website bijwerken zijn niet actief.",
      tone: "success"
    });
    window.location.hash = `#/media/${asset.id}`;
  });
}

function setupRightsStatusCheck(form) {
  const checkbox = form.elements.rightsChecked;
  const hiddenInput = form.querySelector("[data-rights-status-value]");
  if (!checkbox || !hiddenInput) return;

  const syncRightsStatus = () => {
    hiddenInput.value = rightsStatusFromCheck(checkbox.checked);
  };

  syncRightsStatus();
  checkbox.addEventListener("change", syncRightsStatus);
}
