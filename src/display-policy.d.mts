export type DisplayLike = { id: number };

export function chooseExternalDisplay<T extends DisplayLike>(
  displays: readonly T[],
  primaryId: number,
  preferredId: number | null,
): T | undefined;
