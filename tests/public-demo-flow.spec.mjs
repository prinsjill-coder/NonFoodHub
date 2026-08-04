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
  await expect(page.locator("body")).not.toContainText(/\b(?:demo|todo|test|pilot|prototype|voorbeeld)\b|Notion|Fase 1/i);
  const brokenImages = await page.locator("img").evaluateAll((images) =>
    images
      .filter((image) => image.naturalWidth === 0)
      .map((image) => image.getAttribute("src"))
  );
  const brokenHeroImages = await page.locator(".hero, .page-hero.has-image").evaluateAll(async (heroes) => {
    const checks = await Promise.all(
      heroes.map(async (hero) => {
        const raw = getComputedStyle(hero).getPropertyValue("--hero-image") || getComputedStyle(hero).getPropertyValue("--page-image");
        const match = raw.match(/url\(["']?([^"')]+)["']?\)/);
        if (!match) return { ok: false, url: raw };

        const stylesheetBase = new URL("/assets/css/styles.css", document.baseURI);
        const url = new URL(match[1], stylesheetBase).href;
        const response = await fetch(url, { cache: "no-store" });
        return { ok: response.ok && url.includes("/assets/images/"), url };
      })
    );

    return checks.filter((check) => !check.ok).map((check) => check.url);
  });
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const breadcrumbsWithoutCurrent = await page.locator(".breadcrumb, .detail-breadcrumb").evaluateAll((breadcrumbs) =>
    breadcrumbs
      .filter((breadcrumb) => !breadcrumb.querySelector('[aria-current="page"]'))
      .map((breadcrumb) => breadcrumb.textContent.trim())
  );
  expect(brokenImages).toEqual([]);
  expect(brokenHeroImages).toEqual([]);
  expect(breadcrumbsWithoutCurrent).toEqual([]);
  expect(horizontalOverflow).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
}

async function tabUntilFocused(page, locator, maxTabs = 30) {
  for (let index = 0; index < maxTabs; index += 1) {
    await page.keyboard.press("Tab");
    const isFocused = await locator.evaluate((element) => element === document.activeElement).catch(() => false);
    if (isFocused) return;
  }

  throw new Error(`Focusdoel niet bereikt na ${maxTabs} Tab-stappen.`);
}

const publicPages = [
  "/index.html",
  "/pages/inspiratie.html",
  "/pages/leveranciers.html",
  "/pages/brochures-catalogi.html",
  "/pages/virtuele-showroom.html",
  "/pages/terras-outdoor.html",
  "/pages/nieuw.html",
  "/pages/logos-personalisatie.html",
  "/pages/bibliotheek.html",
  "/pages/aanbiedingen.html",
  "/pages/droogijs.html",
  "/pages/contact.html"
];

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
  await expect(page.getByRole("button", { name: "Alle" })).toHaveAttribute("aria-pressed", "true");
  await expectCleanPage(page, errors);

  await page.goto("/pages/brochures-catalogi.html#amefa-for-professionals-2026");
  await expect(page.locator("[data-public-brochure-intro]")).toBeHidden();
  await expect(page.locator("[data-public-brochure-overview]")).toBeHidden();
  await expect(page.locator("[data-public-brochure-detail] h2")).toHaveText("Amefa for Professionals 2026");
  await expectCleanPage(page, errors);
});

test("publieke navigatie, filters en focusstates blijven toegankelijk", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  await page.goto("/index.html");
  await expect(page.locator('a[aria-current="page"]', { hasText: "Home" }).first()).toBeAttached();

  const startCta = page.getByRole("link", { name: "Start met inspiratie" });
  await tabUntilFocused(page, startCta);
  await expect(startCta).toBeFocused();
  await expect(startCta).toHaveCSS("outline-style", "solid");

  const searchButton = page.getByRole("button", { name: "Zoeken" }).first();
  await expect(searchButton).toHaveAttribute("aria-expanded", "false");
  await searchButton.click();
  await expect(searchButton).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("dialog", { name: "Zoeken" })).toBeVisible();
  await page.getByRole("button", { name: "Zoeken sluiten" }).click();
  await expect(searchButton).toHaveAttribute("aria-expanded", "false");

  const viewport = page.viewportSize();
  if (viewport && viewport.width <= 1080) {
    const navToggle = page.locator(".nav-toggle");
    const mobileNavigation = page.locator("#mobile-navigation");

    await expect(navToggle).toHaveAccessibleName("Menu openen");
    await expect(mobileNavigation).toHaveAttribute("aria-hidden", "true");
    await expect(mobileNavigation).toHaveCSS("visibility", "hidden");
    await navToggle.click();
    await expect(navToggle).toHaveAccessibleName("Menu sluiten");
    await expect(navToggle).toHaveAttribute("aria-expanded", "true");
    await expect(mobileNavigation).toHaveAttribute("aria-hidden", "false");
    await expect(mobileNavigation).toHaveCSS("visibility", "visible");
    await page.keyboard.press("Escape");
    await expect(navToggle).toHaveAccessibleName("Menu openen");
    await expect(navToggle).toHaveAttribute("aria-expanded", "false");
    await expect(mobileNavigation).toHaveAttribute("aria-hidden", "true");
  }

  await expectCleanPage(page, errors);

  await page.goto("/pages/brochures-catalogi.html");
  const allFilter = page.getByRole("button", { name: "Alle" });
  const serviesFilter = page.getByRole("button", { name: "Servies" });

  await expect(allFilter).toHaveAttribute("aria-pressed", "true");
  await serviesFilter.click();
  await expect(serviesFilter).toHaveAttribute("aria-pressed", "true");
  await expect(allFilter).toHaveAttribute("aria-pressed", "false");
  await expectCleanPage(page, errors);
});

test("publieke pagina's blijven schoon en visueel stabiel", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  for (const publicPage of publicPages) {
    await page.goto(publicPage);
    await expect(page.locator("main")).toBeVisible();
    await expectCleanPage(page, errors);
  }
});
