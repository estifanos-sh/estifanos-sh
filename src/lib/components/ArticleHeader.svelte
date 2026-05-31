<script lang="ts">
	import { Download } from "@lucide/svelte";
	import { formatDate } from "$lib/utils/date";
	import TagChip from "./TagChip.svelte";

	interface Props {
		title: string;
		tags?: string[];
		publishDate: string;
		fileSize?: number;
		pdfUrl?: string;
		description?: string;
	}

	let { title, tags, publishDate, fileSize, pdfUrl, description }: Props = $props();

	function formatFileSize(bytes: number | undefined): string {
		if (!bytes) return "";
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}
</script>

<header class="mb-8 sm:mb-10 max-w-2xl">
	<h1 class="text-lg sm:text-xl md:text-2xl text-th-text mb-3 sm:mb-4 leading-tight font-sans">
		{title}
	</h1>

	{#if tags && tags.length > 0}
		<div class="flex flex-wrap items-center gap-2 mb-3">
			{#each tags as tag (tag)}
				<TagChip href="/journal?tags={encodeURIComponent(tag)}">{tag}</TagChip>
			{/each}
		</div>
	{/if}

	<div class="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-th-muted">
		<time datetime={publishDate} class="uppercase tracking-wide">
			{formatDate(publishDate)}
		</time>

		{#if fileSize}
			<span class="text-th-border" aria-hidden="true">&middot;</span>
			<span>{formatFileSize(fileSize)}</span>
		{/if}

		{#if pdfUrl}
			<span class="text-th-border" aria-hidden="true">&middot;</span>
			<a
				href={pdfUrl}
				download
				class="inline-flex items-center gap-1.5 text-th-accent hover:text-th-accent-hover transition-colors"
				aria-label="Download PDF version of {title}"
			>
				<Download class="w-3.5 h-3.5" aria-hidden="true" />
				<span>PDF</span>
			</a>
		{/if}
	</div>

	{#if description}
		<p class="text-th-subtle mt-3 sm:mt-4 text-xs sm:text-sm leading-relaxed font-sans italic">
			{description}
		</p>
	{/if}
</header>
