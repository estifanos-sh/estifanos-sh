import { createFileRoute } from "@tanstack/solid-router";
import { docsProject, mountPath } from "../config/project";
import { HomePage } from "../components/home";

export const Route = createFileRoute("/")({
  head: () => ({
    links: [{ href: `${mountPath}/`, rel: "canonical" }],
    meta: [
      { title: `${docsProject.title} by Estifanos` },
      {
        content: docsProject.description,
        name: "description",
      },
    ],
  }),
  component: HomePage,
});
