import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite-plus";

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
        env: ["PUBLIC_CONVEX_URL", "PUBLIC_SHOW_VALUE_SQUARES"],
        input: [
          "src/**",
          "static/**",
          "convex/**",
          "journal/**",
          "package.json",
          "pnpm-lock.yaml",
          "svelte.config.js",
          "tsconfig.json",
          "vite.config.ts",
          ".env*",
          "!build/**",
          "!.build/**",
          "!.svelte-kit/**",
        ],
      },
      "cache:check": {
        command: "vp check",
        cache: true,
        input: [
          "src/**",
          "convex/**",
          "scripts/**",
          "package.json",
          "pnpm-lock.yaml",
          "svelte.config.js",
          "tsconfig.json",
          "vite.config.ts",
          "!build/**",
          "!.build/**",
          "!.svelte-kit/**",
        ],
      },
      "cache:test": {
        command: "vp test",
        cache: true,
        input: [
          "src/**",
          "convex/**",
          "scripts/**",
          "package.json",
          "pnpm-lock.yaml",
          "svelte.config.js",
          "tsconfig.json",
          "vite.config.ts",
          "!build/**",
          "!.build/**",
          "!.svelte-kit/**",
        ],
      },
    },
  },
  plugins: [tailwindcss(), sveltekit()],
  server: {
    fs: {
      allow: ["convex"],
    },
  },
  test: {
    passWithNoTests: true,
  },
});
