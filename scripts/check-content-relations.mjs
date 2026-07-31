import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { getArticles } from "../shared/article-model.js";
import { getBrochures } from "../shared/brochure-model.js";
import {
  findArticleBrochures,
  findArticleSuppliers,
  findBrochureArticles,
  findMediaUsage,
  findSupplierArticles,
  findSupplierBrochures,
  getContentRelationStats
} from "../shared/content-relations.js";
import { getMediaAssets } from "../shared/media-model.js";
import { getSuppliers } from "../shared/supplier-model.js";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readJson(relativePath) {
  return JSON.parse(readFileSync(resolve(rootDir, relativePath), "utf8"));
}

function idsFor(items) {
  return new Set(items.map((item) => item.id));
}

function issue(path, message) {
  return { path, message };
}

function arrayValues(value) {
  return Array.isArray(value) ? value : [];
}

function collectRelationIssues(supplierData, brochureData, mediaData, articleData) {
  const errors = [];
  const warnings = [];
  const supplierIds = idsFor(getSuppliers(supplierData));
  const brochureIds = idsFor(getBrochures(brochureData));
  const articleIds = idsFor(getArticles(articleData));
  const mediaFiles = new Set(getMediaAssets(mediaData).map((asset) => asset.file));

  getArticles(articleData).forEach((article, articleIndex) => {
    arrayValues(article.supplierIds).forEach((supplierId, relationIndex) => {
      if (!supplierIds.has(supplierId)) {
        errors.push(issue(`articles.items[${articleIndex}].supplierIds[${relationIndex}]`, `Onbekende leverancier: ${supplierId}.`));
      }
    });

    arrayValues(article.brochureIds).forEach((brochureId, relationIndex) => {
      if (!brochureIds.has(brochureId)) {
        errors.push(issue(`articles.items[${articleIndex}].brochureIds[${relationIndex}]`, `Onbekende brochure: ${brochureId}.`));
      }
    });

    if (article.heroImage && !mediaFiles.has(article.heroImage)) {
      warnings.push(issue(`articles.items[${articleIndex}].heroImage`, "Hero afbeelding staat niet geregistreerd in media.json."));
    }
  });

  getBrochures(brochureData).forEach((brochure, brochureIndex) => {
    if (brochure.supplierId && !supplierIds.has(brochure.supplierId)) {
      errors.push(issue(`brochures.items[${brochureIndex}].supplierId`, `Onbekende leverancier: ${brochure.supplierId}.`));
    }
  });

  getSuppliers(supplierData).forEach((supplier, supplierIndex) => {
    arrayValues(supplier.brochureIds).forEach((brochureId, relationIndex) => {
      if (!brochureIds.has(brochureId)) {
        errors.push(issue(`suppliers.items[${supplierIndex}].brochureIds[${relationIndex}]`, `Onbekende brochure: ${brochureId}.`));
      }
    });

    arrayValues(supplier.relatedArticleIds).forEach((articleId, relationIndex) => {
      if (!articleIds.has(articleId)) {
        errors.push(issue(`suppliers.items[${supplierIndex}].relatedArticleIds[${relationIndex}]`, `Onbekend artikel: ${articleId}.`));
      }
    });
  });

  return { valid: errors.length === 0, errors, warnings };
}

async function runCheck(name, check) {
  await check();
  console.log(`ok - ${name}`);
}

export async function runContentRelationChecks() {
  const suppliers = readJson("data/suppliers.json");
  const brochures = readJson("data/brochures.json");
  const media = readJson("data/media.json");
  const articles = readJson("data/articles.json");

  await runCheck("contentrelaties hebben geen kapotte id-verwijzingen", () => {
    const report = collectRelationIssues(suppliers, brochures, media, articles);
    assert.equal(report.valid, true);
    assert.deepEqual(report.errors, []);
    assert.ok(report.warnings.some((warning) => warning.path.includes("heroImage")));
  });

  await runCheck("relatiehelpers vinden leveranciers, brochures en artikelen", () => {
    const amefa = getSuppliers(suppliers).find((supplier) => supplier.id === "supplier-amefa");
    const churchill = getSuppliers(suppliers).find((supplier) => supplier.id === "supplier-churchill");
    const amefaBrochure = getBrochures(brochures).find((brochure) => brochure.id === "brochure-amefa-2026");
    const tableArticle = getArticles(articles).find((article) => article.id === "article-professioneel-tafelconcept");

    assert.equal(findSupplierBrochures(amefa, brochures)[0].id, "brochure-amefa-2026");
    assert.ok(findSupplierArticles(churchill, articles).some((article) => article.id === "article-terras-outdoor-inspiratie"));
    assert.ok(findArticleSuppliers(tableArticle, suppliers).some((supplier) => supplier.id === "supplier-amefa"));
    assert.ok(findArticleBrochures(tableArticle, brochures).some((brochure) => brochure.id === "brochure-amefa-2026"));
    assert.ok(findBrochureArticles(amefaBrochure, articles).some((article) => article.id === "article-professioneel-tafelconcept"));
  });

  await runCheck("media-gebruik wordt berekend vanuit bestaande padvelden", () => {
    const amefaLogo = getMediaAssets(media).find((asset) => asset.id === "media-supplier-amefa-logo");
    const usage = findMediaUsage(amefaLogo, suppliers, brochures, articles);

    assert.ok(usage.suppliers.some((supplier) => supplier.id === "supplier-amefa"));
    assert.ok(usage.brochures.some((brochure) => brochure.id === "brochure-amefa-2026"));
    assert.equal(usage.articles.length, 0);
  });

  await runCheck("dashboardrelatiestatistieken rapporteren bestaande contentrelaties", () => {
    const stats = getContentRelationStats(suppliers, brochures, media, articles);
    assert.equal(stats.articlesWithoutSupplier, 0);
    assert.equal(stats.suppliersWithoutBrochures, 0);
    assert.ok(stats.mediaWithoutUsage >= 1);
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runContentRelationChecks()
    .then(() => {
      console.log("Content relation checks voltooid.");
    })
    .catch((error) => {
      console.error(`Content relation checks mislukt: ${error.message}`);
      process.exitCode = 1;
    });
}
