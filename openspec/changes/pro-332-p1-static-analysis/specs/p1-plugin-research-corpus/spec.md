# Capability: p1-plugin-research-corpus

A reproducible static-analysis methodology and the resulting paraphrased markdown corpus for the four P1 EventON plugins. The corpus is the only sanctioned input for downstream Dateline plugin specs in the ticketing, RSVP, seat-map, and pricing domains.

## Requirements

### Requirement: Per-plugin output directory and file set

The system SHALL produce, for each P1 plugin, a dedicated analysis directory containing exactly four markdown documents with the canonical names `00-overview.md`, `01-data-model.md`, `02-hooks.md`, and `03-features.md`.

#### Scenario: Directory created for each P1 plugin

- **WHEN** the change is implemented
- **THEN** `research/analysis/eventon-tickets/`, `research/analysis/eventon-rsvp/`, `research/analysis/eventon-seats/`, and `research/analysis/eventon-ticket-variations-options/` each exist
- **AND** each directory contains exactly the four canonical markdown files listed above
- **AND** no other files (no images, no scratch notes, no source quotes) are committed in this change

#### Scenario: Missing or extra docs are rejected at review

- **WHEN** a reviewer audits a plugin's analysis directory
- **AND** any of the four canonical files is missing OR an unexpected file is present
- **THEN** the change is BLOCKED until the corpus matches the canonical structure

### Requirement: YAML front-matter on every analysis document

Every analysis document MUST begin with a YAML front-matter block declaring `plugin`, `version`, `analyzed` (ISO-8601 date), `analyst`, and `phase` keys. No document may ship without this header.

#### Scenario: Front-matter validates against the schema

- **WHEN** a doc is opened
- **THEN** the first non-empty lines of the file are exactly a YAML block delimited by `---` lines
- **AND** the block contains `plugin: <plugin-slug>`, `version: <semver-string>`, `analyzed: 2026-04-30`, `analyst: claudeflare`, and `phase: 1`
- **AND** the `plugin` value matches the directory name
- **AND** the `version` value matches the upstream version on disk (`2.4.7`, `3.0.3`, `1.2.6`, `1.1.4`)

### Requirement: Clean-room write discipline (no verbatim PHP)

The corpus MUST contain no verbatim PHP source code from the analyzed plugins. Hook names, function names, postmeta keys, option names, REST route paths, and other identifiers — which are facts, not creative expression — MAY be quoted exactly. Implementation logic SHALL be paraphrased in prose or rendered as pseudo-code distinct from the source language.

#### Scenario: Identifiers are quoted; implementation is paraphrased

- **WHEN** documenting a hook, postmeta key, REST route, or option name
- **THEN** the exact upstream identifier MAY appear verbatim (it is a fact, like a URL)
- **AND** any accompanying explanation of what the hook does is the analyst's own prose
- **AND** no PHP function bodies, class declarations, or multi-line code blocks lifted from source are present

#### Scenario: Pseudo-code uses non-PHP syntax

- **WHEN** an analyst needs to illustrate an algorithm
- **THEN** the snippet is written in TypeScript-flavored or language-agnostic pseudo-code
- **AND** the snippet does not preserve the source's variable names, control flow, or statement order verbatim

### Requirement: 00-overview.md content

`00-overview.md` SHALL document the plugin's file census, entry point, top-level directory structure, declared and inferred dependencies, and minimum WordPress and PHP version requirements.

#### Scenario: Overview captures plugin metadata and structure

- **WHEN** `00-overview.md` is reviewed
- **THEN** it identifies the entry-point PHP file (the file containing the WordPress plugin header)
- **AND** it lists declared `Requires at least`, `Tested up to`, and `Requires PHP` values from the plugin header (or notes their absence)
- **AND** it provides a file count and a one-paragraph summary of the top-level directory structure (`includes/`, `templates/`, `assets/`, `lang/`, etc.)
- **AND** it lists upstream plugin dependencies (e.g., EventON core, WooCommerce) inferred from the entry-point's bootstrap checks

### Requirement: 01-data-model.md content

`01-data-model.md` SHALL enumerate every storage location the plugin writes to: custom post types, taxonomies, custom database tables (via `dbDelta`), postmeta keys (via `update_post_meta`), and WordPress options (via `add_option` / `update_option`).

#### Scenario: Data-model doc has a postmeta-keys table

- **WHEN** `01-data-model.md` is reviewed
- **THEN** it contains at least one markdown table whose columns include the postmeta key name, the post type it applies to (or "global"), and a one-line paraphrase of what is stored
- **AND** every postmeta key surfaced by `rg "update_post_meta"` against the plugin source is listed OR explicitly excluded with a reason
- **AND** custom tables (if any) are listed with column names and a paraphrased purpose
- **AND** options (if any) are listed with their option keys and a paraphrased purpose

### Requirement: 02-hooks.md content

`02-hooks.md` SHALL document every WordPress action and filter the plugin registers (`add_action`, `add_filter`) and emits (`do_action`, `apply_filters`), plus every REST route registered via `register_rest_route`.

#### Scenario: Hooks doc has a hook table

- **WHEN** `02-hooks.md` is reviewed
- **THEN** it contains a markdown table with columns `Hook name`, `Type` (action/filter/emitted-action/emitted-filter/REST), `Source file:line`, and `Purpose (paraphrased)`
- **AND** every hook surfaced by ripgrep against the plugin source is represented in the table OR explicitly grouped (e.g., "12 admin-notice hooks collapsed; see file `includes/admin/notices.php`")
- **AND** REST routes include the namespace, route pattern, and HTTP methods

### Requirement: 03-features.md content

`03-features.md` SHALL inventory user-visible features: admin screens, settings sections, shortcodes, and a feature taxonomy seeded by translatable strings extracted from the plugin's `.pot` or `.po` files.

#### Scenario: Features doc covers admin, shortcodes, and i18n taxonomy

- **WHEN** `03-features.md` is reviewed
- **THEN** it lists every admin menu item, settings page, and metabox the plugin registers
- **AND** it lists every shortcode (`add_shortcode` calls) with parameters and a paraphrased purpose
- **AND** it includes a feature taxonomy section seeded by translatable strings from the plugin's `lang/*.pot` or `lang/*.po` file (or notes the file's absence)
- **AND** the taxonomy section is grouped (e.g., "Ticketing UI", "Email notifications", "Admin reports") rather than a flat dump
