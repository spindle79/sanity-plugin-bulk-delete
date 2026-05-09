import { describe, it, expect } from "vitest";

import {
  applyFiltersAndSort,
  filterDocumentTypes,
} from "../src/filters";
import type { SanityDocSummary } from "../src/types";

const docs: SanityDocSummary[] = [
  {
    _id: "post-1",
    _type: "post",
    title: "Alpha",
    _updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    _id: "drafts.post-2",
    _type: "post",
    title: "Bravo",
    _updatedAt: "2026-03-01T00:00:00Z",
  },
  {
    _id: "post-3",
    _type: "post",
    internalTitle: "Charlie internal",
    _updatedAt: "2026-02-01T00:00:00Z",
  },
  {
    _id: "drafts.post-4",
    _type: "post",
    // No title or internalTitle — display falls back to "Untitled"
    _updatedAt: "2026-04-01T00:00:00Z",
  },
];

describe("applyFiltersAndSort — search", () => {
  it("returns every doc for an empty search string (default)", () => {
    expect(applyFiltersAndSort(docs)).toHaveLength(docs.length);
  });

  it("filters by title (case-insensitive)", () => {
    const out = applyFiltersAndSort(docs, { search: "alpha" });
    expect(out.map((d) => d._id)).toEqual(["post-1"]);

    const out2 = applyFiltersAndSort(docs, { search: "BRAVO" });
    expect(out2.map((d) => d._id)).toEqual(["drafts.post-2"]);
  });

  it("falls back to internalTitle when title is missing", () => {
    const out = applyFiltersAndSort(docs, { search: "charlie" });
    expect(out.map((d) => d._id)).toEqual(["post-3"]);
  });

  it("falls back to 'Untitled' when both title and internalTitle are missing", () => {
    const out = applyFiltersAndSort(docs, { search: "untitled" });
    expect(out.map((d) => d._id)).toEqual(["drafts.post-4"]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(applyFiltersAndSort(docs, { search: "zzz" })).toHaveLength(0);
  });
});

describe("applyFiltersAndSort — status", () => {
  it("'all' returns every doc regardless of draft prefix", () => {
    const out = applyFiltersAndSort(docs, { statusFilter: "all" });
    expect(out).toHaveLength(docs.length);
  });

  it("'draft' keeps only documents whose _id starts with 'drafts.'", () => {
    const out = applyFiltersAndSort(docs, { statusFilter: "draft" });
    expect(out.map((d) => d._id).sort()).toEqual(
      ["drafts.post-2", "drafts.post-4"].sort()
    );
  });

  it("'published' keeps only documents whose _id does NOT start with 'drafts.'", () => {
    const out = applyFiltersAndSort(docs, { statusFilter: "published" });
    expect(out.map((d) => d._id).sort()).toEqual(["post-1", "post-3"].sort());
  });

  it("composes search and status (AND semantics)", () => {
    const out = applyFiltersAndSort(docs, {
      search: "post",
      statusFilter: "draft",
    });
    // No draft has 'post' in its title — Bravo doesn't, Untitled doesn't.
    expect(out).toHaveLength(0);

    const out2 = applyFiltersAndSort(docs, {
      search: "alpha",
      statusFilter: "published",
    });
    expect(out2.map((d) => d._id)).toEqual(["post-1"]);
  });
});

describe("applyFiltersAndSort — sort", () => {
  it("'updatedDesc' (default) returns most-recently-updated first", () => {
    const out = applyFiltersAndSort(docs);
    expect(out.map((d) => d._id)).toEqual([
      "drafts.post-4", // 2026-04-01
      "drafts.post-2", // 2026-03-01
      "post-3", //         2026-02-01
      "post-1", //         2026-01-01
    ]);
  });

  it("'updatedAsc' returns oldest first", () => {
    const out = applyFiltersAndSort(docs, { sort: "updatedAsc" });
    expect(out.map((d) => d._id)).toEqual([
      "post-1",
      "post-3",
      "drafts.post-2",
      "drafts.post-4",
    ]);
  });

  it("'titleAsc' sorts alphabetically by display title (A→Z)", () => {
    const out = applyFiltersAndSort(docs, { sort: "titleAsc" });
    // "" (untitled fallback in sort) — note sort uses raw title||internalTitle
    // so the no-title doc sorts as empty string and lands first.
    expect(out.map((d) => d._id)).toEqual([
      "drafts.post-4", // empty title
      "post-1", //         "Alpha"
      "drafts.post-2", //  "Bravo"
      "post-3", //         "Charlie internal"
    ]);
  });

  it("'titleDesc' reverses the alphabetical ordering", () => {
    const out = applyFiltersAndSort(docs, { sort: "titleDesc" });
    expect(out.map((d) => d._id)).toEqual([
      "post-3",
      "drafts.post-2",
      "post-1",
      "drafts.post-4",
    ]);
  });

  it("does not mutate the input array", () => {
    const input = [...docs];
    const before = input.map((d) => d._id);
    applyFiltersAndSort(input, { sort: "titleAsc" });
    expect(input.map((d) => d._id)).toEqual(before);
  });

  it("handles documents missing _updatedAt without throwing", () => {
    const partial: SanityDocSummary[] = [
      { _id: "x", _type: "post", title: "X" },
      { _id: "y", _type: "post", title: "Y", _updatedAt: "2026-05-01T00:00:00Z" },
    ];
    const out = applyFiltersAndSort(partial, { sort: "updatedDesc" });
    // Doc with a real timestamp wins; missing-timestamp falls back to "".
    expect(out[0]._id).toBe("y");
  });
});

describe("filterDocumentTypes", () => {
  const registered = [
    { name: "post", title: "Post" },
    { name: "page", title: "Page" },
    { name: "siteSettings", title: "Site Settings" },
    { name: "author", title: "Author" },
  ];

  it("returns every type alphabetised by title when no filters given", () => {
    expect(filterDocumentTypes(registered).map((t) => t.name)).toEqual([
      "author",
      "page",
      "post",
      "siteSettings",
    ]);
  });

  it("applies the documentTypes whitelist", () => {
    const out = filterDocumentTypes(registered, {
      documentTypes: ["post", "page"],
    });
    expect(out.map((t) => t.name)).toEqual(["page", "post"]);
  });

  it("ignores an empty whitelist (treated as 'no whitelist')", () => {
    const out = filterDocumentTypes(registered, { documentTypes: [] });
    expect(out).toHaveLength(registered.length);
  });

  it("applies the hiddenDocumentTypes blocklist", () => {
    const out = filterDocumentTypes(registered, {
      hiddenDocumentTypes: ["siteSettings"],
    });
    expect(out.map((t) => t.name)).toEqual(["author", "page", "post"]);
  });

  it("composes whitelist and blocklist (whitelist first, then blocklist)", () => {
    const out = filterDocumentTypes(registered, {
      documentTypes: ["post", "page", "siteSettings"],
      hiddenDocumentTypes: ["siteSettings"],
    });
    expect(out.map((t) => t.name)).toEqual(["page", "post"]);
  });

  it("does not mutate the input list", () => {
    const input = [...registered];
    filterDocumentTypes(input, { documentTypes: ["post"] });
    expect(input.map((t) => t.name)).toEqual([
      "post",
      "page",
      "siteSettings",
      "author",
    ]);
  });
});
