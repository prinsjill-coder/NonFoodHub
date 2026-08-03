import { getArticleCounts, getArticles } from "./article-model.js";
import { getArticleQualityReport } from "./article-quality.js";
import { validateBrochureFile } from "./brochure-file-validation.js";
import { getBrochureCounts, getBrochures } from "./brochure-model.js";
import { findMediaUsage, findSupplierBrochures, getContentRelationStats } from "./content-relations.js";
import { getLibraryCounts, getLibraryItems } from "./library-model.js";
import { getLibraryQualityReport } from "./library-quality.js";
import { validateMediaFile } from "./media-file-validation.js";
import { getMediaCounts, getMediaAssets, isImageLikeMedia } from "./media-model.js";
import { validateSupplierFile } from "./supplier-file-validation.js";
import { getSupplierCounts, getSuppliers } from "./supplier-model.js";

export const GOVERNANCE_MODULE_IDS = ["suppliers", "brochures", "articles", "media", "library"];

export const GOVERNANCE_ISSUE_SEVERITIES = ["error", "warning"];

export const GOVERNANCE_MODULE_CONFIG = {
  suppliers: {
    label: "Leveranciers",
    route: "#/leveranciers",
    itemRoute: (supplier) => (supplier?.slug ? `#/leveranciers/${supplier.slug}` : "#/leveranciers"),
    itemLabel: (supplier) => supplier?.name || supplier?.slug || supplier?.id || "Leverancier"
  },
  brochures: {
    label: "Brochures",
    route: "#/brochures",
    itemRoute: (brochure) => (brochure?.slug ? `#/brochures/${brochure.slug}` : "#/brochures"),
    itemLabel: (brochure) => brochure?.title || brochure?.slug || brochure?.id || "Brochure"
  },
  articles: {
    label: "Kennisbank",
    route: "#/kennisbank",
    itemRoute: (article) => (article?.slug ? `#/kennisbank/${article.slug}` : "#/kennisbank"),
    itemLabel: (article) => article?.title || article?.slug || article?.id || "Kennisbankartikel"
  },
  media: {
    label: "Media",
    route: "#/media",
    itemRoute: (asset) => (asset?.id ? `#/media/${asset.id}` : "#/media"),
    itemLabel: (asset) => asset?.title || asset?.file || asset?.id || "Media-asset"
  },
  library: {
    label: "Bibliotheek",
    route: "#/bibliotheek",
    itemRoute: (item) => (item?.slug ? `#/bibliotheek/${item.slug}` : "#/bibliotheek"),
    itemLabel: (item) => item?.title || item?.slug || item?.id || "Bibliotheekitem"
  }
};

const MODULE_CONFIG = GOVERNANCE_MODULE_CONFIG;

function moduleRoute(moduleId) {
  return MODULE_CONFIG[moduleId]?.route || "#/governance";
}

function countIssues(report, key) {
  return Array.isArray(report?.[key]) ? report[key].length : 0;
}

function statusValue(counts, status) {
  return counts?.statuses?.[status] || counts?.statusCounts?.[status] || 0;
}

function moduleItems(moduleId, context) {
  return context.itemsByModule[moduleId] || [];
}

function ownItemIndex(path) {
  const match = String(path || "").match(/^items\[(\d+)\]/);
  return match ? Number(match[1]) : null;
}

function prefixedItemIndex(path, prefix) {
  const match = String(path || "").match(new RegExp(`^${prefix}\\.items\\[(\\d+)\\]`));
  return match ? Number(match[1]) : null;
}

function sourceTargetFromPath(path, moduleId, context) {
  const ownIndex = ownItemIndex(path);
  if (ownIndex !== null) {
    const item = moduleItems(moduleId, context)[ownIndex] || null;
    return {
      moduleId,
      item,
      route: item ? MODULE_CONFIG[moduleId].itemRoute(item) : moduleRoute(moduleId)
    };
  }

  const prefixedModules = [
    ["suppliers", "suppliers"],
    ["brochures", "brochures"],
    ["articles", "articles"],
    ["media", "media"],
    ["library", "library"]
  ];

  for (const [prefix, targetModuleId] of prefixedModules) {
    const index = prefixedItemIndex(path, prefix);
    if (index !== null) {
      const item = moduleItems(targetModuleId, context)[index] || null;
      return {
        moduleId: targetModuleId,
        item,
        route: item ? MODULE_CONFIG[targetModuleId].itemRoute(item) : moduleRoute(targetModuleId)
      };
    }
  }

  return {
    moduleId,
    item: null,
    route: moduleRoute(moduleId)
  };
}

