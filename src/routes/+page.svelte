<svelte:head>
  <title>Robel Estifanos</title>
  <meta name="robots" content="noindex, nofollow" />
  <meta
    name="description"
    content="This site is temporarily offline."
  />
</svelte:head>

<main class="offline" aria-labelledby="offline-title">
  <section>
    <p class="eyebrow">Offline</p>
    <h1 id="offline-title">This site is temporarily unavailable.</h1>
    <p class="body">
      Robel Estifanos has been taken offline while the live backend is disabled.
    </p>
  </section>
</main>

<style>
  .offline {
    min-height: 100vh;
    min-height: 100dvh;
    display: grid;
    place-items: center;
    padding: 24px;
    background: var(--color-th-bg);
    color: var(--color-th-ink);
  }

  section {
    width: min(100%, 520px);
  }

  .eyebrow {
    margin: 0 0 18px;
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--color-th-muted);
  }

  h1 {
    margin: 0;
    max-width: 14ch;
    font-size: clamp(36px, 7vw, 76px);
    line-height: 0.95;
    font-weight: 500;
    color: var(--color-th-ink);
  }

  .body {
    margin: 24px 0 0;
    max-width: 420px;
    font-size: 14px;
    line-height: 1.6;
    color: var(--color-th-ink-2);
  }
</style>
