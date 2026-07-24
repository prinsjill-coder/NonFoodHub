import { escapeHtml } from "../shared/utils.js";

export function renderDataTable({ label, columns, rows, rowAttributes = () => "" }) {
  const heads = columns.map((column) => `<th scope="col">${escapeHtml(column.label)}</th>`).join("");
  const body = rows
    .map((row) => {
      const cells = columns
        .map((column) => {
          const value = column.render ? column.render(row) : escapeHtml(row[column.key]);
          return `<td>${value}</td>`;
        })
        .join("");
      return `<tr ${rowAttributes(row)}>${cells}</tr>`;
    })
    .join("");

  return `
    <div class="studio-table-wrap">
      <table class="studio-table" aria-label="${escapeHtml(label)}">
        <thead><tr>${heads}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;
}

