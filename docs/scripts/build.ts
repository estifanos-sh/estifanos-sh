import { spawn } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

interface ProjectConfig {
  description: string;
  id: string;
  installCommand: string;
  llmsDescription: string;
  repository: string;
  schemaVersion: number;
  sidebar: Array<{ items: Array<{ slug: string; title: string }>; label: string }>;
  startSlug: string;
  title: string;
}

const engine = path.resolve(import.meta.dirname, "..");
const [projectId, sourceArgument, outputArgument] = process.argv.slice(2);
if (!projectId || !sourceArgument || !outputArgument) {
  throw new Error("build requires project id, source checkout, and output directory");
}

const source = path.resolve(sourceArgument);
const docs = path.join(source, "docs");
const content = path.join(docs, "content");
const output = path.resolve(outputArgument);
const configFile = path.join(docs, "docs.json");
const config = JSON.parse(readFileSync(configFile, "utf8")) as ProjectConfig;
validateConfig(config, projectId);

const generated = path.join(engine, "src", "generated");
const preserved = ["project.ts", "docs.json", "search.json"].map((file) => {
  const target = path.resolve(generated, file);
  return { contents: existsSync(target) ? readFileSync(target) : undefined, target };
});

try {
  mkdirSync(generated, { recursive: true });
  writeFileSync(
    path.join(generated, "project.ts"),
    `/* Generated from ${projectId}/docs/docs.json. */\nexport const project = ${JSON.stringify(config, null, 2)} as const;\n`,
  );
  await run("node", [path.join(engine, "scripts", "content", "compile.ts"), content, projectId]);
  validateNavigation(config, path.join(generated, "docs.json"));
  rmSync(path.join(engine, "dist"), { force: true, recursive: true });
  await run("vp", ["exec", "astro", "build"], engine, {
    ...process.env,
    ASTRO_TELEMETRY_DISABLED: "1",
  });
  await run("node", [path.join(engine, "scripts", "static", "assemble.ts"), output]);
  const assets = path.join(docs, "public");
  if (existsSync(assets)) cpSync(assets, output, { force: true, recursive: true });
  validateOutput(config, output);
} finally {
  rmSync(path.join(generated, "pages"), { force: true, recursive: true });
  for (const file of preserved) {
    if (file.contents) writeFileSync(file.target, file.contents);
    else rmSync(file.target, { force: true });
  }
}

function validateConfig(config: ProjectConfig, expectedId: string) {
  if (config.schemaVersion !== 1 || config.id !== expectedId) {
    throw new Error(`Invalid documentation identity in ${configFile}`);
  }
  if (config.repository !== `estifanos-sh/${expectedId}`) {
    throw new Error(`Invalid documentation repository in ${configFile}`);
  }
  for (const key of [
    "title",
    "description",
    "installCommand",
    "startSlug",
    "llmsDescription",
  ] as const) {
    if (!config[key]?.trim()) throw new Error(`Missing ${key} in ${configFile}`);
  }
  if (!config.startSlug.startsWith("/") || !Array.isArray(config.sidebar)) {
    throw new Error(`Invalid navigation in ${configFile}`);
  }
  if (!statSync(content).isDirectory())
    throw new Error(`Missing documentation content: ${content}`);
}

function validateNavigation(config: ProjectConfig, pagesFile: string) {
  const pages = JSON.parse(readFileSync(pagesFile, "utf8")) as Array<{ slug: string }>;
  const pageSlugs = new Set(pages.map((page) => page.slug));
  const navigation = config.sidebar.flatMap((group) => group.items.map((item) => item.slug));
  if (!pages.length) throw new Error(`No documentation pages found for ${config.id}`);
  if (new Set(navigation).size !== navigation.length) {
    throw new Error(`Duplicate sidebar entry in ${configFile}`);
  }
  for (const slug of [config.startSlug, ...navigation]) {
    if (!pageSlugs.has(slug)) throw new Error(`Navigation points to missing page: ${slug}`);
  }
  const unlisted = [...pageSlugs].filter((slug) => !navigation.includes(slug));
  if (unlisted.length) throw new Error(`Pages missing from sidebar: ${unlisted.join(", ")}`);
}

function validateOutput(config: ProjectConfig, directory: string) {
  const required = ["index.html", "404.html", "llms.txt", "llms-full.txt"];
  for (const relative of required) {
    const file = path.join(directory, relative);
    if (!existsSync(file) || !statSync(file).isFile() || !statSync(file).size) {
      throw new Error(`Missing generated documentation file: ${relative}`);
    }
  }
  const htmlPages = collect(directory, ".html");
  const markdownPages = collect(content, ".md");
  const searchIndexes = collect(path.join(directory, "_astro"), ".json");
  if (searchIndexes.length !== 1) {
    throw new Error(`Expected one generated search index, found ${searchIndexes.length}`);
  }
  if (htmlPages.length < markdownPages.length + 2) {
    throw new Error(`Incomplete static site for ${config.id}`);
  }
  console.log(
    `Built ${config.id}: ${markdownPages.length} Markdown pages, ${htmlPages.length} HTML files`,
  );
}

function collect(directory: string, extension: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? collect(file, extension) : file.endsWith(extension) ? [file] : [];
  });
}

function run(
  command: string,
  arguments_: string[],
  cwd = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, arguments_, { cwd, env, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with status ${code}`));
    });
  });
}
