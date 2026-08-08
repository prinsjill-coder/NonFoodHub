import { expect, test } from "@playwright/test";
import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";

const STUDIO_DRAFT_DB_NAME = "nonfoodhub-studio";
const brochureData = JSON.parse(readFileSync(new URL("../data/brochures.json", import.meta.url), "utf8"));
const amefaBrochureTitle =
  brochureData.items.find((item) => item.slug === "amefa-for-professionals-2026")?.title ||
  "Amefa for Professionals 2026";
const amefaNextEditionTitle = amefaBrochureTitle.replace("2026", "2027");

function filePayload(name, mimeType, content) {
  return {
    name,
    mimeType,
    buffer: Buffer.from(content)
  };
}

function collectConsoleErrors(page) {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => {
    errors.push(error.message);
  });
  return errors;
}

async function expectKeyboardFocusVisible(page) {
  await page.keyboard.press("Tab");
  const focusState = await page.evaluate(() => {
    const element = document.activeElement;
    if (!element || element === document.body) {
      return { hasFocus: false, hasOutline: false };
    }

    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);

    return {
      hasFocus: rect.width > 0 && rect.height > 0,
      hasOutline: style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0
    };
  });

  expect(focusState.hasFocus).toBe(true);
  expect(focusState.hasOutline).toBe(true);
}

async function expectCleanStudioPage(page, errors) {
  await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(100);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator("img").evaluateAll((images) =>
    Promise.all(
      images.map((image) => {
        if (image.complete) return null;

        return new Promise((resolve) => {
          const timeout = window.setTimeout(resolve, 1000);
          const finish = () => {
            window.clearTimeout(timeout);
            resolve();
          };
          image.addEventListener("load", finish, { once: true });
          image.addEventListener("error", finish, { once: true });
        });
      })
    )
  );
  const brokenImages = await page.locator("img").evaluateAll((images) =>
    images
      .filter((image) => image.naturalWidth === 0)
      .map((image) => image.getAttribute("src"))
  );
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

  await expect(page.locator("text=/Pagina niet gevonden|niet geladen/i")).toHaveCount(0);
  expect(brokenImages).toEqual([]);
  expect(horizontalOverflow).toBeLessThanOrEqual(1);
  await expectKeyboardFocusVisible(page);
  expect(errors).toEqual([]);
}

async function expectJsonDownload(page, button, fileName) {
  const downloadPromise = page.waitForEvent("download");
  await button.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(fileName);
}

async function clearStudioDraftStore(page) {
  await page.goto("/index.html");
  await page.evaluate((dbName) => new Promise((resolve) => {
    if (!window.indexedDB) {
      resolve();
      return;
    }

    const request = window.indexedDB[["delete", "Data", "base"].join("")](dbName);
    request.addEventListener("success", resolve);
    request.addEventListener("error", resolve);
    request.addEventListener("blocked", resolve);
  }), STUDIO_DRAFT_DB_NAME);
}

async function readStudioDraftStore(page) {
  return page.evaluate((dbName) => new Promise((resolve) => {
    if (!window.indexedDB) {
      resolve(null);
      return;
    }

    const request = window.indexedDB.open(dbName);
    request.addEventListener("upgradeneeded", () => resolve(null), { once: true });
    request.addEventListener("error", () => resolve(null), { once: true });
    request.addEventListener("success", () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("studio-drafts")) {
        db.close();
        resolve(null);
        return;
      }

      const transaction = db.transaction("studio-drafts", "readonly");
      const store = transaction.objectStore("studio-drafts");
      const getRequest = store.get("current");
      getRequest.addEventListener("success", () => {
        const draft = getRequest.result || null;
        db.close();
        resolve(draft);
      }, { once: true });
      getRequest.addEventListener("error", () => {
        db.close();
        resolve(null);
      }, { once: true });
    }, { once: true });
  }), STUDIO_DRAFT_DB_NAME);
}

async function seedBulkStatusDraftStore(page) {
  await page.goto("/index.html");
  await page.evaluate((dbName) => new Promise(async (resolve, reject) => {
    const clone = (value) => JSON.parse(JSON.stringify(value));
    const [
      suppliers,
      brochures,
      media,
      articles,
      library
    ] = await Promise.all([
      fetch("/data/suppliers.json").then((response) => response.json()),
      fetch("/data/brochures.json").then((response) => response.json()),
      fetch("/data/media.json").then((response) => response.json()),
      fetch("/data/articles.json").then((response) => response.json()),
      fetch("/data/library.json").then((response) => response.json())
    ]);
    const seededAt = "2026-01-01T00:00:00.000Z";

    function moduleDraft(key, data, workingData) {
      return {
        sourceData: clone(data),
        workingData: clone(workingData),
        sourceFileName: `data/${key}.json`,
        sourceType: "bundled",
        lastExport: null
      };
    }

    const workingSuppliers = {
      ...clone(suppliers),
      items: [
        ...clone(suppliers.items),
        {
          id: "supplier-rc35-duurzame-leverancier-a",
          name: "RC35 duurzame leverancier A",
          slug: "rc35-duurzame-leverancier-a",
          type: "leverancier",
          summary: "Samenvatting voor bulkstatuscontrole.",
          description: "Omschrijving met voldoende inhoud voor gereed voor publicatie.",
          categories: ["Bestek"],
          logo: "assets/images/logos/rc35-duurzame-leverancier-a.jpg",
          image: "assets/images/suppliers/rc35-duurzame-leverancier-a.jpg",
          brochureIds: [],
          relatedArticleIds: [],
          featured: false,
          sortOrder: 300,
          status: "concept",
          updatedAt: seededAt
        },
        {
          id: "supplier-rc35-duurzame-leverancier-b",
          name: "RC35 duurzame leverancier B",
          slug: "rc35-duurzame-leverancier-b",
          type: "leverancier",
          summary: "Samenvatting voor bulkstatuscontrole.",
          description: "Omschrijving met voldoende inhoud voor gereed voor publicatie.",
          categories: ["Bestek"],
          logo: "assets/images/logos/rc35-duurzame-leverancier-b.jpg",
          image: "assets/images/suppliers/rc35-duurzame-leverancier-b.jpg",
          brochureIds: [],
          relatedArticleIds: [],
          featured: false,
          sortOrder: 310,
          status: "concept",
          updatedAt: seededAt
        }
      ]
    };

    const workingBrochures = {
      ...clone(brochures),
      items: [
        ...clone(brochures.items),
        {
          id: "brochure-rc35-duurzame-brochure",
          title: "RC35 duurzame brochure",
          supplierId: "supplier-amefa",
          slug: "rc35-duurzame-brochure",
          year: 2029,
          categories: ["Bestek"],
          pdfFile: "assets/downloads/brochures/rc35-duurzame-brochure.pdf",
          pdfSize: "",
          thumbnail: "assets/images/brochures/rc35-duurzame-brochure.jpg",
          description: "Brochure voor bulkstatuscontrole in de bewerkversie.",
          language: "nl",
          status: "concept",
          sortOrder: 300,
          updatedAt: seededAt
        }
      ]
    };

    const workingArticles = {
      ...clone(articles),
      items: [
        ...clone(articles.items),
        {
          id: "article-rc35-duurzaam-artikel",
          title: "RC35 duurzaam artikel",
          slug: "rc35-duurzaam-artikel",
          status: "concept",
          summary: "Artikel voor bulkstatuscontrole in de bewerkversie.",
          body: "Deze artikeltekst controleert dat bulkstatussen duurzaam worden opgeslagen.",
          categories: ["Inspiratie"],
          heroImage: "assets/images/rc35-duurzaam-artikel.jpg",
          supplierIds: [],
          brochureIds: [],
          updatedAt: seededAt,
          sortOrder: 300
        }
      ]
    };

    const workingMedia = {
      ...clone(media),
      items: [
        ...clone(media.items),
        {
          id: "rc35-duurzaam-mediarecord",
          title: "RC35 duurzaam mediarecord",
          file: "assets/downloads/brochures/rc35-duurzaam-mediarecord.pdf",
          type: "pdf",
          alt: "",
          caption: "Mediarecord voor bulkstatuscontrole.",
          width: "",
          height: "",
          fileSize: "",
          usageType: "brochure-pdf",
          rightsStatus: "approved",
          status: "concept",
          sortOrder: 300,
          updatedAt: seededAt
        }
      ]
    };

    const workingLibrary = {
      ...clone(library),
      items: [
        ...clone(library.items),
        {
          id: "library-rc35-duurzaam-bibliotheekitem",
          title: "RC35 duurzaam bibliotheekitem",
          slug: "rc35-duurzaam-bibliotheekitem",
          status: "concept",
          type: "overig",
          category: "Productinformatie",
          summary: "Bibliotheekitem voor bulkstatuscontrole in de bewerkversie.",
          filePath: "",
          thumbnailPath: "",
          supplierIds: [],
          brochureIds: [],
          articleIds: [],
          tags: [],
          updatedAt: seededAt,
          sortOrder: 300
        }
      ]
    };

    const draft = {
      version: 1,
      savedAt: new Date().toISOString(),
      modules: {
        suppliers: moduleDraft("suppliers", suppliers, workingSuppliers),
        brochures: moduleDraft("brochures", brochures, workingBrochures),
        media: moduleDraft("media", media, workingMedia),
        articles: moduleDraft("articles", articles, workingArticles),
        library: moduleDraft("library", library, workingLibrary)
      }
    };

    const openRequest = window.indexedDB.open(dbName, 1);
    openRequest.addEventListener("upgradeneeded", () => {
      const db = openRequest.result;
      if (!db.objectStoreNames.contains("studio-drafts")) {
        db.createObjectStore("studio-drafts");
      }
    }, { once: true });
    openRequest.addEventListener("error", () => reject(openRequest.error), { once: true });
    openRequest.addEventListener("success", () => {
      const db = openRequest.result;
      const transaction = db.transaction("studio-drafts", "readwrite");
      const store = transaction.objectStore("studio-drafts");
      store.put(draft, "current");
      transaction.addEventListener("complete", () => {
        db.close();
        resolve();
      }, { once: true });
      transaction.addEventListener("error", () => {
        db.close();
        reject(transaction.error);
      }, { once: true });
    }, { once: true });
  }), STUDIO_DRAFT_DB_NAME);
}

