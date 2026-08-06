import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { validateArticleFile } from "../shared/article-file-validation.js";
import { validateBrochureFile } from "../shared/brochure-file-validation.js";
import { validateSupplierFile } from "../shared/supplier-file-validation.js";
import { projectPublicArticles } from "../shared/public-articles.js";
import { projectPublicBrochures } from "../shared/public-brochures.js";
import { projectPublicSuppliers } from "../shared/public-suppliers.js";
import { PUBLIC_DATASET_CONFIG } from "../shared/public-content.js";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FILE_URL_PREFIX = ["file", "://"].join("");
const LOCAL_HOME_PATH_PATTERN = /[\\/](?:Users|home)[\\/]/i;

function readJsonFile(relativePath, projectRoot = rootDir) {
  const absolutePath = resolve(projectRoot, relativePath);

  try {
    return JSON.parse(readFileSync(absolutePath, "utf8"));
  } catch (error) {
    throw new Error(`${relativePath} kon niet worden gelezen als JSON: ${error.message}`);
  }
}

function readOptionalJsonFile(relativePath, projectRoot = rootDir, fallback = {}) {
  if (!existsSync(resolve(projectRoot, relativePath))) return fallback;
  return readJsonFile(relativePath, projectRoot);
}

function formatReportIssue(section, issue) {
  return `${section}: ${issue.path} - ${issue.message}`;
}

function assertValidSources(sources) {
  const reports = [
    {
      section: "Leveranciers",
      report: validateSupplierFile(sources.suppliers)
    },
    {
      section: "Brochures",
      report: validateBrochureFile(sources.brochures, sources.suppliers)
    },
    {
      section: "Kennisbankartikelen",
      report: validateArticleFile(sources.articles, sources.suppliers, sources.brochures, sources.media)
    }
  ];
  const errors = reports.flatMap(({ section, report }) => report.errors.map((issue) => formatReportIssue(section, issue)));

  if (errors.length) {
    throw new Error(`Publieke contentprojectie niet gegenereerd door ongeldige beheerdata:\n- ${errors.join("\n- ")}`);
  }
}

function isRelativeProjectPath(value) {
  if (!value) return false;

  return (
    !value.startsWith("/") &&
    !value.startsWith("\\") &&
    !value.startsWith("~") &&
    !value.toLowerCase().startsWith(FILE_URL_PREFIX) &&
    !/^[a-zA-Z]:[\\/]/.test(value) &&
    !LOCAL_HOME_PATH_PATTERN.test(value)
  );
}

function publicFileExists(projectRoot, relativePath) {
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

export function createPublicDownloadChecker(projectRoot = rootDir) {
  return (downloadUrl) => publicFileExists(projectRoot, downloadUrl) && String(downloadUrl).toLowerCase().endsWith(".pdf");
}

export function readPublicContentSources(projectRoot = rootDir) {
  return {
    articles: readJsonFile(PUBLIC_DATASET_CONFIG.articles.sourcePath, projectRoot),
    suppliers: readJsonFile(PUBLIC_DATASET_CONFIG.suppliers.sourcePath, projectRoot),
    brochures: readJsonFile(PUBLIC_DATASET_CONFIG.brochures.sourcePath, projectRoot),
    media: readOptionalJsonFile("data/media.json", projectRoot)
  };
}

export function createPublicContentOutputs(sources, options = {}) {
  assertValidSources(sources);

  const isPublicDownload = options.isPublicDownload || createPublicDownloadChecker(options.rootDir || rootDir);

  return [
    {
      key: "articles",
      label: PUBLIC_DATASET_CONFIG.articles.label,
      path: PUBLIC_DATASET_CONFIG.articles.publicPath,
      data: projectPublicArticles(sources.articles, sources.suppliers)
    },
    {
      key: "suppliers",
      label: PUBLIC_DATASET_CONFIG.suppliers.label,
      path: PUBLIC_DATASET_CONFIG.suppliers.publicPath,
      data: projectPublicSuppliers(sources.suppliers, sources.articles, sources.brochures, { isPublicDownload })
    },
    {
      key: "brochures",
      label: PUBLIC_DATASET_CONFIG.brochures.label,
      path: PUBLIC_DATASET_CONFIG.brochures.publicPath,
      data: projectPublicBrochures(sources.brochures, sources.suppliers, { isPublicDownload })
    }
  ];
}

export function stringifyPublicJson(data) {
  return `${JSON.stringify(data, null, 2)}\n`;
}

export function stringifyPublicContentOutputs(outputs) {
  return outputs.map((output) => ({
    ...output,
    content: stringifyPublicJson(output.data)
  }));
}

export function writePublicContentFiles(options = {}) {
  const projectRoot = options.rootDir || rootDir;
  const sources = options.sources || readPublicContentSources(projectRoot);
  const outputs = stringifyPublicContentOutputs(createPublicContentOutputs(sources, { ...options, rootDir: projectRoot }));
  const writeFile = options.writeFile || writeFileSync;

  outputs.forEach((output) => {
    writeFile(resolve(projectRoot, output.path), output.content, "utf8");
  });

  return outputs.map((output) => ({
    key: output.key,
    label: output.label,
    path: output.path,
    itemCount: output.data.items.length
  }));
}

export function generatePublicContent(options = {}) {
  return writePublicContentFiles(options);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const results = generatePublicContent();
    results.forEach((result) => {
      console.log(`Gegenereerd: ${result.path} (${result.itemCount} items)`);
    });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
