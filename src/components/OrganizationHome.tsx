import { onMount } from "solid-js";

import { SiteHeader } from "./SiteHeader";

export function OrganizationHome() {
  onMount(() => {
    document.title = "estifanos.com";
  });

  return (
    <div class="site organization-site">
      <SiteHeader site="com" />
      <main>
        <section class="organization-hero" aria-labelledby="organization-title">
          <p class="eyebrow">An independent organization in New York City</p>
          <h1 id="organization-title">An independent engineering company.</h1>
          <p class="organization-deck">
            Estifanos LLC provides engineering consulting and builds open-source software. Our
            public engineering work lives at estifanos.sh.
          </p>
        </section>

        <section class="organization-branches" aria-labelledby="branches-title">
          <div class="section-heading">
            <h2 id="branches-title">Organization</h2>
            <span>Current work</span>
          </div>
          <a class="branch-row" href="https://estifanos.sh/">
            <span class="branch-domain">estifanos.sh</span>
            <span>Open-source engineering</span>
            <span>Active</span>
            <span aria-hidden="true">↗</span>
          </a>
        </section>

        <section class="organization-connection" aria-label="Contact Estifanos">
          <p>For work and correspondence</p>
          <a href="mailto:robel@estifanos.com">
            robel@estifanos.com <span aria-hidden="true">↗</span>
          </a>
        </section>
      </main>
      <footer class="site-footer organization-footer">
        <p>Estifanos</p>
        <p>New York City</p>
        <p>Independent by design</p>
      </footer>
    </div>
  );
}
