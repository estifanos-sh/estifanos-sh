import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { project } from "../../src/generated/project.ts";

const root = path.resolve(import.meta.dirname, "../..");
const publicDir = path.join(root, "dist", "client");
const nested = path.join(publicDir, project.id);
const source = existsSync(nested) ? nested : publicDir;
const target = path.resolve(process.argv[2] || "");

interface DocumentationPage {
  description: string;
  markdown: string;
  slug: string;
  title: string;
}

if (!process.argv[2]) throw new Error("assemble requires an output directory");
if (!existsSync(source)) throw new Error(`TanStack static output is missing: ${source}`);
rmSync(target, { force: true, recursive: true });
mkdirSync(path.dirname(target), { recursive: true });
cpSync(source, target, { recursive: true });

const documentationPages = JSON.parse(
  readFileSync(path.join(root, "src", "generated", "docs.json"), "utf8"),
) as DocumentationPage[];
for (const page of documentationPages) {
  const pathname = page.slug.slice(1);
  const file = path.join(target, `${pathname}.md`);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${page.markdown}\n`);
}

const mountPath = `/${project.id}`;
const overviewAlias = path.join(target, project.startSlug.slice(1), "index.html");
mkdirSync(path.dirname(overviewAlias), { recursive: true });
writeFileSync(
  overviewAlias,
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=${mountPath}/"><link rel="canonical" href="${mountPath}/"><title>Overview | ${project.title}</title></head><body><p><a href="${mountPath}/">Continue to ${project.title} overview.</a></p></body></html>\n`,
);
const index = documentationPages
  .map((page) => {
    const url = page.slug === project.startSlug ? `${mountPath}/` : `${mountPath}${page.slug}.md`;
    return `- [${page.title}](${url}): ${page.description}`;
  })
  .join("\n");
writeFileSync(
  path.join(target, "llms.txt"),
  `# ${project.id} documentation\n\n> ${project.llmsDescription}\n\n${index}\n`,
);
writeFileSync(
  path.join(target, "llms-full.txt"),
  `# ${project.id} complete documentation\n\n${documentationPages.map((page) => `## ${page.title}\n\n${page.markdown}`).join("\n\n")}\n`,
);
writeFileSync(
  path.join(target, "404.html"),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="icon" href="${mountPath}/favicon.svg" type="image/svg+xml"><title>404 | ${project.title}</title><style>:root{color-scheme:light;font-family:Inter,ui-sans-serif,system-ui,sans-serif}*{box-sizing:border-box}body{min-height:100svh;margin:0;display:grid;place-items:center;background:#f6f6f6;color:#4f4f52}main{padding:2rem;text-align:center}h1{margin:0;color:#141414;font-size:3rem;font-weight:700;letter-spacing:-.05em}a{color:#8d2676}</style></head><body><main><h1>404</h1><p>This page does not exist.</p><a href="${mountPath}/">Return to ${project.title}.</a></main></body></html>\n`,
);
