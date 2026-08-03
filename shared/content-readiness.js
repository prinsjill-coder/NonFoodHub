import {
  GOVERNANCE_MODULE_CONFIG,
  GOVERNANCE_MODULE_IDS,
  getContentGovernanceReport
} from "./content-governance.js";
import { getArticles } from "./article-model.js";
import { getBrochures } from "./brochure-model.js";
import { getLibraryItems } from "./library-model.js";
import { getMediaAssets } from "./media-model.js";
import { getSuppliers } from "./supplier-model.js";

export const CONTENT_READINESS_STATUSES = ["ready", "review", "needs_attention"];

export const CONTENT_READINESS_LABELS = {
  ready: "Klaar",
  review: "Review nodig",
  needs_attention: "Aandacht nodig"
};

const NEEDS_ATTENTION_ISSUE_TYPES = ["missing-file", "missing-alt"];
const REVIEW_FIRST_ISSUE_TYPES = ["missing-media-registration", "relation", "rights-review"];
const PRIORITY_LABELS = {
  1: "Eerst controleren",
  2: "Daarna controleren",
  3: "Controle gewenst"
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

function reasonFromIssue(issue) {
  const priority = issuePriority(issue);

  return {
    message: issue.message,
    priority,
    priorityLabel: PRIORITY_LABELS[priority],
    severity: issue.severity,
    type: issue.type,
    targetRoute: issue.targetRoute,
    governanceRoute: "#/governance"
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

function itemReadiness({ moduleId, item, issues }) {
  const sortedIssues = sortIssuesByPriority(issues);
  const status = readinessStatusForIssues(issues);
  const config = GOVERNANCE_MODULE_CONFIG[moduleId];

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
    reasons: sortedIssues.map(reasonFromIssue)
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

function issuesForRoute(issues, targetRoute) {
  return issues.filter((issue) => issue.targetRoute === targetRoute);
}

export function getContentReadinessReport(data = {}, options = {}) {
  const governanceReport = options.governanceReport || getContentGovernanceReport(data);
  const sourceItems = itemsByModule(data);

  const modules = GOVERNANCE_MODULE_IDS.map((moduleId) => {
    const config = GOVERNANCE_MODULE_CONFIG[moduleId];
    const items = sourceItems[moduleId].map((item) => {
      const route = config.itemRoute(item);
      return itemReadiness({
        moduleId,
        item,
        issues: issuesForRoute(governanceReport.issues, route)
      });
    });
    const counts = readinessCounts(items);

    return {
      id: moduleId,
      label: config.label,
      route: config.route,
      total: items.length,
      ready: counts.ready,
      review: counts.review,
      needs_attention: counts.needs_attention,
      items
    };
  });

  const totals = modules.reduce(
    (summary, module) => {
      summary.totalItems += module.total;
      summary.ready += module.ready;
      summary.review += module.review;
      summary.needs_attention += module.needs_attention;
      return summary;
    },
    {
      moduleCount: modules.length,
      totalItems: 0,
      ready: 0,
      review: 0,
      needs_attention: 0
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
