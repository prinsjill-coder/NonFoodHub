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
    enabled: false
  },
  {
    id: "brochures",
    path: "/brochures",
    title: "Brochures",
    enabled: false
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
    enabled: false
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
  return STUDIO_ROUTES.find((route) => route.path === cleaned) || STUDIO_ROUTES[0];
}
