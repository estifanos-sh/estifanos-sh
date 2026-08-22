import { createFileRoute } from "@tanstack/solid-router";
import { docsProject, mountPath } from "../config/project";
import { DocsShell } from "../components/shell";
import { documentationLoaders } from "../generated/docs";

export const Route = createFileRoute("/")({
  loader: async () => {
    const load = documentationLoaders[docsProject.startSlug];
    if (!load) throw new Error(`Missing overview document: ${docsProject.startSlug}`);
    return load();
  },
  head: ({ loaderData }) => ({
    links: [{ href: `${mountPath}/`, rel: "canonical" }],
    meta: [
      { title: loaderData ? `${loaderData.title} | ${docsProject.title}` : docsProject.title },
      {
        content: loaderData?.description || docsProject.description,
        name: "description",
      },
    ],
  }),
  component: OverviewPage,
});

function OverviewPage() {
  const page = Route.useLoaderData();
  return <DocsShell page={page()} />;
}
