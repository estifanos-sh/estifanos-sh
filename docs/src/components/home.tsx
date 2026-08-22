import { For, createSignal } from "solid-js";
import { docsProject, mountPath } from "../config/project";
import { Chrome } from "./chrome";
import { CopyIcon } from "./icons";

const projectUrl = (slug: string) => `${mountPath}${slug}/`;

export function HomePage() {
  const [copied, setCopied] = createSignal(false);
  const copy = async () => {
    await navigator.clipboard.writeText(docsProject.installCommand);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Chrome landing>
      <main class="home" id="main-content">
        <section aria-labelledby="hero-title" class="home-hero">
          <div class="home-copy">
            <p class="hero-eyebrow">
              <span>{docsProject.hero.eyebrow}</span>
              <span>{docsProject.hero.status}</span>
            </p>
            <h1 id="hero-title">
              {docsProject.title}
              <span>By Estifanos</span>
            </h1>
            <p class="hero-deck">{docsProject.hero.deck}</p>
            <div class="home-actions">
              <a class="cta-ghost" href={projectUrl(docsProject.startSlug)}>
                Read the docs
              </a>
              <a class="cta-solid" href={projectUrl(docsProject.startSlug)}>
                Start building
              </a>
            </div>
          </div>
          <aside aria-label={`Install ${docsProject.id}`} class="signal-panel">
            <div class="palette-row">
              <p class="palette-label">{docsProject.hero.paletteLabel}</p>
              <button class="palette-command" onClick={() => void copy()} type="button">
                <code>{docsProject.installCommand}</code>
                <span>{copied() ? "Copied" : <CopyIcon />}</span>
              </button>
            </div>
            <div class="palette-row">
              <p class="palette-label">Build anything with Convex</p>
              <a class="palette-command" href={projectUrl(docsProject.hero.paletteSlug)}>
                <code>{docsProject.hero.paletteText}</code>
                <span>→</span>
              </a>
            </div>
          </aside>
        </section>
        <section class="home-rest">
          <div class="home-paths">
            <For each={docsProject.hero.cards}>
              {(card) => (
                <a class="path-card" href={projectUrl(card.slug)}>
                  <h2>{card.title}</h2>
                  <p>{card.body}</p>
                </a>
              )}
            </For>
          </div>
        </section>
      </main>
    </Chrome>
  );
}
