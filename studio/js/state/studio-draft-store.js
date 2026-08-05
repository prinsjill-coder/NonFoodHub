const DATABASE_NAME = "nonfoodhub-studio";
const DATABASE_VERSION = 1;
const STORE_NAME = "studio-drafts";
const CURRENT_DRAFT_KEY = "current";

export const STUDIO_DRAFT_MODULES = ["suppliers", "brochures", "media", "articles", "library"];

function hasIndexedDb() {
  return Boolean(globalThis.indexedDB);
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error || new Error("IndexedDB request failed")));
  });
}

function openDatabase() {
  if (!hasIndexedDb()) {
    return Promise.reject(new Error("IndexedDB is niet beschikbaar in deze browser."));
  }

  return new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.addEventListener("upgradeneeded", () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    });

    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error || new Error("IndexedDB openen mislukt.")));
  });
}

async function withStore(mode, callback) {
  const database = await openDatabase();

  try {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const transactionDone = new Promise((resolve, reject) => {
      transaction.addEventListener("complete", resolve);
      transaction.addEventListener("abort", () => reject(transaction.error || new Error("IndexedDB transactie afgebroken.")));
      transaction.addEventListener("error", () => reject(transaction.error || new Error("IndexedDB transactie mislukt.")));
    });
    const result = await callback(store);
    await transactionDone;
    return result;
  } finally {
    database.close();
  }
}

function isObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isValidModuleDraft(moduleDraft) {
  return isObject(moduleDraft) && isObject(moduleDraft.sourceData) && isObject(moduleDraft.workingData);
}

export function isValidStudioDraft(draft) {
  return (
    isObject(draft) &&
    draft.version === 1 &&
    isObject(draft.modules) &&
    STUDIO_DRAFT_MODULES.every((moduleKey) => isValidModuleDraft(draft.modules[moduleKey]))
  );
}

export async function loadStudioDraft() {
  if (!hasIndexedDb()) return null;

  try {
    const draft = await withStore("readonly", (store) => requestToPromise(store.get(CURRENT_DRAFT_KEY)));
    return isValidStudioDraft(draft) ? draft : null;
  } catch {
    return null;
  }
}

export async function saveStudioDraft(draft) {
  if (!isValidStudioDraft(draft)) {
    throw new Error("De bewerkversie heeft niet het verwachte formaat.");
  }

  await withStore("readwrite", (store) => requestToPromise(store.put(draft, CURRENT_DRAFT_KEY)));
}

export async function clearStudioDraft() {
  if (!hasIndexedDb()) return;
  await withStore("readwrite", (store) => requestToPromise(store.delete(CURRENT_DRAFT_KEY)));
}

export function createModuleDraft(session) {
  const snapshot = session.snapshot();

  return {
    sourceData: session.getSourceData(),
    workingData: session.getWorkingData(),
    sourceFileName: snapshot.sourceFileName,
    sourceType: snapshot.sourceType,
    lastExport: snapshot.lastExport || null
  };
}

export function createStudioDraftPayload(state) {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    modules: {
      suppliers: createModuleDraft(state.supplierSession),
      brochures: createModuleDraft(state.brochureSession),
      media: createModuleDraft(state.mediaSession),
      articles: createModuleDraft(state.articleSession),
      library: createModuleDraft(state.librarySession)
    }
  };
}
