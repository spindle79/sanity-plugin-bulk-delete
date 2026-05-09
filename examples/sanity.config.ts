/**
 * Example wiring for sanity-plugin-bulk-delete.
 *
 * Copy the relevant pieces into your project's `sanity.config.ts`. This file
 * is reference-only and not bundled into the published plugin.
 */
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { bulkDeleteTool } from "sanity-plugin-bulk-delete";

export default defineConfig({
  name: "default",
  title: "My Studio",
  projectId: "your-project-id",
  dataset: "production",

  plugins: [
    structureTool(),

    bulkDeleteTool({
      // Required — the API version used for queries and mutations.
      apiVersion: "2024-10-01",

      // Optional — restrict the dropdown to specific document types.
      // documentTypes: ['page', 'post', 'product'],

      // Optional — hide types that should never be bulk-deleted.
      hiddenDocumentTypes: ["siteSettings", "navigation"],

      // Optional — override the default tool slot name + label.
      // toolName: 'bulk-delete',
      // toolTitle: 'Bulk Delete',
    }),
  ],

  schema: {
    types: [
      // Your schema types …
    ],
  },
});
