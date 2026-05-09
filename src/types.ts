export interface BulkDeleteOptions {
  /**
   * Sanity API version to use for queries and mutations.
   * Required — the plugin uses `useClient({ apiVersion })`.
   *
   * Use a date string in `YYYY-MM-DD` form, e.g. `"2024-10-01"`.
   */
  apiVersion: string;

  /**
   * Whitelist — only these document types appear in the dropdown.
   * If omitted, every registered document type is shown.
   */
  documentTypes?: string[];

  /**
   * Blocklist — these document types are excluded from the dropdown.
   * Applied after `documentTypes` if both are provided.
   * Useful for hiding singletons or settings docs that shouldn't be
   * bulk-deleted.
   */
  hiddenDocumentTypes?: string[];

  /**
   * Override the tool's identifier. Defaults to `"bulk-delete"`.
   * Useful if you have multiple instances of the plugin configured
   * for different document subsets.
   */
  toolName?: string;

  /**
   * Override the tool's title shown in the studio nav.
   * Defaults to `"Bulk Delete"`.
   */
  toolTitle?: string;
}

export interface SanityDocSummary {
  _id: string;
  _type: string;
  _updatedAt?: string;
  title?: string;
  internalTitle?: string;
  referencedBy?: Array<{
    _id: string;
    _type: string;
    title?: string;
    internalTitle?: string;
  }>;
}
