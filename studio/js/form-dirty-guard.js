import { confirmStudioAction } from "../../components/confirm-dialog.js";

function formSignature(form) {
  return JSON.stringify(Array.from(new FormData(form).entries()));
}

export function createFormDirtyGuard() {
  let activeForm = null;
  let confirmation = null;
  let allowNextRouteChange = false;
  let ignoreNextHashChange = false;
  let lastStableHash = window.location.hash || "#/dashboard";

  function updateDirtyState() {
    if (!activeForm) return false;
    const dirty = formSignature(activeForm.form) !== activeForm.cleanSignature;
    if (activeForm.dirtyNotice) {
      activeForm.dirtyNotice.hidden = !dirty;
    }
    activeForm.form.dataset.formDirty = dirty ? "true" : "false";
    return dirty;
  }

  function registerForm(form, options = {}) {
    activeForm = {
      form,
      cleanSignature: formSignature(form),
      dirtyNotice: options.dirtyNotice || null
    };

    function handleChange() {
      updateDirtyState();
    }

    form.addEventListener("input", handleChange);
    form.addEventListener("change", handleChange);
    updateDirtyState();

    return {
      markClean() {
        if (!activeForm || activeForm.form !== form) return;
        activeForm.cleanSignature = formSignature(form);
        updateDirtyState();
      },
      unregister() {
        form.removeEventListener("input", handleChange);
        form.removeEventListener("change", handleChange);
        if (activeForm?.form === form) {
          activeForm = null;
        }
      }
    };
  }

  function clearActiveForm() {
    activeForm = null;
  }

  function isDirty() {
    return updateDirtyState();
  }

  function markClean() {
    if (!activeForm) return;
    activeForm.cleanSignature = formSignature(activeForm.form);
    updateDirtyState();
  }

  async function confirmDiscard(options = {}) {
    if (!isDirty()) return true;

    if (!confirmation) {
      confirmation = confirmStudioAction({
        title: options.title || "Niet-toegepaste formulierwijzigingen verwerpen?",
        message:
          options.message ||
          "Er staan wijzigingen in het geopende formulier die nog niet zijn opgeslagen in de bewerkversie. Als je doorgaat, worden alleen deze formulierwijzigingen verworpen.",
        confirmLabel: options.confirmLabel || "Wijzigingen verwerpen",
        cancelLabel: options.cancelLabel || "Blijven bewerken",
        allowEscape: true,
        tone: "warning"
      }).finally(() => {
        confirmation = null;
      });
    }

    return confirmation;
  }

  function allowNextHashNavigation() {
    allowNextRouteChange = true;
  }

  function consumeAllowedHashNavigation() {
    const allowed = allowNextRouteChange;
    allowNextRouteChange = false;
    return allowed;
  }

  function ignoreNextHashNavigation() {
    ignoreNextHashChange = true;
  }

  function consumeIgnoredHashNavigation() {
    const ignored = ignoreNextHashChange;
    ignoreNextHashChange = false;
    return ignored;
  }

  function setLastStableHash(hash) {
    lastStableHash = hash || "#/dashboard";
  }

  function getLastStableHash() {
    return lastStableHash;
  }

  return {
    registerForm,
    clearActiveForm,
    isDirty,
    markClean,
    confirmDiscard,
    allowNextHashNavigation,
    consumeAllowedHashNavigation,
    ignoreNextHashNavigation,
    consumeIgnoredHashNavigation,
    setLastStableHash,
    getLastStableHash
  };
}
