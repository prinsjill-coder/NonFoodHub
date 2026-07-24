export function confirmStudioAction({ title, message }) {
  return window.confirm(`${title}\n\n${message}`);
}

