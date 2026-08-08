import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const output = join(root, "..", "dist", "client");

const docs = [["convex-auth", join(root, "..", "..", "convex-auth", "docs", "build")]];

for (const [name, source] of docs) {
  const destination = join(output, name);
  const nestedPagefind = join(source, "pagefind", "pagefind");
  await rm(destination, { force: true, recursive: true });
  await mkdir(destination, { recursive: true });
  await cp(source, destination, {
    recursive: true,
    filter: (path) => path !== nestedPagefind && !path.startsWith(`${nestedPagefind}/`),
  });
}

console.log(`Synced ${docs.length} documentation sites into ${output}`);
