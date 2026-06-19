<script lang="ts">
  import { page } from "$app/state";

  const message = $derived(
    page.status === 404
      ? "This page has wandered off."
      : page.error?.message || "Something went wrong.",
  );
</script>

<svelte:head>
  <title>{page.status} — Robel Estifanos</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="wrap">
  <div class="card">
    <div class="code">{page.status}</div>
    <p class="msg">{message}</p>
    <a class="link" href="/">Return home</a>
  </div>
</div>

<style>
  .wrap {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-th-bg);
    color: var(--color-th-ink);
  }
  .card {
    text-align: center;
    padding: 32px;
    max-width: 420px;
  }
  .code {
    font-family: var(--font-mono);
    font-size: 12px;
    letter-spacing: 0.2em;
    color: var(--color-th-faint);
    text-transform: uppercase;
    margin-bottom: 18px;
  }
  .msg {
    font-family: var(--font-sans);
    font-size: 15px;
    line-height: 1.5;
    color: var(--color-th-ink-2);
    margin: 0 0 18px;
  }
  .link {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--color-th-accent);
    text-decoration: none;
    border-bottom: 1px solid var(--color-th-accent);
    padding-bottom: 1px;
  }
</style>
