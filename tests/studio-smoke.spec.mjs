import { expect, test } from "@playwright/test";

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

const studioRoutes = [
  { path: "/studio/index.html#/dashboard", heading: "Dashboard" },
  { path: "/studio/index.html#/governance", heading: "Governance" },
  { path: "/studio/index.html#/leveranciers", heading: "Leveranciers" },
  { path: "/studio/index.html#/brochures", heading: "Brochures" },
  { path: "/studio/index.html#/kennisbank", heading: "Kennisbank" },
  { path: "/studio/index.html#/bibliotheek", heading: "Bibliotheek" }
];

for (const route of studioRoutes) {
  test(`Studio opent ${route.heading} zonder consolefouten`, async ({ page }) => {
    const errors = collectConsoleErrors(page);

    await page.goto(route.path);
    await expect(page.locator("#studio-app")).toBeVisible();
    await expect(page.getByRole("heading", { name: route.heading, level: 1 })).toBeVisible();
    await expectCleanStudioPage(page, errors);
  });
}

test("Studio toont readiness op detailpagina zonder consolefouten", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  await page.goto("/studio/index.html#/leveranciers/amefa");
  await expect(page.locator("#studio-app")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Amefa", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Content readiness", level: 2 })).toBeVisible();
  await expect(page.getByText("Websiteweergave: Leveranciers")).toBeVisible();
  await expectCleanStudioPage(page, errors);
});

