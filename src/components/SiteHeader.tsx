import { EstifanosMark } from "./EstifanosMark";

type Site = "com" | "sh";

const siteLinks = {
  com: { label: "Engineering", href: "https://estifanos.sh/" },
  sh: { label: "Organization", href: "https://estifanos.com/" },
} as const;

export function SiteHeader(props: { site: Site }) {
  const link = siteLinks[props.site];

  return (
    <header class="site-header">
      <a class="site-brand" href="/" aria-label={`estifanos.${props.site} home`}>
        <EstifanosMark />
        <span>ESTIFANOS</span>
        <span class="site-domain">.{props.site}</span>
      </a>
      <a class="site-switch" href={link.href}>
        <span>{link.label}</span>
        <span aria-hidden="true">↗</span>
      </a>
    </header>
  );
}
