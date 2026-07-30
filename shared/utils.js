export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

export function renderAttributes(attributes = {}) {
  return Object.entries(attributes)
    .map(([name, value]) => {
      if (value === false || value === null || value === undefined) return "";
      if (value === true) return ` ${name}`;
      return ` ${name}="${escapeHtml(value)}"`;
    })
    .join("");
}

export function formatNullable(value, fallback = "Niet gekoppeld") {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

export async function fetchJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Kon Studio-data niet laden: ${path}`);
  }
  return response.json();
}
