import {
  GOVERNANCE_MODULE_CONFIG,
  GOVERNANCE_MODULE_IDS,
  getContentGovernanceReport
} from "./content-governance.js";
import { getArticles } from "./article-model.js";
import { getBrochures } from "./brochure-model.js";
import { getContentStatusLabel } from "./content-status.js";
import { getLibraryItems } from "./library-model.js";
import { getMediaAssets } from "./media-model.js";
import { projectPublicArticles } from "./public-articles.js";
import { projectPublicBrochures } from "./public-brochures.js";
import { PUBLIC_CONTENT_STATUS, PUBLIC_DATASET_CONFIG, isPublicContentItem } from "./public-content.js";
import { projectPublicSuppliers } from "./public-suppliers.js";
import { getSuppliers } from "./supplier-model.js";

export const CONTENT_READINESS_STATUSES = ["ready", "review", "needs_attention"];

export const CONTENT_READINESS_LABELS = {
  ready: "Publiceerbaar",
  review: "Nog enkele punten afronden",
  needs_attention: "Nog niet publiceerbaar"
};

const NEEDS_ATTENTION_ISSUE_TYPES = ["missing-file", "missing-alt"];
const REVIEW_FIRST_ISSUE_TYPES = ["missing-media-registration", "relation", "rights-review"];
const PRIORITY_LABELS = {
  1: "Eerst afronden",
  2: "Daarna afronden",
  3: "Controlepunt"
};
const PUBLICATION_STATUS_LABELS = {
  ready: "Gepubliceerd",
  review: "Zichtbaar, nog afronden",
  not_public: "Nog niet gepubliceerd",
  not_applicable: "Geen websiteweergave"
};
const PUBLICATION_MODULE_CONFIG = {
  suppliers: {
    dataset: PUBLIC_DATASET_CONFIG.suppliers.publicPath,
    routeLabel: "leverancierdetail"
  },
  brochures: {
    dataset: PUBLIC_DATASET_CONFIG.brochures.publicPath,
    routeLabel: "brochurepagina"
  },
  articles: {
    dataset: PUBLIC_DATASET_CONFIG.articles.publicPath,
    routeLabel: "inspiratiepagina"
  }
};

function issueNeedsAttention(issue) {
  return issue?.severity === "error" || NEEDS_ATTENTION_ISSUE_TYPES.includes(issue?.type);
}

function issuePriority(issue) {
  if (issueNeedsAttention(issue)) return 1;
  if (REVIEW_FIRST_ISSUE_TYPES.includes(issue?.type)) return 2;
  return 3;
}

function sortIssuesByPriority(issues) {
  return [...issues].sort((left, right) => {
    const priorityDifference = issuePriority(left) - issuePriority(right);
    if (priorityDifference) return priorityDifference;

    const severityDifference = String(left?.severity || "").localeCompare(String(right?.severity || ""));
    if (severityDifference) return severityDifference;

    return String(left?.message || "").localeCompare(String(right?.message || ""));
  });
}

function friendlyIssueMessage(issue) {
  if (issue?.type === "missing-file") {
    return "Voeg het ontbrekende bestand toe of vul het juiste bestand in, zodat bezoekers de content kunnen openen.";
  }
  if (issue?.type === "missing-alt") {
    return "Voeg een duidelijke alt-tekst toe, zodat de afbeelding toegankelijk is voor bezoekers die hulpsoftware gebruiken.";
  }
  if (issue?.type === "missing-media-registration") {
    return "Registreer het gebruikte beeld in Media, zodat rechten en gebruik later goed gecontroleerd kunnen worden.";
  }
  if (issue?.type === "rights-review") {
    return "Controleer de beeldrechten voordat dit bestand breder op de website wordt gebruikt.";
  }
  if (issue?.type === "relation") {
    return "Controleer de koppeling, zodat bezoekers logisch kunnen doorklikken tussen inspiratie, leverancier en brochure.";
  }
  return issue?.message || "Controleer dit punt voordat de content verder kan.";
}

function reasonFromIssue(issue) {
  const priority = issuePriority(issue);

  return {
    message: friendlyIssueMessage(issue),
    priority,
    priorityLabel: PRIORITY_LABELS[priority],
    severity: issue.severity,
    type: issue.type,
    targetRoute: issue.targetRoute,
    governanceRoute: "#/governance"
  };
}

function hasValue(value) {
  return String(value ?? "").trim().length > 0;
}

