/* Content that needs a verified source before it can appear publicly.
 *
 * Anything null here is simply not rendered — no placeholder ships. Fill a
 * value in and its section appears. Never guess at these: a judge who checks
 * a claim and finds it invented is worse than a claim not made. */

export const IMPACT_PILLAR: {
  name: string;
  fit: string;
} | null = null;
/* Set once the official Venture 313 Impact Pillar name is confirmed, e.g.
   { name: "<official pillar name>",
     fit: "Navigator strengthens Detroit's foster-care capacity by reducing
           licensing confusion, supporting foster families, and routing
           ambiguous situations to qualified specialists." } */

export const FOUNDER_CONNECTION: string | null = null;
/* One or two sentences on why this founder is building this. Venture 313
   backs founders as much as products; this is the part nobody else can
   write. Until it exists the Detroit section renders without it. */

export const VERIFIED_STATS: { value: string; label: string; source: string }[] = [];
/* Each needs a citable source. An empty list renders no stat cards rather
   than empty boxes. */

/* Facts about the corpus, true and checkable in the repo. */
export const CORPUS_FACTS = {
  ruleCount: 43,
  sectionCount: 101,
  phrase: "43 licensing rules containing 101 individually citable sections",
  effectiveDate: "2023-06-16",
  effectiveDateLabel: "June 16, 2023",
  sourceName: "Michigan Administrative Code, R 400.9101–400.9506",
  sourceUrl:
    "https://ars.apps.lara.state.mi.us/AdminCode/DeptBureauAdminCode?Department=Health%20and%20Human%20Services&Bureau=Children%27s%20Services%20Agency",
  /* The date a human last confirmed this is still the current compilation.
     Update when that check is actually performed — the app does not do it
     automatically, so claiming otherwise would be false. */
  lastCheckedLabel: "September 2026",
};