function issueTypeFromSource(issue, fallbackType) {
  const source = `${issue?.path || ""} ${issue?.message || ""}`.toLowerCase();

  if (
    source.includes("pdffile") ||
    source.includes("thumbnail") ||
    source.includes("filepath") ||
    source.includes("thumbnailpath") ||
    source.includes(".file") ||
    source.includes("bestand") ||
    source.includes("pdf")
  ) {
    return "missing-file";
  }

  if (source.includes("media.json") || source.includes("mediaregistratie") || source.includes("heroimage")) {
    return "missing-media-registration";
  }

  if (
    source.includes("supplierids") ||
    source.includes("brochureids") ||
    source.includes("articleids") ||
    source.includes("relatedarticleids") ||
    source.includes("relatie") ||
    source.includes("onbekende leverancier") ||
    source.includes("onbekende brochure") ||
    source.includes("onbekend kennisbankartikel")
  ) {
    return "relation";
  }

  if (source.includes("alt")) return "missing-alt";
  if (source.includes("rightsstatus") || source.includes("rechten")) return "rights-review";
  if (source.includes("status")) return "status";

  return fallbackType;
}

function createGovernanceIssue({
  moduleId,
  severity,
  type,
  message,
  targetRoute,
  sourcePath = "",
  targetItem = null,
  targetModuleId = moduleId
}) {
  const itemLabel = targetItem ? MODULE_CONFIG[targetModuleId]?.itemLabel(targetItem) : "";
  const cleanMessage = String(message || "Governance-signaal vraagt aandacht.").trim();

  return {
    module: moduleId,
    moduleLabel: MODULE_CONFIG[moduleId]?.label || moduleId,
    severity,
    type,
    message: itemLabel ? `${itemLabel}: ${cleanMessage}` : cleanMessage,
    targetRoute: targetRoute || moduleRoute(moduleId),
    sourcePath
  };
}

function issuesFromReport({ moduleId, report, context, defaultType = "quality-signal" }) {
  const createFromIssue = (issue, severity) => {
    const sourcePath = String(issue?.path || "");
    const target = sourceTargetFromPath(sourcePath, moduleId, context);

    return createGovernanceIssue({
      moduleId,
      severity,
      type: issueTypeFromSource(issue, defaultType),
      message: issue?.message,
      targetRoute: target.route,
      sourcePath,
      targetItem: target.item,
      targetModuleId: target.moduleId
    });
  };

  return [
    ...(Array.isArray(report?.errors) ? report.errors.map((issue) => createFromIssue(issue, "error")) : []),
    ...(Array.isArray(report?.warnings) ? report.warnings.map((issue) => createFromIssue(issue, "warning")) : [])
  ];
}

function hasIssueForSource(issues, moduleId, sourcePath) {
  return issues.some((issue) => issue.module === moduleId && issue.sourcePath === sourcePath);
}

function collectSupplierSignalIssues(supplierData, brochureData, context, issues) {
  return getSuppliers(supplierData)
    .map((supplier, index) => {
      const sourcePath = `items[${index}].brochureIds`;
      if (findSupplierBrochures(supplier, brochureData).length || hasIssueForSource(issues, "suppliers", sourcePath)) {
        return null;
      }

      return createGovernanceIssue({
        moduleId: "suppliers",
        severity: "warning",
        type: "relation",
        message: "Heeft geen gekoppelde brochure.",
        targetRoute: MODULE_CONFIG.suppliers.itemRoute(supplier),
        sourcePath,
        targetItem: supplier
      });
    })
    .filter(Boolean);
}

