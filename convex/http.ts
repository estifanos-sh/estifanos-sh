import { httpRouter } from "convex/server";
import { getMimeType } from "@convex-dev/static-hosting";
import { components } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

/**
 * Custom static file handler with directory URL resolution.
 *
 * Tries in order:
 *   1. Exact path match
 *   2. /path/index.html (directory index)
 *   3. /path.html (flat file)
 *   4. 404
 */
const serveStaticFile = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  let path = url.pathname;
  const requestedDirectoryUrl = path.endsWith("/");

  if (path === "/convex-auth" || path === "/convex-auth/") {
    url.pathname = "/convex-auth/getting-started/installation/";
    return Response.redirect(url, 308);
  }

  if (path === "/convex-auth/sso" || path.startsWith("/convex-auth/sso/")) {
    url.pathname = path.replace("/convex-auth/sso", "/convex-auth/connection");
    return Response.redirect(url, 301);
  }

  // Normalize root
  if (path === "" || path === "/") {
    path = "/index.html";
  }

  // Strip trailing slash (e.g., /convex-auth/ -> /convex-auth) so resolution works.
  if (path !== "/index.html" && path.endsWith("/")) {
    path = path.slice(0, -1);
  }

  // Helper to look up an asset from the static hosting component
  const getAsset = async (assetPath: string) => {
    return await ctx.runQuery(components.selfHosting.lib.getByPath, {
      path: assetPath,
    });
  };

  // Try resolution chain
  let asset = await getAsset(path);

  // If no exact match and path has no file extension, try directory patterns
  if (!asset && !hasFileExtension(path)) {
    // Try /path/index.html
    asset = await getAsset(`${path}/index.html`);
    if (asset && !requestedDirectoryUrl) {
      url.pathname = `${path}/`;
      return Response.redirect(url, 308);
    }
    // Try /path.html
    if (!asset) {
      asset = await getAsset(`${path}.html`);
    }
  }

  // 404 — serve custom error page if available
  if (!asset) {
    const notFoundPath =
      path === "/convex-auth" || path.startsWith("/convex-auth/")
        ? "/convex-auth/404.html"
        : "/404.html";
    const notFoundAsset = await getAsset(notFoundPath);
    if (notFoundAsset?.storageId) {
      const notFoundBlob = await ctx.storage.get(notFoundAsset.storageId);
      if (notFoundBlob) {
        return new Response(notFoundBlob, {
          status: 404,
          headers: {
            "Content-Type": "text/html",
            "Cache-Control": "public, max-age=0, must-revalidate",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
    }

    return new Response("Not Found", {
      status: 404,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // ETag / conditional request
  const etag = `"${asset.storageId}"`;
  const ifNoneMatch = request.headers.get("If-None-Match");
  if (ifNoneMatch === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: etag,
        "Cache-Control": isHashedAsset(path)
          ? "public, max-age=31536000, immutable"
          : "public, max-age=0, must-revalidate",
      },
    });
  }

  // Serve from Convex storage
  if (!asset.storageId) {
    return new Response("Storage error", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }
  const blob = await ctx.storage.get(asset.storageId);
  if (!blob) {
    return new Response("Storage error", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const cacheControl = isHashedAsset(path)
    ? "public, max-age=31536000, immutable"
    : "public, max-age=0, must-revalidate";

  return new Response(blob, {
    status: 200,
    headers: {
      "Content-Type": asset.contentType || getMimeType(path),
      "Cache-Control": cacheControl,
      ETag: etag,
      "X-Content-Type-Options": "nosniff",
    },
  });
});

function hasFileExtension(path: string): boolean {
  const lastSegment = path.split("/").pop() || "";
  return lastSegment.includes(".") && !lastSegment.startsWith(".");
}

function isHashedAsset(path: string): boolean {
  return /[-.][\dA-Za-z_]{6,12}\.[a-z]+$/.test(path);
}

// Catch-all route for all GET requests
http.route({
  pathPrefix: "/",
  method: "GET",
  handler: serveStaticFile,
});

export default http;
