import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import rehypeStringify from "rehype-stringify";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { createHighlighter } from "shiki";
import { unified } from "unified";
import { visit } from "unist-util-visit";

const root = path.resolve(import.meta.dirname, "../..");
const source = path.resolve(process.argv[2] || "");
const projectId = process.argv[3];
if (!process.argv[2] || !projectId) {
  throw new Error("compile requires a content directory and project id");
}

const mountPath = `/${projectId}`;
const generated = path.join(root, "src", "generated", "docs.json");
const generatedSearch = path.join(root, "src", "generated", "search.json");
const productConfig = JSON.parse(readFileSync(path.resolve(source, "..", "docs.json"), "utf8")) as {
  startSlug?: unknown;
};
const startSlug = typeof productConfig.startSlug === "string" ? productConfig.startSlug : "";

export interface DocumentationPage {
  description: string;
  html: string;
  markdown: string;
  slug: string;
  title: string;
}

interface MutableNode {
  children?: MutableNode[];
  depth?: number;
  lang?: string;
  meta?: string;
  properties?: Record<string, unknown>;
  tagName?: string;
  type: string;
  url?: string;
  value?: string;
}

interface CompiledPage extends DocumentationPage {
  anchors: Set<string>;
  file: string;
  links: string[];
  searchText: string;
}

const highlighter = await createHighlighter({
  themes: ["github-dark-dimmed"],
  langs: [
    "typescript",
    "javascript",
    "bash",
    "json",
    "http",
    "html",
    "css",
    "svelte",
    "tsx",
    "jsx",
    "yaml",
    "toml",
    "diff",
    "text",
  ],
});

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(entry.name)) {
        throw new Error(`Invalid documentation directory name: ${entryPath}`);
      }
      return walk(entryPath);
    }
    if (!entry.isFile())
      throw new Error(`Documentation content must be regular files: ${entryPath}`);
    if (entry.name === "+page.md") {
      throw new Error(`Legacy +page.md files are not supported: ${entryPath}`);
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/u.test(entry.name)) {
      throw new Error(`Documentation files must be lowercase slug Markdown files: ${entryPath}`);
    }
    return [entryPath];
  });
}

