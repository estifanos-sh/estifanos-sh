import { createRootRoute, HeadContent, Scripts } from "@tanstack/solid-router";
import { Suspense, type JSX } from "solid-js";
import { HydrationScript } from "solid-js/web";

import "../styles.css";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      {
        name: "description",
        content: "Estifanos builds durable software, infrastructure, and institutions.",
      },
      { title: "estifanos.com" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg?v=accrete-square" },
      { rel: "preload", href: "/figtree.woff2", as: "font", type: "font/woff2", crossOrigin: "" },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument(props: { children: JSX.Element }) {
  return (
    <html lang="en">
      <head>
        <HydrationScript />
        <HeadContent />
        <script
          innerHTML={`(() => {
            const projects = location.hostname === "estifanos.sh" || location.hostname === "www.estifanos.sh" || location.hostname === "estifanos.sh.localhost";
            document.title = projects ? "estifanos.sh" : "estifanos.com";
            const description = document.querySelector('meta[name="description"]');
            if (description && projects) description.setAttribute("content", "An independent engineering practice building durable systems.");
          })();`}
        />
      </head>
      <body>
        <Suspense>{props.children}</Suspense>
        <Scripts />
      </body>
    </html>
  );
}
