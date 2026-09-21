/* React Router replaces a parent's meta wholesale when a route exports its
   own, so a page that sets a title would otherwise silently drop the social
   card. Every route builds its tags through pageMeta() instead, and the full
   set is assembled in one place. */

export const SITE_ORIGIN = "https://foster-navigator.jay-a84.workers.dev";

export const SITE_NAME = "Foster Parent Navigator";

export const SITE_DESCRIPTION =
  "Michigan foster parents get a plain-language answer to a licensing question, with the exact rule quoted underneath — and an escalation to their licensing specialist when the rules do not settle it.";

const CARD = `${SITE_ORIGIN}/social-card.png`;

export function pageMeta({
  title,
  description = SITE_DESCRIPTION,
  path = "/",
  robots,
}: {
  title: string;
  description?: string;
  /* Path only, with a leading slash — the origin is added here. */
  path?: string;
  robots?: string;
}) {
  const url = `${SITE_ORIGIN}${path === "/" ? "" : path}`;
  return [
    { title },
    { name: "description", content: description },

    { property: "og:type", content: "website" },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:image", content: CARD },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:type", content: "image/png" },
    {
      property: "og:image:alt",
      content: "Foster Parent Navigator — a plain-language answer, with the rule underneath",
    },

    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: CARD },

    { tagName: "link", rel: "canonical", href: url },

    ...(robots ? [{ name: "robots", content: robots }] : []),
  ];
}
