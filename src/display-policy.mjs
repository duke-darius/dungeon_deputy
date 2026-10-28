export function chooseExternalDisplay(displays, primaryId, preferredId) {
  const external = displays.filter((display) => display.id !== primaryId);
  if (preferredId === null) return external[0];
  return external.find((display) => display.id === preferredId);
}