function byId(items = []) {
  return new Map(items.map((item) => [item.id, item]));
}

function publicationReason(message, priority = 2, type = "public-projection") {
  return {
    message,
    priority,
    priorityLabel: PRIORITY_LABELS[priority] || PRIORITY_LABELS[3],
    type
  };
}

function publicationCheck(message, type = "public-projection") {
  return { message, type };
}

function publicProjectionContext({ suppliers = {}, brochures = {}, articles = {} } = {}, options = {}) {
  const publicSuppliers = projectPublicSuppliers(suppliers, articles, brochures, options).items;
  const publicBrochures = projectPublicBrochures(brochures, suppliers, options).items;
  const publicArticles = projectPublicArticles(articles, suppliers).items;

  return {
    publicByModule: {
      suppliers: byId(publicSuppliers),
      brochures: byId(publicBrochures),
      articles: byId(publicArticles)
    },
    sourceByModule: {
      suppliers: byId(getSuppliers(suppliers)),
      brochures: byId(getBrochures(brochures)),
      articles: byId(getArticles(articles))
    }
  };
}

function publicSupplierExists(supplierId, projectionContext) {
  return projectionContext.publicByModule.suppliers.has(supplierId);
}

function publicationStatusFor({ included, reasons }) {
  if (!included) return "not_public";
  return reasons.length ? "review" : "ready";
}

function publicationState(status) {
  if (status === "ready") return "ready";
  if (status === "review") return "review";
  if (status === "not_public") return "disabled";
  return "foundation";
}

function articlePublicationFeedback(item, projectedItem, projectionContext) {
  const supplierIds = Array.isArray(item?.supplierIds) ? item.supplierIds.filter(Boolean) : [];
  const publicSuppliers = Array.isArray(projectedItem?.suppliers) ? projectedItem.suppliers : [];
  const reasons = [];
  const checks = [];

  if (hasValue(item?.title)) checks.push(publicationCheck("Titel is ingevuld."));
  if (hasValue(item?.summary)) checks.push(publicationCheck("Samenvatting is ingevuld."));
  if (hasValue(item?.heroImage)) checks.push(publicationCheck("Headerafbeelding is gekoppeld."));

  if (!supplierIds.length) {
    reasons.push(publicationReason("Koppel een leverancier zodat bezoekers vanuit het artikel kunnen doorklikken naar het assortiment.", 3, "relation"));
  } else if (!publicSuppliers.length) {
    reasons.push(
      publicationReason(
        "De gekoppelde leverancier staat nog niet op de website. Werk die leverancier eerst bij, zodat de artikelcontext zichtbaar wordt.",
        2,
        "relation"
      )
    );
  } else {
    checks.push(publicationCheck("Publieke leveranciercontext is beschikbaar."));
  }

  supplierIds
    .filter((supplierId) => !publicSupplierExists(supplierId, projectionContext))
    .forEach((supplierId) => {
      const supplier = projectionContext.sourceByModule.suppliers.get(supplierId);
      const label = supplier?.name || supplierId;
      reasons.push(publicationReason(`Werk leverancier ${label} bij voor de website, zodat deze koppeling zichtbaar wordt.`, 2, "relation"));
    });

  return { reasons, checks };
}

function supplierPublicationFeedback(item, projectedItem) {
  const relatedArticles = Array.isArray(projectedItem?.relatedArticles) ? projectedItem.relatedArticles : [];
  const relatedBrochures = Array.isArray(projectedItem?.relatedBrochures) ? projectedItem.relatedBrochures : [];
  const reasons = [];
  const checks = [];

  if (hasValue(item?.name)) checks.push(publicationCheck("Naam is ingevuld."));
  if (hasValue(item?.description)) checks.push(publicationCheck("Beschrijving is ingevuld."));
  if (hasValue(item?.logo)) checks.push(publicationCheck("Logo is gekoppeld."));
  if (Array.isArray(item?.categories) && item.categories.length) checks.push(publicationCheck("Categorie is ingevuld."));

  if (relatedBrochures.length) {
    checks.push(publicationCheck("Heeft publieke brochurekoppeling."));
  } else {
    reasons.push(publicationReason("Voeg minimaal één brochure toe zodat bezoekers een collectie kunnen bekijken of downloaden.", 2, "relation"));
  }

  if (relatedArticles.length) {
    checks.push(publicationCheck("Heeft publieke kennisbankkoppeling."));
  } else {
    reasons.push(publicationReason("Koppel een kennisbankartikel zodat bezoekers via inspiratie bij deze leverancier kunnen uitkomen.", 3, "relation"));
  }

  return { reasons, checks };
}

