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
import { getMediaAssets, normalizeMediaId } from "../../../../shared/media-model.js";
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

function renderFileChoice({ id, label, accept, targetField, currentPath, expectedPath, help }) {
  const hasCurrentPath = Boolean(currentPath);
  const choiceText = hasCurrentPath ? "Geen nieuw lokaal bestand gekozen" : "Geen lokaal bestand gekozen in dit formulier";
  const stateText = hasCurrentPath ? "Bestaand projectbestand blijft gekoppeld" : "Wachten op keuze";

  return `
    <div
      class="studio-field studio-file-picker"
      data-brochure-file-picker
      data-target-field="${escapeHtml(targetField)}"
      data-current-path="${escapeHtml(currentPath)}"
      data-expected-path="${escapeHtml(expectedPath)}"
    >
      <label for="${escapeHtml(id)}">${escapeHtml(label)}</label>
      <input id="${escapeHtml(id)}" type="file" accept="${escapeHtml(accept)}" data-brochure-file-choice>
      <p class="studio-field-help">${escapeHtml(help)}</p>
      <dl class="studio-file-choice-summary" data-file-choice-summary aria-live="polite">
        <div>
          <dt>Gekozen lokaal bestand</dt>
          <dd data-file-choice-name>${escapeHtml(choiceText)}</dd>
        </div>
        <div>
          <dt>Gekoppeld projectbestand</dt>
          <dd class="${hasCurrentPath ? "studio-meta" : "studio-muted"}" data-file-current-path>${escapeHtml(currentPath || "Nog geen projectbestand gekoppeld")}</dd>
        </div>
        <div>
          <dt>Bestandstype</dt>
          <dd data-file-choice-type>Niet gekozen</dd>
        </div>
        <div>
          <dt>Bestandsgrootte</dt>
          <dd data-file-choice-size>Niet gekozen</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd data-file-choice-state>${escapeHtml(stateText)}</dd>
        </div>
        <div>
          <dt>Verwachte projectbestandsnaam</dt>
          <dd data-file-choice-expected>${escapeHtml(expectedPath || currentPath || "Nog niet bekend")}</dd>
        </div>
      </dl>
      <p class="studio-field-help">
        ${hasCurrentPath
          ? "Laat dit leeg als je het bestaande projectbestand wilt behouden. Kies alleen een nieuw lokaal bestand als je de koppeling wilt vervangen."
          : "Studio neemt de gekozen bestandsnaam over en normaliseert deze naar een veilige projectbestandsnaam. Plaats het bestand daarna zelf onder die naam in de projectmap."}
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

export function renderBrochureForm({ brochureData, supplierData, brochure = createEmptyBrochure(), mode }) {
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
            help: "Concept is nog in bewerking. Review betekent controleren. Gepubliceerd betekent klaarzetten voor Website bijwerken."
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
        <p class="studio-muted">
          Kies alleen een lokaal bestand wanneer je een projectbestand wilt toevoegen of vervangen. De browser kopieert niets naar de projectmap.
        </p>
        <div class="studio-form-grid">
          ${renderFileChoice({
            id: "studio-field-pdf-choice",
            label: "PDF kiezen",
            accept: "application/pdf,.pdf",
            targetField: "pdfFile",
            currentPath: brochure.pdfFile,
            expectedPath: brochure.pdfFile || expectedPdfPath(brochure),
            help:
              "Selecteer het PDF-bestand vanaf je computer als je een nieuwe PDF wilt koppelen. Laat dit leeg bij een gewone tekstwijziging."
          })}
          ${renderFileChoice({
            id: "studio-field-thumbnail-choice",
            label: "Afbeelding kiezen",
            accept: "image/jpeg,image/png,image/webp,image/svg+xml,.jpg,.jpeg,.png,.webp,.svg",
            targetField: "thumbnail",
            currentPath: brochure.thumbnail,
            expectedPath: brochure.thumbnail || expectedImagePath(brochure),
            help:
              "Selecteer de brochureafbeelding vanaf je computer als je een nieuwe afbeelding wilt koppelen. Laat dit leeg bij een gewone tekstwijziging."
          })}
          ${renderTextField({
            name: "pdfFile",
            label: "Verwachte bestandsnaam van de PDF",
            value: brochure.pdfFile,
            help: "Dit is het projectbestand dat na de lokale publicatiestap moet bestaan. Voorbeeld: assets/downloads/brochures/amefa-2026.pdf. Sla hier geen lokaal Windows-pad op."
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
            help: "Dit is het projectbestand dat na de lokale publicatiestap moet bestaan. Voorbeeld: assets/images/brochures/amefa-2026.jpg. Gebruik geen lokaal computerpad."
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

export function setupBrochureForm({ brochureSession, supplierSession, mediaSession, formDirtyGuard }) {
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

  setupBrochureFileChoices(form, { mediaSession });

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
    const createdMedia = registerBrochureMedia({ brochure, mediaSession });
    dirtyRegistration?.markClean();
    feedback.innerHTML = renderNotice({
      title: "Opgeslagen in bewerkversie",
      message: [
        "De brochure is opgeslagen in de bewerkversie. Gebruik Gegevens exporteren; plaats PDF en afbeelding op de ingevulde bestandslocatie.",
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

function registerBrochureMedia({ brochure, mediaSession }) {
  if (!mediaSession) return [];

  const specs = [
    { path: brochure.pdfFile, kind: "pdf" },
    { path: brochure.thumbnail, kind: "thumbnail" }
  ].filter((spec) => spec.path);
  const created = [];

  specs.forEach((spec) => {
    const mediaData = mediaSession.getWorkingData();
    const existingAssets = getMediaAssets(mediaData);
    const hasRegistration = existingAssets.some((asset) => asset.file === spec.path);
    if (hasRegistration) return;

    const asset = mediaAssetForBrochureFile({
      brochure,
      path: spec.path,
      kind: spec.kind,
      sortOrder: nextMediaSortOrder(mediaData),
      existingAssets
    });
    mediaSession.applyMediaAsset(asset, "");
    created.push(asset);
  });

  return created;
}

function formatFileSize(size) {
  if (!Number.isFinite(size) || size <= 0) return "Onbekend";
  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function fileExtension(name, fallback) {
  const match = String(name || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? `.${match[1]}` : fallback;
}

function projectFileNameFromChoice(file, fallbackExtension) {
  const originalName = String(file?.name || "");
  const extension = fileExtension(originalName, fallbackExtension).toLowerCase();
  const baseName = originalName.replace(/\.[^.]+$/, "");
  const safeName = normalizeSlug(baseName) || "brochure-bestand";
  return `${safeName}${extension}`;
}

function expectedPathForChoice(_form, targetField, file) {
  if (targetField === "pdfFile") {
    return `assets/downloads/brochures/${projectFileNameFromChoice(file, ".pdf")}`;
  }

  return `assets/images/brochures/${projectFileNameFromChoice(file, ".jpg")}`;
}

function setSummaryText(picker, selector, value) {
  const element = picker.querySelector(selector);
  if (element) element.textContent = value;
}

function syncGeneratedPath(targetInput, expectedPath) {
  if (!targetInput || !expectedPath) return;
  targetInput.value = expectedPath;
  targetInput.dataset.generatedAssetPath = expectedPath;
  targetInput.dispatchEvent(new Event("input", { bubbles: true }));
}

function setupBrochureFileChoices(form, { mediaSession } = {}) {
  form.querySelectorAll("[data-brochure-file-picker]").forEach((picker) => {
    const input = picker.querySelector("[data-brochure-file-choice]");
    const targetField = picker.dataset.targetField || "";
    const targetInput = form.elements[targetField];

    input?.addEventListener("change", () => {
      const file = input.files?.[0];
      const expectedPath = file ? expectedPathForChoice(form, targetField, file) : picker.dataset.expectedPath || "";

      if (!file) {
        const currentPath = picker.dataset.currentPath || "";
        setSummaryText(
          picker,
          "[data-file-choice-name]",
          currentPath ? "Geen nieuw lokaal bestand gekozen" : "Geen lokaal bestand gekozen in dit formulier"
        );
        setSummaryText(picker, "[data-file-choice-type]", "Niet gekozen");
        setSummaryText(picker, "[data-file-choice-size]", "Niet gekozen");
        setSummaryText(
          picker,
          "[data-file-choice-state]",
          currentPath ? "Bestaand projectbestand blijft gekoppeld" : "Wachten op keuze"
        );
        setSummaryText(picker, "[data-file-choice-expected]", expectedPath || targetInput?.value || "Nog niet bekend");
        return;
      }

      setSummaryText(picker, "[data-file-choice-name]", file.name);
      setSummaryText(picker, "[data-file-choice-type]", file.type || fileExtension(file.name, "Onbekend"));
      setSummaryText(picker, "[data-file-choice-size]", formatFileSize(file.size));
      setSummaryText(picker, "[data-file-choice-state]", "Gekozen lokaal bestand gecontroleerd; nog niet geplaatst in de projectmap");
      setSummaryText(picker, "[data-file-choice-expected]", expectedPath);
      setSummaryText(picker, "[data-file-current-path]", expectedPath);
      picker.dataset.currentPath = expectedPath;
      syncGeneratedPath(targetInput, expectedPath);
      mediaSession?.registerLocalProjectFile(expectedPath, file);
    });
  });
}
