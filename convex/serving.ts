const CONTENT_CACHE = "public, max-age=300, stale-while-revalidate=86400";
const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";
const STATIC_CACHE = "public, max-age=3600, stale-while-revalidate=86400";

const MIME_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json",
  ".mjs": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".xml": "application/xml",
};

export type StaticRequest =
  | { kind: "asset"; path: string; varyHost: boolean }
  | { kind: "bad-request" }
  | { kind: "redirect"; location: string; status: 301 | 308 };

export function resolveStaticRequest(requestUrl: string, host: string | null): StaticRequest {
  const url = new URL(requestUrl);
  const path = decodeRequestPath(url.pathname);
  if (path === null) return { kind: "bad-request" };

  if (path === "/convex-auth/sso" || path.startsWith("/convex-auth/sso/")) {
    url.pathname = path.replace("/convex-auth/sso", "/convex-auth/connection");
    return { kind: "redirect", location: url.toString(), status: 301 };
  }

  if (path === "" || path === "/") {
    return {
      kind: "asset",
      path: isEngineeringHost(host) ? "/landing/sh/index.html" : "/index.html",
      varyHost: true,
    };
  }

  if (!hasFileExtension(path)) {
    if (!path.endsWith("/")) {
      url.pathname = `${path}/`;
      return { kind: "redirect", location: url.toString(), status: 308 };
    }
    return { kind: "asset", path: `${path}index.html`, varyHost: false };
  }

  return { kind: "asset", path, varyHost: false };
}

export function cacheControlFor(path: string): string {
  if (isHashedAsset(path)) return IMMUTABLE_CACHE;
  if (isContent(path)) return CONTENT_CACHE;
  return STATIC_CACHE;
}

export function contentTypeFor(path: string): string {
  const extension = path.slice(path.lastIndexOf(".")).toLowerCase();
  return MIME_TYPES[extension] || "application/octet-stream";
}

export function isHashedAsset(path: string): boolean {
  const match = path.match(/(?:[-._])([\dA-Za-z_-]{6,32})\.[A-Za-z\d_]+$/);
  return match !== null && (path.includes("/_astro/") || /[\d_-]/.test(match[1]));
}

function decodeRequestPath(path: string): string | null {
  try {
    return decodeURIComponent(path);
  } catch {
    return null;
  }
}

function hasFileExtension(path: string): boolean {
  const lastSegment = path.split("/").pop() || "";
  return lastSegment.includes(".") && !lastSegment.startsWith(".");
}

function isContent(path: string): boolean {
  return /\.(?:html|json|md|txt)$/i.test(path);
}

function isEngineeringHost(host: string | null): boolean {
  const hostname = host?.split(":", 1)[0]?.toLowerCase();
  return (
    hostname === "estifanos.sh" ||
    hostname === "www.estifanos.sh" ||
    hostname === "estifanos.sh.localhost"
  );
}
