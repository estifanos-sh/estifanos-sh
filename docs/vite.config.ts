import { tanstackStart } from "@tanstack/solid-start/plugin/vite";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import { project } from "./src/generated/project";

const mountPath = `/${project.id}`;

export default defineConfig({
  base: `${mountPath}/`,
  plugins: [
    tanstackStart({
      prerender: {
        autoStaticPathsDiscovery: true,
        autoSubfolderIndex: true,
        crawlLinks: true,
        enabled: true,
        failOnError: true,
        filter: ({ path }) =>
          (path === "/" || path.startsWith(mountPath)) &&
          !path.includes("#") &&
          !/\.(?:md|txt)$/u.test(path.split("?", 1)[0]),
      },
    }),
    solid({ ssr: true }),
  ],
});