function collectBrochureSignalIssues(brochureData, issues) {
  return getBrochures(brochureData).flatMap((brochure, index) => {
    const found = [];
    const checks = [
      ["pdfFile", "PDF-bestand ontbreekt."],
      ["thumbnail", "Thumbnail ontbreekt."]
    ];

    checks.forEach(([field, message]) => {
      const sourcePath = `items[${index}].${field}`;
      if (brochure[field] || hasIssueForSource(issues, "brochures", sourcePath)) return;

      found.push(
        createGovernanceIssue({
          moduleId: "brochures",
          severity: "warning",
          type: "missing-file",
          message,
          targetRoute: MODULE_CONFIG.brochures.itemRoute(brochure),
          sourcePath,
          targetItem: brochure
        })
      );
    });

    return found;
  });
}

function collectArticleSignalIssues(articleData, issues) {
  return getArticles(articleData)
    .map((article, index) => {
      const sourcePath = `items[${index}].supplierIds`;
      if ((Array.isArray(article.supplierIds) && article.supplierIds.length) || hasIssueForSource(issues, "articles", sourcePath)) {
        return null;
      }

      return createGovernanceIssue({
        moduleId: "articles",
        severity: "warning",
        type: "relation",
        message: "Heeft geen gekoppelde leverancier.",
        targetRoute: MODULE_CONFIG.articles.itemRoute(article),
        sourcePath,
        targetItem: article
      });
    })
    .filter(Boolean);
}

function collectMediaSignalIssues(mediaData, supplierData, brochureData, articleData, issues) {
  return getMediaAssets(mediaData).flatMap((asset, index) => {
    const found = [];
    const fieldSignals = [
      [!asset.file, "file", "Bestandspad ontbreekt.", "missing-file"],
      [isImageLikeMedia(asset) && !asset.alt, "alt", "Alt-tekst ontbreekt.", "missing-alt"],
      [
        asset.rightsStatus === "unknown" || asset.rightsStatus === "needs-review",
        "rightsStatus",
        "Rechtenstatus moet worden gecontroleerd.",
        "rights-review"
      ]
    ];

    fieldSignals.forEach(([active, field, message, type]) => {
      const sourcePath = `items[${index}].${field}`;
      if (!active || hasIssueForSource(issues, "media", sourcePath)) return;

      found.push(
        createGovernanceIssue({
          moduleId: "media",
          severity: "warning",
          type,
          message,
          targetRoute: MODULE_CONFIG.media.itemRoute(asset),
          sourcePath,
          targetItem: asset
        })
      );
    });

    const usage = findMediaUsage(asset, supplierData, brochureData, articleData);
    const usageCount = usage.suppliers.length + usage.brochures.length + usage.articles.length;
    const usageSourcePath = `items[${index}].file`;
    if (asset.file && usageCount === 0 && !hasIssueForSource(issues, "media", usageSourcePath)) {
      found.push(
        createGovernanceIssue({
          moduleId: "media",
          severity: "warning",
          type: "usage",
          message: "Wordt nergens gebruikt in bestaande contentpadvelden.",
          targetRoute: MODULE_CONFIG.media.itemRoute(asset),
          sourcePath: usageSourcePath,
          targetItem: asset
        })
      );
    }

    return found;
  });
}

