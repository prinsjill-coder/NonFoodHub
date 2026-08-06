import { fileExtension, formatFileSize } from "../../../shared/project-files.js";

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

export function setupProjectFileChoices(form, { mediaSession, expectedPathForChoice } = {}) {
  form.querySelectorAll("[data-project-file-picker]").forEach((picker) => {
    const input = picker.querySelector("[data-project-file-choice]");
    const targetField = picker.dataset.targetField || "";
    const targetInput = form.elements[targetField];

    input?.addEventListener("change", () => {
      const file = input.files?.[0];
      const expectedPath = file
        ? expectedPathForChoice?.(form, targetField, file, picker) || picker.dataset.expectedPath || ""
        : picker.dataset.expectedPath || "";

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

