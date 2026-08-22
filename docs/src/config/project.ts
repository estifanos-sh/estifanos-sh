import { project } from "../generated/project";

export interface SidebarItem {
  slug: string;
  title: string;
}

export interface SidebarGroup {
  items: readonly SidebarItem[];
  label: string;
}

export interface DocumentationProject {
  description: string;
  id: string;
  installCommand: string;
  llmsDescription: string;
  repository: string;
  schemaVersion: 1;
  sidebar: readonly SidebarGroup[];
  startSlug: string;
  title: string;
}

export const docsProject = project as DocumentationProject;
export const mountPath = `/${docsProject.id}`;
