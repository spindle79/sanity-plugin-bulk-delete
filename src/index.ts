import { definePlugin } from "sanity";
import { DocumentsIcon } from "@sanity/icons";
import * as React from "react";

import { BulkDeleteToolWithToasts } from "./BulkDeleteTool";
import type { BulkDeleteOptions } from "./types";

export type { BulkDeleteOptions, SanityDocSummary } from "./types";
export { BulkDeleteTool, BulkDeleteToolWithToasts } from "./BulkDeleteTool";

/**
 * Sanity Studio plugin that registers a "Bulk Delete" tool in the studio nav.
 *
 * Renders a TanStack-Table grid of every document of the selected type, with
 * filters for search, status (draft/published), and sort. Each row shows
 * which other documents reference it so editors can spot what would be
 * orphaned before deleting.
 *
 * Example:
 *
 *   import { defineConfig } from 'sanity'
 *   import { bulkDeleteTool } from 'sanity-plugin-bulk-delete'
 *
 *   export default defineConfig({
 *     plugins: [
 *       bulkDeleteTool({
 *         apiVersion: '2024-10-01',
 *         hiddenDocumentTypes: ['siteSettings'],
 *       }),
 *     ],
 *   })
 */
export const bulkDeleteTool = definePlugin<BulkDeleteOptions>((options) => {
  if (!options?.apiVersion) {
    throw new Error(
      "[sanity-plugin-bulk-delete] `apiVersion` is required (e.g. '2024-10-01')."
    );
  }

  return {
    name: "sanity-plugin-bulk-delete",
    tools: (prev) => [
      ...prev,
      {
        name: options.toolName ?? "bulk-delete",
        title: options.toolTitle ?? "Bulk Delete",
        icon: DocumentsIcon,
        component: () =>
          React.createElement(BulkDeleteToolWithToasts, { options }),
      },
    ],
  };
});

export default bulkDeleteTool;
