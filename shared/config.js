import { CONTENT_STATUS_LABELS } from "./content-status.js";

export const STUDIO_CONFIG = {
  appName: "NonFood Hub Studio",
  projectName: "NonFoodHub",
  data: {
    navigation: "../data/studio-navigation.json",
    dashboard: "../data/studio-dashboard.json",
    suppliers: "../data/suppliers.json",
    brochures: "../data/brochures.json",
    media: "../data/media.json",
    articles: "../data/articles.json"
  },
  authPlaceholder: {
    title: "Authentication placeholder",
    label: "Geen echte authenticatie actief",
    message:
      "Deze Studio-shell toont alleen waar toegang later komt. Er is nog geen login, sessiebeheer, autorisatie of beveiliging geimplementeerd."
  }
};

export const STATUS_LABELS = {
  foundation: "Studio-fundament",
  empty: "Leeg",
  not_connected: "Niet gekoppeld",
  placeholder: "Placeholder",
  disabled: "Nog niet actief",
  ...CONTENT_STATUS_LABELS,
  success: "Geslaagd"
};
