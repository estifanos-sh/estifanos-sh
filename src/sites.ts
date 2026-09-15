export const sites = {
  com: {
    paper: "#eee9dc",
    ink: "#18231d",
    quiet: "#667269",
    signal: "#ef5b3f",
    colorScheme: "light",
  },
  sh: {
    paper: "#18231d",
    ink: "#e9eee7",
    quiet: "#8b978e",
    signal: "#b8ff3d",
    colorScheme: "dark",
  },
} as const;

export type SiteId = keyof typeof sites;