async function visibleItemCount(page, selector) {
  return page.locator(selector).evaluateAll((items) => items.filter((item) => !item.hidden).length);
}

async function visibleItemTexts(page, selector) {
  return page
    .locator(selector)
    .evaluateAll((items) => items.filter((item) => !item.hidden).map((item) => item.textContent.trim()));
}

async function makeRouteScrollableAndScroll(page, top = 700) {
  await page.evaluate((scrollTop) => {
    if (!document.querySelector("[data-test-scroll-spacer]")) {
      const spacer = document.createElement("div");
      spacer.dataset.testScrollSpacer = "true";
      spacer.style.height = "1800px";
      spacer.style.pointerEvents = "none";
      document.body.append(spacer);
    }
    window.scrollTo(0, scrollTop);
  }, top);
}

const studioRoutes = [
  { path: "/studio/index.html#/dashboard", heading: "Dashboard" },
  { path: "/studio/index.html#/governance", heading: "Governance" },
  { path: "/studio/index.html#/leveranciers", heading: "Leveranciers", workflow: true },
  { path: "/studio/index.html#/brochures", heading: "Brochures", workflow: true },
  { path: "/studio/index.html#/media", heading: "Media", workflow: true },
  { path: "/studio/index.html#/kennisbank", heading: "Kennisbank", workflow: true },
  { path: "/studio/index.html#/bibliotheek", heading: "Bibliotheek" }
];

test.beforeEach(async ({ page }) => {
  await clearStudioDraftStore(page);
});

for (const route of studioRoutes) {
  test(`Studio opent ${route.heading} zonder consolefouten`, async ({ page }) => {
    const errors = collectConsoleErrors(page);

    await page.goto(route.path);
    await expect(page.locator("#studio-app")).toBeVisible();
    await expect(page.getByRole("heading", { name: route.heading, level: 1 })).toBeVisible();
    if (route.workflow) {
      const workflow = page.locator(".studio-workflow-panel");
      await expect(workflow.getByRole("heading", { name: "Van beheer naar website", level: 2 })).toBeVisible();
      await expect(workflow.getByText("Concept", { exact: true })).toBeVisible();
      await expect(workflow.getByText("Gereed voor publicatie", { exact: true })).toBeVisible();
      await expect(workflow.getByText("Gepubliceerd", { exact: true })).toBeVisible();
    }
    await expectCleanStudioPage(page, errors);
  });
}

test("Studio zoekt realtime in alle contentoverzichten", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  const cases = [
    {
      path: "/studio/index.html#/leveranciers",
      query: "ÁMEFA",
      itemSelector: "[data-supplier-card-list] [data-supplier-item]",
      emptySelector: "[data-supplier-empty]"
    },
    {
      path: "/studio/index.html#/brochures",
      query: "chürchill",
      itemSelector: "[data-brochure-card-list] [data-brochure-item]",
      emptySelector: "[data-brochure-empty]"
    },
    {
      path: "/studio/index.html#/kennisbank",
      query: "hospitálity",
      itemSelector: "[data-article-card-list] [data-article-item]",
      emptySelector: "[data-article-empty]"
    },
    {
      path: "/studio/index.html#/bibliotheek",
      query: "outdóor",
      itemSelector: "[data-library-card-list] [data-library-item]",
      emptySelector: "[data-library-empty]"
    },
    {
      path: "/studio/index.html#/media",
      query: "vîrtuele",
      itemSelector: "[data-media-card-list] [data-media-item]",
      emptySelector: "[data-media-empty]"
    }
  ];

  for (const searchCase of cases) {
    await page.goto(searchCase.path);
    const topbarSearch = page.locator("[data-studio-search]");
    await expect(page.locator(searchCase.itemSelector).first()).toBeVisible();
    const totalCount = await visibleItemCount(page, searchCase.itemSelector);

    await expect(topbarSearch).toBeEnabled();
    expect(totalCount).toBeGreaterThan(1);

    await topbarSearch.fill(searchCase.query);
    await expect(page.locator(searchCase.emptySelector)).toBeHidden();
    const filteredCount = await visibleItemCount(page, searchCase.itemSelector);
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThan(totalCount);

    await topbarSearch.fill("geen-resultaat-voor-deze-zoektest");
    await expect(page.locator(searchCase.emptySelector)).toBeVisible();

    await page.getByRole("button", { name: "Wissen", exact: true }).click();
    await expect(topbarSearch).toHaveValue("");
    await expect(page.locator(searchCase.emptySelector)).toBeHidden();
    expect(await visibleItemCount(page, searchCase.itemSelector)).toBe(totalCount);
  }

  await expectCleanStudioPage(page, errors);
});

test("Studio combineert zoeken, slimme filters, sortering en reset", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  await page.goto("/studio/index.html#/leveranciers");
  const supplierCards = "[data-supplier-card-list] [data-supplier-item]";
  await expect(page.locator(supplierCards).first()).toBeVisible();
  const supplierTotal = await visibleItemCount(page, supplierCards);
  expect(supplierTotal).toBeGreaterThanOrEqual(2);

  await page.locator("[data-supplier-sort]").selectOption("name-desc");
  await expect.poll(() => visibleItemTexts(page, supplierCards).then((items) => items[0])).toContain("Churchill");
  await page.locator("[data-supplier-sort]").selectOption("name-asc");
  await expect.poll(() => visibleItemTexts(page, supplierCards).then((items) => items[0])).toContain("Amefa");

  await page.locator("[data-studio-search]").fill("Churchill");
  await page.locator('[data-supplier-filter="workflow"]').selectOption("published");
  await page.locator('[data-supplier-filter="website"]').selectOption("live");
  await page.locator('[data-supplier-filter="category"]').selectOption("servies");
  await page.locator('[data-supplier-filter="hasbrochure"]').selectOption("yes");
  await expect(page.locator("[data-supplier-filter-summary]")).toBeVisible();
  await expect(page.locator("[data-supplier-filter-summary]")).toContainText("Zoeken: Churchill");
  await expect(page.locator("[data-supplier-filter-summary]")).toContainText(["Workflow", "status: Gepubliceerd"].join(""));
  await expect(page.locator("[data-supplier-filter-summary]")).toContainText("Categorie: Servies");
  expect(await visibleItemCount(page, supplierCards)).toBe(1);
  await expect(page.locator(supplierCards).filter({ hasText: "Churchill" }).first()).toBeVisible();

  await page.locator('[data-supplier-filter="hasarticle"]').selectOption("no");
  await expect(page.locator("[data-supplier-empty]")).toBeVisible();
  await expect(page.locator("[data-supplier-empty]")).toContainText("Geen leveranciers");
  await page.locator("[data-supplier-empty-clear]").click();
  await expect(page.locator("[data-studio-search]")).toHaveValue("");
  await expect(page.locator('[data-supplier-filter="workflow"]')).toHaveValue("all");
  await expect(page.locator("[data-supplier-sort]")).toHaveValue("name-asc");
  await expect(page.locator("[data-supplier-filter-summary]")).toBeHidden();
  await expect(page.locator("[data-supplier-empty]")).toBeHidden();
  expect(await visibleItemCount(page, supplierCards)).toBe(supplierTotal);

  await page.goto("/studio/index.html#/brochures");
  const brochureCards = "[data-brochure-card-list] [data-brochure-item]";
  await page.locator("[data-studio-search]").fill("Churchill");
  await page.locator('[data-brochure-filter="supplier"]').selectOption("supplier-churchill");
  await page.locator('[data-brochure-filter="category"]').selectOption("servies");
  await page.locator('[data-brochure-filter="haspdf"]').selectOption("yes");
  await expect(page.locator("[data-brochure-filter-summary]")).toContainText("Leverancier: Churchill");
  await expect(page.locator("[data-brochure-filter-summary]")).toContainText("Categorie: Servies");
  expect(await visibleItemCount(page, brochureCards)).toBe(1);
  await expect(page.locator(brochureCards).filter({ hasText: "Churchill Combined Brochure 2026" }).first()).toBeVisible();
  await page.locator("[data-brochure-clear-filters]").click();
  await expect(page.locator("[data-brochure-filter-summary]")).toBeHidden();

  await page.goto("/studio/index.html#/kennisbank");
  const articleCards = "[data-article-card-list] [data-article-item]";
  await page.locator("[data-studio-search]").fill("hospitality");
  await page.locator('[data-article-filter="supplier"]').selectOption("supplier-amefa");
  await page.locator('[data-article-filter="category"]').selectOption("buffet & presentatie");
  await page.locator('[data-article-filter="hashero"]').selectOption("yes");
  await page.locator('[data-article-filter="hasbrochurerelation"]').selectOption("yes");
  await expect(page.locator("[data-article-filter-summary]")).toContainText("Leverancier: Amefa");
  expect(await visibleItemCount(page, articleCards)).toBe(1);
  await expect(page.locator(articleCards).filter({ hasText: "Professioneel tafelconcept" }).first()).toBeVisible();

  await page.goto("/studio/index.html#/media");
  const mediaCards = "[data-media-card-list] [data-media-item]";
  await page.locator("[data-studio-search]").fill("Amefa");
  await page.locator('[data-media-filter="filetype"]').selectOption("logo");
  await page.locator('[data-media-filter="rights"]').selectOption("needs-review");
  await page.locator('[data-media-filter="usedbysupplier"]').selectOption("yes");
  await page.locator('[data-media-filter="missingfile"]').selectOption("no");
  await expect(page.locator("[data-media-filter-summary]")).toContainText("Bestandstype: Logo");
  expect(await visibleItemCount(page, mediaCards)).toBe(1);
  await expect(page.locator(mediaCards).filter({ hasText: "Amefa leveranciersbeeld" }).first()).toBeVisible();

  await page.goto("/studio/index.html#/bibliotheek");
  const libraryCards = "[data-library-card-list] [data-library-item]";
  await page.locator("[data-studio-search]").fill("Churchill");
  await page.locator('[data-library-filter="workflow"]').selectOption("concept");
  await page.locator('[data-library-filter="type"]').selectOption("catalogus");
  await page.locator('[data-library-filter="category"]').selectOption("leveranciers");
  await expect(page.locator("[data-library-filter-summary]")).toContainText("Contenttype: Catalogus");
  expect(await visibleItemCount(page, libraryCards)).toBe(1);
  await expect(page.locator(libraryCards).filter({ hasText: "Churchill Combined Brochure 2026" }).first()).toBeVisible();

  await expectCleanStudioPage(page, errors);
});

