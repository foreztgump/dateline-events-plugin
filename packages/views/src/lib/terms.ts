import type { TaxonomyTerm } from "emdash";

/**
 * Inline taxonomy-term accessors for EmDash 0.18 content entries.
 *
 * EmDash 0.18 populates `entry.data.terms` on every entry returned by
 * `getEmDashCollection` / `getEmDashEntry` (release PR #1409), so views read
 * terms directly off the entry instead of issuing a separate `getEntryTerms`
 * round trip.
 *
 * The accessors only read `entry.data.terms`, so they accept the minimal
 * structural shape rather than the full `ContentEntry` (whose `edit` proxy is
 * irrelevant here and would force callers to fabricate one).
 */

/** Minimal entry shape carrying the inline 0.18 terms map keyed by taxonomy slug. */
export interface EntryWithTerms {
  data: { terms?: Record<string, TaxonomyTerm[]>; [field: string]: unknown };
}

/** Inline terms for a taxonomy, or an empty array when none are present. */
export function entryTerms(entry: EntryWithTerms, taxonomy: string): TaxonomyTerm[] {
  return entry.data.terms?.[taxonomy] ?? [];
}

/** Inline term slugs for a taxonomy, preserving order. */
export function entryTermSlugs(entry: EntryWithTerms, taxonomy: string): string[] {
  return entryTerms(entry, taxonomy).map((term) => term.slug);
}
