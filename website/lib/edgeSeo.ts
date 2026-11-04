import { SITE_ORIGIN } from './locationSchema';

const APEX_HOST = 'hoopheroes.co.uk';

/** 301 target for the apex host, or null when this request must not be redirected. */
export function apexWwwRedirectTarget(url: URL): string | null {
  if (url.hostname !== APEX_HOST) return null;
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return null;
  return `${SITE_ORIGIN}${url.pathname}${url.search}`;
}

/** /llms.txt is not a page. There is no file for it in public/. */
export function isLlmsTxtRequest(pathname: string): boolean {
  return pathname === '/llms.txt';
}
