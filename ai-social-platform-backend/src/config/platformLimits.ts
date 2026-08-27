export const PLATFORM_CHAR_LIMITS: Record<string, number> = {
  twitter: 280,
  linkedin: 3000,
  instagram: 2200,
  facebook: 63206,
  tiktok: 2200,
  pinterest: 500,
  youtube: 5000,
};

export function getCharLimit(platform: string): number {
  return PLATFORM_CHAR_LIMITS[platform] ?? 2200;
}

export function getTightestLimit(platforms: string[]): number {
  if (platforms.length === 0) return 2200;
  return Math.min(...platforms.map(getCharLimit));
}

/**
 * Length the post should actually aim for, per platform — distinct from the
 * hard ceiling. Models treat a stated maximum as a target and overshoot, so
 * the prompt needs a concrete range to write to.
 */
export const PLATFORM_TARGET_RANGES: Record<string, [number, number]> = {
  twitter: [120, 240],
  linkedin: [600, 1200],
  instagram: [300, 700],
  facebook: [300, 700],
  tiktok: [100, 250],
  pinterest: [150, 350],
  youtube: [200, 500],
};

export function getTargetRange(platform: string): [number, number] {
  return PLATFORM_TARGET_RANGES[platform] ?? [200, 500];
}

export function formatPlatformConstraints(platforms: string[]): string {
  return platforms
    .map((p) => {
      const [lo, hi] = getTargetRange(p);
      return `- ${p}: each variant must be at least ${lo} characters and at most ${hi} (absolute ceiling ${getCharLimit(p)})`;
    })
    .join('\n');
}

/** Token budget sized to the tightest platform, so output can't run long. */
export function getMaxTokensFor(platforms: string[]): number {
  const tightest = getTightestLimit(platforms);
  // ~4 chars/token, 3 variants, plus room for delimiters and hashtags.
  return Math.min(2000, Math.max(400, Math.ceil((tightest / 4) * 3 + 250)));
}