function dedupeIssues(issues) {
  const seen = new Set();
  return issues.filter((issue) => {
    const key = [issue.module, issue.severity, issue.type, issue.message, issue.targetRoute, issue.sourcePath].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function createModuleSummary({
  id,
  label,
  route,
  total = 0,
  statusCounts = {},
  report = {},
  missingFiles = 0,
  missingMedia = 0,
  brokenRelations = 0,
  usageSignals = 0,
  signals = [],
  issues = []
}) {
  const warnings = issues.length ? issues.filter((issue) => issue.severity === "warning").length : countIssues(report, "warnings");
  const blockers = issues.length ? issues.filter((issue) => issue.severity === "error").length : countIssues(report, "errors");

  return {
    id,
    label,
    route,
    total,
    published: statusCounts.published || 0,
    concept: statusCounts.concept || 0,
    review: statusCounts.review || 0,
    hidden: statusCounts.hidden || 0,
    archived: statusCounts.archived || 0,
    warnings,
    blockers,
    missingFiles,
    missingMedia,
    brokenRelations,
    usageSignals,
    statusCounts,
    signals,
    issues
  };
}

function brochureMissingFiles(brochureData) {
  return getBrochures(brochureData).filter((brochure) => !brochure.pdfFile || !brochure.thumbnail).length;
}

function mediaUsageSignals(mediaData, relationStats) {
  const counts = getMediaCounts(mediaData);
  return counts.missingFilePath + counts.missingAlt + counts.needsRightsReview + relationStats.mediaWithoutUsage;
}

function contentPathsWithoutMediaRegistration(articleQuality, libraryQuality) {
  return articleQuality.stats.missingMediaRegistrations + libraryQuality.stats.missingFiles;
}

export function getContentGovernanceReport({
  suppliers = {},
  brochures = {},
  media = {},
  articles = {},
  library = {}
} = {}) {
  const supplierCounts = getSupplierCounts(suppliers);
  const brochureCounts = getBrochureCounts(brochures);
  const mediaCounts = getMediaCounts(media);
  const articleCounts = getArticleCounts(articles);
  const libraryCounts = getLibraryCounts(library);
  const relationStats = getContentRelationStats(suppliers, brochures, media, articles);
  const supplierReport = validateSupplierFile(suppliers);
  const brochureReport = validateBrochureFile(brochures, suppliers);
  const mediaReport = validateMediaFile(media);
  const articleQuality = getArticleQualityReport(articles, suppliers, brochures, media);
  const libraryQuality = getLibraryQualityReport(library, suppliers, brochures, articles, media);
  const context = {
    itemsByModule: {
      suppliers: getSuppliers(suppliers),
      brochures: getBrochures(brochures),
      articles: getArticles(articles),
      media: getMediaAssets(media),
      library: getLibraryItems(library)
    }
  };

  const reportIssues = [
    ...issuesFromReport({ moduleId: "suppliers", report: supplierReport, context }),
    ...issuesFromReport({ moduleId: "brochures", report: brochureReport, context }),
    ...issuesFromReport({ moduleId: "articles", report: articleQuality, context }),
    ...issuesFromReport({ moduleId: "media", report: mediaReport, context }),
    ...issuesFromReport({ moduleId: "library", report: libraryQuality, context })
  ];
  const issues = dedupeIssues([
    ...reportIssues,
    ...collectSupplierSignalIssues(suppliers, brochures, context, reportIssues),
    ...collectBrochureSignalIssues(brochures, reportIssues),
    ...collectArticleSignalIssues(articles, reportIssues),
    ...collectMediaSignalIssues(media, suppliers, brochures, articles, reportIssues)
  ]);
  const issuesByModule = GOVERNANCE_MODULE_IDS.reduce((byModule, moduleId) => {
    byModule[moduleId] = issues.filter((issue) => issue.module === moduleId);
    return byModule;
  }, {});

  const modules = [
    createModuleSummary({
      id: "suppliers",
      label: "Leveranciers",
      route: "#/leveranciers",
      total: supplierCounts.total,
      statusCounts: supplierCounts.statuses,
      report: supplierReport,
      brokenRelations: relationStats.suppliersWithoutBrochures,
      issues: issuesByModule.suppliers,
      signals: [
        {
          id: "withoutBrochures",
          label: "Zonder brochurekoppeling",
          value: relationStats.suppliersWithoutBrochures,
          state: relationStats.suppliersWithoutBrochures ? "review" : "foundation"
        }
      ]
    }),
    createModuleSummary({
      id: "brochures",
      label: "Brochures",
      route: "#/brochures",
      total: brochureCounts.total,
      statusCounts: brochureCounts.statuses,
      report: brochureReport,
      missingFiles: brochureMissingFiles(brochures),
      issues: issuesByModule.brochures,
      signals: [
        {
          id: "missingFiles",
          label: "Ontbrekende PDF of thumbnail",
          value: brochureMissingFiles(brochures),
          state: brochureMissingFiles(brochures) ? "review" : "foundation"
        },
        {
          id: "withPdf",
          label: "Met PDF-pad",
          value: brochureCounts.withPdf,
          state: "foundation"
        }
      ]
    }),
    createModuleSummary({
      id: "articles",
      label: "Kennisbank",
      route: "#/kennisbank",
      total: articleCounts.total,
      statusCounts: articleQuality.statusCounts,
      report: articleQuality,
      missingMedia: articleQuality.stats.missingMediaRegistrations,
      issues: issuesByModule.articles,
      signals: [
        {
          id: "missingMedia",
          label: "Ontbrekende mediaregistratie",
          value: articleQuality.stats.missingMediaRegistrations,
          state: articleQuality.stats.missingMediaRegistrations ? "review" : "foundation"
        },
        {
          id: "withoutSupplier",
          label: "Zonder leverancier",
          value: relationStats.articlesWithoutSupplier,
          state: relationStats.articlesWithoutSupplier ? "review" : "foundation"
        }
      ]
    }),
    createModuleSummary({
      id: "media",
      label: "Media",
      route: "#/media",
      total: mediaCounts.total,
      statusCounts: mediaCounts.statuses,
      report: mediaReport,
      missingFiles: mediaCounts.missingFilePath,
      missingMedia: contentPathsWithoutMediaRegistration(articleQuality, libraryQuality),
      usageSignals: mediaUsageSignals(media, relationStats),
      issues: issuesByModule.media,
      signals: [
        {
          id: "unregisteredContentPaths",
          label: "Contentpaden zonder mediaregistratie",
          value: contentPathsWithoutMediaRegistration(articleQuality, libraryQuality),
          state: contentPathsWithoutMediaRegistration(articleQuality, libraryQuality) ? "review" : "foundation"
        },
        {
          id: "missingFilePath",
          label: "Zonder bestandspad",
          value: mediaCounts.missingFilePath,
          state: mediaCounts.missingFilePath ? "review" : "foundation"
        },
        {
          id: "missingAlt",
          label: "Afbeeldingen zonder alt",
          value: mediaCounts.missingAlt,
          state: mediaCounts.missingAlt ? "review" : "foundation"
        },
        {
          id: "rightsReview",
          label: "Rechten te controleren",
          value: mediaCounts.needsRightsReview,
          state: mediaCounts.needsRightsReview ? "review" : "foundation"
        },
        {
          id: "withoutUsage",
          label: "Niet gebruikt",
          value: relationStats.mediaWithoutUsage,
          state: relationStats.mediaWithoutUsage ? "review" : "foundation"
        }
      ]
    }),
    createModuleSummary({
      id: "library",
      label: "Bibliotheek",
      route: "#/bibliotheek",
      total: libraryCounts.total,
      statusCounts: libraryQuality.statusCounts,
      report: libraryQuality,
      missingFiles: libraryQuality.stats.missingFiles,
      brokenRelations: libraryQuality.stats.brokenRelations,
      issues: issuesByModule.library,
      signals: [
        {
          id: "missingFiles",
          label: "Ontbrekende bestanden/media",
          value: libraryQuality.stats.missingFiles,
          state: libraryQuality.stats.missingFiles ? "review" : "foundation"
        },
        {
          id: "brokenRelations",
          label: "Verbroken relaties",
          value: libraryQuality.stats.brokenRelations,
          state: libraryQuality.stats.brokenRelations ? "review" : "foundation"
        }
      ]
    })
  ];

  const totals = modules.reduce(
    (summary, module) => {
      summary.totalItems += module.total;
      summary.warnings += module.warnings;
      summary.blockers += module.blockers;
      summary.missingFiles += module.missingFiles;
      summary.missingMedia += module.missingMedia;
      summary.brokenRelations += module.brokenRelations;
      summary.usageSignals += module.usageSignals;
      summary.issueCount += module.issues.length;
      summary.issueErrors += module.issues.filter((issue) => issue.severity === "error").length;
      summary.issueWarnings += module.issues.filter((issue) => issue.severity === "warning").length;
      if (module.issues.length) summary.modulesWithAttention += 1;
      return summary;
    },
    {
      moduleCount: modules.length,
      totalItems: 0,
      warnings: 0,
      blockers: 0,
      missingFiles: 0,
      missingMedia: 0,
      brokenRelations: 0,
      usageSignals: 0,
      issueCount: 0,
      issueErrors: 0,
      issueWarnings: 0,
      modulesWithAttention: 0
    }
  );

  return {
    valid: totals.blockers === 0,
    totals,
    relationStats,
    registeredMediaPaths: getMediaAssets(media).length,
    modules,
    issues
  };
}
