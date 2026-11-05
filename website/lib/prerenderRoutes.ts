/** The 14 sitemap URLs. Redirect-only paths are not in this list. */
export const LOCATION_SLUGS = [
  'marlow',
  'bicester',
  'aylesbury',
  'great-missenden',
  'wendover',
  'tring',
  'holmer-green',
  'oxford',
  'sandhurst',
] as const;

export const SITEMAP_PATHS = [
  '/',
  '/mission',
  '/careers',
  '/3x3-gameday',
  '/policies',
  ...LOCATION_SLUGS.map((slug) => `/location/${slug}`),
] as const;

export function isPrerenderPath(path: string): boolean {
  return (SITEMAP_PATHS as readonly string[]).includes(path);
}

export function prerenderAssetPath(path: string): string {
  return path === '/' ? '/index.html' : `${path}/index.html`;
}

export function prerenderMarker(path: string): string {
  return `<!--hh-prerender:${path}-->`;
}

export const SPA_SHELL_MARKER = '<!--hh-spa-shell-->';
export const SPA_SHELL_PATH = '/_shell.html';
