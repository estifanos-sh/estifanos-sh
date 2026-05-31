import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { mdsvex } from "mdsvex";
import { createHighlighter } from "shiki";

const highlighter = await createHighlighter({
  themes: ["github-light"],
  langs: [
    "javascript",
    "typescript",
    "tsx",
    "svelte",
    "html",
    "css",
    "json",
    "bash",
    "markdown",
    "yaml",
    "rust",
    "sql",
    "toml",
    "diff",
    "text",
  ],
});

/** @type {import('@sveltejs/kit').Config} */
const config = {
  extensions: [".svelte", ".md"],
  preprocess: [
    vitePreprocess(),
    mdsvex({
      extensions: [".md"],
      highlight: {
        highlighter: (code, lang) => {
          // Mermaid: plain text for client-side rendering
          if (lang === "mermaid") {
            return `<pre class="mermaid">${code
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/\{/g, "&#123;")
              .replace(/\}/g, "&#125;")}</pre>`;
          }

          const resolvedLang = highlighter.getLoadedLanguages().includes(lang || "")
            ? lang
            : "text";

          const html = highlighter.codeToHtml(code, {
            lang: resolvedLang || "text",
            theme: "github-light",
          });

          // Escape backticks and dollar signs for Svelte template literal
          return `{@html \`${html.replace(/`/g, "\\`").replace(/\$/g, "\\$")}\`}`;
        },
      },
    }),
  ],
  kit: {
    adapter: adapter({
      pages: "build",
      assets: "build",
      fallback: "404.html",
    }),
    prerender: {
      handleUnseenRoutes: "ignore",
    },
  },
};

export default config;