function textContent(node: MutableNode): string {
  if (node.value !== undefined) return node.value;
  return node.children?.map(textContent).join("") ?? "";
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function validateMarkdown(tree: MutableNode, file: string): void {
  visit(tree, (node: MutableNode) => {
    if (node.type === "heading" && node.depth === 1) {
      throw new Error(`Markdown H1 is not allowed; use frontmatter title instead: ${file}`);
    }
    if (node.type !== "html") return;
    const markup = node.value ?? "";
    if (/<\/?\s*svelte:/iu.test(markup) || /<\/?\s*script\b/iu.test(markup)) {
      throw new Error(`Svelte or script markup is not allowed in documentation: ${file}`);
    }
    if (/<\/?\s*[A-Z][A-Za-z0-9._-]*/u.test(markup)) {
      throw new Error(`Custom MDX components are not allowed in documentation: ${file}`);
    }
  });
}

function collectHeadingIds(tree: MutableNode): Set<string> {
  const seen = new Map<string, number>();
  const ids = new Set<string>();
  visit(tree, (node: MutableNode) => {
    if (node.type !== "heading" || !node.depth || node.depth < 2) return;
    const base = slugify(textContent(node)) || "section";
    const suffix = seen.get(base) || 0;
    seen.set(base, suffix + 1);
    ids.add(suffix ? `${base}-${suffix + 1}` : base);
  });
  return ids;
}

function collectRootRelativeLinks(tree: MutableNode): string[] {
  const links: string[] = [];
  visit(tree, (node: MutableNode) => {
    if (
      (node.type === "link" || node.type === "image") &&
      node.url?.startsWith("/") &&
      !node.url.startsWith("//")
    ) {
      links.push(node.url);
    }
  });
  return links;
}

function markdownComponents() {
  return (tree: MutableNode): void => {
    visit(tree, (node: MutableNode) => {
      if (node.type !== "code") return;
      node.type = "html";
      node.value = highlighter.codeToHtml(node.value ?? "", {
        lang: node.lang || "text",
        theme: "github-dark-dimmed",
      });
      delete node.lang;
      delete node.meta;
    });
  };
}

function addHeadingIds() {
  const seen = new Map<string, number>();
  return (tree: MutableNode): void => {
    visit(tree, "element", (node: MutableNode) => {
      if (!node.tagName || !/^h[2-6]$/.test(node.tagName)) return;
      const base = slugify(textContent(node)) || "section";
      const suffix = seen.get(base) || 0;
      seen.set(base, suffix + 1);
      node.properties ??= {};
      node.properties.id = suffix ? `${base}-${suffix + 1}` : base;
    });
  };
}

function prefixInternalLinks() {
  return (tree: MutableNode): void => {
    visit(tree, "element", (node: MutableNode) => {
      if (node.tagName !== "a" || typeof node.properties?.href !== "string") return;
      const href = node.properties.href;
      if (href.startsWith("/") && !href.startsWith(`${mountPath}/`)) {
        const [pathAndQuery, hash] = href.split("#", 2);
        const [pathname, query] = pathAndQuery.split("?", 2);
        const routePath =
          !path.extname(pathname) && !pathname.endsWith("/") ? `${pathname}/` : pathname;
        node.properties.href = `${mountPath}${routePath}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
      }
      if (href.startsWith("/") && !href.startsWith("//")) {
        node.properties.dataAstroPrefetch = "tap";
      }
    });
  };
}

const processor = unified()
  .use(remarkParse)
  .use(remarkFrontmatter, ["yaml"])
  .use(remarkGfm)
  .use(markdownComponents)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(addHeadingIds)
  .use(prefixInternalLinks)
  .use(rehypeStringify, { allowDangerousHtml: true });

const files = walk(source).sort();
if (!files.length) throw new Error(`No Markdown files found in ${source}`);

const compiledPages: CompiledPage[] = await Promise.all(
  files.map(async (file) => {
    const parsed = matter(readFileSync(file, "utf8"));
    const relative = path.relative(source, file).replaceAll(path.sep, "/");
    const slug = `/${relative.slice(0, -".md".length)}`;
    const title = typeof parsed.data.title === "string" ? parsed.data.title.trim() : "";
    const description =
      typeof parsed.data.description === "string" ? parsed.data.description.trim() : "";
    if (!title || !description) {
      throw new Error(`Documentation frontmatter requires title and description: ${file}`);
    }
    const tree = processor.parse(parsed.content) as MutableNode;
    validateMarkdown(tree, file);
    const searchText = textContent(tree).replace(/\s+/gu, " ").trim();
    const anchors = collectHeadingIds(tree);
    const links = collectRootRelativeLinks(tree);
    const html = String(processor.stringify(await processor.run(tree as never)));
    return {
      anchors,
      description,
      file,
      html,
      links,
      markdown: parsed.content.trim(),
      searchText,
      slug,
      title,
    };
  }),
);

validateInternalLinks(compiledPages);
const pages: DocumentationPage[] = compiledPages.map(
  ({ anchors: _anchors, file: _file, links: _links, searchText: _searchText, ...page }) => page,
);

mkdirSync(path.dirname(generated), { recursive: true });
writeFileSync(generated, `${JSON.stringify(pages, null, 2)}\n`);
writeFileSync(
  generatedSearch,
  `${JSON.stringify(
    compiledPages.map(({ description, searchText: text, slug, title }) => ({
      description,
      text,
      title,
      url: slug === startSlug ? `${mountPath}/` : `${mountPath}${slug}/`,
    })),
  )}\n`,
);

function validateInternalLinks(pages: CompiledPage[]): void {
  const pageBySlug = new Map(pages.map((page) => [page.slug, page]));
  const endpoints = new Set([
    "/404.html",
    "/favicon.svg",
    "/llms-full.txt",
    "/llms.txt",
    "/robots.txt",
    ...publicAssetPaths(),
  ]);

  for (const page of pages) {
    for (const link of page.links) {
      const { fragment, pathname } = normalizeInternalLink(link);
      const target = pageBySlug.get(pathname);
      if (target) {
        if (fragment && !target.anchors.has(fragment)) {
          throw new Error(`Unknown heading fragment in ${link} from ${page.file}`);
        }
        continue;
      }
      if (endpoints.has(pathname)) continue;
      throw new Error(
        `Root-relative link points to no generated page or file: ${link} in ${page.file}`,
      );
    }
  }
}

function normalizeInternalLink(link: string): { fragment: string | undefined; pathname: string } {
  const [pathAndQuery, rawFragment] = link.split("#", 2);
  const [rawPathname] = pathAndQuery.split("?", 1);
  let pathname = rawPathname || "/";
  if (pathname === mountPath || pathname === `${mountPath}/`) pathname = "/";
  else if (pathname.startsWith(`${mountPath}/`)) pathname = pathname.slice(mountPath.length);
  if (pathname.endsWith(".md")) pathname = pathname.slice(0, -".md".length);
  if (pathname !== "/") pathname = pathname.replace(/\/+$/u, "");
  const fragment = rawFragment ? decodeFragment(rawFragment) : undefined;
  return {
    fragment,
    pathname: pathname === "/" ? projectStartSlug() : pathname,
  };
}

function projectStartSlug(): string {
  if (!startSlug.startsWith("/")) throw new Error("Documentation config requires a startSlug");
  return startSlug.replace(/\/+$/u, "") || "/";
}

function decodeFragment(fragment: string): string {
  try {
    return slugify(decodeURIComponent(fragment));
  } catch {
    throw new Error(`Invalid URL fragment: #${fragment}`);
  }
}

function publicAssetPaths(): string[] {
  const assets = path.resolve(source, "..", "public");
  if (!existsSync(assets)) return [];
  const walkAssets = (directory: string): string[] =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory() ? walkAssets(entryPath) : [entryPath];
    });
  return walkAssets(assets).map(
    (file) => `/${path.relative(assets, file).replaceAll(path.sep, "/")}`,
  );
}
