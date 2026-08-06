import { getFieldId } from "../../../components/form-field.js";
import { renderValidationSummary } from "../../../components/validation-summary.js";

export function clearFieldErrors(form) {
  form.querySelectorAll("[data-field-error]").forEach((node) => {
    node.textContent = "";
  });
  form.querySelectorAll("[aria-invalid='true']").forEach((field) => {
    field.removeAttribute("aria-invalid");
  });
}

export function clearFieldError(form, fieldName) {
  const errorNode = form.querySelector(`[data-field-error="${fieldName}"]`);
  const field = form.elements[fieldName];

  if (errorNode) {
    errorNode.textContent = "";
  }

  if (field) {
    if (typeof RadioNodeList !== "undefined" && field instanceof RadioNodeList) {
      Array.from(field).forEach((input) => input.removeAttribute("aria-invalid"));
    } else {
      field.removeAttribute("aria-invalid");
    }
  }
}

export function getFirstField(form, fieldName) {
  const field = form.elements[fieldName];
  if (!field) return null;
  if (typeof RadioNodeList !== "undefined" && field instanceof RadioNodeList) {
    return Array.from(field)[0] || null;
  }
  return field;
}

export function setFieldError(form, fieldName, message) {
  clearFieldError(form, fieldName);
  if (!message) return;

  const errorNode = form.querySelector(`[data-field-error="${fieldName}"]`);
  const field = form.elements[fieldName];

  if (errorNode) {
    errorNode.textContent = message;
  }

  if (field) {
    if (typeof RadioNodeList !== "undefined" && field instanceof RadioNodeList) {
      Array.from(field).forEach((input) => input.setAttribute("aria-invalid", "true"));
    } else {
      field.setAttribute("aria-invalid", "true");
    }
  }
}

export function setFieldErrors(form, errors) {
  Object.entries(errors).forEach(([fieldName, message]) => {
    setFieldError(form, fieldName, message);
  });
}

export function focusFirstInvalidField(form, errors) {
  const firstFieldName = Object.keys(errors)[0];
  const field = getFirstField(form, firstFieldName);
  if (field && typeof field.focus === "function") {
    field.focus();
  }
}

export function setupErrorLinkFocus(feedback, form) {
  feedback.addEventListener("click", (event) => {
    const link = event.target.closest("[data-error-link]");
    if (!link) return;

    const field = getFirstField(form, link.dataset.errorLink);
    if (!field) return;

    event.preventDefault();
    field.focus();
  });
}

export function renderFormValidationErrors(form, feedback, errors, options = {}) {
  feedback.innerHTML = renderValidationSummary(errors, {
    fieldIdForName: options.fieldIdForName || getFieldId,
    headingId: options.headingId,
    title: options.title
  });
  setFieldErrors(form, errors);
  focusFirstInvalidField(form, errors);
}

function normalizeValidationErrors(result) {
  return result?.errors || result || {};
}

export function setupLiveValidation(form, getValidationResult) {
  const touchedFields = new Set();

  function applyValidation(fieldNames) {
    const errors = normalizeValidationErrors(getValidationResult());
    fieldNames.forEach((fieldName) => {
      setFieldError(form, fieldName, errors[fieldName] || "");
    });
  }

  function handleFieldEvent(event) {
    const fieldName = event.target?.name;
    if (!fieldName) return;
    touchedFields.add(fieldName);
    applyValidation([fieldName]);
  }

  form.addEventListener("input", handleFieldEvent);
  form.addEventListener("change", handleFieldEvent);
  form.addEventListener("blur", handleFieldEvent, true);

  return {
    validateTouched() {
      applyValidation([...touchedFields]);
    },
    validateFields(fieldNames) {
      fieldNames.forEach((fieldName) => touchedFields.add(fieldName));
      applyValidation(fieldNames);
    },
    clear() {
      clearFieldErrors(form);
    }
  };
}
