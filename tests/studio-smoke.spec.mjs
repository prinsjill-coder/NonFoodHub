import { expect, test } from "@playwright/test";
import { Buffer } from "node:buffer";

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

const studioRoutes = [
  { path: "/studio/index.html#/dashboard", heading: "Dashboard" },
  { path: "/studio/index.html#/governance", heading: "Governance" },
  { path: "/studio/index.html#/leveranciers", heading: "Leveranciers", workflow: true },
  { path: "/studio/index.html#/brochures", heading: "Brochures", workflow: true },
  { path: "/studio/index.html#/media", heading: "Media", workflow: true },
  { path: "/studio/index.html#/kennisbank", heading: "Kennisbank", workflow: true },
  { path: "/studio/index.html#/bibliotheek", heading: "Bibliotheek" }
];

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
      await expect(workflow.getByText("Review", { exact: true })).toBeVisible();
      await expect(workflow.getByText("Publiceerbaar", { exact: true })).toBeVisible();
      await expect(workflow.getByText("Gepubliceerd", { exact: true })).toBeVisible();
    }
    await expectCleanStudioPage(page, errors);
  });
}

test("Studio toont readiness op detailpagina zonder consolefouten", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  await page.goto("/studio/index.html#/leveranciers/amefa");
  await expect(page.locator("#studio-app")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Amefa", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Klaar voor de website?", level: 2 })).toBeVisible();
  await expect(page.getByText("Publieke website: Leveranciers")).toBeVisible();
  await expectCleanStudioPage(page, errors);
});

