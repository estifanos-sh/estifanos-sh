import { httpRouter } from "convex/server";
import { components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { httpAction, type ActionCtx } from "./_generated/server";
import { cacheControlFor, contentTypeFor, resolveStaticRequest } from "./serving";

const http = httpRouter();

interface HostedAsset {
  appStorageId?: string;
  blobId?: string;
  contentType?: string;
  etag?: string;
  storageUrl?: string;
}

const serveStaticFile = httpAction(async (ctx, request) => {
  const resolution = resolveStaticRequest(request.url, request.headers.get("host"));

  if (resolution.kind === "bad-request") {
    return new Response("Bad Request", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  if (resolution.kind === "redirect") {
    return Response.redirect(resolution.location, resolution.status);
  }

  const asset = (await ctx.runQuery(components.selfHosting.lib.resolveAssetForHttp, {
    path: resolution.path,
    spaFallback: false,
  })) as HostedAsset | null;

  if (asset) {
    return await assetResponse(ctx, request, resolution.path, asset, {
      varyHost: resolution.varyHost,
    });
  }

  const project = ["convex-auth", "convex-embedded"].find(
    (id) => resolution.path === `/${id}/index.html` || resolution.path.startsWith(`/${id}/`),
  );
  const notFoundPath = project ? `/${project}/404.html` : "/404.html";
  const notFoundAsset = (await ctx.runQuery(components.selfHosting.lib.resolveAssetForHttp, {
    path: notFoundPath,
    spaFallback: false,
  })) as HostedAsset | null;

  if (!notFoundAsset) {
    return new Response("Not Found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return await assetResponse(ctx, request, notFoundPath, notFoundAsset, {
    status: 404,
  });
});

async function assetResponse(
  ctx: ActionCtx,
  request: Request,
  path: string,
  asset: HostedAsset,
  options: { status?: number; varyHost?: boolean } = {},
): Promise<Response> {
  const cacheControl = cacheControlFor(path);
  const contentType = asset.contentType || contentTypeFor(path);
  const headers = {
    "Cache-Control": cacheControl,
    "Content-Type": contentType,
    ...(asset.etag ? { ETag: asset.etag } : {}),
    ...(options.varyHost ? { Vary: "Host" } : {}),
    "X-Content-Type-Options": "nosniff",
  };

  if (asset.etag && etagMatches(request.headers.get("If-None-Match"), asset.etag)) {
    return new Response(null, { status: 304, headers });
  }

  if (asset.appStorageId) {
    const blob = await ctx.storage.get(asset.appStorageId as Id<"_storage">);
    if (!blob) return storageError();
    return new Response(blob, { status: options.status ?? 200, headers });
  }

  // This deployment does not use legacy --cdn uploads. Preserve the redirect
  // branch for inherited manifests so migration never turns a valid asset into
  // a storage error.
  if (asset.blobId && !contentType.startsWith("text/html")) {
    const url = new URL(request.url);
    return new Response(null, {
      status: 302,
      headers: {
        "Cache-Control": cacheControl,
        Location: `${url.origin}/fs/blobs/${asset.blobId}`,
      },
    });
  }

  if (!asset.storageUrl) return storageError();
  const storageResponse = await fetch(asset.storageUrl);
  if (!storageResponse.ok || !storageResponse.body) return storageError();

  return new Response(storageResponse.body, {
    status: options.status ?? 200,
    headers,
  });
}

function etagMatches(candidateHeader: string | null, currentEtag: string): boolean {
  if (!candidateHeader) return false;
  const normalize = (value: string) => value.trim().replace(/^W\//, "").trim();
  const normalizedCurrent = normalize(currentEtag);
  return candidateHeader.split(",").some((candidate) => {
    const normalized = normalize(candidate);
    return normalized === "*" || normalized === normalizedCurrent;
  });
}

function storageError(): Response {
  return new Response("Storage error", {
    status: 500,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

http.route({
  pathPrefix: "/",
  method: "GET",
  handler: serveStaticFile,
});

export default http;