test("Studio brochurebeheer ondersteunt de handmatige werksessieflow", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  await page.goto("/studio/index.html#/brochures/nieuw");
  await expect(page.getByRole("heading", { name: "Nieuwe brochure", level: 1 })).toBeVisible();

  await page.getByLabel(/Titel/).fill("RC1E praktijkbrochure");
  await expect(page.locator("[data-form-dirty-notice]")).toBeVisible();
  await page.getByRole("link", { name: "Annuleren" }).click();
  await expect(page.getByRole("alertdialog", { name: "Formulier verlaten?" })).toBeVisible();
  await page.getByRole("button", { name: "Blijven bewerken" }).click();
  await expect(page).toHaveURL(/#\/brochures\/nieuw$/);
  await page.getByRole("link", { name: "Annuleren" }).click();
  await page.getByRole("button", { name: "Wijzigingen verwerpen" }).click();
  await expect(page).toHaveURL(/#\/brochures$/);
  await expect(page.getByText("RC1E praktijkbrochure")).toHaveCount(0);

  await page.getByRole("link", { name: "Nieuwe brochure" }).click();
  await page.getByRole("button", { name: "Opslaan in deze sessie" }).click();
  await expect(page.getByRole("alert", { name: "Controleer het formulier" })).toBeVisible();
  await expect(page.locator('[data-field-error="title"]')).toHaveText("Vul een brochuretitel in.");
  await expect(page.locator('[data-field-error="supplierId"]')).toHaveText("Kies een leverancier.");

  await page.getByLabel(/Titel/).fill("RC1E praktijkbrochure");
  await page.getByLabel("Leverancier").selectOption({ label: "Amefa" });
  await page.getByLabel("Jaar").fill("2026");
  await page.getByLabel("Beschrijving").fill("Interne praktijktest voor brochurebeheer binnen de Studio-werksessie.");
  await page.locator("#studio-field-categories-bestek").check({ force: true });
  await page.getByRole("button", { name: "Opslaan in deze sessie" }).click();

  await expect(page).toHaveURL(/#\/brochures\/rc1e-praktijkbrochure$/);
  await expect(page.getByRole("heading", { name: "RC1E praktijkbrochure", level: 1 })).toBeVisible();
  await expect(page.getByText("Geen PDF gekoppeld. Dit is toegestaan bij concepten.")).toBeVisible();
  await expect(page.getByText("Dit staat niet live.")).toBeVisible();
  await expect(page.getByText("PDF aanwezig: Nee, geen pad ingevuld")).toBeVisible();
  await expect(page.getByText("Thumbnail aanwezig: Nee, geen pad ingevuld")).toBeVisible();

  await page.getByRole("link", { name: "Bewerken" }).click();
  await page.getByLabel("Status").selectOption("review");
  await page.getByRole("button", { name: "Opslaan in deze sessie" }).click();
  await expect(page.locator('[data-field-error="pdfFile"]')).toHaveText(
    "Een brochure ter controle of gepubliceerd heeft een PDF-pad nodig."
  );

  await page.getByLabel("Status").selectOption("concept");
  await page.getByRole("button", { name: "Opslaan in deze sessie" }).click();
  await expect(page).toHaveURL(/#\/brochures\/rc1e-praktijkbrochure$/);

  await page.getByRole("link", { name: "Terug naar brochures" }).click();
  await expect(page.locator("[data-brochure-item]", { hasText: "RC1E praktijkbrochure" }).first()).toBeVisible();
  await expect(page.getByText("Wijzigingen nog niet geëxporteerd")).toBeVisible();
  const exportButton = page.getByRole("button", { name: "Brochuregegevens exporteren" });
  await expect(exportButton).toBeVisible();

  await expectJsonDownload(page, exportButton, "brochures.json");
  await expect(page.getByText("Export gedownload")).toBeVisible();
  await expect(page.getByLabel("Werksessiestatus").getByText(/werk de publieke websitegegevens bij/)).toBeVisible();

  await page.goto("/pages/brochures-catalogi.html");
  await expect(page.locator("[data-public-brochure-grid]")).not.toContainText("RC1E praktijkbrochure");
  await expect(page.locator("[data-public-brochure-grid] .resource-card")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Download brochure" })).toHaveCount(0);

  await expectCleanStudioPage(page, errors);
});

test("Studio contentbeheerflows tonen sessiestatus, validatie en export per module", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  await page.goto("/studio/index.html#/leveranciers/nieuw");
  await expect(page.getByRole("heading", { name: "Nieuwe leverancier", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Opslaan in deze sessie" }).click();
  await expect(page.locator('[data-field-error="name"]')).toHaveText("Vul een leveranciersnaam in.");
  await page.locator("#studio-field-name").fill("RC1F leverancier");
  await page.locator("#studio-field-categories-bestek").check({ force: true });
  await page.getByRole("button", { name: "Opslaan in deze sessie" }).click();
  await expect(page).toHaveURL(/#\/leveranciers\/rc1f-leverancier$/);
  await expect(page.getByText("Dit staat niet live.")).toBeVisible();
  await page.getByRole("link", { name: "Bewerken" }).click();
  await page.getByLabel("Samenvatting").fill("Beheercontrole voor een nieuwe leverancier in deze Studio-sessie.");
  await page.getByRole("button", { name: "Opslaan in deze sessie" }).click();
  await expect(page).toHaveURL(/#\/leveranciers\/rc1f-leverancier$/);
  await page.getByRole("link", { name: "Terug naar overzicht" }).click();
  await expect(page.locator("[data-supplier-item]", { hasText: "RC1F leverancier" }).first()).toBeVisible();
  await expect(page.getByText("Wijzigingen nog niet geëxporteerd")).toBeVisible();
  await expectJsonDownload(page, page.getByRole("button", { name: "Leveranciersgegevens exporteren" }), "suppliers.json");
  await expect(page.getByText("Export gedownload")).toBeVisible();

  await page.goto("/studio/index.html#/kennisbank/nieuw");
  await expect(page.getByRole("heading", { name: "Nieuw artikel", level: 1 })).toBeVisible();
  await page.getByLabel("Titel").fill("RC1F artikel");
  await page.getByLabel("Status").selectOption("review");
  await page.getByRole("button", { name: "Opslaan in deze sessie" }).click();
  await expect(page.locator('[data-field-error="summary"]')).toHaveText(
    "Vul een samenvatting in voor review of publicatie."
  );
  await expect(page.locator('[data-field-error="categories"]')).toHaveText(
    "Kies minimaal een categorie voor review of publicatie."
  );
  await page.getByLabel("Samenvatting").fill("Korte controlecopy voor kennisbankbeheer in deze Studio-sessie.");
  await page.getByLabel("Inhoud").fill("Deze tekst blijft in de Studio-sessie totdat de gegevens handmatig zijn geëxporteerd.");
  await page.locator("#studio-field-categories-inspiratie").check({ force: true });
  await page.getByRole("button", { name: "Opslaan in deze sessie" }).click();
  await expect(page).toHaveURL(/#\/kennisbank\/rc1f-artikel$/);
  await expect(page.getByText("Dit staat niet live.")).toBeVisible();
  await page.getByRole("link", { name: "Terug naar kennisbank" }).click();
  await expect(page.locator("[data-article-item]", { hasText: "RC1F artikel" }).first()).toBeVisible();
  await expect(page.getByText("Wijzigingen nog niet geëxporteerd")).toBeVisible();
  await expectJsonDownload(page, page.getByRole("button", { name: "Artikelgegevens exporteren" }), "articles.json");
  await expect(page.getByText("Export gedownload")).toBeVisible();

  await page.goto("/studio/index.html#/bibliotheek/nieuw");
  await expect(page.getByRole("heading", { name: "Nieuw bibliotheekitem", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Opslaan in deze sessie" }).click();
  await expect(page.locator('[data-field-error="title"]')).toHaveText("Vul een titel in.");
  await page.getByLabel("Titel").fill("RC1F bibliotheekitem");
  await page.getByLabel("Samenvatting").fill("Beheercontrole voor een nieuw bibliotheekitem in deze Studio-sessie.");
  await page.getByRole("button", { name: "Opslaan in deze sessie" }).click();
  await expect(page).toHaveURL(/#\/bibliotheek\/rc1f-bibliotheekitem$/);
  await expect(page.getByRole("heading", { name: "Content readiness", level: 2 })).toBeVisible();
  await page.getByRole("link", { name: "Terug naar bibliotheek" }).click();
  await expect(page.locator("[data-library-item]", { hasText: "RC1F bibliotheekitem" }).first()).toBeVisible();
  await expect(page.getByText("Wijzigingen nog niet geëxporteerd")).toBeVisible();
  await page.getByRole("link", { name: "Gegevens exporteren" }).click();
  await expect(page.getByRole("heading", { name: "Bibliotheekgegevens exporteren", level: 1 })).toBeVisible();
  await expectJsonDownload(page, page.getByRole("button", { name: "Gegevens exporteren" }), "library.json");
  await expect(page.getByText("Export gedownload")).toBeVisible();

  await expectCleanStudioPage(page, errors);
});
