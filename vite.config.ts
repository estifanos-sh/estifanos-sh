import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    ignorePatterns: ["convex/_generated/ai/**"],
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
        command: "ASTRO_TELEMETRY_DISABLED=1 vp exec astro build",
        cache: true,
        env: [],
        input: [
          "astro.config.ts",
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
        ],
      },
      "cache:check": {
        command: "vp check",
        cache: true,
        input: [
          "astro.config.ts",
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
        ],
      },
    },
  },
  test: {
    passWithNoTests: true,
  },
});
