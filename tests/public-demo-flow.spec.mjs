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

async function expectCleanPage(page, errors) {
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
  await expect(page.locator("text=/niet geladen|konden niet worden geladen|Content niet geladen/i")).toHaveCount(0);
  const brokenImages = await page.locator("img").evaluateAll((images) =>
    images
      .filter((image) => !image.complete || image.naturalWidth === 0)
      .map((image) => image.getAttribute("src"))
  );
  expect(brokenImages).toEqual([]);
  expect(errors).toEqual([]);
}

test("publieke demo-flow loopt van homepage naar artikel, leverancier en brochure", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  await page.goto("/index.html");
  await expect(page.locator("[data-home-article-grid] .article-card")).toHaveCount(2);
  await expect(page.getByRole("link", { name: /Start met inspiratie/i })).toBeVisible();
  const homepageArticleCard = page.locator("[data-home-article-grid] .article-card", {
    hasText: "Professioneel tafelconcept"
  });
  await expect(homepageArticleCard).toHaveCount(1);
  await expect(homepageArticleCard).toHaveAttribute(
    "href",
    /pages\/inspiratie\.html#professioneel-tafelconcept-hospitality$/
  );
  await expectCleanPage(page, errors);

  await homepageArticleCard.click();
  await expect(page).toHaveURL(/pages\/inspiratie\.html#professioneel-tafelconcept-hospitality$/);
  await expect(page.locator("[data-public-article-overview]")).toBeHidden();
  await expect(page.locator("[data-public-article-body] h2")).toHaveText("Professioneel tafelconcept voor hospitality");
  await expect(page.locator("[data-public-article-body]")).not.toContainText("Terras & outdoor tafelpresentatie");
  await expect(page).toHaveTitle("Professioneel tafelconcept voor hospitality | Non-Food Hub");
  const supplierCta = page.getByRole("link", { name: /Bekijk Amefa/i });
  await expect(supplierCta).toBeVisible();
  await expect(supplierCta).toHaveCSS("color", "rgb(255, 255, 255)");
  await supplierCta.focus();
  await expect(supplierCta).toBeFocused();
  await expect(supplierCta).toHaveCSS("color", "rgb(255, 255, 255)");
  await expectCleanPage(page, errors);

  await supplierCta.click();
  await expect(page).toHaveURL(/pages\/leveranciers\.html#amefa$/);
  await expect(page.locator("[data-public-supplier-overview]")).toBeHidden();
  await expect(page.locator("[data-public-supplier-extra]")).toBeHidden();
  await expect(page.locator("[data-public-supplier-detail] h2")).toHaveText("Amefa");
  await expect(page).toHaveTitle("Amefa | Non-Food Hub");
  const primaryBrochureLink = page.locator(
    '[data-public-supplier-detail] .section-actions .btn-primary[href$="#amefa-for-professionals-2026"]'
  );
  await expect(primaryBrochureLink).toHaveCount(1);
  await expect(primaryBrochureLink).toBeVisible();
  await expect(page.getByRole("link", { name: /Terug naar leveranciers/i })).toBeVisible();
  await expectCleanPage(page, errors);

  await primaryBrochureLink.click();
  await expect(page).toHaveURL(/pages\/brochures-catalogi\.html#amefa-for-professionals-2026$/);
  await expect(page.locator("[data-public-brochure-intro]")).toBeHidden();
  await expect(page.locator("[data-public-brochure-overview]")).toBeHidden();
  await expect(page.locator("[data-public-brochure-detail] h2")).toHaveText("Amefa for Professionals 2026");
  await expect(page).toHaveTitle("Amefa for Professionals 2026 | Non-Food Hub");
  await expect(page.locator("[data-public-brochure-detail]").getByText("PDF nog niet beschikbaar")).toBeVisible();
  await expect(page.getByRole("link", { name: /Terug naar brochures/i })).toBeVisible();
  await expectCleanPage(page, errors);

  await page.getByRole("link", { name: /Terug naar brochures/i }).click();
  await expect(page).toHaveURL(/pages\/brochures-catalogi\.html$/);
  await expect(page.locator("[data-public-brochure-grid] .resource-card")).toHaveCount(1);
  await expectCleanPage(page, errors);
});

test("overzicht en detail blijven gescheiden bij directe publieke URLs", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  await page.goto("/pages/inspiratie.html");
  await expect(page.locator("[data-public-article-overview]")).toBeVisible();
  await expect(page.locator("[data-public-article-detail-section]")).toBeHidden();
  await expect(page.locator("[data-public-article-grid] .article-card")).toHaveCount(2);
  await expectCleanPage(page, errors);

  await page.goto("/pages/inspiratie.html#professioneel-tafelconcept-hospitality");
  await expect(page.locator("[data-public-article-overview]")).toBeHidden();
  await expect(page.locator("[data-public-article-body] h2")).toHaveText("Professioneel tafelconcept voor hospitality");
  await expect(page.locator("[data-public-article-body]")).not.toContainText("Terras & outdoor tafelpresentatie");
  await expectCleanPage(page, errors);

  await page.goto("/pages/leveranciers.html");
  await expect(page.locator("[data-public-supplier-overview]")).toBeVisible();
  await expect(page.locator("[data-public-supplier-detail-section]")).toBeHidden();
  await expect(page.locator("[data-public-supplier-grid] .supplier-card")).toHaveCount(1);
  await expectCleanPage(page, errors);

  await page.goto("/pages/leveranciers.html#amefa");
  await expect(page.locator("[data-public-supplier-overview]")).toBeHidden();
  await expect(page.locator("[data-public-supplier-extra]")).toBeHidden();
  await expect(page.locator("[data-public-supplier-detail] h2")).toHaveText("Amefa");
  await expectCleanPage(page, errors);

  await page.goto("/pages/brochures-catalogi.html");
  await expect(page.locator("[data-public-brochure-intro]")).toBeVisible();
  await expect(page.locator("[data-public-brochure-overview]")).toBeVisible();
  await expect(page.locator("[data-public-brochure-detail-section]")).toBeHidden();
  await expect(page.locator("[data-public-brochure-grid] .resource-card")).toHaveCount(1);
  await expectCleanPage(page, errors);

  await page.goto("/pages/brochures-catalogi.html#amefa-for-professionals-2026");
  await expect(page.locator("[data-public-brochure-intro]")).toBeHidden();
  await expect(page.locator("[data-public-brochure-overview]")).toBeHidden();
  await expect(page.locator("[data-public-brochure-detail] h2")).toHaveText("Amefa for Professionals 2026");
  await expectCleanPage(page, errors);
});
