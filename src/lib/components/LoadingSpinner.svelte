<script lang="ts">
	interface Props {
		message?: string;
		label?: string;
	}

	let { message = "Loading...", label }: Props = $props();
</script>

<div class="flex items-center gap-3 text-th-muted" role="status" aria-label={label}>
	<div
		class="w-4 h-4 border-2 border-th-muted border-t-transparent rounded-full animate-spin"
		aria-hidden="true"
	></div>
	<span class="text-sm">{message}</span>
</div>
