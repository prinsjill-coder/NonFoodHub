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
  expect(errors).toEqual([]);
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
