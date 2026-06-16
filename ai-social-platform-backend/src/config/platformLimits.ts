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

export function formatPlatformConstraints(platforms: string[]): string {
  return platforms
    .map((p) => `- ${p}: ${getCharLimit(p)} characters max`)
    .join('\n');
}
