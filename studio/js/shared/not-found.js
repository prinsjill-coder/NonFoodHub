import { renderButton } from "../../../components/button.js";
import { renderEmptyState } from "../../../components/empty-state.js";

export function renderNotFoundState({
  title,
  message,
  label = "Niet gevonden",
  backHref,
  backLabel,
  variant = "primary"
}) {
  return renderEmptyState({
    title,
    message,
    label,
    actions: backHref && backLabel ? renderButton({ label: backLabel, href: backHref, variant }) : ""
  });
}
