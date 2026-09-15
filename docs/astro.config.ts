import { defineConfig } from "astro/config";
import { project } from "./src/generated/project";

// Astro is intentionally invoked directly. The landing site keeps Vite+ as the
// workspace-facing build tool, while the documentation renderer owns its
// framework's native static build pipeline.
export default defineConfig({
  // Every project's documentation is published under the Engineering domain.
  site: "https://estifanos.sh",
  base: `/${project.id}`,
  build: {
    format: "directory",
    inlineStylesheets: "never",
  },
  compressHTML: true,
  outDir: "./dist/client",
  output: "static",
  publicDir: "./public",
  vite: {
    build: {
      assetsInlineLimit: 0,
      cssCodeSplit: false,
    },
  },
});
