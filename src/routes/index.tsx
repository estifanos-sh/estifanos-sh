import { createFileRoute } from "@tanstack/solid-router";

import { AccreteField } from "../components/AccreteField";
import { ProjectsDirectory } from "../components/ProjectsDirectory";

export const Route = createFileRoute("/")({
  ssr: false,
  component: Home,
});

function Home() {
  const hostname = typeof window === "undefined" ? "" : window.location.hostname;
  const isProjectsHost = hostname === "estifanos.sh" || hostname === "www.estifanos.sh";

  return isProjectsHost ? <ProjectsDirectory /> : <AccreteField />;
}
