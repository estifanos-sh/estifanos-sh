<script lang="ts">
  type Props = { progress?: number };
  let { progress = 1 }: Props = $props();

  const opacity = $derived(Math.max(0, Math.min(1, progress)));
  const ty = $derived(((1 - opacity) * 18).toFixed(1));
  const interactive = $derived(opacity > 0.15);
</script>

<div
  class="bio"
  style:opacity={opacity}
  style:transform="translateY({ty}px)"
  style:pointer-events={interactive ? "auto" : "none"}
>
  <p class="body">
    From enterprise infrastructure to building on the ground, I focus on
    environments where software quality and judgment actually matter. I now
    lead technical direction
    <a href="https://trestle.inc" target="_blank" rel="noreferrer">@Trestle</a>,
    building a system of record designed around the authentic workflows of
    frontline staff. As AI collapses the cost of automation, I&rsquo;ve shifted
    my focus to the new frontier: reducing cognitive load and designing software
    that remains durable over time.
  </p>
  <nav class="links" aria-label="Elsewhere">
    <a href="https://github.com/robelest" target="_blank" rel="noreferrer">GitHub</a>
    <a href="https://x.com/robelestifanos_" target="_blank" rel="noreferrer">Twitter</a>
    <a href="https://linkedin.com/in/robelest/" target="_blank" rel="noreferrer">LinkedIn</a>
    <a href="mailto:robel@estifanos.com">Email</a>
  </nav>
</div>

<style>
  .bio {
    position: fixed;
    left: 52px;
    /* Lift above iOS Safari URL bar (env() is 0 on desktop). */
    bottom: calc(96px + env(safe-area-inset-bottom));
    max-width: 360px;
    z-index: 4;
    transition:
      opacity 0.18s ease,
      transform 0.18s ease;
  }

  .body {
    margin: 0 0 18px;
    font-family: var(--font-sans);
    font-size: 13px;
    line-height: 1.6;
    color: var(--color-th-ink-2);
  }

  .body a {
    color: var(--color-th-ink);
    text-decoration: none;
    border-bottom: 1px solid var(--color-th-faint);
    transition:
      color 0.25s ease,
      border-color 0.35s cubic-bezier(0.76, 0, 0.24, 1);
  }

  .body a:hover {
    color: var(--color-th-accent);
    border-bottom-color: var(--color-th-accent);
  }

  .links {
    display: flex;
    gap: 20px;
    font-family: var(--font-mono);
    font-size: 12px;
  }

  .links a {
    color: var(--color-th-ink-2);
    text-decoration: none;
    border-bottom: 1px solid transparent;
    padding-bottom: 1px;
    transition:
      color 0.25s ease,
      border-color 0.35s cubic-bezier(0.76, 0, 0.24, 1);
  }

  .links a:hover {
    color: var(--color-th-accent);
    border-bottom-color: var(--color-th-accent);
  }

  @media (max-width: 640px) {
    .bio {
      left: 20px;
      right: 20px;
      bottom: calc(76px + env(safe-area-inset-bottom));
      max-width: none;
    }
    .body {
      font-size: 12px;
    }
    .links {
      gap: 14px;
      font-size: 11px;
    }
  }
</style>
