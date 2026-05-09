# sanity-plugin-bulk-delete

> Multi-select grid for deleting many Sanity documents in a single transaction — with referenced-by visibility so editors can spot what would be orphaned before they hit delete.

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> **At a glance** — Sanity Studio doesn't ship a first-party answer for "select 50 documents and delete them in one go." This plugin adds a tool to the studio nav that does:
>
> - Pick a document type from a registered-schema dropdown (with optional whitelist/blocklist)
> - Filter by search, draft/published status, and sort
> - Multi-select rows in a TanStack-Table grid
> - See which other documents reference each row (so you don't silently orphan stuff)
> - Delete all selected in one Sanity transaction
> - Click any row name to jump straight to that document's editor
>
> Built on `@sanity/ui`, `@tanstack/react-table`, and the public `useSchema()` / `useClient()` / `useRouter()` Sanity hooks. No project-specific schema assumptions — works against any Sanity Studio.

## Install

```bash
npm install sanity-plugin-bulk-delete
# or
pnpm add sanity-plugin-bulk-delete
```

`react`, `sanity`, `@sanity/icons`, and `@sanity/ui` are peer deps and should already be in your studio's `package.json`.

## Quickstart

```ts
// sanity.config.ts
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { bulkDeleteTool } from "sanity-plugin-bulk-delete";

export default defineConfig({
  plugins: [
    structureTool(),
    bulkDeleteTool({
      apiVersion: "2024-10-01",
    }),
  ],
  // ...
});
```

That's it. A "Bulk Delete" entry appears in your studio nav next to the structure tool.

## Configuration

### `BulkDeleteOptions`

| Field | Type | Default | Required | Description |
|---|---|---|---|---|
| `apiVersion` | `string` | — | Yes | Sanity API version for the underlying `useClient` (e.g. `"2024-10-01"`). |
| `documentTypes` | `string[]` | _all registered_ | No | Whitelist — only these types appear in the dropdown. |
| `hiddenDocumentTypes` | `string[]` | `[]` | No | Blocklist — these types are excluded from the dropdown. Applied after `documentTypes`. Useful for hiding singletons (`siteSettings`, `navigation`, etc.) that shouldn't be bulk-deleted. |
| `toolName` | `string` | `"bulk-delete"` | No | Override the tool's slot name. Useful if you have multiple instances configured for different document subsets. |
| `toolTitle` | `string` | `"Bulk Delete"` | No | Override the title shown in the studio nav. |

### Common patterns

**Hide settings/singletons:**

```ts
bulkDeleteTool({
  apiVersion: "2024-10-01",
  hiddenDocumentTypes: ["siteSettings", "navigation", "redirectsConfig"],
});
```

**Restrict to a content subset:**

```ts
bulkDeleteTool({
  apiVersion: "2024-10-01",
  documentTypes: ["blogPost", "newsArticle"],
  toolTitle: "Bulk Delete: Editorial",
});
```

**Two instances for different audiences (admins see everything, editors see editorial only):**

```ts
plugins: [
  bulkDeleteTool({
    apiVersion: "2024-10-01",
    toolName: "bulk-delete-admin",
    toolTitle: "Bulk Delete (Admin)",
  }),
  bulkDeleteTool({
    apiVersion: "2024-10-01",
    toolName: "bulk-delete-editorial",
    toolTitle: "Bulk Delete: Editorial",
    documentTypes: ["blogPost", "newsArticle"],
  }),
];
```

## What the UI shows

Each row of the grid displays:

| Column | What it is |
|---|---|
| ☐ | Row selection checkbox (header has select-all + indeterminate state) |
| **ID** | Copy-to-clipboard button for the document `_id` |
| **Name** | `title` ?? `internalTitle` ?? `"Untitled"`. Click to open the document in the editor (uses Sanity's `editIntent` router, so it works regardless of which structure resolver is mounted). |
| **Status** | `Draft` if `_id` starts with `drafts.`, otherwise `Published`. |
| **Referenced By** | Every other document that references this one, with each linked to its editor. If empty, shows "No refs" — a green light that nothing will be orphaned. |
| **Last Updated** | `_updatedAt` formatted via `toLocaleString()`. |

Filters above the grid:

- **Search** — case-insensitive substring match on `title`/`internalTitle`
- **Status** — All / Draft only / Published only
- **Sort** — Last Updated (desc/asc), Title (A–Z / Z–A)
- **Document Type** — populated from the registered schema, filtered by `documentTypes`/`hiddenDocumentTypes`

The bottom of the grid has TanStack-Table pagination + a critical-tone "Delete Selected (N)" button that triggers a `window.confirm` and then commits all deletes in one transaction.

## How the referenced-by lookup works

The plugin runs this GROQ for each fetch:

```groq
*[_type == $docType]{
  _id, _type, title, internalTitle, _updatedAt,
  "referencedBy": *[references(^._id)]{_id, _type, title, internalTitle}
}
```

`references(^._id)` is Sanity's built-in operator for finding any document that references the parent's `_id`. It's the same query Sanity Studio uses internally for its delete-confirmation dialog — but the standard delete dialog only fires for one document at a time, which is the gap this plugin fills.

The lookup is one round-trip per fetch (not per row), so it scales fine to a few thousand documents in a single type. For very large types, use the document-type filter and the search box to narrow the set first.

## Behavior notes

- **Hard delete only.** The plugin uses `client.transaction().delete(id).commit()`. There's no soft-delete / archive flag. If you have a soft-delete convention, fork or wait for v0.2.
- **Drafts and published are both deleted by id.** If you select a draft and the corresponding published document, both go away — Sanity won't auto-recreate the published from the draft because the draft is also deleted in the same transaction.
- **Confirmation is `window.confirm()`.** Plain and ugly, but identical to the original tool's behavior. A nicer Sanity Dialog confirmation is on the v0.2 list.
- **The select-all checkbox uses the table's row model**, not the underlying document set, so it respects the active page (current pagination view) — selecting all on page 1 selects only page 1's rows. To select across pages, change pagination size.

## Origin

This plugin was extracted from a Sanity Studio implementation in a private monorepo where it was known internally as "Bulk Edit" (despite being delete-only). The standalone version drops the project-specific `allSchemas` import, the studio-config indirection, and the leftover Autocomplete column-picker dead code, and replaces them with public Sanity hooks (`useSchema`, `useRouter`) plus a clean plugin-options API.

## License

[MIT](LICENSE) © Adam Harris
