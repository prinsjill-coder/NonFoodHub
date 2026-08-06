import { confirmStudioAction } from "../../../../components/confirm-dialog.js";
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
import { markContentUpdated, updatedAtDateInputValue } from "../../../../shared/content-dates.js";
import { canDeleteContentStatus, getArticleDeleteBlocker } from "../../../../shared/delete-guards.js";
import { getSuppliers, sortSuppliers } from "../../../../shared/supplier-model.js";
import { articleFromForm, hasValidationErrors, validateArticle } from "../../../../shared/article-validation.js";
import { escapeHtml } from "../../../../shared/utils.js";
import { clearFieldErrors, renderFormValidationErrors, setupErrorLinkFocus, setupLiveValidation } from "../../shared/form-errors.js";

function optionList(items, labelGetter) {
  return (items || []).map((item) => ({
    value: item,
    label: labelGetter(item)
  }));
}

function getStatusOptions(articleData) {
  return optionList(articleData.statuses || [], getArticleStatusLabel);
}

function renderDeleteFormAction({ article, supplierData = {} }) {
  if (!canDeleteContentStatus(article.status)) return "";

  const reason = getArticleDeleteBlocker({ article, supplierData });
  return `
    ${renderButton({
      label: "Definitief verwijderen",
      variant: "danger",
      disabled: Boolean(reason),
      attributes: { "data-article-form-delete": true, "data-disabled-reason": reason }
    })}
    ${reason ? `<p class="studio-meta studio-action-hint">${escapeHtml(reason)}</p>` : ""}
  `;
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
      <legend>${escapeHtml(label)} <span class="studio-optional-label">(optioneel)</span></legend>
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

function renderHeroImageChoice(article) {
  const currentPath = article.heroImage || "";
  const hasCurrentPath = Boolean(currentPath);

  return `
    <div
      class="studio-field studio-file-picker"
      data-article-image-picker
      data-current-path="${escapeHtml(currentPath)}"
    >
      <label for="article-hero-image-choice">Headerafbeelding</label>
      <input id="article-hero-image-choice" type="file" accept="image/*" data-article-image-choice>
      <p class="studio-field-help">
        Kies een afbeelding vanaf je computer. Studio slaat alleen het projectpad op; het bestand wordt niet geupload of verplaatst.
      </p>
      <label class="studio-meta" for="studio-field-heroimage">Gekozen projectpad</label>
      <input
        id="studio-field-heroimage"
        name="heroImage"
        type="text"
        value="${escapeHtml(currentPath)}"
        placeholder="Nog geen headerafbeelding gekozen"
        aria-describedby="studio-field-heroimage-help studio-field-heroimage-error"
        readonly
      >
      <p id="studio-field-heroimage-help" class="studio-field-help">
        Dit pad wordt automatisch ingevuld na het kiezen van een bestand.
      </p>
      <dl class="studio-file-choice-summary" data-file-choice-summary aria-live="polite">
        <div>
          <dt>Gekozen lokaal bestand</dt>
          <dd data-file-choice-name>${escapeHtml(hasCurrentPath ? "Geen nieuw lokaal bestand gekozen" : "Geen lokaal bestand gekozen in dit formulier")}</dd>
        </div>
        <div>
          <dt>Gekoppeld projectbestand</dt>
          <dd class="${hasCurrentPath ? "studio-meta" : "studio-muted"}" data-file-current-path>${escapeHtml(currentPath || "Nog geen headerafbeelding gekoppeld")}</dd>
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
          <dd data-file-choice-state>${escapeHtml(hasCurrentPath ? "Bestaand projectbestand blijft gekoppeld" : "Wachten op keuze")}</dd>
        </div>
        <div>
          <dt>Projectpad</dt>
          <dd data-file-choice-expected>${escapeHtml(currentPath || "Nog niet bekend")}</dd>
        </div>
      </dl>
      <p class="studio-field-help">
        Na het kiezen wordt de bestandsnaam automatisch veilig gemaakt en opgeslagen als assets/images/bestandsnaam.extensie.
        Plaats het bestand daarna zelf onder die naam in de projectmap.
      </p>
      <p id="studio-field-heroimage-error" class="studio-field-error" data-field-error="heroImage" aria-live="polite"></p>
    </div>
  `;
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
            help: "Concept is nog in bewerking. Gereed voor publicatie betekent gecontroleerd. Gepubliceerd zie je pas wanneer het artikel in de publieke websitegegevens staat."
          })}
          ${renderTextField({
            name: "updatedAt",
            label: "Bijgewerkt op",
            type: "date",
            value: updatedAtDateInputValue(article.updatedAt),
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
          ${renderHeroImageChoice(article)}
        </div>
      </section>

      <section class="studio-form-section">
        <h2>Content</h2>
        ${renderTextAreaField({
          name: "summary",
          label: "Samenvatting",
          value: article.summary,
          rows: 4,
          help: "Verplicht voor Gereed voor publicatie. Concepten mogen nog onvolledig zijn."
        })}
        ${renderTextAreaField({
          name: "body",
          label: "Inhoud",
          value: article.body,
          rows: 9,
          help: "Verplicht voor Gereed voor publicatie. Gebruik gewone tekst; uitgebreide tekstopmaak komt later."
        })}
        ${renderCheckboxGroup({
          name: "categories",
          label: "Categorieen",
          values: article.categories,
          options: articleData.categories || [],
          help: "Minimaal een categorie is verplicht voor Gereed voor publicatie."
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
        ${isEdit ? renderDeleteFormAction({ article, supplierData }) : ""}
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

function projectFileNameFromChoice(file) {
  const originalName = String(file?.name || "");
  const extension = fileExtension(originalName, ".jpg").toLowerCase();
  const baseName = originalName.replace(/\.[^.]+$/, "");
  const safeName = normalizeSlug(baseName) || "headerafbeelding";
  return `${safeName}${extension}`;
}

function expectedHeroImagePath(file) {
  return `assets/images/${projectFileNameFromChoice(file)}`;
}

function setSummaryText(picker, selector, value) {
  const element = picker.querySelector(selector);
  if (element) element.textContent = value;
}

function syncHeroImagePath(targetInput, projectPath) {
  if (!targetInput || !projectPath) return;
  targetInput.value = projectPath;
  targetInput.dispatchEvent(new Event("input", { bubbles: true }));
}

function setupHeroImageChoice(form) {
  const picker = form.querySelector("[data-article-image-picker]");
  const input = picker?.querySelector("[data-article-image-choice]");
  const targetInput = form.elements.heroImage;

  input?.addEventListener("change", () => {
    const file = input.files?.[0];

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
      setSummaryText(picker, "[data-file-choice-expected]", currentPath || "Nog niet bekend");
      return;
    }

    const projectPath = expectedHeroImagePath(file);

    setSummaryText(picker, "[data-file-choice-name]", file.name);
    setSummaryText(picker, "[data-file-choice-type]", file.type || fileExtension(file.name, "Onbekend"));
    setSummaryText(picker, "[data-file-choice-size]", formatFileSize(file.size));
    setSummaryText(picker, "[data-file-choice-state]", "Gekozen lokaal bestand gekoppeld; nog niet geplaatst in de projectmap");
    setSummaryText(picker, "[data-file-choice-expected]", projectPath);
    setSummaryText(picker, "[data-file-current-path]", projectPath);
    picker.dataset.currentPath = projectPath;
    syncHeroImagePath(targetInput, projectPath);
  });
}

export function setupArticleForm({ articleSession, supplierSession, brochureSession, mediaSession, formDirtyGuard, rerender }) {
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
  setupHeroImageChoice(form);
  const liveValidation = setupLiveValidation(form, () =>
    validateArticle(articleFromForm(form), articleData.items || [], supplierData, brochureData, articleData, mediaData, {
      originalSlug: form.dataset.originalSlug || "",
      originalId: form.dataset.originalId || ""
    })
  );

  form.querySelector("[data-article-form-delete]")?.addEventListener("click", async (event) => {
    if (event.currentTarget.disabled) return;

    const originalSlug = form.dataset.originalSlug || "";
    const article = articleSession.findBySlug(originalSlug);
    if (!article) return;

    const reason = getArticleDeleteBlocker({
      article,
      supplierData: supplierSession?.getWorkingData()
    });
    if (reason) {
      feedback.innerHTML = renderNotice({
        title: "Artikel niet verwijderd",
        message: reason,
        tone: "warning"
      });
      return;
    }

    const confirmed = await confirmStudioAction({
      title: "Artikel definitief verwijderen?",
      message:
        "Dit artikel wordt verwijderd uit de bewerkversie. Dit kan alleen voor concepten of gearchiveerde items en verandert de publieke website pas na export en Website bijwerken.",
      confirmLabel: "Definitief verwijderen",
      cancelLabel: "Annuleren",
      tone: "warning"
    });
    if (!confirmed) return;

    await articleSession.deleteArticle(originalSlug);
    dirtyRegistration?.markClean();
    window.location.hash = "#/kennisbank";
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

    const article = markContentUpdated(articleFromForm(form));
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

    await articleSession.applyArticle(article, form.dataset.originalSlug || "");
    dirtyRegistration?.markClean();
    feedback.innerHTML = renderNotice({
      title: "Opgeslagen in bewerkversie",
      message:
        "Opgeslagen in de bewerkversie. De publieke website is nog niet bijgewerkt. Gebruik Gegevens exporteren en daarna Website bijwerken.",
      tone: "success"
    });
    window.location.hash = `#/kennisbank/${article.slug}`;
  });
}
