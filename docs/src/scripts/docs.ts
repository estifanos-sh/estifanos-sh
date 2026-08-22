let pagefindPromise: Promise<Pagefind> | undefined;

interface PagefindResult {
  data(): Promise<{
    excerpt: string;
    meta?: { title?: string };
    url: string;
  }>;
}

interface Pagefind {
  init(): Promise<void>;
  search(query: string): Promise<{ results: PagefindResult[] }>;
}

function element<T extends Element>(selector: string): T | null {
  return document.querySelector<T>(selector);
}

function closeMenu() {
  const menu = element<HTMLElement>("[data-menu]");
  const opener = element<HTMLButtonElement>("[data-menu-open]");
  if (menu) menu.hidden = true;
  opener?.setAttribute("aria-expanded", "false");
}

function closeSearch() {
  const search = element<HTMLElement>("[data-search]");
  const input = element<HTMLInputElement>("[data-search-input]");
  const hits = element<HTMLOListElement>("[data-search-hits]");
  const empty = element<HTMLElement>("[data-search-empty]");
  if (search) search.hidden = true;
  if (input) input.value = "";
  hits?.replaceChildren();
  if (empty) {
    empty.hidden = false;
    empty.textContent = "Search guides and API reference.";
  }
}

function openSearch() {
  const search = element<HTMLElement>("[data-search]");
  const input = element<HTMLInputElement>("[data-search-input]");
  if (search) search.hidden = false;
  input?.focus();
  void loadPagefind();
}

function loadPagefind(): Promise<Pagefind> {
  const base = document.body.dataset.base || "/";
  return (pagefindPromise ??= import(/* @vite-ignore */ `${base}pagefind/pagefind.js`).then(
    async (module: Pagefind) => {
      await module.init();
      return module;
    },
  ));
}

function installCodeCopyButtons() {
  document.querySelectorAll("pre").forEach((pre) => {
    if (pre.parentElement?.classList.contains("code-block")) return;
    const wrap = document.createElement("div");
    wrap.className = "code-block";
    pre.replaceWith(wrap);
    wrap.append(pre);

    const button = document.createElement("button");
    button.className = "code-copy";
    button.type = "button";
    button.textContent = "Copy";
    button.addEventListener("click", async () => {
      await navigator.clipboard.writeText(pre.textContent || "");
      button.textContent = "Copied";
      window.setTimeout(() => {
        button.textContent = "Copy";
      }, 1600);
    });
    wrap.append(button);
  });
}

function setupPage() {
  closeMenu();
  closeSearch();
  installCodeCopyButtons();

  element<HTMLButtonElement>("[data-menu-open]")?.addEventListener("click", () => {
    const menu = element<HTMLElement>("[data-menu]");
    if (menu) menu.hidden = false;
    element<HTMLButtonElement>("[data-menu-open]")?.setAttribute("aria-expanded", "true");
  });
  document
    .querySelectorAll<HTMLButtonElement>("[data-menu-close]")
    .forEach((button) => button.addEventListener("click", closeMenu));
  element<HTMLButtonElement>("[data-search-open]")?.addEventListener("click", openSearch);
  document
    .querySelectorAll<HTMLButtonElement>("[data-search-close]")
    .forEach((button) => button.addEventListener("click", closeSearch));

  element<HTMLButtonElement>("[data-copy-install]")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    if (!(button instanceof HTMLButtonElement)) return;
    await navigator.clipboard.writeText(button.dataset.install || "");
    const label = button.querySelector<HTMLElement>("[data-copy-label]");
    if (!label) return;
    label.textContent = "Copied";
    window.setTimeout(() => {
      label.textContent = "Copy";
    }, 1600);
  });

  element<HTMLInputElement>("[data-search-input]")?.addEventListener("input", async (event) => {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) return;
    const hits = element<HTMLOListElement>("[data-search-hits]");
    const empty = element<HTMLElement>("[data-search-empty]");
    if (!hits || !empty) return;

    const query = input.value.trim();
    hits.replaceChildren();
    if (!query) {
      empty.hidden = false;
      empty.textContent = "Search guides and API reference.";
      return;
    }

    const pagefind = await loadPagefind();
    const response = await pagefind.search(query);
    const results = await Promise.all(response.results.slice(0, 6).map((result) => result.data()));
    empty.hidden = results.length > 0;
    if (!results.length) empty.textContent = `No results for “${query}”`;

    results.forEach((result) => {
      const item = document.createElement("li");
      const anchor = document.createElement("a");
      anchor.href = result.url;
      anchor.dataset.astroPrefetch = "tap";
      const title = document.createElement("strong");
      title.textContent = result.meta?.title || result.url;
      const excerpt = document.createElement("span");
      excerpt.textContent = result.excerpt
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
      anchor.append(title, excerpt);
      item.append(anchor);
      hits.append(item);
    });
  });
}

document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    const search = element<HTMLElement>("[data-search]");
    if (search?.hidden) openSearch();
    else closeSearch();
  }
  if (event.key === "Escape") {
    closeMenu();
    closeSearch();
  }
});

document.addEventListener("astro:page-load", setupPage);
