import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const output = join(root, "..", "dist", "client");

const convexAuthDocs = process.env.CONVEX_AUTH_DOCS_DIR
  ? resolve(process.env.CONVEX_AUTH_DOCS_DIR)
  : join(root, "..", "..", "convex-auth", "docs", "dist", "client", "convex-auth");
const projects = [["convex-auth", convexAuthDocs]];

for (const [name, source] of projects) {
  const destination = join(output, name);
  const nestedPagefind = join(source, "pagefind", "pagefind");
  await rm(destination, { force: true, recursive: true });
  await mkdir(destination, { recursive: true });
  await cp(source, destination, {
    recursive: true,
    filter: (path) => path !== nestedPagefind && !path.startsWith(`${nestedPagefind}/`),
  });
}

console.log(`Assembled ${projects.length} project site into ${output}`);
