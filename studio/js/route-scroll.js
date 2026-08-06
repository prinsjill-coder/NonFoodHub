export function disableRouteScrollRestoration() {
  if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
  }
}

export function scrollRouteToTop() {
  const scrollOptions = {
    top: 0,
    left: 0,
    behavior: "auto"
  };

  window.scrollTo(scrollOptions);
  document.scrollingElement?.scrollTo?.(scrollOptions);
  document.querySelector(".studio-main")?.scrollTo?.(scrollOptions);
  document.querySelector(".studio-content")?.scrollTo?.(scrollOptions);
}
