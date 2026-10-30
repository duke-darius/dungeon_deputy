export function saveTestPolicy({ e2e, isPackaged, delayMs, failFirst }) {
  if (e2e !== true || isPackaged !== false) return { delayMs: 0, failFirst: false };
  return {
    delayMs: Number.isFinite(delayMs) ? Math.max(0, Math.min(5000, delayMs)) : 0,
    failFirst: failFirst === true,
  };
}

export function createFailOnce(enabled) {
  let pending = enabled === true;
  return () => {
    if (!pending) return false;
    pending = false;
    return true;
  };
}
