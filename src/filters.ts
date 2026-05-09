import type { SanityDocSummary } from "./types";

/**
 * Available status filters in the bulk-delete tool.
 *
 * - "all" — include both draft and published versions
 * - "draft" — only documents whose `_id` is prefixed with `drafts.`
 * - "published" — only documents whose `_id` is NOT prefixed with `drafts.`
 */
export type StatusFilter = "all" | "draft" | "published";

/**
 * Available sort orders in the bulk-delete tool.
 */
export type SortOrder = "updatedDesc" | "updatedAsc" | "titleAsc" | "titleDesc";

export interface ApplyFiltersAndSortOptions {
  /**
   * Free-text search applied case-insensitively against the document's
   * display title (`title` or `internalTitle`, falling back to "Untitled").
   * An empty string matches every document.
   */
  search?: string;
  /**
   * Filter documents by draft/published status. Defaults to "all".
   */
  statusFilter?: StatusFilter;
  /**
   * Sort order applied after filtering.
   */
  sort?: SortOrder;
}

/**
 * Pure helper used by the bulk-delete tool to filter and sort the document
 * list returned by Sanity. Exported separately from the React component so
 * it can be unit-tested without rendering the studio shell.
 *
 * The function never mutates the input array.
 */
export function applyFiltersAndSort(
  docs: readonly SanityDocSummary[],
  { search = "", statusFilter = "all", sort = "updatedDesc" }: ApplyFiltersAndSortOptions = {}
): SanityDocSummary[] {
  const needle = search.toLowerCase();

  const filtered = docs.filter((doc) => {
    const t = doc.title || doc.internalTitle || "Untitled";
    const matchesSearch = t.toLowerCase().includes(needle);

    let matchesStatus = true;
    if (statusFilter === "draft") {
      matchesStatus = doc._id.startsWith("drafts.");
    } else if (statusFilter === "published") {
      matchesStatus = !doc._id.startsWith("drafts.");
    }

    return matchesSearch && matchesStatus;
  });

  return [...filtered].sort((a, b) => {
    const titleA = (a.title || a.internalTitle || "").toLowerCase();
    const titleB = (b.title || b.internalTitle || "").toLowerCase();
    if (sort === "updatedDesc") {
      return (b._updatedAt || "").localeCompare(a._updatedAt || "");
    }
    if (sort === "updatedAsc") {
      return (a._updatedAt || "").localeCompare(b._updatedAt || "");
    }
    if (sort === "titleAsc") return titleA.localeCompare(titleB);
    if (sort === "titleDesc") return titleB.localeCompare(titleA);
    return 0;
  });
}

export interface DocumentTypeChoice {
  name: string;
  title: string;
}

export interface FilterDocumentTypesOptions {
  /** Whitelist — if provided, only these type names are kept. */
  documentTypes?: string[];
  /** Blocklist — these type names are removed (applied after the whitelist). */
  hiddenDocumentTypes?: string[];
}

/**
 * Apply the plugin's whitelist/blocklist options to a registered list of
 * document types and return them alphabetised by title. The component uses
 * this to populate the "Document Type" select.
 */
export function filterDocumentTypes(
  registered: readonly DocumentTypeChoice[],
  { documentTypes, hiddenDocumentTypes }: FilterDocumentTypesOptions = {}
): DocumentTypeChoice[] {
  let result: DocumentTypeChoice[] = [...registered];

  if (documentTypes?.length) {
    const allow = new Set(documentTypes);
    result = result.filter((d) => allow.has(d.name));
  }
  if (hiddenDocumentTypes?.length) {
    const block = new Set(hiddenDocumentTypes);
    result = result.filter((d) => !block.has(d.name));
  }

  return result.sort((a, b) => a.title.localeCompare(b.title));
}
