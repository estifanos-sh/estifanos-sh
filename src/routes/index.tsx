import { createFileRoute } from "@tanstack/solid-router";

import { OrganizationHome } from "../components/OrganizationHome";
import { ProjectsDirectory } from "../components/ProjectsDirectory";

export const Route = createFileRoute("/")({
  ssr: false,
  component: Home,
});

function Home() {
  const hostname = typeof window === "undefined" ? "" : window.location.hostname;
  const isProjectsHost =
    hostname === "estifanos.sh" ||
    hostname === "www.estifanos.sh" ||
    hostname === "estifanos.sh.localhost";

  return isProjectsHost ? <ProjectsDirectory /> : <OrganizationHome />;
}
