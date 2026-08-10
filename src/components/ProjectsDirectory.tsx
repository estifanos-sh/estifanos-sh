import { For, onMount } from "solid-js";

import { AccreteField } from "./AccreteField";
import { SiteHeader } from "./SiteHeader";

const projects = [
  {
    name: "convex-auth",
    href: "/convex-auth/",
  },
] as const;

export function ProjectsDirectory() {
  onMount(() => {
    document.title = "estifanos.sh";
  });

  return (
    <main class="index-page" aria-label="estifanos.sh">
      <AccreteField showContent={false} />
      <div class="index-surface">
        <SiteHeader site="sh" />
        <div class="index-body">
          <nav class="index-list" aria-label="Project directory">
            <ul>
              <For each={projects}>
                {(project) => (
                  <li>
                    <a class="index-entry" href={project.href}>
                      {project.name}
                    </a>
                  </li>
                )}
              </For>
            </ul>
          </nav>
        </div>
      </div>
    </main>
  );
}
