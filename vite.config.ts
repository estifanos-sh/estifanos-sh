import { defineConfig } from "vite-plus";

export default defineConfig({
  build: {
    outDir: "dist/client",
  },
  fmt: {
    ignorePatterns: ["docs/src/routeTree.gen.ts"],
  },
  staged: {
    "*": "vp check --fix",
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  run: {
    cache: {
      scripts: false,
      tasks: true,
    },
    tasks: {
      "cache:build": {
        command: "vp build",
        cache: true,
        env: [],
        input: [
          "index.html",
          "src/**",
          "config/**",
          "scripts/**",
          "static/**",
          "convex/**",
          "package.json",
          "pnpm-lock.yaml",
          "tsconfig.json",
          "vite.config.ts",
          ".env*",
          "!build/**",
          "!dist/**",
          "!.output/**",
          "!.tanstack/**",
          "!.vinxi/**",
        ],
      },
      "cache:check": {
        command: "vp check",
        cache: true,
        input: [
          "index.html",
          "src/**",
          "config/**",
          "convex/**",
          "scripts/**",
          "package.json",
          "pnpm-lock.yaml",
          "tsconfig.json",
          "vite.config.ts",
          "!build/**",
          "!dist/**",
          "!.output/**",
          "!.tanstack/**",
          "!.vinxi/**",
        ],
      },
      "cache:test": {
        command: "vp test",
        cache: true,
        input: [
          "src/**",
          "config/**",
          "convex/**",
          "scripts/**",
          "package.json",
          "pnpm-lock.yaml",
          "tsconfig.json",
          "vite.config.ts",
          "!build/**",
          "!dist/**",
          "!.output/**",
          "!.tanstack/**",
          "!.vinxi/**",
        ],
      },
    },
  },
  publicDir: "static",
  test: {
    passWithNoTests: true,
  },
});
