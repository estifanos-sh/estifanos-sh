import type { Component } from "svelte";

export interface JournalMeta {
  slug: string;
  title: string;
  description?: string;
  tags?: string[];
  publishDate: string;
  published: boolean;
  featured?: boolean;
  category?: string;
}

export interface JournalEntry extends JournalMeta {
  component: Component;
}

// Glob import all journal .md files — mdsvex compiles them to Svelte components
const modules = import.meta.glob<{
  default: Component;
  metadata: Record<string, unknown>;
}>("/src/content/journal/*.md");

export async function getEntry(slug: string): Promise<JournalEntry | null> {
  for (const [, loader] of Object.entries(modules)) {
    const mod = await loader();
    const meta = mod.metadata;
    if (meta?.slug === slug) {
      return {
        slug: meta.slug as string,
        title: meta.title as string,
        description: meta.description as string | undefined,
        tags: meta.tags as string[] | undefined,
        publishDate: meta.publishDate as string,
        published: (meta.published as boolean) ?? false,
        featured: meta.featured as boolean | undefined,
        category: meta.category as string | undefined,
        component: mod.default,
      };
    }
  }
  return null;
}

export async function getAllEntries(): Promise<JournalMeta[]> {
  const entries: JournalMeta[] = [];

  for (const [, loader] of Object.entries(modules)) {
    const mod = await loader();
    const meta = mod.metadata;
    if (!meta?.title) continue;

    entries.push({
      slug: meta.slug as string,
      title: meta.title as string,
      description: meta.description as string | undefined,
      tags: meta.tags as string[] | undefined,
      publishDate: meta.publishDate as string,
      published: (meta.published as boolean) ?? false,
      featured: meta.featured as boolean | undefined,
      category: meta.category as string | undefined,
    });
  }

  return entries
    .filter((e) => e.published)
    .sort((a, b) => b.publishDate.localeCompare(a.publishDate));
}
