import { confirmStudioAction } from "../../../components/confirm-dialog.js";
import { renderButton } from "../../../components/button.js";
import { CONTENT_STATUS_LABELS } from "../../../shared/content-status.js";
import { markContentUpdated } from "../../../shared/content-dates.js";
import { escapeHtml } from "../../../shared/utils.js";

const BULK_SELECTION_RESTORE = new Map();
const BULK_NOTICES = new Map();

const BULK_STATUS_ACTIONS = [
  { status: "concept", label: "Naar Concept" },
  { status: "ready", label: "Gereed voor publicatie" },
  { status: "archived", label: "Archiveren" }
];

function itemIdFromElement(element) {
  return String(element?.dataset?.listId || "").trim();
}

function uniqueValues(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function restoreSelection(scope) {
  const selection = BULK_SELECTION_RESTORE.get(scope) || [];
  BULK_SELECTION_RESTORE.delete(scope);
  return new Set(selection);
}

function setSelectionRestore(scope, ids) {
  BULK_SELECTION_RESTORE.set(scope, uniqueValues(ids));
}

function setBulkNotice(scope, notice) {
  BULK_NOTICES.set(scope, notice);
}

function consumeBulkNotice(scope) {
  const notice = BULK_NOTICES.get(scope);
  BULK_NOTICES.delete(scope);
  return notice || null;
}

function statusActionLabel(status) {
  if (status === "concept") return "op Concept gezet";
  if (status === "ready") return "gereed voor publicatie gezet";
  if (status === "archived") return "gearchiveerd";
  return `bijgewerkt naar ${CONTENT_STATUS_LABELS[status] || status}`;
}

function statusConfirmTitle(status, count, pluralLabel) {
  if (status === "archived") return `${count} ${pluralLabel} archiveren?`;
  return `${count} ${pluralLabel} wijzigen naar ${CONTENT_STATUS_LABELS[status] || status}?`;
}

function skippedSummary(skipped, pluralLabel) {
  if (!skipped.length) return "";

  const reasonCounts = new Map();
  skipped.forEach((entry) => {
    const reason = entry.reason || "Controleer dit item handmatig.";
    reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
  });

  const reasons = [...reasonCounts.entries()]
    .map(([reason, count]) => `${count}x ${reason}`)
    .join(" ");
  return `${skipped.length} ${pluralLabel} overgeslagen: ${reasons}`;
}

function operationSummary({ changedCount, skipped, pluralLabel, actionLabel }) {
  const parts = [];
  if (changedCount) {
    parts.push(`${changedCount} ${pluralLabel} ${actionLabel}.`);
  }
  const skippedText = skippedSummary(skipped, pluralLabel);
  if (skippedText) parts.push(skippedText);
  return parts.join(" ") || `Geen ${pluralLabel} aangepast.`;
}

function currentSelectedItems({ selectedIds, findItem, getItemLabel }) {
  return [...selectedIds].map((id) => {
    const item = findItem(id);
    return {
      id,
      item,
      label: item ? getItemLabel(item) : id
    };
  });
}

function renderStatusActions(scope) {
  return BULK_STATUS_ACTIONS.map((action) =>
    renderButton({
      label: action.label,
      variant: action.status === "archived" ? "danger" : "secondary",
      attributes: {
        "data-bulk-status": action.status,
        "data-bulk-scope": scope
      }
    })
  ).join("");
}

export function renderBulkSelectControl({ scope, itemId, label }) {
  return `
    <label class="studio-bulk-select">
      <input
        type="checkbox"
        value="${escapeHtml(itemId)}"
        data-bulk-select
        data-bulk-scope="${escapeHtml(scope)}"
        aria-label="${escapeHtml(`Selecteer ${label}`)}"
      >
      <span>Selecteer</span>
    </label>
  `;
}

export function renderBulkActionControls({ scope, moduleLabelPlural, allowDelete = true }) {
  return `
    <section class="studio-bulk-select-bar" aria-label="${escapeHtml(`${moduleLabelPlural} selecteren`)}">
      ${renderButton({
        label: "Selecteer zichtbare items",
        variant: "secondary",
        attributes: {
          "data-bulk-select-visible": true,
          "data-bulk-scope": scope
        }
      })}
      ${renderButton({
        label: "Deselecteer alles",
        variant: "outline",
        attributes: {
          "data-bulk-clear": true,
          "data-bulk-scope": scope
        }
      })}
    </section>

    <section class="studio-bulk-result" data-bulk-result data-bulk-scope="${escapeHtml(scope)}" hidden aria-live="polite">
      <p data-bulk-result-message></p>
    </section>

    <section class="studio-bulk-toolbar" data-bulk-toolbar data-bulk-scope="${escapeHtml(scope)}" hidden aria-live="polite">
      <div>
        <strong><span data-bulk-count>0</span> geselecteerd</strong>
        <p data-bulk-message class="studio-muted"></p>
      </div>
      <div class="studio-actions">
        ${renderStatusActions(scope)}
        ${allowDelete ? renderButton({
          label: "Definitief verwijderen",
          variant: "danger",
          attributes: {
            "data-bulk-delete": true,
            "data-bulk-scope": scope
          }
        }) : ""}
        ${renderButton({
          label: "Selectie wissen",
          variant: "outline",
          attributes: {
            "data-bulk-clear": true,
            "data-bulk-scope": scope
          }
        })}
      </div>
    </section>
  `;
}

export function firstValidationMessage(result) {
  if (!result) return "";
  const source = result.errors || result;
  return Object.values(source).flat().find(Boolean) || "";
}

export function setupBulkActions({
  scope,
  itemSelector,
  moduleLabelSingular,
  moduleLabelPlural,
  findItem,
  getItemLabel,
  applyItem,
  validateStatusChange = () => "",
  deleteItem = null,
  getDeleteBlocker = () => "",
  persistChanges = null,
  rerender
}) {
  const toolbar = document.querySelector(`[data-bulk-toolbar][data-bulk-scope="${scope}"]`);
  const result = document.querySelector(`[data-bulk-result][data-bulk-scope="${scope}"]`);
  const resultMessage = result?.querySelector("[data-bulk-result-message]");
  const countNode = toolbar?.querySelector("[data-bulk-count]");
  const messageNode = toolbar?.querySelector("[data-bulk-message]");
  const selectedIds = restoreSelection(scope);

  function selectionControls() {
    return Array.from(document.querySelectorAll(`[data-bulk-select][data-bulk-scope="${scope}"]`));
  }

  function itemElements() {
    return Array.from(document.querySelectorAll(itemSelector));
  }

  function syncSelectionControls() {
    selectionControls().forEach((control) => {
      control.checked = selectedIds.has(control.value);
    });
  }

  function updateResult(notice = null) {
    if (!result || !resultMessage) return;
    if (!notice) return;
    resultMessage.textContent = notice;
    result.hidden = false;
  }

  function updateToolbar(notice = null) {
    syncSelectionControls();
    if (!toolbar) return;

    toolbar.hidden = selectedIds.size === 0;
    if (countNode) {
      countNode.textContent = String(selectedIds.size);
    }
    if (messageNode && notice) {
      messageNode.textContent = notice;
    } else if (messageNode && selectedIds.size === 0) {
      messageNode.textContent = "";
    }
    updateResult(notice);
  }

  function clearSelection() {
    selectedIds.clear();
    updateToolbar();
  }

  function selectedEntries() {
    return currentSelectedItems({ selectedIds, findItem, getItemLabel });
  }

  async function runStatusChange(status) {
    const entries = selectedEntries();
    if (!entries.length) return;

    const confirmed = await confirmStudioAction({
      title: statusConfirmTitle(status, entries.length, moduleLabelPlural),
      message:
        status === "archived"
          ? `Je archiveert ${entries.length} ${moduleLabelPlural}. Dit past alleen de bewerkversie aan.`
          : `Je wijzigt ${entries.length} ${moduleLabelPlural} naar ${CONTENT_STATUS_LABELS[status] || status}. Dit past alleen de bewerkversie aan.`,
      confirmLabel: status === "archived" ? "Archiveren" : "Status wijzigen",
      cancelLabel: "Annuleren",
      tone: status === "archived" ? "warning" : "info"
    });
    if (!confirmed) return;

    const skipped = [];
    let changedCount = 0;

    for (const entry of entries) {
      if (!entry.item) {
        skipped.push({ ...entry, reason: `${moduleLabelSingular} bestaat niet meer.` });
        continue;
      }

      const nextItem = markContentUpdated({ ...entry.item, status });
      const validationMessage = validateStatusChange(nextItem, entry.item);
      if (validationMessage) {
        skipped.push({ ...entry, reason: validationMessage });
        continue;
      }

      await applyItem(nextItem, entry.item);
      selectedIds.delete(entry.id);
      changedCount += 1;
    }

    if (changedCount && persistChanges) {
      await persistChanges();
    }

    const notice = operationSummary({
      changedCount,
      skipped,
      pluralLabel: moduleLabelPlural,
      actionLabel: statusActionLabel(status)
    });
    const remainingSelection = skipped.map((entry) => entry.id);
    setSelectionRestore(scope, remainingSelection);
    setBulkNotice(scope, notice);
    rerender?.();
  }

  async function runDelete() {
    if (!deleteItem) return;
    const entries = selectedEntries();
    if (!entries.length) return;

    const confirmed = await confirmStudioAction({
      title: `${entries.length} ${moduleLabelPlural} definitief verwijderen?`,
      message:
        `Toegestane ${moduleLabelPlural} worden uit de bewerkversie verwijderd. Items die niet veilig verwijderd kunnen worden blijven geselecteerd.`,
      confirmLabel: "Definitief verwijderen",
      cancelLabel: "Annuleren",
      tone: "warning"
    });
    if (!confirmed) return;

    const skipped = [];
    let changedCount = 0;

    for (const entry of entries) {
      if (!entry.item) {
        skipped.push({ ...entry, reason: `${moduleLabelSingular} bestaat niet meer.` });
        continue;
      }

      const blocker = getDeleteBlocker(entry.item);
      if (blocker) {
        skipped.push({ ...entry, reason: blocker });
        continue;
      }

      await deleteItem(entry.item);
      selectedIds.delete(entry.id);
      changedCount += 1;
    }

    if (changedCount && persistChanges) {
      await persistChanges();
    }

    const notice = operationSummary({
      changedCount,
      skipped,
      pluralLabel: moduleLabelPlural,
      actionLabel: "definitief verwijderd"
    });
    const remainingSelection = skipped.map((entry) => entry.id);
    setSelectionRestore(scope, remainingSelection);
    setBulkNotice(scope, notice);
    rerender?.();
  }

  selectionControls().forEach((control) => {
    control.addEventListener("change", () => {
      if (control.checked) {
        selectedIds.add(control.value);
      } else {
        selectedIds.delete(control.value);
      }
      updateToolbar();
    });
  });

  document.querySelectorAll(`[data-bulk-select-visible][data-bulk-scope="${scope}"]`).forEach((button) => {
    button.addEventListener("click", () => {
      itemElements().forEach((element) => {
        if (element.hidden) return;
        const id = itemIdFromElement(element);
        if (id) selectedIds.add(id);
      });
      updateToolbar();
    });
  });

  document.querySelectorAll(`[data-bulk-clear][data-bulk-scope="${scope}"]`).forEach((button) => {
    button.addEventListener("click", clearSelection);
  });

  document.querySelectorAll(`[data-bulk-status][data-bulk-scope="${scope}"]`).forEach((button) => {
    button.addEventListener("click", () => runStatusChange(button.dataset.bulkStatus));
  });

  document.querySelector(`[data-bulk-delete][data-bulk-scope="${scope}"]`)?.addEventListener("click", runDelete);

  updateToolbar(consumeBulkNotice(scope));
}
