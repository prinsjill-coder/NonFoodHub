export function projectFileAvailabilityForPath(path, mediaSession) {
  if (!path || !mediaSession) return { canOpen: false, source: "", url: "" };

  const localFile = mediaSession.findLocalProjectFile?.(path);
  if (localFile?.url) {
    return { canOpen: true, source: "local", url: localFile.url };
  }

  if (mediaSession.sourceHasProjectFile?.(path)) {
    return { canOpen: true, source: "project", url: "" };
  }

  return { canOpen: false, source: "", url: "" };
}

export function projectFileAvailabilityMap(paths = [], mediaSession) {
  return Object.fromEntries(
    paths
      .filter(Boolean)
      .map((path) => [path, projectFileAvailabilityForPath(path, mediaSession)])
  );
}
