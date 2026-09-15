import {
  appendFile,
  cp,
  lstat,
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { execFile } from "node:child_process";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const scripts = dirname(fileURLToPath(import.meta.url));
const root = resolve(scripts, "..");
const execute = promisify(execFile);
// Matches the `site` in docs/astro.config.ts.
const siteUrl = "https://estifanos.sh";
const requiredFiles = ["index.html", "404.html", "llms.txt", "llms-full.txt"];

interface ProjectConfiguration {
  id: string;
  localPath: string;
  mountPath: string;
  ref: string;
  repository: string;
}

interface DocsConfiguration {
  projects: ProjectConfiguration[];
  schemaVersion: number;
}

interface DocumentationProvenance {
  commit: string;
  id: string;
  repository: string;
}

interface ReleaseEntry {
  commit: string;
  id: string;
  mountPath: string;
  repository: string;
}

const configuration = JSON.parse(
  await readFile(join(root, "config", "docs.json"), "utf8"),
) as DocsConfiguration;

validateConfiguration(configuration);

const command = process.argv[2];
if (command === "build") await buildProject();
else if (command === "build-source") await buildSource();
else if (command === "build-local") await buildLocal();
else if (command === "assemble") await assemble();
else if (command === "matrix") await matrix();
else if (command === "provenance") await provenance();
else if (command === "summary") await summary();
else throw new Error(`Unknown docs command: ${command ?? "<missing>"}`);

async function assemble() {
  const output = join(root, "dist", "client");
  const artifacts = resolve(root, process.argv[3]?.trim() || ".docs");
  const release: ReleaseEntry[] = [];

  await requireFile(join(output, "index.html"), "landing page");

  for (const project of configuration.projects) {
    const source = join(artifacts, `docs-${project.id}`);
    const sourceInfo = await lstat(source).catch(() => undefined);
    if (!sourceInfo?.isDirectory() || sourceInfo.isSymbolicLink()) {
      throw new Error(`Documentation source is not a directory: ${source}`);
    }
    for (const file of requiredFiles)
      await requireFile(join(source, file), `${project.id} ${file}`);

    const destination = join(output, project.id);
    assertWithin(output, destination);
    await rm(destination, { force: true, recursive: true });
    await mkdir(destination, { recursive: true });
    await cp(source, destination, {
      recursive: true,
      filter: (path) => path !== join(source, "docs-source.json"),
    });

    const metadata = await readMetadata(source, project);
    release.push({
      id: project.id,
      repository: project.repository,
      commit: metadata.commit,
      mountPath: project.mountPath,
    });
  }

  const releaseFile = join(output, ".well-known", "docs-release.json");
  await mkdir(dirname(releaseFile), { recursive: true });
  await writeFile(
    releaseFile,
    `${JSON.stringify({ schemaVersion: configuration.schemaVersion, projects: release }, null, 2)}\n`,
  );

  await writeSitemap(output);
  console.log(`Assembled ${release.length} documentation sites into ${output}`);
}

async function writeSitemap(output: string) {
  const urls = [`${siteUrl}/`];

  for (const project of configuration.projects) {
    const directory = join(output, project.id);
    const files = await readdir(directory, { recursive: true });
    for (const file of files.filter((entry) => entry.endsWith("index.html")).sort()) {
      const html = await readFile(join(directory, file), "utf8");
      if (html.includes('content="noindex"')) continue;
      const path = dirname(file);
      urls.push(`${siteUrl}${project.mountPath}${path === "." ? "" : `${path}/`}`);
    }
  }

  const entries = urls.map((url) => `  <url>\n    <loc>${url}</loc>\n  </url>`).join("\n");
  await writeFile(
    join(output, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`,
  );
  console.log(`Wrote ${urls.length} URLs to sitemap.xml`);
}

async function buildProject() {
  const [id, sourceArgument, outputArgument] = process.argv.slice(3);
  const project = configuration.projects.find((candidate) => candidate.id === id);
  if (!project || !sourceArgument) throw new Error("build requires a known project and source");
  const source = resolve(root, sourceArgument);
  const output = resolve(root, outputArgument || `.docs/docs-${project.id}`);
  const result = await execute(
    "node",
    [join(root, "docs", "scripts", "build.ts"), project.id, source, output],
    { maxBuffer: 50 * 1024 * 1024 },
  );
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  await writeProvenance(output, project, source);
}

async function buildLocal() {
  const overrides = process.argv.slice(3);
  for (const [index, project] of configuration.projects.entries()) {
    const source = overrides[index] || project.localPath;
    process.argv.splice(3, process.argv.length - 3, project.id, source);
    await buildProject();
  }
}

async function buildSource() {
  const source = process.argv[3];
  if (!source) throw new Error("build-source requires a source checkout");
  const product = JSON.parse(
    await readFile(join(resolve(root, source), "docs", "docs.json"), "utf8"),
  );
  process.argv.splice(3, process.argv.length - 3, product.id, source);
  await buildProject();
}

async function matrix() {
  const event: { inputs?: { convex_auth_ref?: string; convex_embedded_ref?: string } } = process.env
    .GITHUB_EVENT_PATH
    ? JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, "utf8"))
    : {};
  const refs: Record<string, string | undefined> = {
    "convex-auth": event.inputs?.convex_auth_ref?.trim() || process.argv[3]?.trim(),
    "convex-embedded": event.inputs?.convex_embedded_ref?.trim() || process.argv[4]?.trim(),
  };

  const include = configuration.projects.map((project) => {
    return {
      id: project.id,
      repository: project.repository,
      ref: refs[project.id] || project.ref,
    };
  });
  const value = `matrix=${JSON.stringify({ include })}\n`;
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, value);
  else process.stdout.write(value);
}

async function provenance() {
  const [artifact, id, repository, source] = process.argv.slice(3);
  if (!artifact || !id || !repository || !source) {
    throw new Error("provenance requires artifact, id, repository, and source arguments");
  }
  const project = configuration.projects.find((candidate) => candidate.id === id);
  if (!project || project.repository !== repository)
    throw new Error(`Unexpected project source: ${id}`);
  const directory = resolve(root, artifact);
  await writeProvenance(directory, project, resolve(root, source));
}

async function writeProvenance(directory: string, project: ProjectConfiguration, source: string) {
  const { stdout } = await execute("git", ["-C", source, "rev-parse", "HEAD"]);
  const commit = stdout.trim();
  if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error(`Invalid source commit: ${commit}`);
  for (const file of requiredFiles)
    await requireFile(join(directory, file), `${project.id} ${file}`);
  await writeFile(
    join(directory, "docs-source.json"),
    `${JSON.stringify({ schemaVersion: 1, id: project.id, repository: project.repository, commit }, null, 2)}\n`,
  );
}

async function summary() {
  const release = JSON.parse(
    await readFile(join(root, "dist", "client", ".well-known", "docs-release.json"), "utf8"),
  ) as { projects: ReleaseEntry[] };
  const lines = ["## Production deployment", "", `- Landing: \`${process.env.GITHUB_SHA}\``];
  for (const project of release.projects) lines.push(`- ${project.id}: \`${project.commit}\``);
  lines.push("- Site: https://estifanos.sh/");
  for (const project of release.projects) {
    lines.push(`- ${project.id}: https://estifanos.sh${project.mountPath}`);
  }
  const value = `${lines.join("\n")}\n`;
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, value);
  else process.stdout.write(value);
}

async function readMetadata(source: string, project: ProjectConfiguration) {
  const file = join(source, "docs-source.json");
  const contents = await readFile(file, "utf8").catch(() => undefined);
  if (!contents) throw new Error(`Missing documentation provenance: ${file}`);
  const metadata = JSON.parse(contents) as DocumentationProvenance;
  if (
    metadata.id !== project.id ||
    metadata.repository !== project.repository ||
    !/^[a-f0-9]{40}$/.test(metadata.commit)
  ) {
    throw new Error(`Invalid documentation provenance: ${file}`);
  }
  return metadata;
}

async function requireFile(file: string, label: string) {
  const details = await stat(file).catch(() => undefined);
  if (!details?.isFile() || details.size === 0) throw new Error(`Missing ${label}: ${file}`);
}

function assertWithin(parent: string, child: string) {
  const path = relative(parent, child);
  if (!path || path.startsWith("..") || isAbsolute(path)) {
    throw new Error(`Documentation destination escapes the site output: ${child}`);
  }
}

function validateConfiguration(config: DocsConfiguration) {
  if (config.schemaVersion !== 1 || !Array.isArray(config.projects) || !config.projects.length) {
    throw new Error("Invalid documentation project configuration");
  }
  const ids = new Set();
  for (const project of config.projects) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.id) || ids.has(project.id)) {
      throw new Error(`Invalid or duplicate documentation project id: ${project.id}`);
    }
    ids.add(project.id);
    if (project.mountPath !== `/${project.id}/`) {
      throw new Error(`Mount path must match project id: ${project.id}`);
    }
    if (project.repository !== `estifanos-sh/${project.id}`) {
      throw new Error(`Unexpected documentation repository: ${project.repository}`);
    }
    if (project.localPath !== `../${project.id}`) {
      throw new Error(`Invalid local path: ${project.localPath}`);
    }
  }
}
