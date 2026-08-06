import { getContentStatusLabel, isReadyForPublicationStatus, normalizeContentStatus } from "./content-status.js";

const PUBLIC_DATASET_KEYS = {
  suppliers: "suppliers",
  brochures: "brochures",
  articles: "articles"
};

function publicItemsForModule(moduleId, publicData = {}) {
  const key = PUBLIC_DATASET_KEYS[moduleId];
  return key && Array.isArray(publicData?.[key]?.items) ? publicData[key].items : [];
}

export function findPublishedPublicItem(moduleId, item, publicData = {}) {
  if (!item) return null;
  const publicItems = publicItemsForModule(moduleId, publicData);
  return publicItems.find((publicItem) => publicItem.id === item.id || publicItem.slug === item.slug) || null;
}

export function isPublishedOnWebsite(moduleId, item, publicData = {}) {
  return Boolean(findPublishedPublicItem(moduleId, item, publicData));
}

export function displayStatusForPublicModule(moduleId, item, publicData = {}) {
  const status = normalizeContentStatus(item?.status);
  if (isPublishedOnWebsite(moduleId, item, publicData)) return "published";
  if (isReadyForPublicationStatus(status)) return "ready";
  return status;
}

export function displayStatusLabelForPublicModule(moduleId, item, publicData = {}) {
  return getContentStatusLabel(displayStatusForPublicModule(moduleId, item, publicData));
}

export function publicationStateForItem(moduleId, item, publicData = {}) {
  const publicItem = findPublishedPublicItem(moduleId, item, publicData);
  const status = normalizeContentStatus(item?.status);
  const published = Boolean(publicItem);
  const ready = isReadyForPublicationStatus(status);

  if (published) {
    return {
      status: "published",
      label: "Gepubliceerd op website",
      message: "Dit item staat in de publieke dataset en is beschikbaar voor de website.",
      publicItem,
      nextStep: "Controleer wijzigingen in de bewerkversie voordat je opnieuw Website bijwerken uitvoert."
    };
  }

  if (ready) {
    return {
      status: "ready",
      label: "Gereed voor publicatie",
      message: "Dit item is gereed in de bewerkversie, maar staat nog niet in de publieke dataset.",
      publicItem: null,
      nextStep: "Gebruik Gegevens exporteren, vervang het beheerbestand en voer daarna Website bijwerken uit."
    };
  }

  return {
    status,
    label: getContentStatusLabel(status),
    message: status === "archived" ? "Dit item is gearchiveerd en niet publiek zichtbaar." : "Dit item staat nog in bewerking.",
    publicItem: null,
    nextStep: status === "archived" ? "Zet terug naar Concept als je opnieuw wilt werken." : "Rond de ontbrekende informatie af en zet daarna op Gereed voor publicatie."
  };
}
