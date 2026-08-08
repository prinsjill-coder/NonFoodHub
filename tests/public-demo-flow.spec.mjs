import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const publicBrochures = JSON.parse(readFileSync(new URL("../data/public/brochures.json", import.meta.url), "utf8"));
const amefaBrochureTitle =
  publicBrochures.items.find((item) => item.slug === "amefa-for-professionals-2026")?.title ||
  "Amefa for Professionals 2026";

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
  await expect(page.getByRole("heading", { name: "Waar ben je vandaag naar op zoek?" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Meer dan alleen een webshop" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Laat je inspireren" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ontdek het volledige assortiment" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Wij helpen je graag verder" })).toBeVisible();
  await expect(page.locator(".hero .btn-primary")).toHaveCount(0);
  await expect(page.locator(".hero-secondary a")).toHaveText("Kijk hier voor meer informatie");
  await expect(page.locator(".hero-secondary a")).toHaveAttribute("href", "#waarom-nonfoodhub");
  await expect(page.locator(".home-entry-grid .home-entry-card")).toHaveCount(6);
  await expect(page.locator(".home-entry-grid .home-entry-card").nth(0)).toHaveAttribute("href", "pages/brochures-catalogi.html");
  await expect(page.locator(".home-entry-grid .home-entry-card").nth(4)).toContainText("Uitgelicht");
  await expect(page.locator(".home-entry-grid .home-entry-card").nth(5)).toContainText("Advies");
  await expect(page.getByRole("link", { name: /Waarom NonFoodHub/i }).first()).toBeVisible();
  const homepageArticleCard = page.getByRole("link", { name: /Glaswerk & Servies/i });
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
  await expect(page.locator("[data-public-brochure-detail] h2").first()).toHaveText("Amefa Collection");
  await expect(page).toHaveTitle("Amefa Collection | Non-Food Hub");
  await expect(page.locator("[data-public-brochure-detail]").getByText("PDF nog niet beschikbaar")).toBeVisible();
  await expect(page.getByRole("link", { name: "Collecties" }).first()).toBeVisible();
  await expectCleanPage(page, errors);

  await page.getByRole("link", { name: "Collecties" }).first().click();
  await expect(page).toHaveURL(/pages\/brochures-catalogi\.html$/);
  await expect(page.locator("[data-public-brochure-grid] .collection-card")).toHaveCount(2);
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
  await expect(page.locator("[data-public-supplier-grid] .supplier-card")).toHaveCount(2);
  await expect(page.locator("[data-public-supplier-grid] .supplier-card", { hasText: "Churchill" })).toBeVisible();
  await page.reload();
  await expect(page.locator("[data-public-supplier-grid] .supplier-card", { hasText: "Churchill" })).toBeVisible();
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
  await expect(page.getByRole("heading", { name: "Collecties", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Collecties zoeken" })).toBeVisible();
  await expect(page.getByPlaceholder("Zoek een collectie...")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("[data-collection-category]")).toHaveCount(12);
  await expect(page.locator("[data-public-brochure-grid] .collection-card")).toHaveCount(2);
  const churchillCollectionCard = page.locator("[data-public-brochure-grid] .collection-card", {
    hasText: "Churchill Collection"
  });
  await expect(churchillCollectionCard.getByText("Bestek", { exact: true })).toBeVisible();
  await expect(churchillCollectionCard.getByText("Buffet & serveergerei", { exact: true })).toBeVisible();
  await expect(churchillCollectionCard.getByText("Servies", { exact: true })).toBeVisible();
  await expect(churchillCollectionCard.getByText("🛒 Deels direct verkrijgbaar via de webshop van Bidfood.")).toBeVisible();
  await expectCleanPage(page, errors);

  await page.goto("/pages/brochures-catalogi.html#amefa-for-professionals-2026");
  await expect(page.locator("[data-public-brochure-intro]")).toBeHidden();
  await expect(page.locator("[data-public-brochure-overview]")).toBeHidden();
  await expect(page.locator("[data-public-brochure-detail] h2").first()).toHaveText("Amefa Collection");
  await expect(page.locator(".collection-detail-visual img")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Beschikbare brochures" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ook direct verkrijgbaar via de webshop" })).toBeVisible();
  await expect(page.getByText("Voor het volledige aanbod bekijk je de brochures hierboven.")).toBeVisible();
  await expect(page.locator(".collection-route-grid .collection-route-card")).toHaveCount(1);
  await expect(page.locator(".collection-route-grid .tag")).toHaveCount(0);
  await expect(page.locator(".collection-route-grid .collection-route-card")).not.toContainText("Complete collectie");
  await expect(page.locator(".collection-route-grid .collection-route-card")).toContainText(
    "Bekijk een selectie uit deze collectie die direct online beschikbaar is via de webshop van Bidfood."
  );
  await expect(page.locator(".collection-webshop-media img")).toBeVisible();
  await expect(page.getByRole("link", { name: "Bekijk assortiment" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Interesse in deze collectie?" })).toBeVisible();
  const detailOrder = await page.locator("[data-public-brochure-detail]").evaluate((detail) => {
    const brochureTop = detail.querySelector("#amefa-brochures")?.getBoundingClientRect().top ?? 0;
    const webshopTop = [...detail.querySelectorAll("h2")]
      .find((heading) => heading.textContent.trim() === "Ook direct verkrijgbaar via de webshop")
      ?.getBoundingClientRect().top ?? 0;
    const contactTop = [...detail.querySelectorAll("h2")]
      .find((heading) => heading.textContent.trim() === "Interesse in deze collectie?")
      ?.getBoundingClientRect().top ?? 0;
    return { brochureTop, webshopTop, contactTop };
  });
  expect(detailOrder.brochureTop).toBeLessThan(detailOrder.webshopTop);
  expect(detailOrder.webshopTop).toBeLessThan(detailOrder.contactTop);
  await expectCleanPage(page, errors);
});

test("publieke navigatie, filters en focusstates blijven toegankelijk", async ({ page }) => {
  const errors = collectConsoleErrors(page);

  await page.goto("/index.html");
  await expect(page.locator(".desktop-nav").getByRole("link", { name: "Home" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Neem contact op" }).first()).toBeVisible();

  const heroInfoLink = page.locator(".hero-secondary a");
  await tabUntilFocused(page, heroInfoLink);
  await expect(heroInfoLink).toBeFocused();
  await expect(heroInfoLink).toHaveCSS("outline-style", "solid");

  const searchButton = page.getByRole("button", { name: "Zoeken" }).first();
  await expect(searchButton).toHaveAttribute("aria-expanded", "false");
  await searchButton.click();
  await expect(searchButton).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("dialog", { name: "Zoeken" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(searchButton).toHaveAttribute("aria-expanded", "false");
  await searchButton.click();
  await expect(searchButton).toHaveAttribute("aria-expanded", "true");
  await page.mouse.click(10, 10);
  await expect(searchButton).toHaveAttribute("aria-expanded", "false");
  await searchButton.click();
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
  const serviesFilter = page.locator('[data-collection-category="Servies"]');
  const bestekFilter = page.locator('[data-collection-category="Bestek"]');
  const collectionSearchToggle = page.getByRole("button", { name: "Collecties zoeken" });
  const searchInput = page.getByPlaceholder("Zoek een collectie...");

  await expect(serviesFilter).toHaveAttribute("aria-pressed", "false");
  await serviesFilter.click();
  await expect(serviesFilter).toHaveAttribute("aria-pressed", "true");
  await bestekFilter.click();
  await expect(serviesFilter).toHaveAttribute("aria-pressed", "false");
  await expect(bestekFilter).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("[data-public-brochure-grid] .collection-card")).toHaveCount(2);
  await expect(collectionSearchToggle).toHaveAttribute("aria-expanded", "false");
  await collectionSearchToggle.click();
  await expect(collectionSearchToggle).toHaveAttribute("aria-expanded", "true");
  await expect(searchInput).toHaveAttribute("aria-hidden", "false");
  await searchInput.fill("Churchill");
  await expect(page.locator("[data-public-brochure-grid] .collection-card")).toHaveCount(1);
  await expect(page.locator("[data-public-brochure-grid] .collection-card")).toContainText("Churchill Collection");
  await page.mouse.click(10, 10);
  await expect(collectionSearchToggle).toHaveAttribute("aria-expanded", "false");
  await collectionSearchToggle.click();
  await page.keyboard.press("Escape");
  await expect(collectionSearchToggle).toHaveAttribute("aria-expanded", "false");
  await page.locator('[data-collection-refine="availability"][value="brochure"]').check();
  await expect(page.locator("[data-public-brochure-grid] .collection-card")).toHaveCount(1);
  await page.locator("[data-collection-clear]").click();
  await expect(searchInput).toHaveValue("");
  await expect(serviesFilter).toHaveAttribute("aria-pressed", "false");
  await expect(bestekFilter).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("[data-public-brochure-grid] .collection-card")).toHaveCount(2);
  await page.goto("/pages/brochures-catalogi.html#churchill");
  await page.getByRole("link", { name: "Servies" }).first().click();
  await expect(page).toHaveURL(/pages\/brochures-catalogi\.html#categorie-servies$/);
  await expect(serviesFilter).toHaveAttribute("aria-pressed", "true");
  await page.waitForFunction(() => {
    const grid = document.querySelector("[data-public-brochure-grid]");
    return grid && Math.abs(grid.getBoundingClientRect().top) <= 140;
  });
  const gridTop = await page.locator("[data-public-brochure-grid]").evaluate((grid) => Math.round(grid.getBoundingClientRect().top));
  expect(gridTop).toBeGreaterThanOrEqual(0);
  expect(gridTop).toBeLessThanOrEqual(140);
  await expectCleanPage(page, errors);
});

test("publieke pagina's blijven schoon en visueel stabiel", async ({ page }) => {
  test.setTimeout(60000);
  const errors = collectConsoleErrors(page);

  for (const publicPage of publicPages) {
    await page.goto(publicPage);
    await expect(page.locator("main")).toBeVisible();
    await expectCleanPage(page, errors);
  }
});
