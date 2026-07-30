export const STUDIO_ROUTES = [
  {
    id: "dashboard",
    path: "/dashboard",
    title: "Dashboard",
    enabled: true
  },
  {
    id: "homepage",
    path: "/homepage",
    title: "Homepage",
    enabled: false
  },
  {
    id: "suppliers",
    path: "/leveranciers",
    title: "Leveranciers",
    enabled: true,
    sectionId: "suppliers"
  },
  {
    id: "brochures",
    path: "/brochures",
    title: "Brochures",
    enabled: true,
    sectionId: "brochures"
  },
  {
    id: "knowledge",
    path: "/kennisbank",
    title: "Kennisbank",
    enabled: false
  },
  {
    id: "library",
    path: "/bibliotheek",
    title: "Bibliotheek",
    enabled: false
  },
  {
    id: "showroom",
    path: "/showroom",
    title: "Virtuele Showroom",
    enabled: false
  },
  {
    id: "dryice",
    path: "/droogijsshop",
    title: "Droogijsshop",
    enabled: false
  },
  {
    id: "specialists",
    path: "/specialisten",
    title: "Specialisten",
    enabled: false
  },
  {
    id: "media",
    path: "/media",
    title: "Media",
    enabled: true,
    sectionId: "media"
  },
  {
    id: "ctas",
    path: "/ctas",
    title: "CTA's",
    enabled: false
  },
  {
    id: "navigation",
    path: "/navigatie",
    title: "Navigatie",
    enabled: false
  },
  {
    id: "settings",
    path: "/instellingen",
    title: "Instellingen",
    enabled: false
  }
];

export function routeFromHash(hash) {
  const cleaned = hash.replace(/^#/, "") || "/dashboard";
  const exactRoute = STUDIO_ROUTES.find((route) => route.path === cleaned);
  if (exactRoute) return exactRoute;

  if (cleaned === "/leveranciers/nieuw") {
    return {
      id: "supplierNew",
      path: cleaned,
      title: "Nieuwe leverancier",
      enabled: true,
      sectionId: "suppliers",
      params: {}
    };
  }

  const supplierEditMatch = cleaned.match(/^\/leveranciers\/([^/]+)\/bewerken$/);
  if (supplierEditMatch) {
    return {
      id: "supplierEdit",
      path: cleaned,
      title: "Leverancier bewerken",
      enabled: true,
      sectionId: "suppliers",
      params: { slug: supplierEditMatch[1] }
    };
  }

  const supplierDetailMatch = cleaned.match(/^\/leveranciers\/([^/]+)$/);
  if (supplierDetailMatch) {
    return {
      id: "supplierDetail",
      path: cleaned,
      title: "Leverancier bekijken",
      enabled: true,
      sectionId: "suppliers",
      params: { slug: supplierDetailMatch[1] }
    };
  }

  if (cleaned === "/brochures/nieuw") {
    return {
      id: "brochureNew",
      path: cleaned,
      title: "Nieuwe brochure",
      enabled: true,
      sectionId: "brochures",
      params: {}
    };
  }

  const brochureEditMatch = cleaned.match(/^\/brochures\/([^/]+)\/bewerken$/);
  if (brochureEditMatch) {
    return {
      id: "brochureEdit",
      path: cleaned,
      title: "Brochure bewerken",
      enabled: true,
      sectionId: "brochures",
      params: { slug: brochureEditMatch[1] }
    };
  }

  const brochureDetailMatch = cleaned.match(/^\/brochures\/([^/]+)$/);
  if (brochureDetailMatch) {
    return {
      id: "brochureDetail",
      path: cleaned,
      title: "Brochure bekijken",
      enabled: true,
      sectionId: "brochures",
      params: { slug: brochureDetailMatch[1] }
    };
  }

  if (cleaned === "/media/nieuw") {
    return {
      id: "mediaNew",
      path: cleaned,
      title: "Nieuw media-asset",
      enabled: true,
      sectionId: "media",
      params: {}
    };
  }

  const mediaEditMatch = cleaned.match(/^\/media\/([^/]+)\/bewerken$/);
  if (mediaEditMatch) {
    return {
      id: "mediaEdit",
      path: cleaned,
      title: "Media-asset bewerken",
      enabled: true,
      sectionId: "media",
      params: { id: mediaEditMatch[1] }
    };
  }

  const mediaDetailMatch = cleaned.match(/^\/media\/([^/]+)$/);
  if (mediaDetailMatch) {
    return {
      id: "mediaDetail",
      path: cleaned,
      title: "Media-asset bekijken",
      enabled: true,
      sectionId: "media",
      params: { id: mediaDetailMatch[1] }
    };
  }

  return {
    id: "notFound",
    path: cleaned,
    title: "Pagina niet gevonden",
    enabled: true,
    params: { requestedPath: cleaned }
  };
}
