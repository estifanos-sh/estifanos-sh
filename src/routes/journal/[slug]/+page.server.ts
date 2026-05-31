import type { PageServerLoad, EntryGenerator } from "./$types.js";
import { ConvexHttpClient } from "convex/browser";
import { PUBLIC_CONVEX_URL } from "$env/static/public";
import { api } from "../../../../convex/_generated/api.js";
import { error } from "@sveltejs/kit";
import { getAllEntries } from "$lib/content.js";

// Enumerate all slugs at build time for adapter-static prerendering
export const entries: EntryGenerator = async () => {
  const allEntries = await getAllEntries();
  return allEntries.map((e) => ({ slug: e.slug }));
};

export const load = (async ({ params }) => {
  // Fetch PDF metadata from Convex
  const client = new ConvexHttpClient(PUBLIC_CONVEX_URL);
  const convexEntry = await client.query(api.journal.getBySlug, {
    slug: params.slug,
  });

  if (!convexEntry) error(404, "Entry not found");

  return {
    slug: params.slug,
    pdfUrl: convexEntry.pdfUrl,
    fileSize: convexEntry.fileSize,
  };
}) satisfies PageServerLoad;
