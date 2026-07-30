export class FileTransferError extends Error {
  constructor(code) {
    super(code);
    this.name = "FileTransferError";
    this.code = code;
  }
}

export function validateFileSelection(file, { maxBytes, extension = ".json" } = {}) {
  if (!file) return { ok: false, code: "missing_file" };

  const fileName = String(file.name || "").toLowerCase();
  if (extension && !fileName.endsWith(extension)) {
    return { ok: false, code: "invalid_extension" };
  }

  if (typeof maxBytes === "number" && typeof file.size === "number" && file.size > maxBytes) {
    return { ok: false, code: "file_too_large" };
  }

  return { ok: true };
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("abort", () => reject(new FileTransferError("read_aborted")));
    reader.addEventListener("error", () => reject(new FileTransferError("read_failed")));
    reader.readAsText(file);
  });
}

export async function readJsonFile(file) {
  const text = await readFileAsText(file);

  try {
    return JSON.parse(text);
  } catch {
    throw new FileTransferError("invalid_json");
  }
}

export function downloadTextFile({ fileName, content, type }) {
  let url = "";
  let link = null;

  try {
    const blob = new Blob([content], { type });
    url = URL.createObjectURL(blob);
    link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.append(link);
    link.click();
  } finally {
    link?.remove();
    if (url) {
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    }
  }
}

export function createBusyGuard() {
  let busy = false;

  return {
    isBusy() {
      return busy;
    },
    async run(task) {
      if (busy) return { skipped: true };
      busy = true;

      try {
        const result = await task();
        return { skipped: false, result };
      } finally {
        busy = false;
      }
    }
  };
}
