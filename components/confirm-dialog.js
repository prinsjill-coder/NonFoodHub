let activeDialog = null;

function focusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => element.offsetParent !== null || element === document.activeElement);
}

export function confirmStudioAction({
  title,
  message,
  confirmLabel = "Doorgaan",
  cancelLabel = "Annuleren",
  allowEscape = true,
  tone = "warning"
}) {
  if (activeDialog) {
    return activeDialog.promise;
  }

  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const overlay = document.createElement("div");
  const titleId = "studio-confirm-title";
  const descriptionId = "studio-confirm-description";
  overlay.className = "studio-dialog-overlay";
  overlay.innerHTML = `
    <section
      class="studio-dialog is-${tone}"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="${titleId}"
      aria-describedby="${descriptionId}"
    >
      <div>
        <p class="studio-kicker">Bevestiging</p>
        <h2 id="${titleId}"></h2>
        <p id="${descriptionId}" class="studio-muted"></p>
      </div>
      <div class="studio-dialog-actions">
        <button class="studio-button studio-button-secondary" type="button" data-dialog-cancel></button>
        <button class="studio-button studio-button-primary" type="button" data-dialog-confirm></button>
      </div>
    </section>
  `;

  const dialog = overlay.querySelector(".studio-dialog");
  const titleNode = overlay.querySelector(`#${titleId}`);
  const descriptionNode = overlay.querySelector(`#${descriptionId}`);
  const cancelButton = overlay.querySelector("[data-dialog-cancel]");
  const confirmButton = overlay.querySelector("[data-dialog-confirm]");
  titleNode.textContent = title;
  descriptionNode.textContent = message;
  cancelButton.textContent = cancelLabel;
  confirmButton.textContent = confirmLabel;

  const promise = new Promise((resolve) => {
    function close(result) {
      document.removeEventListener("keydown", onKeyDown);
      overlay.remove();
      activeDialog = null;

      if (opener?.isConnected) {
        opener.focus({ preventScroll: true });
      }

      resolve(result);
    }

    function onKeyDown(event) {
      if (event.key === "Escape" && allowEscape) {
        event.preventDefault();
        close(false);
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = focusableElements(dialog);
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    cancelButton.addEventListener("click", () => close(false));
    confirmButton.addEventListener("click", () => close(true));
    document.addEventListener("keydown", onKeyDown);
    document.body.append(overlay);
    cancelButton.focus();
  });

  activeDialog = { promise };
  return promise;
}
