/* Placeholder replaced by docs/scripts/content/compile.ts during a project build. */
export interface DocumentationPage {
  description: string;
  html: string;
  slug: string;
  title: string;
}

export interface DocumentationPageMeta {
  description: string;
  slug: string;
  title: string;
}

export const documentationPages: DocumentationPageMeta[] = [];
export const documentationBySlug = new Map<string, DocumentationPageMeta>();
export const documentationLoaders: Record<string, () => Promise<DocumentationPage>> = {};
