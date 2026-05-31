<script lang="ts">
	import type { PageData } from './$types.js';
	import type { Component } from 'svelte';
	import { onMount } from 'svelte';
	import mermaid from 'mermaid';
	import ArticleHeader from '$lib/components/ArticleHeader.svelte';
	import TableOfContents from '$lib/components/TableOfContents.svelte';

	let { data }: { data: PageData } = $props();

	// Load all journal entries eagerly — mdsvex compiles them to Svelte components
	const modules = import.meta.glob<{
		default: Component;
		metadata: Record<string, unknown>;
	}>('/src/content/journal/*.md', { eager: true });

	// Find the entry matching this slug
	const entry = $derived(
		Object.values(modules).find((m) => m.metadata?.slug === data.slug)
	);

	const EntryComponent = $derived(entry?.default);
	const meta = $derived(entry?.metadata as {
		title: string;
		description?: string;
		tags?: string[];
		publishDate: string;
	} | undefined);

	// Initialize mermaid with neutral theme
	mermaid.initialize({
		startOnLoad: false,
		theme: 'neutral',
		fontFamily: 'inherit',
	});

	// Table of contents state
	interface TocItem {
		id: string;
		text: string;
		level: number;
	}

	let tocItems = $state<TocItem[]>([]);
	let activeId = $state<string>('');
	let contentEl: HTMLElement | undefined = $state();
	let sidebarEl: HTMLElement | undefined = $state();

	// Scroll active TOC item into view when it changes
	$effect(() => {
		if (activeId && sidebarEl) {
			const activeButton = sidebarEl.querySelector(`[data-toc-id="${activeId}"]`);
			if (activeButton) {
				activeButton.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
			}
		}
	});

	// Extract headings and run mermaid after content renders
	$effect(() => {
		if (contentEl && EntryComponent) {
			setTimeout(async () => {
				const headings = contentEl?.querySelectorAll('h1, h2, h3');
				const items: TocItem[] = [];

				headings?.forEach((heading, index) => {
					if (!heading.id) {
						heading.id = `heading-${index}`;
					}
					items.push({
						id: heading.id,
						text: heading.textContent || '',
						level: parseInt(heading.tagName[1])
					});
				});

				tocItems = items;

				// Render mermaid diagrams (output as <pre class="mermaid"> by custom highlighter)
				const mermaidElements = contentEl?.querySelectorAll('.mermaid');
				if (mermaidElements && mermaidElements.length > 0) {
					try {
						await mermaid.run({ nodes: mermaidElements as NodeListOf<HTMLElement> });
					} catch (e) {
						console.error('Mermaid rendering error:', e);
					}
				}
			}, 100);
		}
	});

	// Intersection observer for active heading
	onMount(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						activeId = entry.target.id;
					}
				});
			},
			{
				rootMargin: '-20% 0% -60% 0%',
				threshold: 0
			}
		);

		const checkHeadings = () => {
			const headings = contentEl?.querySelectorAll('h1, h2, h3');
			if (headings && headings.length > 0) {
				headings.forEach((heading) => observer.observe(heading));
			} else {
				setTimeout(checkHeadings, 200);
			}
		};
		checkHeadings();

		return () => observer.disconnect();
	});

	function scrollToHeading(id: string) {
		const el = document.getElementById(id);
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}
</script>

<svelte:head>
	{#if meta}
		<title>{meta.title} — Robel Estifanos</title>
		<meta name="description" content={meta.description || meta.title} />
		<meta property="og:title" content={meta.title} />
		<meta property="og:description" content={meta.description || meta.title} />
		<meta property="og:type" content="article" />
	{:else}
		<title>Journal — Robel Estifanos</title>
	{/if}
</svelte:head>

<div class="min-h-screen">
	<div aria-live="polite" aria-atomic="true" class="sr-only">
		{#if meta}
			Article loaded: {meta.title}
		{:else}
			Article not found
		{/if}
	</div>

	<main class="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:py-16">
		{#if meta && EntryComponent}
			<ArticleHeader
				title={meta.title}
				tags={meta.tags}
				publishDate={meta.publishDate}
				fileSize={data.fileSize}
				pdfUrl={data.pdfUrl}
				description={meta.description}
			/>

			<article class="typst-content" bind:this={contentEl}>
				<EntryComponent />
			</article>

			{#if tocItems.length > 0}
				<TableOfContents
					bind:ref={sidebarEl}
					items={tocItems}
					{activeId}
					onNavigate={scrollToHeading}
				/>
			{/if}
		{:else}
			<div class="text-center py-12">
				<p class="text-th-muted mb-4 text-sm">Entry not found.</p>
				<a href="/" class="text-th-accent hover:underline text-sm">Return home</a>
			</div>
		{/if}
	</main>
</div>
