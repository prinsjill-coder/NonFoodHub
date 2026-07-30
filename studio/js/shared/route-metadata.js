export function getBaseRouteTitle(route, fallback = "Studio") {
  if (route.id === "notFound") return "Pagina niet gevonden";
  return route.title || fallback;
}

export function getItemRouteTitle({
  route,
  item,
  detailRouteId,
  editRouteId,
  missingTitle,
  detailTitle,
  editTitle
}) {
  if (route.id !== detailRouteId && route.id !== editRouteId) return "";
  if (!item) return missingTitle;
  return route.id === editRouteId ? editTitle(item) : detailTitle(item);
}
