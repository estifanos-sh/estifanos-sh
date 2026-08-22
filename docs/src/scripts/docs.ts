import searchIndexUrl from "../generated/search.json?url";

interface SearchDocument {
  description: string;
  text: string;
  title: string;
  url: string;
}

interface SearchEntry extends SearchDocument {
  normalizedDescription: string;
  normalizedText: string;
  normalizedTitle: string;
}

let searchIndexPromise: Promise<SearchEntry[]> | undefined;
let searchRevision = 0;
let searchTimer: number | undefined;

function element<T extends Element>(selector: string): T | null {
  return document.querySelector<T>(selector);
}

function closeMenu() {
  const menu = element<HTMLElement>("[data-menu]");
  const opener = element<HTMLButtonElement>("[data-menu-open]");
  if (menu) delete menu.dataset.open;
  opener?.setAttribute("aria-expanded", "false");
}

function closeSearch() {
  searchRevision += 1;
  window.clearTimeout(searchTimer);
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
  void loadSearchIndex().catch(() => undefined);
}

function normalizeSearch(value: string): string {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
}

function loadSearchIndex(): Promise<SearchEntry[]> {
  return (searchIndexPromise ??= fetch(searchIndexUrl).then(async (response) => {
    if (!response.ok) throw new Error(`Search index failed with status ${response.status}`);
    const documents = (await response.json()) as SearchDocument[];
    return documents.map((document) => ({
      ...document,
      normalizedDescription: normalizeSearch(document.description),
      normalizedText: normalizeSearch(document.text),
      normalizedTitle: normalizeSearch(document.title),
    }));
  }));
}

function searchDocuments(documents: SearchEntry[], query: string): SearchEntry[] {
  const normalizedQuery = normalizeSearch(query).trim();
  const terms = normalizedQuery.split(/\s+/u);
  return documents
    .map((document) => {
      const searchable = `${document.normalizedTitle} ${document.normalizedDescription} ${document.normalizedText}`;
      if (!terms.every((term) => searchable.includes(term))) return undefined;

      let score = 0;
      if (document.normalizedTitle === normalizedQuery) score += 240;
      else if (document.normalizedTitle.startsWith(normalizedQuery)) score += 160;
      else if (document.normalizedTitle.includes(normalizedQuery)) score += 120;
      if (document.normalizedDescription.includes(normalizedQuery)) score += 48;
      if (document.normalizedText.includes(normalizedQuery)) score += 16;
      for (const term of terms) {
        if (document.normalizedTitle.includes(term)) score += 32;
        if (document.normalizedDescription.includes(term)) score += 12;
        if (document.normalizedText.includes(term)) score += 4;
      }
      return { document, score };
    })
    .filter((result): result is { document: SearchEntry; score: number } => Boolean(result))
    .sort(
      (left, right) =>
        right.score - left.score || left.document.title.localeCompare(right.document.title),
    )
    .slice(0, 6)
    .map(({ document }) => document);
}

async function renderSearch(query: string, revision: number): Promise<void> {
  let documents: SearchEntry[];
  try {
    documents = await loadSearchIndex();
  } catch {
    if (revision !== searchRevision) return;
    const empty = element<HTMLElement>("[data-search-empty]");
    if (empty) {
      empty.hidden = false;
      empty.textContent = "Search is temporarily unavailable.";
    }
    return;
  }
  if (revision !== searchRevision) return;
  const hits = element<HTMLOListElement>("[data-search-hits]");
  const empty = element<HTMLElement>("[data-search-empty]");
  if (!hits || !empty) return;

  const results = searchDocuments(documents, query);
  empty.hidden = results.length > 0;
  if (!results.length) empty.textContent = `No results for “${query}”`;

  results.forEach((result) => {
    const item = document.createElement("li");
    const anchor = document.createElement("a");
    anchor.href = result.url;
    anchor.dataset.astroPrefetch = "tap";
    const title = document.createElement("strong");
    title.textContent = result.title;
    const excerpt = document.createElement("span");
    excerpt.textContent = result.description;
    anchor.append(title, excerpt);
    item.append(anchor);
    hits.append(item);
  });
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
    if (menu) menu.dataset.open = "";
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

  element<HTMLInputElement>("[data-search-input]")?.addEventListener("input", (event) => {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) return;
    const hits = element<HTMLOListElement>("[data-search-hits]");
    const empty = element<HTMLElement>("[data-search-empty]");
    if (!hits || !empty) return;

    const query = input.value.trim();
    hits.replaceChildren();
    if (!query) {
      searchRevision += 1;
      window.clearTimeout(searchTimer);
      empty.hidden = false;
      empty.textContent = "Search guides and API reference.";
      return;
    }

    const revision = ++searchRevision;
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => void renderSearch(query, revision), 120);
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