function brochurePublicationFeedback(item, projectedItem, projectionContext) {
  const reasons = [];
  const checks = [];

  if (hasValue(item?.title)) checks.push(publicationCheck("Titel is ingevuld."));
  if (hasValue(item?.description)) checks.push(publicationCheck("Samenvatting is ingevuld."));
  if (hasValue(item?.thumbnail)) checks.push(publicationCheck("Afbeelding is gekoppeld."));

  if (hasValue(item?.pdfFile)) {
    checks.push(publicationCheck("PDF-bestand is ingevuld; de download verschijnt alleen als het bestand beschikbaar is."));
  } else {
    reasons.push(publicationReason("Vul het PDF-bestand in zodat bezoekers de brochure kunnen openen of downloaden.", 1, "missing-file"));
  }

  if (!hasValue(item?.supplierId)) {
    reasons.push(publicationReason("Koppel een leverancier zodat bezoekers zien bij welk merk of assortiment deze brochure hoort.", 1, "relation"));
  } else if (!publicSupplierExists(item.supplierId, projectionContext)) {
    const supplier = projectionContext.sourceByModule.suppliers.get(item.supplierId);
    const label = supplier?.name || item.supplierId;
    reasons.push(publicationReason(`Werk leverancier ${label} bij voor de website, zodat deze brochure zichtbaar gekoppeld is.`, 1, "relation"));
  } else {
    checks.push(publicationCheck("Publieke leverancierrelatie is beschikbaar."));
  }

  if (!projectedItem && isPublicContentItem(item) && !reasons.length) {
    reasons.push(publicationReason("Nog niet zichtbaar op de brochurepagina; controleer de aandachtspunten in Governance.", 2));
  }

  return { reasons, checks };
}

function modulePublicationFeedback(moduleId, item, projectedItem, projectionContext) {
  if (moduleId === "articles") return articlePublicationFeedback(item, projectedItem, projectionContext);
  if (moduleId === "suppliers") return supplierPublicationFeedback(item, projectedItem);
  if (moduleId === "brochures") return brochurePublicationFeedback(item, projectedItem, projectionContext);
  return { reasons: [], checks: [] };
}

function publicationForItem(moduleId, item, issues, projectionContext) {
  const config = PUBLICATION_MODULE_CONFIG[moduleId];

  if (!config) {
    return {
      status: "not_applicable",
      label: PUBLICATION_STATUS_LABELS.not_applicable,
      state: publicationState("not_applicable"),
      included: false,
      dataset: "",
      reasons: [
        publicationReason("Deze module heeft nog geen publieke websiteweergave.", 3, "not-applicable")
      ],
      checks: []
    };
  }

  const projectedItem = projectionContext.publicByModule[moduleId].get(item?.id);
  const included = Boolean(projectedItem);
  const feedback = modulePublicationFeedback(moduleId, item, projectedItem, projectionContext);
  const reasons = [...feedback.reasons];
  const checks = [...feedback.checks];

  if (isPublicContentItem(item)) {
    checks.unshift(publicationCheck("Contentstatus is Gepubliceerd."));
  } else {
    reasons.unshift(
      publicationReason(
        `Niet zichtbaar omdat de status ${getContentStatusLabel(item?.status || "onbekend")} is. Zet de status op ${getContentStatusLabel(PUBLIC_CONTENT_STATUS)} en werk daarna de website bij.`,
        1,
        "status"
      )
    );
  }

  if (included) {
    checks.unshift(publicationCheck(`Publieke website bevat dit item voor de ${config.routeLabel}.`));
  }

  const status = publicationStatusFor({ included, reasons });

  return {
    status,
    label: PUBLICATION_STATUS_LABELS[status],
    state: publicationState(status),
    included,
    dataset: config.dataset,
    reasons,
    checks,
    issues: issues.map((issue) => ({
      message: issue.message,
      severity: issue.severity,
      type: issue.type,
      targetRoute: issue.targetRoute
    }))
  };
}

function readinessStatusForIssues(issues) {
  if (issues.some(issueNeedsAttention)) return "needs_attention";
  if (issues.length) return "review";
  return "ready";
}

