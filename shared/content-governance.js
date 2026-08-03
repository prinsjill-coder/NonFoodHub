import { getArticleCounts } from "./article-model.js";
import { getArticleQualityReport } from "./article-quality.js";
import { validateBrochureFile } from "./brochure-file-validation.js";
import { getBrochureCounts, getBrochures } from "./brochure-model.js";
import { getContentRelationStats } from "./content-relations.js";
import { getLibraryCounts } from "./library-model.js";
import { getLibraryQualityReport } from "./library-quality.js";
import { validateMediaFile } from "./media-file-validation.js";
import { getMediaCounts, getMediaAssets } from "./media-model.js";
import { validateSupplierFile } from "./supplier-file-validation.js";
import { getSupplierCounts } from "./supplier-model.js";

export const GOVERNANCE_MODULE_IDS = ["suppliers", "brochures", "articles", "media", "library"];

function countIssues(report, key) {
  return Array.isArray(report?.[key]) ? report[key].length : 0;
}

function statusValue(counts, status) {
  return counts?.statuses?.[status] || counts?.statusCounts?.[status] || 0;
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
  signals = []
}) {
  const warnings = countIssues(report, "warnings");
  const blockers = countIssues(report, "errors");

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
    signals
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

  const modules = [
    createModuleSummary({
      id: "suppliers",
      label: "Leveranciers",
      route: "#/leveranciers",
      total: supplierCounts.total,
      statusCounts: supplierCounts.statuses,
      report: supplierReport,
      brokenRelations: relationStats.suppliersWithoutBrochures,
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
      usageSignals: 0
    }
  );

  return {
    valid: totals.blockers === 0,
    totals,
    relationStats,
    registeredMediaPaths: getMediaAssets(media).length,
    modules
  };
}