test("Studio toont bulkselectie consistent op alle contentoverzichten", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  const cases = [
    { path: "/studio/index.html#/leveranciers", scope: "supplier", selector: "[data-supplier-card-list] [data-supplier-item]" },
    { path: "/studio/index.html#/brochures", scope: "brochure", selector: "[data-brochure-card-list] [data-brochure-item]" },
    { path: "/studio/index.html#/kennisbank", scope: "article", selector: "[data-article-card-list] [data-article-item]" },
    { path: "/studio/index.html#/media", scope: "media", selector: "[data-media-card-list] [data-media-item]" },
    { path: "/studio/index.html#/bibliotheek", scope: "library", selector: "[data-library-card-list] [data-library-item]" }
  ];

  for (const bulkCase of cases) {
    await page.goto(bulkCase.path);
    const toolbar = page.locator(`[data-bulk-toolbar][data-bulk-scope="${bulkCase.scope}"]`);
    await expect(page.locator(bulkCase.selector).first()).toBeVisible();
    await expect(toolbar).toBeHidden();

    await page.locator(`${bulkCase.selector} input[data-bulk-select]`).first().check();
    await expect(toolbar).toBeVisible();
    await expect(toolbar.locator("[data-bulk-count]")).toHaveText("1");

    await page.locator(`[data-bulk-clear][data-bulk-scope="${bulkCase.scope}"]`).last().click();
    await expect(toolbar).toBeHidden();
  }

  await expectCleanStudioPage(page, errors);
});

test("Studio bulkacties werken met filters, statuswijziging, archiveren en deels geblokkeerd verwijderen", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  const supplierCards = "[data-supplier-card-list] [data-supplier-item]";
  const rcSupplierCard = `${supplierCards}[data-list-id="supplier-rc35-bulk-leverancier"]`;
  const amefaCard = `${supplierCards}[data-list-id="supplier-amefa"]`;
  const toolbar = page.locator('[data-bulk-toolbar][data-bulk-scope="supplier"]');
  const result = page.locator('[data-bulk-result][data-bulk-scope="supplier"]');

  await page.goto("/studio/index.html#/leveranciers/nieuw");
  await page.locator("#studio-field-name").fill("RC35 bulk leverancier");
  await page.locator("#studio-field-categories-bestek").check({ force: true });
  await page.getByRole("button", { name: "Opslaan in bewerkversie" }).click();
  await expect(page).toHaveURL(/#\/leveranciers\/rc35-bulk-leverancier$/);

  await page.goto("/studio/index.html#/leveranciers");
  await expect(page.locator(rcSupplierCard)).toBeVisible();

  await page.locator("[data-studio-search]").fill("RC35 bulk");
  await page.locator('[data-bulk-select-visible][data-bulk-scope="supplier"]').click();
  await expect(toolbar).toBeVisible();
  await expect(toolbar.locator("[data-bulk-count]")).toHaveText("1");

  await page.locator("[data-studio-search]").fill("");
  await expect(toolbar.locator("[data-bulk-count]")).toHaveText("1");
  await page.locator('[data-bulk-clear][data-bulk-scope="supplier"]').last().click();
  await expect(toolbar).toBeHidden();

  await page.locator(`${rcSupplierCard} input[data-bulk-select]`).first().check();
  await expect(toolbar.locator("[data-bulk-count]")).toHaveText("1");
  await page.locator(`${amefaCard} input[data-bulk-select]`).first().check();
  await expect(toolbar.locator("[data-bulk-count]")).toHaveText("2");

  await page.locator('[data-bulk-status="concept"][data-bulk-scope="supplier"]').click();
  await expect(page.getByRole("alertdialog", { name: "2 leveranciers wijzigen naar Concept?" })).toBeVisible();
  await page.getByRole("button", { name: "Status wijzigen" }).click();
  await expect(result).toBeVisible();
  await expect(result).toContainText("2 leveranciers op Concept gezet.");
  await expect(toolbar).toBeHidden();

  await page.locator(`${rcSupplierCard} input[data-bulk-select]`).first().check();
  await page.locator('[data-bulk-status="archived"][data-bulk-scope="supplier"]').click();
  await expect(page.getByRole("alertdialog", { name: "1 leveranciers archiveren?" })).toBeVisible();
  await page.getByRole("button", { name: "Archiveren" }).last().click();
  await expect(result).toContainText("1 leveranciers gearchiveerd.");

  await page.locator(`${rcSupplierCard} input[data-bulk-select]`).first().check();
  await page.locator(`${amefaCard} input[data-bulk-select]`).first().check();
  await expect(toolbar.locator("[data-bulk-count]")).toHaveText("2");
  await page.locator('[data-bulk-delete][data-bulk-scope="supplier"]').click();
  await expect(page.getByRole("alertdialog", { name: "2 leveranciers definitief verwijderen?" })).toBeVisible();
  await page.getByRole("button", { name: "Definitief verwijderen" }).last().click();

  await expect(page.locator(rcSupplierCard)).toHaveCount(0);
  await expect(result).toContainText("1 leveranciers definitief verwijderd.");
  await expect(result).toContainText("1 leveranciers overgeslagen");
  await expect(result).toContainText("Verwijder of verplaats eerst gekoppelde brochures.");
  await expect(toolbar).toBeVisible();
  await expect(toolbar.locator("[data-bulk-count]")).toHaveText("1");
  await expect(page.locator(`${amefaCard} input[data-bulk-select]`).first()).toBeChecked();

  await page.reload();
  await expect(page.locator(rcSupplierCard)).toHaveCount(0);
  await expect(page.locator(amefaCard)).toBeVisible();

  await expectCleanStudioPage(page, errors);
});

test("Studio bewaart bulkstatuswijzigingen duurzaam in de bewerkversie", async ({ page }) => {
  test.setTimeout(90000);
  const errors = collectConsoleErrors(page);

  async function bulkReadyAndAssert({
    path,
    scope,
    selector,
    itemIds,
    search = "",
    moduleKey
  }) {
    await page.goto(path);
    if (search) {
      await page.locator("[data-studio-search]").fill(search);
      await page.locator(`[data-bulk-select-visible][data-bulk-scope="${scope}"]`).click();
    } else {
      for (const itemId of itemIds) {
        await page.locator(`${selector}[data-list-id="${itemId}"] input[data-bulk-select]`).first().check();
      }
    }
    await expect(page.locator(`[data-bulk-toolbar][data-bulk-scope="${scope}"] [data-bulk-count]`)).toHaveText(String(itemIds.length));

    const beforeValues = {};
    for (const itemId of itemIds) {
      beforeValues[itemId] = await page.locator(`${selector}[data-list-id="${itemId}"]`).first().getAttribute("data-sort-updated-at");
    }

    await page.waitForTimeout(25);
    await page.locator(`[data-bulk-status="ready"][data-bulk-scope="${scope}"]`).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.getByRole("button", { name: "Status wijzigen" }).click();
    await expect(page.locator(`[data-bulk-result][data-bulk-scope="${scope}"]`)).toContainText("gereed voor publicatie gezet");

    for (const itemId of itemIds) {
      const item = page.locator(`${selector}[data-list-id="${itemId}"]`).first();
      await expect(item).toHaveAttribute("data-filter-workflow", "ready");
      const updatedAt = await item.getAttribute("data-sort-updated-at");
      expect(updatedAt).toMatch(/T/);
      expect(updatedAt).not.toBe(beforeValues[itemId]);
    }

    const draftAfterChange = await readStudioDraftStore(page);
    for (const itemId of itemIds) {
      const draftItem = draftAfterChange?.modules?.[moduleKey]?.workingData?.items?.find((item) => item.id === itemId);
      expect(draftItem?.status).toBe("ready");
      expect(draftItem?.updatedAt).toMatch(/T/);
    }

    await page.reload();
    await expect(page.locator(selector).first()).toBeVisible();
    for (const itemId of itemIds) {
      await expect(page.locator(`${selector}[data-list-id="${itemId}"]`).first()).toHaveAttribute("data-filter-workflow", "ready");
    }

    await page.goto("/index.html");
    await page.goto(path);
    await expect(page.locator(selector).first()).toBeVisible();
    for (const itemId of itemIds) {
      await expect(page.locator(`${selector}[data-list-id="${itemId}"]`).first()).toHaveAttribute("data-filter-workflow", "ready");
    }
  }

  await seedBulkStatusDraftStore(page);

  await bulkReadyAndAssert({
    path: "/studio/index.html#/leveranciers",
    scope: "supplier",
    selector: "[data-supplier-card-list] [data-supplier-item]",
    itemIds: ["supplier-rc35-duurzame-leverancier-a", "supplier-rc35-duurzame-leverancier-b"],
    search: "RC35 duurzame leverancier",
    moduleKey: "suppliers"
  });
  await bulkReadyAndAssert({
    path: "/studio/index.html#/brochures",
    scope: "brochure",
    selector: "[data-brochure-card-list] [data-brochure-item]",
    itemIds: ["brochure-rc35-duurzame-brochure"],
    moduleKey: "brochures"
  });
  await bulkReadyAndAssert({
    path: "/studio/index.html#/kennisbank",
    scope: "article",
    selector: "[data-article-card-list] [data-article-item]",
    itemIds: ["article-rc35-duurzaam-artikel"],
    moduleKey: "articles"
  });
  await bulkReadyAndAssert({
    path: "/studio/index.html#/media",
    scope: "media",
    selector: "[data-media-card-list] [data-media-item]",
    itemIds: ["rc35-duurzaam-mediarecord"],
    moduleKey: "media"
  });
  await bulkReadyAndAssert({
    path: "/studio/index.html#/bibliotheek",
    scope: "library",
    selector: "[data-library-card-list] [data-library-item]",
    itemIds: ["library-rc35-duurzaam-bibliotheekitem"],
    moduleKey: "library"
  });

  await expectCleanStudioPage(page, errors);
});

