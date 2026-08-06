import { confirmStudioAction } from "../../../../components/confirm-dialog.js";
import { renderButton } from "../../../../components/button.js";
import { renderProjectFileChoice } from "../../../../components/project-file-picker.js";
import {
  renderCheckboxField,
  renderCheckboxGroup,
  renderSelectField,
  renderTextAreaField,
  renderTextField
} from "../../../../components/form-field.js";
import { renderNotice } from "../../../../components/notice.js";
import { renderPageHeader } from "../../../../components/page-header.js";
import { markContentUpdated } from "../../../../shared/content-dates.js";
import { canDeleteContentStatus, getSupplierDeleteBlocker } from "../../../../shared/delete-guards.js";
import { getMediaAssets, normalizeMediaId } from "../../../../shared/media-model.js";
import { formatFileSize, projectFileNameFromChoice } from "../../../../shared/project-files.js";
import { createEmptySupplier, normalizeSlug } from "../../../../shared/supplier-model.js";
import { hasValidationErrors, supplierFromForm, validateSupplier } from "../../../../shared/supplier-validation.js";
import { escapeHtml } from "../../../../shared/utils.js";
import { clearFieldErrors, renderFormValidationErrors, setupErrorLinkFocus } from "../../shared/form-errors.js";
import { setupProjectFileChoices } from "../../shared/project-file-choice.js";

function optionList(items, labelMap = {}) {
  return items.map((item) => ({ value: item, label: labelMap[item] || item }));
}

function getTypeOptions(supplierData) {
  return (supplierData.types || []).map((type) => ({ value: type.id, label: type.label }));
}

function getStatusOptions(supplierData) {
  const labels = {
    concept: "Concept",
    ready: "Gereed voor publicatie",
    published: "Gepubliceerd",
    archived: "Gearchiveerd"
  };
  return optionList(supplierData.statuses || [], labels);
}

function renderDeleteFormAction({ supplier, brochureData = {}, articleData = {} }) {
  if (!canDeleteContentStatus(supplier.status)) return "";

  const reason = getSupplierDeleteBlocker({ supplier, brochureData, articleData });
  return `
    ${renderButton({
      label: "Definitief verwijderen",
      variant: "danger",
      disabled: Boolean(reason),
      attributes: { "data-supplier-form-delete": true, "data-disabled-reason": reason }
    })}
    ${reason ? `<p class="studio-meta studio-action-hint">${escapeHtml(reason)}</p>` : ""}
  `;
}

function expectedLogoPath(supplier) {
  const slug = normalizeSlug(supplier.slug || supplier.name || "nieuwe-leverancier");
  return slug ? `assets/images/logos/${slug}.jpg` : "";
}

function expectedHeaderImagePath(supplier) {
  const slug = normalizeSlug(supplier.slug || supplier.name || "nieuwe-leverancier");
  return slug ? `assets/images/suppliers/${slug}.jpg` : "";
}

