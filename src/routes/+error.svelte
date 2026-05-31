<script lang="ts">
	import { page } from '$app/state';

	const message = $derived(
		page.status === 404
			? 'This page has wandered off.'
			: page.error?.message || 'Something went wrong.'
	);
</script>

<svelte:head>
	<title>{page.status} — Robel Estifanos</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="min-h-[100dvh] flex flex-col bg-th-base">
	<main class="flex-1 flex items-center justify-center">
		<div class="w-full max-w-3xl mx-auto px-4 sm:px-6 text-center">
			<p class="text-lg sm:text-xl text-th-text font-sans">
				{message}
				<a href="/" class="text-th-accent hover:underline underline-offset-2 transition-colors">
					Return home.
				</a>
			</p>
		</div>
	</main>
</div>
