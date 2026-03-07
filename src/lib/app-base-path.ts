/**
 * Shared application base path derived from Vite's configured deployment base.
 *
 * GitHub Pages project sites serve this app from a repository subpath instead
 * of the domain root, so both the router and asset/data URL helpers must agree
 * on the same base path.
 */
export function normalizeAppBasePath(basePath: string): string {
  if (basePath === "/") {
    return "/";
  }

  return basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
}

export const appBasePath = normalizeAppBasePath(import.meta.env.BASE_URL);

export function joinAppPath(basePath: string, path: string): string {
  const normalizedBasePath = normalizeAppBasePath(basePath);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (normalizedBasePath === "/") {
    return normalizedPath;
  }

  return `${normalizedBasePath}${normalizedPath}`;
}

export function toAppPath(path: string): string {
  return joinAppPath(appBasePath, path);
}
