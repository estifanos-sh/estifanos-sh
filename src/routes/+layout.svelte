<script lang="ts">
  import "../app.css";
  import { setupConvex } from "convex-svelte";
  import { PUBLIC_CONVEX_URL } from "$env/static/public";

  setupConvex(PUBLIC_CONVEX_URL);

  let { children } = $props();

  // Global viewport + zoom blockers. CSS consumes these dimensions so the
  // fixed canvas follows the visible viewport without enabling page scroll.
  $effect(() => {
    const setViewportVars = () => {
      const viewport = window.visualViewport;
      const width = Math.round(viewport?.width ?? window.innerWidth);
      const height = Math.round(viewport?.height ?? window.innerHeight);
      const root = document.documentElement;
      root.style.setProperty("--app-vw", `${width}px`);
      root.style.setProperty("--app-vh", `${height}px`);
    };
    const updateViewportVars = () => {
      setViewportVars();
      requestAnimationFrame(setViewportVars);
    };

    updateViewportVars();
    window.addEventListener("resize", updateViewportVars);
    window.addEventListener("orientationchange", updateViewportVars);
    window.visualViewport?.addEventListener("resize", updateViewportVars);
    window.visualViewport?.addEventListener("scroll", updateViewportVars);

    const onGesture = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", onGesture);
    document.addEventListener("gesturechange", onGesture);
    document.addEventListener("gestureend", onGesture);

    const onWheelZoom = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault();
    };
    window.addEventListener("wheel", onWheelZoom, { passive: false });

    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (["+", "-", "=", "0"].includes(e.key)) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("resize", updateViewportVars);
      window.removeEventListener("orientationchange", updateViewportVars);
      window.visualViewport?.removeEventListener("resize", updateViewportVars);
      window.visualViewport?.removeEventListener("scroll", updateViewportVars);
      document.removeEventListener("gesturestart", onGesture);
      document.removeEventListener("gesturechange", onGesture);
      document.removeEventListener("gestureend", onGesture);
      window.removeEventListener("wheel", onWheelZoom);
      window.removeEventListener("keydown", onKey);
    };
  });
</script>

{@render children()}
