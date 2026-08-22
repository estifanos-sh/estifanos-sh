import { For, onMount } from "solid-js";

import { SiteHeader } from "./SiteHeader";

const projects = [
  {
    name: "Convex Auth",
    slug: "convex-auth",
    href: "/convex-auth/",
    description: "Authentication and authorization infrastructure for Convex applications.",
    kind: "Open source",
    status: "Maintained",
    external: false,
  },
  {
    name: "Convex Embedded",
    slug: "convex-embedded",
    href: "/convex-embedded/",
    description: "A local-first Convex runtime that can live inside applications and devices.",
    kind: "Research",
    status: "Active",
    external: false,
  },
  {
    name: "Agent",
    slug: "get-convex/agent",
    href: "https://github.com/get-convex/agent",
    description: "Durable agent primitives for building stateful AI systems on Convex.",
    kind: "Convex",
    status: "Maintainer",
    external: true,
  },
  {
    name: "Ledger",
    slug: "trestleinc/ledger",
    href: "https://ledger.page/",
    description:
      "Software for frontline organizations that respects how their work really happens.",
    kind: "Trestle",
    status: "In production",
    external: true,
  },
] as const;

export function ProjectsDirectory() {
  onMount(() => {
    document.title = "estifanos.sh";
  });

  return (
    <div class="site engineering-site">
      <SiteHeader site="sh" />
      <main>
        <section class="engineering-intro" aria-labelledby="engineering-title">
          <p class="eyebrow">Independent engineering practice · New York</p>
          <h1 id="engineering-title">
            Software should become
            <br />
            <span>more durable as it grows.</span>
          </h1>
          <div class="intro-notes">
            <p>
              Estifanos builds infrastructure and products for systems with real memory, real
              consequences, and long lives.
            </p>
            <p>
              The work spans open-source infrastructure, applied research, and product engineering
              with <a href="https://convex.dev/">Convex</a> and{" "}
              <a href="https://trestle.inc/">Trestle</a>.
            </p>
          </div>
        </section>

        <section class="work-index" aria-labelledby="work-title">
          <div class="section-heading">
            <h2 id="work-title">Selected systems</h2>
            <span>2024—26</span>
          </div>
          <ol class="project-list">
            <For each={projects}>
              {(project, index) => (
                <li>
                  <a
                    class="project-row"
                    href={project.href}
                    target={project.external ? "_blank" : undefined}
                    rel={project.external ? "noreferrer" : undefined}
                  >
                    <span class="project-number">{String(index() + 1).padStart(2, "0")}</span>
                    <span class="project-main">
                      <strong>{project.name}</strong>
                      <span class="project-slug">{project.slug}</span>
                    </span>
                    <span class="project-description">{project.description}</span>
                    <span class="project-meta">
                      {project.kind}
                      <br />
                      {project.status}
                    </span>
                    <span class="project-arrow" aria-hidden="true">
                      ↗
                    </span>
                  </a>
                </li>
              )}
            </For>
          </ol>
        </section>
      </main>
      <footer class="site-footer engineering-footer">
        <p>Estifanos Engineering</p>
        <nav aria-label="Engineering links">
          <a href="https://github.com/estifanos-sh">GitHub</a>
          <a href="mailto:robel@estifanos.com">Email</a>
        </nav>
        <p>40.7128° N, 74.0060° W</p>
      </footer>
    </div>
  );
}
