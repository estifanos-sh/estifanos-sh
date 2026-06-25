import { tanstackStart } from "@tanstack/solid-start/plugin/vite";
import { defineConfig } from "vite-plus";
import solid from "vite-plugin-solid";

export default defineConfig({
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
          "src/**",
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
          "src/**",
          "convex/**",
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
          "convex/**",
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
  plugins: [
    tanstackStart({
      router: {
        quoteStyle: "double",
        semicolons: true,
      },
      prerender: {
        enabled: true,
        crawlLinks: true,
        failOnError: true,
      },
    }),
    solid({ ssr: true }),
  ],
  test: {
    passWithNoTests: true,
  },
});
