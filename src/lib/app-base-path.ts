/**
 * Shared application base path derived from Vite's configured deployment base.
 *
 * GitHub Pages project sites serve this app from a repository subpath instead
 * of the domain root, so both the router and asset/data URL helpers must agree
 * on the same base path.
 */
export const appBasePath = import.meta.env.BASE_URL;

export function toAppPath(path: string): string {
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  return `${appBasePath}${normalizedPath}`;
}