test("Studio brochurebeheer ondersteunt de handmatige bewerkflow", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  await page.goto("/studio/index.html#/brochures/nieuw");
  await expect(page.getByRole("heading", { name: "Nieuwe brochure", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Nieuwe leverancier toevoegen" })).toHaveAttribute("target", "_blank");
  await expect(page.locator("#studio-field-pdf-choice")).toHaveAttribute("accept", /pdf/);
  await expect(page.locator("#studio-field-thumbnail-choice")).toHaveAttribute("accept", /image\/jpeg/);

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
  await page.getByLabel("Status").selectOption("review");
  await page.getByRole("button", { name: "Opslaan in bewerkversie" }).click();
  await expect(page.locator('[data-field-error="pdfFile"]')).toHaveText(
    "Vul het bestand van de PDF in voordat deze brochure Review of Gepubliceerd kan zijn."
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
  await expect(page.locator("[data-public-brochure-grid] .resource-card")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Download brochure" })).toHaveCount(0);

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
  await expect(page.getByRole("link", { name: "Afbeelding bekijken" })).toBeVisible();
  await expect(page.getByRole("link", { name: "PDF openen" })).toHaveCount(0);
  await expect(page.getByText("PDF status: Projectbestand nog plaatsen of controleren in Media")).toBeVisible();

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
  await expect(page.getByText("Beeldrechten gecontroleerd")).toBeVisible();
  await expect(page.getByText("Controleer de beeldrechten voordat dit bestand breder op de website wordt gebruikt.")).toHaveCount(0);
  await page.getByRole("link", { name: "Bewerken" }).click();
  await expect(page.getByRole("checkbox", { name: "Beeldrechten gecontroleerd" })).toBeChecked();
  await page.getByRole("link", { name: "Bekijken" }).click();
  await expect(page.getByRole("heading", { name: "Klaarzetten voor gebruik", level: 2 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Naar Review" })).toBeEnabled();
  await page.getByRole("button", { name: "Naar Review" }).click();
  await expect(page.locator("[data-media-action-feedback]").getByText("Status aangepast in bewerkversie")).toBeVisible();
  await expect(page.locator("[data-media-action-feedback]").getByText("Review is ingesteld.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Publiceren" })).toBeEnabled();
  await page.getByRole("button", { name: "Publiceren" }).click();
  await expect(page.locator("[data-media-action-feedback]").getByText("Gepubliceerd is ingesteld.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Terug naar Review" })).toBeEnabled();
  await page.getByRole("button", { name: "Terug naar Review" }).click();
  await expect(page.locator("[data-media-action-feedback]").getByText("Review is ingesteld.")).toBeVisible();

  await page.goto("/studio/index.html#/media");
  const demoImageAsset = page.locator("[data-media-item]", { hasText: "assets/images/brochures/cover-zomer.jpeg" }).first();
  await expect(demoImageAsset).toBeVisible();
  await demoImageAsset.getByRole("link", { name: /bekijken/i }).click();
  await expect(page.getByRole("heading", { name: "Klaarzetten voor gebruik", level: 2 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Naar Review" })).toBeDisabled();
  await expect(page.getByText("Afbeeldingsassets met status review of published hebben alt-tekst nodig.")).toBeVisible();
  await page.getByRole("link", { name: "Bewerken" }).click();
  await expect(page.getByLabel("Status (verplicht)", { exact: true })).toHaveValue("concept");
  const imageRightsCheck = page.getByRole("checkbox", { name: "Beeldrechten gecontroleerd" });
  await expect(imageRightsCheck).not.toBeChecked();
  await page.getByLabel("Alt-tekst").fill("Brochureafbeelding voor RC1H bestandsbrochure.");
  await imageRightsCheck.check();
  await page.getByRole("button", { name: "Opslaan in bewerkversie" }).click();
  await expect(page.getByRole("heading", { name: "Klaarzetten voor gebruik", level: 2 })).toBeVisible();
  await expect(page.getByText("Controleer de beeldrechten voordat dit bestand breder op de website wordt gebruikt.")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Naar Review" })).toBeEnabled();
  await page.getByRole("button", { name: "Naar Review" }).click();
  await expect(page.locator("[data-media-action-feedback]").getByText("Review is ingesteld.")).toBeVisible();

  await page.goto("/studio/index.html#/brochures/rc1h-bestandsbrochure");
  const pdfOpenLink = page.getByRole("link", { name: "PDF openen" });
  const imageOpenLink = page.getByRole("link", { name: "Afbeelding bekijken" });
  await expect(pdfOpenLink).toHaveAttribute("href", /^blob:/);
  await expect(imageOpenLink).toHaveAttribute("href", /^blob:/);
  await expect(page.getByText("PDF status: Lokaal gekozen bestand en Media zijn gecontroleerd")).toBeVisible();
  await expect(page.getByText("Thumbnail status: Lokaal gekozen bestand en Media zijn gecontroleerd")).toBeVisible();

  const publishButton = page.locator('[data-brochure-status-action="published"]');
  await expect(publishButton).toBeEnabled();
  await publishButton.click();
  await expect(page.getByRole("alertdialog", { name: "Brochure publiceren?" })).toBeVisible();
  await page.getByRole("button", { name: "Publiceren" }).last().click();
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
  await expect(page.getByLabel(/Titel/)).toHaveValue("Amefa for Professionals 2027");
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
  await expect(page.locator('[data-brochure-status-action="published"]')).toBeDisabled();
  await expect(page.getByText("Een gepubliceerde brochure heeft een afbeelding nodig.")).toBeVisible();
  await expect(page.getByRole("link", { name: "PDF openen" })).toHaveCount(0);
  await expect(page.getByText("Mediaregistratie ontbreekt").first()).toBeVisible();

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
  await page.getByLabel("Status").selectOption("review");
  await page.getByRole("button", { name: "Opslaan in bewerkversie" }).click();
  await expect(page.locator('[data-field-error="summary"]')).toHaveText(
    "Vul een samenvatting in voor review of publicatie."
  );
  await expect(page.locator('[data-field-error="categories"]')).toHaveText(
    "Kies minimaal een categorie voor review of publicatie."
  );
  await page.getByLabel("Samenvatting").fill("Korte controlecopy voor kennisbankbeheer in de bewerkversie.");
  await page.getByLabel("Inhoud").fill("Deze tekst blijft in de bewerkversie totdat de gegevens handmatig zijn geexporteerd.");
  await page.locator("#studio-field-categories-inspiratie").check({ force: true });
  await page.getByRole("button", { name: "Opslaan in bewerkversie" }).click();
  await expect(page).toHaveURL(/#\/kennisbank\/rc1f-artikel$/);
  await expect(page.getByText("Dit staat nog niet op de publieke website. De punten hieronder tonen wat nog ontbreekt.")).toBeVisible();
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
