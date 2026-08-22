import { docsProject, mountPath } from "./project";

export const sidebar = docsProject.sidebar;

export const navigationItems = sidebar.flatMap((group) =>
  group.items.map((item) => ({ ...item, section: group.label })),
);

export function sectionFor(url: string) {
  const clean = url.replace(new RegExp(`^${mountPath}`), "").replace(/\/$/, "");
  return sidebar.find((group) => group.items.some((item) => item.slug === clean))?.label || "";
}

export function adjacentPages(slug: string) {
  const currentIndex = navigationItems.findIndex((item) => item.slug === slug);
  return {
    next: currentIndex >= 0 ? navigationItems[currentIndex + 1] : undefined,
    previous: currentIndex > 0 ? navigationItems[currentIndex - 1] : undefined,
  };
}
