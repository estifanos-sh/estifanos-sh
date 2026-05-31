<script lang="ts">
	import type { Snippet } from "svelte";

	interface Props {
		active?: boolean;
		href?: string;
		onclick?: () => void;
		children: Snippet;
	}

	let { active = false, href, onclick, children }: Props = $props();

	const base =
		"py-1 px-2.5 text-[0.625rem] uppercase tracking-wide border rounded-none transition-all whitespace-nowrap shrink-0 no-underline";
	const activeClasses = "bg-th-text text-th-base border-th-text";
	const inactiveClasses =
		"bg-transparent text-th-muted border-th-border hover:border-th-accent hover:text-th-accent";
</script>

{#if href}
	<a {href} class="{base} {active ? activeClasses : inactiveClasses}">
		{@render children()}
	</a>
{:else}
	<button type="button" {onclick} class="{base} cursor-pointer {active ? activeClasses : inactiveClasses}">
		{@render children()}
	</button>
{/if}
