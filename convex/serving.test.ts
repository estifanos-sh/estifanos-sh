import { describe, expect, test } from "vite-plus/test";
import { cacheControlFor, isHashedAsset, notFoundAssetPath, resolveStaticRequest } from "./serving";

describe("resolveStaticRequest", () => {
  test("selects the landing page by hostname", () => {
    expect(resolveStaticRequest("https://estifanos.sh/", "estifanos.sh")).toEqual({
      kind: "asset",
      path: "/landing/sh/index.html",
      varyHost: true,
    });
    expect(resolveStaticRequest("https://estifanos.com/", "estifanos.com")).toEqual({
      kind: "asset",
      path: "/index.html",
      varyHost: true,
    });
  });

  test("redirects clean document URLs once and resolves directory indexes", () => {
    expect(
      resolveStaticRequest(
        "https://estifanos.sh/convex-auth/installation?from=nav",
        "estifanos.sh",
      ),
    ).toEqual({
      kind: "redirect",
      location: "https://estifanos.sh/convex-auth/installation/?from=nav",
      status: 308,
    });
    expect(
      resolveStaticRequest("https://estifanos.sh/convex-auth/installation/", "estifanos.sh"),
    ).toEqual({
      kind: "asset",
      path: "/convex-auth/installation/index.html",
      varyHost: false,
    });
  });

  test("preserves files and the legacy SSO redirect", () => {
    expect(
      resolveStaticRequest(
        "https://estifanos.sh/convex-auth/assets/app.abc-123.js",
        "estifanos.sh",
      ),
    ).toEqual({
      kind: "asset",
      path: "/convex-auth/assets/app.abc-123.js",
      varyHost: false,
    });
    expect(
      resolveStaticRequest("https://estifanos.sh/convex-auth/sso/callback?code=1", "estifanos.sh"),
    ).toEqual({
      kind: "redirect",
      location: "https://estifanos.sh/convex-auth/connection/callback?code=1",
      status: 301,
    });
  });

  test("sends www hosts to the apex", () => {
    expect(
      resolveStaticRequest("https://www.estifanos.sh/convex-auth/?from=nav", "www.estifanos.sh"),
    ).toEqual({
      kind: "redirect",
      location: "https://estifanos.sh/convex-auth/?from=nav",
      status: 301,
    });
    expect(resolveStaticRequest("https://www.estifanos.com/", "www.estifanos.com:443")).toEqual({
      kind: "redirect",
      location: "https://estifanos.com/",
      status: 301,
    });
    expect(resolveStaticRequest("https://www.example.com/", "www.example.com")).toEqual({
      kind: "asset",
      path: "/index.html",
      varyHost: true,
    });
  });

  test("sends documentation paths on the organization host to the engineering site", () => {
    expect(
      resolveStaticRequest(
        "https://estifanos.com/convex-auth/installation?from=nav",
        "estifanos.com",
      ),
    ).toEqual({
      kind: "redirect",
      location: "https://estifanos.sh/convex-auth/installation?from=nav",
      status: 301,
    });
    expect(resolveStaticRequest("https://estifanos.com/convex-embedded", "estifanos.com")).toEqual({
      kind: "redirect",
      location: "https://estifanos.sh/convex-embedded",
      status: 301,
    });
    expect(
      resolveStaticRequest(
        "https://estifanos.com/convex-auth/sso/callback?code=1",
        "estifanos.com",
      ),
    ).toEqual({
      kind: "redirect",
      location: "https://estifanos.sh/convex-auth/connection/callback?code=1",
      status: 301,
    });
    expect(
      resolveStaticRequest("https://estifanos.com/convex-auth-notes/", "estifanos.com"),
    ).toEqual({ kind: "asset", path: "/convex-auth-notes/index.html", varyHost: false });
    expect(resolveStaticRequest("https://estifanos.com/og-com.png", "estifanos.com")).toEqual({
      kind: "asset",
      path: "/og-com.png",
      varyHost: false,
    });
    expect(
      resolveStaticRequest("https://estifanos.sh/convex-auth/installation/", "estifanos.sh"),
    ).toEqual({ kind: "asset", path: "/convex-auth/installation/index.html", varyHost: false });
  });

  test("redirects the internal landing paths to the site root", () => {
    expect(resolveStaticRequest("https://estifanos.sh/landing/sh/", "estifanos.sh")).toEqual({
      kind: "redirect",
      location: "https://estifanos.sh/",
      status: 301,
    });
    expect(
      resolveStaticRequest("https://estifanos.sh/landing/sh/index.html", "estifanos.sh"),
    ).toEqual({
      kind: "redirect",
      location: "https://estifanos.sh/",
      status: 301,
    });
    expect(resolveStaticRequest("https://estifanos.com/landing/sh/", "estifanos.com")).toEqual({
      kind: "redirect",
      location: "https://estifanos.com/",
      status: 301,
    });
  });

  test("rejects malformed escaped paths", () => {
    expect(resolveStaticRequest("https://estifanos.sh/bad/%E0%A4%A", "estifanos.sh")).toEqual({
      kind: "bad-request",
    });
  });
});

describe("notFoundAssetPath", () => {
  test("keeps 404 pages inside the documentation tree", () => {
    expect(notFoundAssetPath("/convex-auth/guide/index.html", "estifanos.sh")).toBe(
      "/convex-auth/404.html",
    );
    expect(notFoundAssetPath("/convex-embedded/guide/index.html", "estifanos.com")).toBe(
      "/convex-embedded/404.html",
    );
  });

  test("serves each landing its own palette", () => {
    expect(notFoundAssetPath("/missing/index.html", "estifanos.sh")).toBe(
      "/landing/sh/not-found/index.html",
    );
    expect(notFoundAssetPath("/missing/index.html", "www.estifanos.sh")).toBe(
      "/landing/sh/not-found/index.html",
    );
    expect(notFoundAssetPath("/missing/index.html", "estifanos.com")).toBe("/404.html");
  });
});

describe("cacheControlFor", () => {
  test("keeps content fresh while caching immutable bundles", () => {
    expect(cacheControlFor("/convex-auth/index.html")).toBe(
      "public, max-age=300, stale-while-revalidate=86400",
    );
    expect(cacheControlFor("/convex-auth/app.D3LP-ukt.js")).toBe(
      "public, max-age=31536000, immutable",
    );
    expect(cacheControlFor("/convex-auth/favicon.svg")).toBe(
      "public, max-age=3600, stale-while-revalidate=86400",
    );
  });

  test("does not mistake ordinary filenames for hashes", () => {
    expect(isHashedAsset("/privacy-policy.html")).toBe(false);
    expect(isHashedAsset("/pagefind/pagefind-highlight.js")).toBe(false);
    expect(isHashedAsset("/_astro/app.BcTwWGl9.css")).toBe(true);
    expect(isHashedAsset("/convex-embedded/_astro/search.BJMRmqJX.json")).toBe(true);
  });
});
