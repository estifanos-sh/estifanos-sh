<script lang="ts">
	interface TocItem {
		id: string;
		text: string;
		level: number;
	}

	interface Props {
		items: TocItem[];
		activeId: string;
		onNavigate: (id: string) => void;
		ref?: HTMLElement | null;
	}

	let { items, activeId, onNavigate, ref = $bindable(null) }: Props = $props();
</script>

<aside
	bind:this={ref}
	class="hidden lg:block fixed top-24 left-[calc(50%+25rem)] w-40 max-h-[calc(100vh-8rem)] overflow-y-auto"
	aria-label="Article sidebar"
>
	<nav
		class="pl-3 border-l border-th-border text-[0.6875rem] leading-relaxed font-sans"
		aria-label="Table of contents"
	>
		<span class="block text-[0.5625rem] font-semibold uppercase tracking-widest text-th-muted mb-3"
			>Contents</span
		>
		{#each items as item (item.id)}
			<button
				type="button"
				data-toc-id={item.id}
				onclick={() => onNavigate(item.id)}
				class="block w-full text-left bg-transparent border-none cursor-pointer py-1 text-xs leading-relaxed transition-colors {activeId ===
				item.id
					? 'text-th-accent'
					: 'text-th-muted hover:text-th-accent'} {item.level === 1
					? 'font-medium text-th-text'
					: ''} {item.level === 2 ? 'font-medium' : ''} {item.level === 3
					? 'pl-3 text-[0.6875rem]'
					: ''}"
				aria-current={activeId === item.id ? "true" : undefined}
			>
				{item.text}
			</button>
		{/each}
	</nav>
</aside>
