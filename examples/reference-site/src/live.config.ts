import { defineLiveCollection } from "astro:content";
import { emdashLoader } from "emdash/runtime";

/**
 * EmDash live content collection.
 *
 * `getEmDashCollection()` / `getEmDashEntry()` dispatch to the Astro live
 * collection named `_emdash`, backed by the EmDash SQLite database via
 * `emdashLoader()`. This replaces the old static JSON data path,
 * pages now render whatever the seeded database contains.
 */
export const collections = {
  _emdash: defineLiveCollection({ loader: emdashLoader() }),
};