export function renderSupplierForm({ supplierData, brochureData = {}, articleData = {}, supplier = createEmptySupplier(), mode }) {
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
            help: "Concept is nog in bewerking. Gereed voor publicatie betekent gecontroleerd. Gepubliceerd zie je pas wanneer het item in de publieke websitegegevens staat."
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
        <h2>Bestanden en media</h2>
        <p class="studio-muted">
          Kies alleen een lokaal bestand wanneer je een logo of headerafbeelding wilt toevoegen of vervangen. De browser kopieert niets naar de projectmap.
        </p>
        <div class="studio-form-grid">
          ${renderProjectFileChoice({
            id: "studio-field-logo-choice",
            label: "Logo kiezen",
            accept: "image/jpeg,image/png,image/webp,image/svg+xml,.jpg,.jpeg,.png,.webp,.svg",
            targetField: "logo",
            currentPath: supplier.logo,
            expectedPath: supplier.logo || expectedLogoPath(supplier),
            help:
              "Selecteer het logobestand vanaf je computer als je een nieuw logo wilt koppelen. Laat dit leeg bij een gewone tekstwijziging.",
            attributes: { "data-supplier-file-picker": true, "data-supplier-media-kind": "logo" },
            inputAttributes: { "data-supplier-file-choice": true }
          })}
          ${renderProjectFileChoice({
            id: "studio-field-image-choice",
            label: "Headerafbeelding kiezen",
            accept: "image/jpeg,image/png,image/webp,image/svg+xml,.jpg,.jpeg,.png,.webp,.svg",
            targetField: "image",
            currentPath: supplier.image,
            expectedPath: supplier.image || expectedHeaderImagePath(supplier),
            help:
              "Selecteer de headerafbeelding vanaf je computer als je een nieuw beeld wilt koppelen. Laat dit leeg bij een gewone tekstwijziging.",
            attributes: { "data-supplier-file-picker": true, "data-supplier-media-kind": "image" },
            inputAttributes: { "data-supplier-file-choice": true }
          })}
          ${renderTextField({
            name: "logo",
            label: "Verwacht projectpad logo",
            value: supplier.logo,
            help: "Dit is het projectbestand dat na Website bijwerken moet bestaan. Voorbeeld: assets/images/logos/amefa.svg. Sla hier geen lokaal Windows-pad op."
          })}
          ${renderTextField({
            name: "image",
            label: "Verwacht projectpad headerafbeelding",
            value: supplier.image,
            help: "Dit is het projectbestand dat na Website bijwerken moet bestaan. Voorbeeld: assets/images/suppliers/amefa.jpg. Gebruik geen lokaal computerpad."
          })}
        </div>
        ${renderNotice({
          title: "Lokaal gekozen bestand versus projectbestand",
          message:
            "Stap 1: kies lokaal een bestand. Stap 2: Studio neemt de bestandsnaam over en normaliseert deze. Stap 3: plaats het bestand zelf onder die projectbestandsnaam in de projectmap. Stap 4: bij opslaan maakt Studio de basisregistratie in Media aan als die nog ontbreekt.",
          tone: "info"
        })}
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
        ${isEdit ? renderDeleteFormAction({ supplier, brochureData, articleData }) : ""}
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

export function setupSupplierForm({ supplierSession, brochureSession, mediaSession, articleSession, formDirtyGuard, rerender }) {
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
  setupProjectFileChoices(form, { mediaSession, expectedPathForChoice });

  form.querySelector("[data-supplier-form-delete]")?.addEventListener("click", async (event) => {
    if (event.currentTarget.disabled) return;

    const originalSlug = form.dataset.originalSlug || "";
    const supplier = supplierSession.findBySlug(originalSlug);
    if (!supplier) return;

    const reason = getSupplierDeleteBlocker({
      supplier,
      brochureData: brochureSession?.getWorkingData(),
      articleData: articleSession?.getWorkingData()
    });
    if (reason) {
      feedback.innerHTML = renderNotice({
        title: "Leverancier niet verwijderd",
        message: reason,
        tone: "warning"
      });
      return;
    }

    const confirmed = await confirmStudioAction({
      title: "Leverancier definitief verwijderen?",
      message:
        "Deze leverancier wordt verwijderd uit de bewerkversie. Dit kan alleen voor concepten of gearchiveerde items en verandert de publieke website pas na export en Website bijwerken.",
      confirmLabel: "Definitief verwijderen",
      cancelLabel: "Annuleren",
      tone: "warning"
    });
    if (!confirmed) return;

    await supplierSession.deleteSupplier(originalSlug);
    dirtyRegistration?.markClean();
    window.location.hash = "#/leveranciers";
    rerender?.();
  });

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

    const supplier = markContentUpdated(supplierFromForm(form));
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
    const createdMedia = await registerSupplierMedia({ supplier, mediaSession });
    dirtyRegistration?.markClean();
    feedback.innerHTML = renderNotice({
      title: "Opgeslagen in bewerkversie",
      message: [
        "De leverancier is opgeslagen in de bewerkversie. Gebruik Gegevens exporteren om de wijziging handmatig over te dragen.",
        createdMedia.length
          ? `${createdMedia.length} ontbrekende Media-basisregistratie${createdMedia.length === 1 ? " is" : "s zijn"} aangemaakt in de bewerkversie.`
          : "De gekoppelde bestanden hadden al een Media-basisregistratie of er is nog geen bestand gekoppeld."
      ].join(" "),
      tone: "success"
    });
    window.location.hash = `#/leveranciers/${supplier.slug}`;
  });
}

