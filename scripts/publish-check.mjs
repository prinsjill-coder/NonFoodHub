import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { getArticles } from "../shared/article-model.js";
import { getBrochures } from "../shared/brochure-model.js";
import { isReadyForPublicationStatus } from "../shared/content-status.js";
import { getMediaAssets, isImageLikeMedia } from "../shared/media-model.js";
import { getSuppliers } from "../shared/supplier-model.js";
import {
  createPublicContentOutputs,
  readPublicContentSources,
  stringifyPublicContentOutputs
} from "./generate-public-content.mjs";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FILE_URL_PREFIX = ["file", "://"].join("");
const LOCAL_HOME_PATH_PATTERN = /[\\/](?:Users|home)[\\/]/i;

function isRelativeProjectPath(value) {
  const path = String(value || "").trim();
  return Boolean(
    path &&
      !path.startsWith("/") &&
      !path.startsWith("\\") &&
      !path.startsWith("~") &&
      !path.toLowerCase().startsWith(FILE_URL_PREFIX) &&
      !/^[a-zA-Z]:[\\/]/.test(path) &&
      !LOCAL_HOME_PATH_PATTERN.test(path)
  );
}

function exactProjectFileExists(projectRoot, relativePath) {
  const projectPath = String(relativePath || "").trim();
  if (!isRelativeProjectPath(projectPath)) return false;

  let currentDir = projectRoot;
  const segments = projectPath.split(/[\\/]/).filter(Boolean);

  for (const segment of segments) {
    if (!existsSync(currentDir) || !statSync(currentDir).isDirectory()) return false;
    const exactMatch = readdirSync(currentDir).find((entry) => entry === segment);
    if (!exactMatch) return false;
    currentDir = resolve(currentDir, exactMatch);
  }

  return existsSync(currentDir) && statSync(currentDir).isFile();
}

function addRequiredFile(errors, moduleLabel, itemLabel, fieldLabel, relativePath) {
  if (!isRelativeProjectPath(relativePath)) {
    errors.push(`${moduleLabel} "${itemLabel}": ${fieldLabel} is geen veilig projectpad: ${relativePath || "leeg"}`);
    return;
  }

  if (!exactProjectFileExists(rootDir, relativePath)) {
    errors.push(`${moduleLabel} "${itemLabel}": ${fieldLabel} bestaat niet exact in de projectmap: ${relativePath}`);
  }
}

function addOptionalFileWarning(warnings, moduleLabel, itemLabel, fieldLabel, relativePath) {
  if (!relativePath) return;

  if (!isRelativeProjectPath(relativePath)) {
    warnings.push(`${moduleLabel} "${itemLabel}": ${fieldLabel} is geen veilig projectpad: ${relativePath}`);
    return;
  }

  if (!exactProjectFileExists(rootDir, relativePath)) {
    warnings.push(`${moduleLabel} "${itemLabel}": ${fieldLabel} ontbreekt exact in de projectmap; er wordt geen publieke downloadlink gemaakt: ${relativePath}`);
  }
}

function checkSourceFiles(sources) {
  const errors = [];
  const warnings = [];

  getSuppliers(sources.suppliers).filter((supplier) => isReadyForPublicationStatus(supplier.status)).forEach((supplier) => {
    if (supplier.logo) addRequiredFile(errors, "Leverancier", supplier.name, "logo", supplier.logo);
    if (supplier.image) addRequiredFile(errors, "Leverancier", supplier.name, "afbeelding", supplier.image);
  });

  getBrochures(sources.brochures).filter((brochure) => isReadyForPublicationStatus(brochure.status)).forEach((brochure) => {
    addOptionalFileWarning(warnings, "Brochure", brochure.title, "PDF", brochure.pdfFile);
    addRequiredFile(errors, "Brochure", brochure.title, "afbeelding", brochure.thumbnail);
  });

  getArticles(sources.articles).filter((article) => isReadyForPublicationStatus(article.status)).forEach((article) => {
    addRequiredFile(errors, "Kennisbankartikel", article.title, "headerafbeelding", article.heroImage);
  });

  getMediaAssets(sources.media).filter((asset) => isReadyForPublicationStatus(asset.status)).forEach((asset) => {
    addRequiredFile(errors, "Media", asset.title, isImageLikeMedia(asset) ? "afbeelding" : "bestand", asset.file);
  });

  return { errors, warnings };
}

function checkExistingPublicFiles(outputs) {
  const errors = [];
  stringifyPublicContentOutputs(outputs).forEach((output) => {
    const publicPath = resolve(rootDir, output.path);
    const current = existsSync(publicPath) ? readFileSync(publicPath, "utf8") : "";
    if (current !== output.content) {
      errors.push(`${output.path} is niet gelijk aan de huidige projectie. Voer npm run generate:public uit.`);
    }
  });
  return errors;
}

function listTitles(items, labelKey = "title") {
  return items.map((item) => item[labelKey] || item.name || item.slug || item.id).join(", ") || "geen";
}

export function runPublishCheck() {
  const sources = readPublicContentSources(rootDir);
  const fileReport = checkSourceFiles(sources);
  const outputs = createPublicContentOutputs(sources, {
    rootDir,
    isPublicDownload: (downloadUrl) =>
      String(downloadUrl || "").toLowerCase().endsWith(".pdf") && exactProjectFileExists(rootDir, downloadUrl)
  });
  const projectionErrors = checkExistingPublicFiles(outputs);
  const errors = [...fileReport.errors, ...projectionErrors];

  outputs.forEach((output) => {
    console.log(`${output.label}: ${output.data.items.length} publiek (${listTitles(output.data.items)})`);
  });
  fileReport.warnings.forEach((warning) => {
    console.warn(`Waarschuwing: ${warning}`);
  });

  if (errors.length) {
    throw new Error(`Publicatiecontrole niet akkoord:\n- ${errors.join("\n- ")}`);
  }

  console.log("Publicatiecontrole akkoord.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    runPublishCheck();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
