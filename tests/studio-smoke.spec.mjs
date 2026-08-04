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
    await expect(page.locator("text=/Pagina niet gevonden|niet geladen/i")).toHaveCount(0);

    expect(errors).toEqual([]);
  });
}