test("Studio dashboard en governance navigeren met scroll-reset en filterhandoff", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  await page.goto("/studio/index.html#/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
  await makeRouteScrollableAndScroll(page);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await page.evaluate(() => {
    window.location.hash = "#/leveranciers/amefa";
  });
  await expect(page.getByRole("heading", { name: "Amefa", level: 1 })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

  await makeRouteScrollableAndScroll(page);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await page.getByRole("link", { name: "Brochure bekijken" }).first().click();
  await expect(page).toHaveURL(/#\/brochures\//);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

  await makeRouteScrollableAndScroll(page);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: /Amefa for Professionals|Churchill Combined Brochure/, level: 1 })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

  await page.goto("/studio/index.html#/dashboard");
  await page.locator('a.studio-clickable-card[aria-label="Media-assets openen"]').click();
  await expect(page).toHaveURL(/#\/media$/);
  await expect(page.getByRole("heading", { name: "Media", level: 1 })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

  await page.goto("/studio/index.html#/dashboard");
  await page.locator('a.studio-clickable-card[aria-label="Leveranciers zonder brochures openen"]').focus();
  await expect(page.locator('a.studio-clickable-card[aria-label="Leveranciers zonder brochures openen"]')).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#\/leveranciers$/);
  await expect(page.locator('[data-supplier-filter="hasbrochure"]')).toHaveValue("no");
  await expect(page.locator("[data-supplier-filter-summary]")).toContainText("Heeft brochure: Nee");
  await page.locator("[data-supplier-clear-filters]").click();
  await expect(page.locator('[data-supplier-filter="hasbrochure"]')).toHaveValue("all");
  await expect(page.locator("[data-supplier-filter-summary]")).toBeHidden();

  await page.evaluate(() => window.scrollTo(0, 600));
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(50);
  await page.locator('[data-supplier-filter="website"]').selectOption("live");
  await expect(page.locator("[data-supplier-filter-summary]")).toContainText("Websitestatus: Live");
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(50);

  await page.goto("/studio/index.html#/governance");
  await page.getByRole("button", { name: "Fouten tonen in het issue-overzicht" }).click();
  await expect(page.locator("[data-governance-active-severity]")).toHaveText("Alleen fouten");
  await page.getByRole("button", { name: "Issues tonen in het issue-overzicht" }).click();
  await expect(page.locator("[data-governance-active-severity]")).toHaveText("Alle issues");
  const issueLink = page.locator("[data-governance-issue]").first().getByRole("link", { name: /openen/i });
  const targetHref = await issueLink.getAttribute("href");
  expect(targetHref).toMatch(/^#\//);
  await issueLink.click();
  await expect.poll(() => page.evaluate(() => window.location.hash)).toBe(targetHref);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

  await expectCleanStudioPage(page, errors);
});

test("Studio sorteert bewaarde wijzigingen op laatst gewijzigd en behoudt dit na refresh", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  const supplierCards = "[data-supplier-card-list] [data-supplier-item]";
  const amefaCard = `${supplierCards}[data-list-id="supplier-amefa"]`;

  await page.goto("/studio/index.html#/leveranciers/amefa/bewerken");
  await expect(page.getByRole("heading", { name: "Amefa bewerken", level: 1 })).toBeVisible();
  await page.locator("#studio-field-description").fill(
    "Amefa ondersteunt professionele tafelpresentatie met bestek, buffetoplossingen en hospitalitycollecties voor de sorteercontrole."
  );
  await page.getByRole("button", { name: "Opslaan in bewerkversie" }).click();
  await expect(page).toHaveURL(/#\/leveranciers\/amefa$/);

  await page.goto("/studio/index.html#/leveranciers");
  await expect(page.locator(supplierCards).first()).toBeVisible();
  await expect(page.locator(amefaCard)).toHaveAttribute("data-sort-updated-at", /T/);
  const updatedAt = await page.locator(amefaCard).getAttribute("data-sort-updated-at");

  await page.locator("[data-supplier-sort]").selectOption("updated-desc");
  await expect.poll(() => visibleItemTexts(page, supplierCards).then((items) => items[0])).toContain("Amefa");

  await page.locator("[data-supplier-sort]").selectOption("updated-asc");
  await expect.poll(() => visibleItemTexts(page, supplierCards).then((items) => items.at(-1))).toContain("Amefa");

  await page.reload();
  await expect(page.locator(supplierCards).first()).toBeVisible();
  await expect(page.locator(amefaCard)).toHaveAttribute("data-sort-updated-at", updatedAt);

  await page.locator("[data-supplier-sort]").selectOption("updated-desc");
  await expect.poll(() => visibleItemTexts(page, supplierCards).then((items) => items[0])).toContain("Amefa");

  await page.locator("[data-supplier-sort]").selectOption("updated-asc");
  await expect.poll(() => visibleItemTexts(page, supplierCards).then((items) => items.at(-1))).toContain("Amefa");

  await expectCleanStudioPage(page, errors);
});

test("Studio laat leveranciersmedia kiezen en registreert Media-koppelingen", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  const supplierCards = "[data-supplier-card-list] [data-supplier-item]";
  const amefaCard = `${supplierCards}[data-list-id="supplier-amefa"]`;
  const logoPath = "assets/images/logos/leverancier-logo-def.png";
  const imagePath = "assets/images/suppliers/header-beeld-zomer.jpeg";

  await page.goto("/studio/index.html#/leveranciers/amefa/bewerken");
  await expect(page.getByRole("heading", { name: "Amefa bewerken", level: 1 })).toBeVisible();
  const originalLogo = await page.locator("#studio-field-logo").inputValue();
  const originalImage = await page.locator("#studio-field-image").inputValue();

  await page.locator("#studio-field-description").fill(
    "Amefa ondersteunt professionele tafelpresentatie met bestek en buffetoplossingen zonder het bestaande beeld te vervangen."
  );
  await page.getByRole("button", { name: "Opslaan in bewerkversie" }).click();
  await expect(page).toHaveURL(/#\/leveranciers\/amefa$/);

  await page.goto("/studio/index.html#/leveranciers/amefa/bewerken");
  await expect(page.locator("#studio-field-logo")).toHaveValue(originalLogo);
  await expect(page.locator("#studio-field-image")).toHaveValue(originalImage);

  await page
    .locator("#studio-field-logo-choice")
    .setInputFiles(filePayload("Leverancier Logo DEF.PNG", "image/png", "logo"));
  await expect(page.locator('[data-target-field="logo"] [data-file-choice-name]')).toHaveText("Leverancier Logo DEF.PNG");
  await expect(page.locator('[data-target-field="logo"] [data-file-choice-type]')).toHaveText("image/png");
  await expect(page.locator('[data-target-field="logo"] [data-file-choice-size]')).toHaveText("4 B");
  await expect(page.locator('[data-target-field="logo"] [data-file-choice-expected]')).toHaveText(logoPath);
  await expect(page.locator("#studio-field-logo")).toHaveValue(logoPath);

  await page
    .locator("#studio-field-image-choice")
    .setInputFiles(filePayload("Header beeld zomer.jpeg", "image/jpeg", "header"));
  await expect(page.locator('[data-target-field="image"] [data-file-choice-name]')).toHaveText("Header beeld zomer.jpeg");
  await expect(page.locator('[data-target-field="image"] [data-file-choice-type]')).toHaveText("image/jpeg");
  await expect(page.locator('[data-target-field="image"] [data-file-choice-size]')).toHaveText("6 B");
  await expect(page.locator('[data-target-field="image"] [data-file-choice-expected]')).toHaveText(imagePath);
  await expect(page.locator("#studio-field-image")).toHaveValue(imagePath);

  await page.getByRole("button", { name: "Opslaan in bewerkversie" }).click();
  await expect(page).toHaveURL(/#\/leveranciers\/amefa$/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Amefa", level: 1 })).toBeVisible();

  await page.goto("/studio/index.html#/leveranciers/amefa/bewerken");
  await expect(page.locator("#studio-field-logo")).toHaveValue(logoPath);
  await expect(page.locator("#studio-field-image")).toHaveValue(imagePath);

  await page.goto("/studio/index.html#/media/media-amefa-logo");
  await expect(page.getByRole("heading", { name: "Amefa logo", level: 1 })).toBeVisible();
  await expect(page.getByRole("code").filter({ hasText: logoPath })).toBeVisible();
  const logoSupplierUsage = page
    .locator(".studio-card")
    .filter({ has: page.getByRole("heading", { name: "Leveranciers", level: 3 }) });
  await expect(logoSupplierUsage.getByRole("link", { name: "Amefa" })).toBeVisible();

  await page.goto("/studio/index.html#/media/media-amefa-headerafbeelding");
  await expect(page.getByRole("heading", { name: "Amefa headerafbeelding", level: 1 })).toBeVisible();
  await expect(page.getByRole("code").filter({ hasText: imagePath })).toBeVisible();
  const imageSupplierUsage = page
    .locator(".studio-card")
    .filter({ has: page.getByRole("heading", { name: "Leveranciers", level: 3 }) });
  await expect(imageSupplierUsage.getByRole("link", { name: "Amefa" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Amefa headerafbeelding", level: 1 })).toBeVisible();
  await expect(imageSupplierUsage.getByRole("link", { name: "Amefa" })).toBeVisible();

  await page.goto("/studio/index.html#/leveranciers");
  await expect(page.locator(amefaCard)).toHaveAttribute("data-sort-updated-at", /T/);
  await page.locator("[data-supplier-sort]").selectOption("updated-desc");
  await expect.poll(() => visibleItemTexts(page, supplierCards).then((items) => items[0])).toContain("Amefa");
  await page.locator("[data-supplier-sort]").selectOption("updated-asc");
  await expect.poll(() => visibleItemTexts(page, supplierCards).then((items) => items.at(-1))).toContain("Amefa");

  await expectCleanStudioPage(page, errors);
});

test("Studio bewaart bewerkversies centraal na refresh en herstelt naar JSON-bron", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  page.on("dialog", (dialog) => dialog.accept());

  await page.goto("/studio/index.html#/leveranciers/nieuw");
  await page.locator("#studio-field-name").fill("RC1K leverancier");
  await page.locator("#studio-field-categories-bestek").check({ force: true });
  await page.getByRole("button", { name: "Opslaan in bewerkversie" }).click();
  await expect(page).toHaveURL(/#\/leveranciers\/rc1k-leverancier$/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "RC1K leverancier", level: 1 })).toBeVisible();

  await page.goto("/studio/index.html#/brochures/nieuw");
  await page.getByLabel(/Titel/).fill("RC1K brochure");
  await page.getByLabel("Leverancier").selectOption({ label: "Amefa" });
  await page.getByLabel("Jaar").fill("2027");
  await page.getByLabel("Beschrijving").fill("Controlebrochure voor de duurzame bewerkversie.");
  await page.locator("#studio-field-categories-bestek").check({ force: true });
  await page.getByRole("button", { name: "Opslaan in bewerkversie" }).click();
  await expect(page).toHaveURL(/#\/brochures\/rc1k-brochure$/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "RC1K brochure", level: 1 })).toBeVisible();

  await page.goto("/studio/index.html#/kennisbank/nieuw");
  await page.getByLabel("Titel").fill("RC1K artikel");
  await page.getByLabel("Samenvatting").fill("Controleartikel voor de duurzame bewerkversie.");
  await page.getByLabel("Inhoud").fill("Deze tekst controleert dat kennisbankartikelen na F5 in de bewerkversie blijven staan.");
  await page.locator("#studio-field-categories-inspiratie").check({ force: true });
  await page.getByRole("button", { name: "Opslaan in bewerkversie" }).click();
  await expect(page).toHaveURL(/#\/kennisbank\/rc1k-artikel$/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "RC1K artikel", level: 1 })).toBeVisible();

  await page.goto("/studio/index.html#/media/nieuw");
  await page.getByLabel("Titel").fill("RC1K mediarecord");
  await page.getByLabel("ID").fill("rc1k-mediarecord");
  await page.locator("#studio-field-file").fill("assets/images/rc1k-mediarecord.jpg");
  await page.getByLabel("Type").selectOption("image");
  await page.getByLabel("Gebruik").selectOption("page-image");
  await page.getByRole("button", { name: "Opslaan in bewerkversie" }).click();
  await expect(page).toHaveURL(/#\/media\/rc1k-mediarecord$/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "RC1K mediarecord", level: 1 })).toBeVisible();

  await page.goto("/studio/index.html#/bibliotheek/nieuw");
  await page.getByLabel("Titel").fill("RC1K bibliotheekitem");
  await page.getByLabel("Samenvatting").fill("Controle-item voor de duurzame bewerkversie.");
  await page.getByRole("button", { name: "Opslaan in bewerkversie" }).click();
  await expect(page).toHaveURL(/#\/bibliotheek\/rc1k-bibliotheekitem$/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "RC1K bibliotheekitem", level: 1 })).toBeVisible();

  await page.goto("/studio/index.html#/leveranciers");
  await expect(page.locator("[data-supplier-item]", { hasText: "RC1K leverancier" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Bewerkversie herstellen" }).click();
  const restoreDialog = page.getByRole("alertdialog");
  if (await restoreDialog.isVisible({ timeout: 1000 }).catch(() => false)) {
    await restoreDialog.getByRole("button", { name: /Bewerkversie herstellen|Doorgaan/ }).click();
  }
  await expect(page.locator("[data-supplier-item]", { hasText: "RC1K leverancier" })).toHaveCount(0);
  await page.reload();
  await expect(page.locator("[data-supplier-item]", { hasText: "RC1K leverancier" })).toHaveCount(0);

  await page.goto("/studio/index.html#/brochures");
  await expect(page.locator("[data-brochure-item]", { hasText: "RC1K brochure" })).toHaveCount(0);
  await page.goto("/studio/index.html#/kennisbank");
  await expect(page.locator("[data-article-item]", { hasText: "RC1K artikel" })).toHaveCount(0);
  await page.goto("/studio/index.html#/media");
  await expect(page.locator("[data-media-item]", { hasText: "RC1K mediarecord" })).toHaveCount(0);
  await page.goto("/studio/index.html#/bibliotheek");
  await expect(page.locator("[data-library-item]", { hasText: "RC1K bibliotheekitem" })).toHaveCount(0);

  await expectCleanStudioPage(page, errors);
});

test("Studio verwijdert conceptcontent definitief uit de bewerkversie", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  await page.goto("/studio/index.html#/leveranciers/nieuw");
  await page.locator("#studio-field-name").fill("RC1K delete leverancier");
  await page.locator("#studio-field-categories-bestek").check({ force: true });
  await page.getByRole("button", { name: "Opslaan in bewerkversie" }).click();
  await expect(page).toHaveURL(/#\/leveranciers\/rc1k-delete-leverancier$/);
  await page.getByRole("link", { name: "Bewerken" }).click();
  await expect(page).toHaveURL(/#\/leveranciers\/rc1k-delete-leverancier\/bewerken$/);
  await page.getByRole("button", { name: "Definitief verwijderen" }).click();
  await expect(page.getByRole("alertdialog", { name: "Leverancier definitief verwijderen?" })).toBeVisible();
  await page.getByRole("button", { name: "Definitief verwijderen" }).last().click();
  await expect(page).toHaveURL(/#\/leveranciers$/);
  await expect(page.locator("[data-supplier-item]", { hasText: "RC1K delete leverancier" })).toHaveCount(0);
  await page.reload();
  await expect(page.locator("[data-supplier-item]", { hasText: "RC1K delete leverancier" })).toHaveCount(0);
  await page.goto("/studio/index.html#/leveranciers/rc1k-delete-leverancier");
  await expect(page.getByRole("heading", { name: "Leverancier niet gevonden" })).toBeVisible();

  await page.goto("/studio/index.html#/brochures/nieuw");
  await page.getByLabel(/Titel/).fill("RC1K delete brochure");
  await page.getByLabel("Leverancier").selectOption({ label: "Amefa" });
  await page.getByLabel("Jaar").fill("2028");
  await page.getByLabel("Beschrijving").fill("Controlebrochure voor definitief verwijderen.");
  await page.locator("#studio-field-categories-bestek").check({ force: true });
  await page.getByRole("button", { name: "Opslaan in bewerkversie" }).click();
  await expect(page).toHaveURL(/#\/brochures\/rc1k-delete-brochure$/);
  await page.getByRole("link", { name: "Bewerken" }).click();
  await expect(page).toHaveURL(/#\/brochures\/rc1k-delete-brochure\/bewerken$/);
  await page.getByRole("button", { name: "Definitief verwijderen" }).click();
  await expect(page.getByRole("alertdialog", { name: "Brochure definitief verwijderen?" })).toBeVisible();
  await page.getByRole("button", { name: "Definitief verwijderen" }).last().click();
  await expect(page).toHaveURL(/#\/brochures$/);
  await expect(page.locator("[data-brochure-item]", { hasText: "RC1K delete brochure" })).toHaveCount(0);
  await page.reload();
  await expect(page.locator("[data-brochure-item]", { hasText: "RC1K delete brochure" })).toHaveCount(0);
  await page.goto("/studio/index.html#/brochures/rc1k-delete-brochure");
  await expect(page.getByRole("heading", { name: "Brochure niet gevonden" })).toBeVisible();

  await page.goto("/studio/index.html#/kennisbank/nieuw");
  await page.getByLabel("Titel").fill("RC1K delete artikel");
  await page.getByLabel("Samenvatting").fill("Controleartikel voor definitief verwijderen.");
  await page.getByLabel("Inhoud").fill("Deze tekst controleert dat definitief verwijderen uit de bewerkversie werkt.");
  await page.locator("#studio-field-categories-inspiratie").check({ force: true });
  await page.getByRole("button", { name: "Opslaan in bewerkversie" }).click();
  await expect(page).toHaveURL(/#\/kennisbank\/rc1k-delete-artikel$/);
  await page.getByRole("link", { name: "Bewerken" }).click();
  await expect(page).toHaveURL(/#\/kennisbank\/rc1k-delete-artikel\/bewerken$/);
  await page.getByRole("button", { name: "Definitief verwijderen" }).click();
  await expect(page.getByRole("alertdialog", { name: "Artikel definitief verwijderen?" })).toBeVisible();
  await page.getByRole("button", { name: "Definitief verwijderen" }).last().click();
  await expect(page).toHaveURL(/#\/kennisbank$/);
  await expect(page.locator("[data-article-item]", { hasText: "RC1K delete artikel" })).toHaveCount(0);
  await page.reload();
  await expect(page.locator("[data-article-item]", { hasText: "RC1K delete artikel" })).toHaveCount(0);
  await page.goto("/studio/index.html#/kennisbank/rc1k-delete-artikel");
  await expect(page.getByRole("heading", { name: "Kennisbankartikel niet gevonden" })).toBeVisible();

  await expectCleanStudioPage(page, errors);
});

test("Studio toont readiness op detailpagina zonder consolefouten", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  await page.goto("/studio/index.html#/leveranciers/amefa");
  await expect(page.locator("#studio-app")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Amefa", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Klaar voor de website?", level: 2 })).toBeVisible();
  await expect(page.getByText("Publieke website: Leveranciers")).toBeVisible();
  await expectCleanStudioPage(page, errors);
});

test("Studio kennisbankdetail toont workflowacties en headerafbeelding", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  await page.goto("/studio/index.html#/kennisbank/terras-outdoor-inspiratie");
  await expect(page.locator("#studio-app")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Terras & outdoor tafelpresentatie", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Klaarzetten voor website", level: 2 })).toBeVisible();
  await expect(page.locator('[data-article-status-action="concept"]')).toBeVisible();
  await expect(page.locator("[data-article-archive]")).toBeVisible();
  await expect(page.locator("[data-article-hero-preview] img")).toBeVisible();
  await expect(page.locator("[data-article-hero-preview] img")).toHaveAttribute("src", /assets\/images\/blog-terrace\.png/);
  await expect(page.locator("[data-article-hero-preview] code").first()).toHaveText("assets/images/blog-terrace.png");
  await expect(page.locator("[data-article-hero-preview] dl")).toHaveCount(0);
  await expect(page.locator("[data-article-hero-preview]").getByText("Dit bestand staat nog niet geregistreerd in Media.")).toBeVisible();
  await expect(page.locator(".studio-readiness-card").getByRole("link", { name: "Bekijk in Governance" })).toHaveCount(1);

  await page.getByRole("button", { name: "Archiveren" }).click();
  await expect(page.getByRole("alertdialog", { name: "Artikel archiveren?" })).toBeVisible();
  await page.getByRole("button", { name: "Archiveren" }).last().click();
  await expect(page.locator("[data-article-action-feedback]").getByText("Gearchiveerd in bewerkversie")).toBeVisible();
  await expect(page.getByRole("button", { name: "Terug naar concept" })).toBeVisible();
  await expectCleanStudioPage(page, errors);
});

test("Studio brochurebeheer ondersteunt de handmatige bewerkflow", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  await page.goto("/studio/index.html#/brochures/nieuw");
  await expect(page.getByRole("heading", { name: "Nieuwe brochure", level: 1 })).toBeVisible();
  await expect(page.getByLabel("Titel (verplicht)", { exact: true })).toBeVisible();
  await expect(page.getByText("Beschrijving (optioneel)", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Nieuwe leverancier toevoegen" })).toHaveAttribute("target", "_blank");
  await expect(page.locator("#studio-field-pdf-choice")).toHaveAttribute("accept", /pdf/);
  await expect(page.locator("#studio-field-thumbnail-choice")).toHaveAttribute("accept", /image\/jpeg/);

  await page.getByLabel(/Titel/).focus();
  await page.keyboard.press("Tab");
  await expect(page.locator('[data-field-error="title"]')).toHaveText("Vul een brochuretitel in.");
  await page.getByLabel(/Titel/).fill("RC1E praktijkbrochure");
  await expect(page.locator('[data-field-error="title"]')).toHaveText("");
  await expect(page.locator("[data-form-dirty-notice]")).toBeVisible();
  await page.getByRole("link", { name: "Annuleren" }).click();
  await expect(page.getByRole("alertdialog", { name: "Formulier verlaten?" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("alertdialog", { name: "Formulier verlaten?" })).toHaveCount(0);
  await expect(page).toHaveURL(/#\/brochures\/nieuw$/);
  await page.getByRole("link", { name: "Annuleren" }).click();
  await expect(page.getByRole("alertdialog", { name: "Formulier verlaten?" })).toBeVisible();
  await page.getByRole("button", { name: "Blijven bewerken" }).click();
  await expect(page).toHaveURL(/#\/brochures\/nieuw$/);
  await page.getByRole("link", { name: "Annuleren" }).click();
  await page.getByRole("button", { name: "Wijzigingen verwerpen" }).click();
  await expect(page).toHaveURL(/#\/brochures$/);
  await expect(page.getByText("RC1E praktijkbrochure")).toHaveCount(0);

  await page.getByRole("link", { name: "Nieuwe brochure" }).click();
  await page.getByRole("button", { name: "Opslaan in bewerkversie" }).click();
  await expect(page.getByRole("alert", { name: "Controleer het formulier" })).toBeVisible();
  await expect(page.locator('[data-field-error="title"]')).toHaveText("Vul een brochuretitel in.");
  await expect(page.locator('[data-field-error="supplierId"]')).toHaveText("Kies een leverancier.");

  await page.getByLabel(/Titel/).fill("RC1E praktijkbrochure");
  await page.getByLabel("Leverancier").selectOption({ label: "Amefa" });
  await page.getByLabel("Jaar").fill("2026");
  await page.getByLabel("Beschrijving").fill("Interne praktijktest voor brochurebeheer binnen de bewerkversie.");
  await page.locator("#studio-field-categories-bestek").check({ force: true });
  await page.getByRole("button", { name: "Opslaan in bewerkversie" }).click();

  await expect(page).toHaveURL(/#\/brochures\/rc1e-praktijkbrochure$/);
  await expect(page.getByRole("heading", { name: "RC1E praktijkbrochure", level: 1 })).toBeVisible();
  await expect(page.getByText("Nog geen PDF gekoppeld. Gebruik bijvoorbeeld assets/downloads/brochures/amefa-2026.pdf.")).toBeVisible();
  await expect(page.getByText("Dit staat nog niet op de publieke website. De punten hieronder tonen wat nog ontbreekt.")).toBeVisible();
  await expect(page.getByText("PDF aanwezig: Nee, nog geen bestand ingevuld")).toBeVisible();
  await expect(page.getByText("Thumbnail aanwezig: Nee, nog geen bestand ingevuld")).toBeVisible();

  await page.getByRole("link", { name: "Bewerken" }).click();
  await page.getByLabel("Status").selectOption("ready");
  await page.getByRole("button", { name: "Opslaan in bewerkversie" }).click();
  await expect(page.locator('[data-field-error="pdfFile"]')).toHaveText(
    "Vul het bestand van de PDF in voordat deze brochure gereed voor publicatie kan zijn."
  );

  await page.getByLabel("Status").selectOption("concept");
  await page.getByRole("button", { name: "Opslaan in bewerkversie" }).click();
  await expect(page).toHaveURL(/#\/brochures\/rc1e-praktijkbrochure$/);

  await page.getByRole("link", { name: "Terug naar brochures" }).click();
  await expect(page.locator("[data-brochure-item]", { hasText: "RC1E praktijkbrochure" }).first()).toBeVisible();
  await expect(page.getByText("Wijzigingen nog niet geexporteerd")).toBeVisible();
  const exportButton = page.getByRole("button", { name: "Brochuregegevens exporteren" });
  await expect(exportButton).toBeVisible();

  await expectJsonDownload(page, exportButton, "brochures.json");
  await expect(page.getByText("Export gedownload")).toBeVisible();
  await expect(page.getByLabel("Status van de bewerkversie").getByText(/Website bijwerken/)).toBeVisible();

  await page.goto("/pages/brochures-catalogi.html");
  await expect(page.locator("[data-public-brochure-grid]")).not.toContainText("RC1E praktijkbrochure");
  await expect(page.locator("[data-public-brochure-grid] .collection-card")).toHaveCount(2);
  await expect(page.getByRole("link", { name: "Bekijk brochures" })).toHaveCount(2);

  await expectCleanStudioPage(page, errors);
});

test("Studio brochurebeheer ondersteunt RC1H acties zonder repositorydata te wijzigen", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  await page.goto("/studio/index.html#/brochures/amefa-for-professionals-2026/bewerken");
  await expect(page.getByLabel("Verwachte bestandsnaam van de PDF")).toHaveValue(
    "assets/downloads/brochures/amefa-for-professionals-2026.pdf"
  );
  await expect(page.getByLabel("Verwachte bestandsnaam van de afbeelding")).toHaveValue("assets/images/supplier-amefa.jpg");
  await expect(page.getByText("Geen nieuw lokaal bestand gekozen").first()).toBeVisible();
  await expect(page.getByText("Bestaand projectbestand blijft gekoppeld").first()).toBeVisible();
  await page
    .getByLabel("Beschrijving")
    .fill("Brochure met professionele besteklijnen en tafelpresentatie-oplossingen voor horeca en hospitality. Kleine UAT-tekstwijziging.");
  await page.getByRole("button", { name: "Opslaan in bewerkversie" }).click();
  await expect(page).toHaveURL(/#\/brochures\/amefa-for-professionals-2026$/);
  await expect(page.getByText("assets/downloads/brochures/amefa-for-professionals-2026.pdf")).toBeVisible();
  await expect(page.getByRole("link", { name: "Afbeelding bekijken" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "PDF openen" })).toHaveCount(0);
  await expect(page.getByText("PDF status: Projectbestand nog plaatsen of controleren in Media")).toBeVisible();
  await expect(page.getByText("Thumbnail status: Projectbestand nog plaatsen of controleren in Media")).toBeVisible();

  await page.goto("/studio/index.html#/brochures/nieuw");
  await page.getByLabel(/Titel/).fill("RC1H bestandsbrochure");

  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("link", { name: "Nieuwe leverancier toevoegen" }).click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(/studio\/index\.html#\/leveranciers\/nieuw$/);
  await popup.close();
  await expect(page.getByLabel(/Titel/)).toHaveValue("RC1H bestandsbrochure");

  await page
    .locator("#studio-field-pdf-choice")
    .setInputFiles(filePayload("Churchill-catalogus-2027.pdf", "application/pdf", "%PDF-1.4\n% test fixture\n"));
  await expect(page.locator('[data-target-field="pdfFile"] [data-file-choice-name]')).toHaveText("Churchill-catalogus-2027.pdf");
  await expect(page.getByText("Gekozen lokaal bestand gecontroleerd; nog niet geplaatst in de projectmap")).toBeVisible();
  await expect(page.getByText("Studio neemt de gekozen bestandsnaam over").first()).toBeVisible();
  await expect(page.getByLabel("Verwachte bestandsnaam van de PDF")).toHaveValue(
    "assets/downloads/brochures/churchill-catalogus-2027.pdf"
  );

  await page
    .locator("#studio-field-thumbnail-choice")
    .setInputFiles(filePayload("Cover zomer.jpeg", "image/jpeg", "test image fixture"));
  await expect(page.locator('[data-target-field="thumbnail"] [data-file-choice-name]')).toHaveText("Cover zomer.jpeg");
  await expect(page.getByLabel("Verwachte bestandsnaam van de afbeelding")).toHaveValue(
    "assets/images/brochures/cover-zomer.jpeg"
  );

  await page.getByLabel("Verwachte bestandsnaam van de PDF").fill("C:\\temp\\brochure.pdf");
  await page.getByLabel("Leverancier").selectOption({ label: "Amefa" });
  await page.getByLabel("Jaar").fill("2026");
  await page.getByLabel("Beschrijving").fill("Controlebrochure voor de RC1H bewerkversie.");
  await page.locator("#studio-field-categories-bestek").check({ force: true });
  await page.getByRole("button", { name: "Opslaan in bewerkversie" }).click();
  await expect(page.locator('[data-field-error="pdfFile"]')).toContainText("Gebruik een PDF-bestand binnen het project");

  await page.getByLabel("Verwachte bestandsnaam van de PDF").fill("assets/downloads/brochures/churchill-catalogus-2027.pdf");
  await page.getByLabel("Verwachte bestandsnaam van de afbeelding").fill("assets/images/brochures/cover-zomer.jpeg");
  await page.getByRole("button", { name: "Opslaan in bewerkversie" }).click();

  await expect(page).toHaveURL(/#\/brochures\/rc1h-bestandsbrochure$/);
  await expect(page.getByRole("link", { name: "Amefa" })).toHaveAttribute("href", "#/leveranciers/amefa");
  await expect(page.getByRole("link", { name: "Leverancier openen" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "PDF openen" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Afbeelding bekijken" })).toHaveCount(0);
  await expect(page.getByText("Lokaal gekozen bestand beschikbaar; controleer Media").first()).toBeVisible();

  await page.goto("/studio/index.html#/media");
  await expect(page.locator("[data-media-item]", { hasText: "RC1H bestandsbrochure PDF" }).first()).toBeVisible();
  await expect(page.locator("[data-media-item]", { hasText: "RC1H bestandsbrochure thumbnail" }).first()).toBeVisible();

  await page.goto("/studio/index.html#/media");
  const demoPdfAsset = page.locator("[data-media-item]", { hasText: "assets/downloads/brochures/churchill-catalogus-2027.pdf" }).first();
  await expect(demoPdfAsset).toBeVisible();
  await demoPdfAsset.getByRole("link", { name: /bekijken/i }).click();
  await expect(page.getByText("Controleer de beeldrechten voordat dit bestand breder op de website wordt gebruikt.")).toBeVisible();
  await page.getByRole("link", { name: "Bewerken" }).click();
  const pdfRightsCheck = page.getByRole("checkbox", { name: "Beeldrechten gecontroleerd" });
  await expect(pdfRightsCheck).not.toBeChecked();
  await pdfRightsCheck.check();
  await page.getByRole("button", { name: "Opslaan in bewerkversie" }).click();
  await expect(page.getByRole("definition").filter({ hasText: "Beeldrechten gecontroleerd" })).toBeVisible();
  await expect(page.getByText("Controleer de beeldrechten voordat dit bestand breder op de website wordt gebruikt.")).toHaveCount(0);
  await page.getByRole("link", { name: "Bewerken" }).click();
  await expect(page.getByRole("checkbox", { name: "Beeldrechten gecontroleerd" })).toBeChecked();
  await page.getByRole("link", { name: "Bekijken" }).click();
  await expect(page.getByRole("heading", { name: "Klaarzetten voor website", level: 2 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Gereed voor publicatie" })).toBeEnabled();
  await page.getByRole("button", { name: "Gereed voor publicatie" }).click();
  await expect(page.locator("[data-media-action-feedback]").getByText("Status aangepast in bewerkversie")).toBeVisible();
  await expect(page.locator("[data-media-action-feedback]").getByText("Gereed voor publicatie is ingesteld.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Terug naar Concept" })).toBeEnabled();

  await page.goto("/studio/index.html#/media");
  const demoImageAsset = page.locator("[data-media-item]", { hasText: "assets/images/brochures/cover-zomer.jpeg" }).first();
  await expect(demoImageAsset).toBeVisible();
  await demoImageAsset.getByRole("link", { name: /bekijken/i }).click();
  await expect(page.getByRole("heading", { name: "Klaarzetten voor website", level: 2 })).toBeVisible();
  await expect(page.locator(".studio-media-reference img").first()).toHaveAttribute("src", /^blob:/);
  await expect(page.locator(".studio-media-reference img").first()).toHaveAttribute("alt", "RC1H bestandsbrochure thumbnail");
  await expect(page.getByRole("button", { name: "Gereed voor publicatie" })).toBeDisabled();
  await expect(page.getByText("Afbeeldingsassets die gereed zijn voor publicatie hebben alt-tekst nodig.")).toBeVisible();
  await page.getByRole("link", { name: "Bewerken" }).click();
  await expect(page.getByLabel("Status (verplicht)", { exact: true })).toHaveValue("concept");
  const imageRightsCheck = page.getByRole("checkbox", { name: "Beeldrechten gecontroleerd" });
  await expect(imageRightsCheck).not.toBeChecked();
  await page.getByLabel("Alt-tekst").fill("Brochureafbeelding voor RC1H bestandsbrochure.");
  await imageRightsCheck.check();
  await page.getByRole("button", { name: "Opslaan in bewerkversie" }).click();
  await expect(page.getByRole("heading", { name: "Klaarzetten voor website", level: 2 })).toBeVisible();
  await expect(page.getByText("Controleer de beeldrechten voordat dit bestand breder op de website wordt gebruikt.")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Gereed voor publicatie" })).toBeEnabled();
  await page.getByRole("button", { name: "Gereed voor publicatie" }).click();
  await expect(page.locator("[data-media-action-feedback]").getByText("Gereed voor publicatie is ingesteld.")).toBeVisible();

  await page.goto("/studio/index.html#/brochures/rc1h-bestandsbrochure");
  const pdfOpenLink = page.getByRole("link", { name: "PDF openen" });
  const imageOpenLink = page.getByRole("link", { name: "Afbeelding bekijken" });
  await expect(pdfOpenLink).toHaveAttribute("href", /^blob:/);
  await expect(imageOpenLink).toHaveAttribute("href", /^blob:/);
  await expect(page.getByText("PDF status: Lokaal gekozen bestand en Media zijn gecontroleerd")).toBeVisible();
  await expect(page.getByText("Thumbnail status: Lokaal gekozen bestand en Media zijn gecontroleerd")).toBeVisible();

  const publishButton = page.locator('[data-brochure-status-action="ready"]');
  await expect(publishButton).toBeEnabled();
  await publishButton.click();
  await expect(page.getByRole("alertdialog", { name: "Brochure gereed voor publicatie zetten?" })).toBeVisible();
  await page.getByRole("button", { name: "Gereed voor publicatie" }).last().click();
  await expect(page.getByText("Status aangepast in bewerkversie")).toBeVisible();
  await expect(page.locator("[data-brochure-action-feedback]").getByText(/Gegevens exporteren/)).toBeVisible();

  await page.getByRole("button", { name: "Terug naar concept" }).click();
  await expect(page.getByRole("alertdialog", { name: "Terug naar concept?" })).toBeVisible();
  await page.getByRole("button", { name: "Terug naar concept" }).last().click();
  await expect(page.getByText("Status aangepast in bewerkversie")).toBeVisible();
  await expect(page.getByText("Concept").first()).toBeVisible();

  await page.getByRole("link", { name: "Terug naar brochures" }).click();
  await expect(page.locator("[data-brochure-item]", { hasText: "RC1H bestandsbrochure" }).first()).toBeVisible();

  await page.goto("/pages/brochures-catalogi.html");
  await expect(page.locator("[data-public-brochure-grid]")).not.toContainText("RC1H bestandsbrochure");

  await expectCleanStudioPage(page, errors);
});

test("Studio brochurebeheer maakt nieuwe jaargang zonder oude brochure te overschrijven", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  await page.goto("/studio/index.html#/brochures/amefa-for-professionals-2026");
  await page.getByRole("button", { name: "Nieuwe jaargang toevoegen" }).click();
  await expect(page.getByRole("alertdialog", { name: "Nieuwe jaargang toevoegen?" })).toBeVisible();
  await page.getByRole("button", { name: "Nieuwe jaargang maken" }).click();

  await expect(page).toHaveURL(/#\/brochures\/amefa-for-professionals-2027\/bewerken$/);
  await expect(page.getByLabel(/Titel/)).toHaveValue(amefaNextEditionTitle);
  await expect(page.getByLabel("URL-naam")).toHaveValue("amefa-for-professionals-2027");
  await expect(page.getByLabel("Jaar")).toHaveValue("2027");
  await expect(page.getByLabel("Status")).toHaveValue("concept");
  await expect(page.getByLabel("Verwachte bestandsnaam van de PDF")).toHaveValue(
    "assets/downloads/brochures/amefa-for-professionals-2027.pdf"
  );
  await expect(page.getByLabel("Verwachte bestandsnaam van de afbeelding")).toHaveValue("assets/images/supplier-amefa.jpg");
  await expect(page.getByText("Geen nieuw lokaal bestand gekozen").first()).toBeVisible();
  await expect(page.getByText("Bestaand projectbestand blijft gekoppeld").first()).toBeVisible();

  await page.getByRole("link", { name: "Terug naar brochures" }).click();
  await expect(page.locator("[data-brochure-item]", { hasText: "Amefa for Professionals 2026" }).first()).toBeVisible();
  await expect(page.locator("[data-brochure-item]", { hasText: "Amefa for Professionals 2027" }).first()).toBeVisible();

  await page.goto("/studio/index.html#/brochures/churchill-combined-brochure-2026");
  await expect(page.getByRole("heading", { name: "Churchill Combined Brochure 2026", level: 1 })).toBeVisible();
  await expect(page.getByText("Bestek, Buffet & presentatie, Servies")).toBeVisible();

  await expectCleanStudioPage(page, errors);
});

test("Studio contentbeheerflows tonen bewerkstatus, validatie en export per module", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  await page.goto("/studio/index.html#/leveranciers/nieuw");
  await expect(page.getByRole("heading", { name: "Nieuwe leverancier", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Opslaan in bewerkversie" }).click();
  await expect(page.locator('[data-field-error="name"]')).toHaveText("Vul een leveranciersnaam in.");
  await page.locator("#studio-field-name").fill("RC1F leverancier");
  await page.locator("#studio-field-categories-bestek").check({ force: true });
  await page.getByRole("button", { name: "Opslaan in bewerkversie" }).click();
  await expect(page).toHaveURL(/#\/leveranciers\/rc1f-leverancier$/);
  await expect(page.getByText("Dit staat nog niet op de publieke website. De punten hieronder tonen wat nog ontbreekt.")).toBeVisible();
  await page.getByRole("link", { name: "Bewerken" }).click();
  await page.getByLabel("Samenvatting").fill("Beheercontrole voor een nieuwe leverancier in de bewerkversie.");
  await page.getByRole("button", { name: "Opslaan in bewerkversie" }).click();
  await expect(page).toHaveURL(/#\/leveranciers\/rc1f-leverancier$/);
  await page.getByRole("link", { name: "Terug naar overzicht" }).click();
  await expect(page.locator("[data-supplier-item]", { hasText: "RC1F leverancier" }).first()).toBeVisible();
  await expect(page.getByText("Wijzigingen nog niet geexporteerd")).toBeVisible();
  await expectJsonDownload(page, page.getByRole("button", { name: "Leveranciersgegevens exporteren" }), "suppliers.json");
  await expect(page.getByText("Export gedownload")).toBeVisible();

  await page.goto("/studio/index.html#/kennisbank");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.getByRole("link", { name: "Nieuw artikel" }).click();
  await expect(page).toHaveURL(/#\/kennisbank\/nieuw$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.getByRole("heading", { name: "Nieuw artikel", level: 1 })).toBeVisible();
  await expect(page.getByText("Bestand van de headerafbeelding")).toHaveCount(0);
  await expect(page.locator("[data-article-image-picker]")).toBeVisible();
  await page.locator("[data-article-image-choice]").setInputFiles(
    filePayload("Cover zomer.jpeg", "image/jpeg", "article image fixture")
  );
  await expect(page.locator("[data-article-image-picker] [data-file-choice-name]")).toHaveText("Cover zomer.jpeg");
  await expect(page.locator('input[name="heroImage"]')).toHaveValue("assets/images/cover-zomer.jpeg");
  await expect(page.locator("[data-article-image-picker] [data-file-choice-expected]")).toHaveText(
    "assets/images/cover-zomer.jpeg"
  );
  await page.getByLabel("Titel").fill("RC1F artikel");
  await page.getByLabel("Status").selectOption("ready");
  await page.getByRole("button", { name: "Opslaan in bewerkversie" }).click();
  await expect(page.locator('[data-field-error="summary"]')).toHaveText(
    "Vul een samenvatting in voordat dit artikel gereed is voor publicatie."
  );
  await expect(page.locator('[data-field-error="categories"]')).toHaveText(
    "Kies minimaal een categorie voordat dit artikel gereed is voor publicatie."
  );
  await page.getByLabel("Samenvatting").fill("Korte controlecopy voor kennisbankbeheer in de bewerkversie.");
  await page.getByLabel("Inhoud").fill("Deze tekst blijft in de bewerkversie totdat de gegevens handmatig zijn geexporteerd.");
  await page.locator("#studio-field-categories-inspiratie").check({ force: true });
  await page.getByRole("button", { name: "Opslaan in bewerkversie" }).click();
  await expect(page).toHaveURL(/#\/kennisbank\/rc1f-artikel$/);
  await expect(page.getByText("Dit item is gereed in de bewerkversie, maar staat nog niet in de publieke dataset.")).toBeVisible();
  await expect(page.getByText("Afbeeldingsbestand nog niet beschikbaar in de projectmap.")).toBeVisible();
  await page.getByRole("link", { name: "Terug naar kennisbank" }).click();
  await expect(page.locator("[data-article-item]", { hasText: "RC1F artikel" }).first()).toBeVisible();
  await expect(page.getByText("Wijzigingen nog niet geexporteerd")).toBeVisible();
  await expectJsonDownload(page, page.getByRole("button", { name: "Artikelgegevens exporteren" }), "articles.json");
  await expect(page.getByText("Export gedownload")).toBeVisible();

  await page.goto("/studio/index.html#/bibliotheek/nieuw");
  await expect(page.getByRole("heading", { name: "Nieuw bibliotheekitem", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Opslaan in bewerkversie" }).click();
  await expect(page.locator('[data-field-error="title"]')).toHaveText("Vul een titel in.");
  await page.getByLabel("Titel").fill("RC1F bibliotheekitem");
  await page.getByLabel("Samenvatting").fill("Beheercontrole voor een nieuw bibliotheekitem in de bewerkversie.");
  await page.getByRole("button", { name: "Opslaan in bewerkversie" }).click();
  await expect(page).toHaveURL(/#\/bibliotheek\/rc1f-bibliotheekitem$/);
  await expect(page.getByRole("heading", { name: "Klaar voor de website?", level: 2 })).toBeVisible();
  await page.getByRole("link", { name: "Terug naar bibliotheek" }).click();
  await expect(page.locator("[data-library-item]", { hasText: "RC1F bibliotheekitem" }).first()).toBeVisible();
  await expect(page.getByText("Wijzigingen nog niet geexporteerd")).toBeVisible();
  await page.getByRole("link", { name: "Gegevens exporteren" }).click();
  await expect(page.getByRole("heading", { name: "Bibliotheekgegevens exporteren", level: 1 })).toBeVisible();
  await expectJsonDownload(page, page.getByRole("button", { name: "Gegevens exporteren" }), "library.json");
  await expect(page.getByText("Export gedownload")).toBeVisible();

  await expectCleanStudioPage(page, errors);
});
