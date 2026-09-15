export const sites = {
  com: {
    name: "Estifanos LLC",
    url: "https://estifanos.com/",
    mark: "estifanos-mark-orange.png",
    related: "https://estifanos.sh/",
    paper: "#eee9dc",
    ink: "#18231d",
    quiet: "#667269",
    signal: "#ef5b3f",
    colorScheme: "light",
  },
  sh: {
    name: "Estifanos Engineering",
    url: "https://estifanos.sh/",
    mark: "estifanos-mark-green.png",
    related: "https://estifanos.com/",
    paper: "#18231d",
    ink: "#e9eee7",
    quiet: "#8b978e",
    signal: "#b8ff3d",
    colorScheme: "dark",
  },
} as const;

export type SiteId = keyof typeof sites;
