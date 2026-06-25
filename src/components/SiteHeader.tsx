type Site = "com" | "sh";

const siteLinks = {
  com: { label: "sh", href: "https://estifanos.sh/" },
  sh: { label: "com", href: "https://estifanos.com/" },
} as const;

export function SiteHeader(props: { site: Site }) {
  const link = siteLinks[props.site];

  return (
    <header class="site-header">
      <div class="site-brand" aria-label={`estifanos.${props.site}`}>
        <span class="site-mark" aria-hidden="true" />
        <span>estifanos.{props.site}</span>
      </div>
      <a class="site-switch" href={link.href}>
        {link.label}
      </a>
    </header>
  );
}