function expectedPathForChoice(_form, targetField, file) {
  if (targetField === "logo") {
    return `assets/images/logos/${projectFileNameFromChoice(file, ".jpg", "leverancierslogo")}`;
  }

  return `assets/images/suppliers/${projectFileNameFromChoice(file, ".jpg", "leveranciersbeeld")}`;
}

function nextMediaSortOrder(mediaData) {
  return getMediaAssets(mediaData).reduce((highest, asset) => Math.max(highest, Number(asset.sortOrder) || 0), 0) + 10;
}

function localFileSizeForPath(mediaSession, path) {
  const localFile = mediaSession?.findLocalProjectFile?.(path);
  return formatFileSize(localFile?.size);
}

function mediaAssetForSupplierFile({ supplier, path, kind, sortOrder, existingAssets, mediaSession }) {
  const isLogo = kind === "logo";
  const baseId = normalizeMediaId(`media-${supplier.slug}-${isLogo ? "logo" : "headerafbeelding"}`);
  const existingIds = new Set(existingAssets.map((asset) => asset.id));
  let id = baseId;
  let suffix = 2;

  while (existingIds.has(id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return {
    id,
    title: `${supplier.name} ${isLogo ? "logo" : "headerafbeelding"}`,
    file: path,
    type: isLogo ? "logo" : "image",
    alt: "",
    caption: "Automatisch geregistreerd vanuit leveranciersbeheer. Controleer metadata in Media.",
    width: "",
    height: "",
    fileSize: localFileSizeForPath(mediaSession, path),
    usageType: isLogo ? "supplier-logo" : "supplier-image",
    rightsStatus: "needs-review",
    status: "concept",
    sortOrder
  };
}

function mergeGeneratedMediaDefaults(existingAsset, generatedAsset) {
  return {
    ...existingAsset,
    title: existingAsset.title || generatedAsset.title,
    type: existingAsset.type || generatedAsset.type,
    caption: existingAsset.caption || generatedAsset.caption,
    fileSize: existingAsset.fileSize && existingAsset.fileSize !== "Onbekend" ? existingAsset.fileSize : generatedAsset.fileSize,
    usageType: existingAsset.usageType || generatedAsset.usageType
  };
}

async function registerSupplierMedia({ supplier, mediaSession }) {
  if (!mediaSession) return [];

  const specs = [
    { path: supplier.logo, kind: "logo" },
    { path: supplier.image, kind: "image" }
  ].filter((spec) => spec.path);
  const changed = [];

  for (const spec of specs) {
    const mediaData = mediaSession.getWorkingData();
    const existingAssets = getMediaAssets(mediaData);
    const generatedAsset = mediaAssetForSupplierFile({
      supplier,
      path: spec.path,
      kind: spec.kind,
      sortOrder: nextMediaSortOrder(mediaData),
      existingAssets,
      mediaSession
    });
    const existingAsset = existingAssets.find((asset) => asset.file === spec.path);

    if (existingAsset) {
      const updatedAsset = mergeGeneratedMediaDefaults(existingAsset, generatedAsset);
      if (JSON.stringify(updatedAsset) !== JSON.stringify(existingAsset)) {
        await mediaSession.applyMediaAsset(markContentUpdated(updatedAsset), existingAsset.id);
        changed.push(updatedAsset);
      }
      continue;
    }

    const asset = markContentUpdated(generatedAsset);
    await mediaSession.applyMediaAsset(asset, "");
    changed.push(asset);
  }

  return changed;
}