function readinessScoreForIssues(status, issues) {
  const attentionIssues = issues.filter(issueNeedsAttention).length;
  const reviewIssues = issues.length - attentionIssues;

  if (status === "ready") return 100;
  if (status === "review") return Math.max(60, 85 - reviewIssues * 5);
  return Math.max(0, 55 - attentionIssues * 8 - reviewIssues * 3);
}

function itemId(item) {
  return item?.id || item?.slug || "";
}

function itemReadiness({ moduleId, item, issues, projectionContext }) {
  const sortedIssues = sortIssuesByPriority(issues);
  const status = readinessStatusForIssues(issues);
  const config = GOVERNANCE_MODULE_CONFIG[moduleId];
  const publication = publicationForItem(moduleId, item, sortedIssues, projectionContext);

  return {
    module: moduleId,
    moduleLabel: config.label,
    itemId: itemId(item),
    itemLabel: config.itemLabel(item),
    targetRoute: config.itemRoute(item),
    status,
    label: CONTENT_READINESS_LABELS[status],
    score: readinessScoreForIssues(status, issues),
    issues: sortedIssues.map((issue) => ({ ...issue, priority: issuePriority(issue) })),
    reasons: sortedIssues.map(reasonFromIssue),
    publication
  };
}

function itemsByModule({ suppliers = {}, brochures = {}, media = {}, articles = {}, library = {} } = {}) {
  return {
    suppliers: getSuppliers(suppliers),
    brochures: getBrochures(brochures),
    articles: getArticles(articles),
    media: getMediaAssets(media),
    library: getLibraryItems(library)
  };
}

function readinessCounts(items) {
  return items.reduce(
    (counts, item) => {
      counts[item.status] += 1;
      return counts;
    },
    { ready: 0, review: 0, needs_attention: 0 }
  );
}

function publicationCounts(items) {
  return items.reduce(
    (counts, item) => {
      const status = item.publication?.status || "not_applicable";
      counts[status] += 1;
      if (item.publication?.included) counts.visible += 1;
      if (status === "ready" || status === "review") counts.connected += 1;
      return counts;
    },
    { ready: 0, review: 0, not_public: 0, not_applicable: 0, visible: 0, connected: 0 }
  );
}

function issuesForRoute(issues, targetRoute) {
  return issues.filter((issue) => issue.targetRoute === targetRoute);
}

export function getContentReadinessReport(data = {}, options = {}) {
  const governanceReport = options.governanceReport || getContentGovernanceReport(data);
  const sourceItems = itemsByModule(data);
  const projectionContext = publicProjectionContext(data, options.publicProjectionOptions || {});

  const modules = GOVERNANCE_MODULE_IDS.map((moduleId) => {
    const config = GOVERNANCE_MODULE_CONFIG[moduleId];
    const items = sourceItems[moduleId].map((item) => {
      const route = config.itemRoute(item);
      return itemReadiness({
        moduleId,
        item,
        issues: issuesForRoute(governanceReport.issues, route),
        projectionContext
      });
    });
    const counts = readinessCounts(items);
    const publication = publicationCounts(items);

    return {
      id: moduleId,
      label: config.label,
      route: config.route,
      total: items.length,
      ready: counts.ready,
      review: counts.review,
      needs_attention: counts.needs_attention,
      publication,
      items
    };
  });

  const totals = modules.reduce(
    (summary, module) => {
      summary.totalItems += module.total;
      summary.ready += module.ready;
      summary.review += module.review;
      summary.needs_attention += module.needs_attention;
      summary.publication.ready += module.publication.ready;
      summary.publication.review += module.publication.review;
      summary.publication.not_public += module.publication.not_public;
      summary.publication.not_applicable += module.publication.not_applicable;
      summary.publication.visible += module.publication.visible;
      summary.publication.connected += module.publication.connected;
      return summary;
    },
    {
      moduleCount: modules.length,
      totalItems: 0,
      ready: 0,
      review: 0,
      needs_attention: 0,
      publication: {
        ready: 0,
        review: 0,
        not_public: 0,
        not_applicable: 0,
        visible: 0,
        connected: 0
      }
    }
  );

  return {
    totals,
    modules
  };
}

export function findReadinessByRoute(readinessReport, moduleId, targetRoute) {
  const module = readinessReport?.modules?.find((item) => item.id === moduleId);
  return module?.items.find((item) => item.targetRoute === targetRoute) || null;
}
