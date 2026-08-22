import { describe, expect, test } from "vite-plus/test";
import { cacheControlFor, isHashedAsset, resolveStaticRequest } from "./serving";

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

  test("rejects malformed escaped paths", () => {
    expect(resolveStaticRequest("https://estifanos.sh/bad/%E0%A4%A", "estifanos.sh")).toEqual({
      kind: "bad-request",
    });
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
  });
});
