import { describe, it, expect, vi } from "vitest";

// Stub the React component so we don't pull @sanity/ui, useClient, etc. into
// these tests — we only care about the plugin definition's shape and the
// validation of its options.
vi.mock("../src/BulkDeleteTool", () => ({
  BulkDeleteTool: () => null,
  BulkDeleteToolWithToasts: () => null,
}));

import { bulkDeleteTool } from "../src/index";

describe("bulkDeleteTool — option validation", () => {
  it("throws when called with no options", () => {
    expect(() =>
      // @ts-expect-error — explicitly testing the missing-options path
      bulkDeleteTool()
    ).toThrow(/apiVersion.*required/i);
  });

  it("throws when apiVersion is missing", () => {
    expect(() =>
      // @ts-expect-error — explicitly testing the missing-apiVersion path
      bulkDeleteTool({})
    ).toThrow(/apiVersion.*required/i);
  });

  it("throws when apiVersion is an empty string", () => {
    expect(() => bulkDeleteTool({ apiVersion: "" })).toThrow(
      /apiVersion.*required/i
    );
  });

  it("does not throw when apiVersion is provided", () => {
    expect(() => bulkDeleteTool({ apiVersion: "2024-10-01" })).not.toThrow();
  });
});

describe("bulkDeleteTool — plugin shape", () => {
  it("registers under the name 'sanity-plugin-bulk-delete'", () => {
    const plugin = bulkDeleteTool({ apiVersion: "2024-10-01" });
    expect(plugin.name).toBe("sanity-plugin-bulk-delete");
  });

  it("appends a single tool to the previous tools array", () => {
    const plugin = bulkDeleteTool({ apiVersion: "2024-10-01" });
    const prev = [
      { name: "vision", title: "Vision" },
      { name: "structure", title: "Structure" },
    ];
    // The tools transformer in `definePlugin` accepts whatever `prev` shape
    // sanity passes through; the plugin appends one entry.
    const next = (plugin.tools as (prev: unknown[]) => unknown[])(prev);
    expect(next).toHaveLength(prev.length + 1);
    expect(next.slice(0, prev.length)).toEqual(prev);
  });

  it("uses default toolName/toolTitle when not overridden", () => {
    const plugin = bulkDeleteTool({ apiVersion: "2024-10-01" });
    const next = (plugin.tools as (prev: unknown[]) => unknown[])([]);
    const tool = next[0] as { name: string; title: string };
    expect(tool.name).toBe("bulk-delete");
    expect(tool.title).toBe("Bulk Delete");
  });

  it("respects custom toolName / toolTitle overrides", () => {
    const plugin = bulkDeleteTool({
      apiVersion: "2024-10-01",
      toolName: "purge",
      toolTitle: "Document Purge",
    });
    const next = (plugin.tools as (prev: unknown[]) => unknown[])([]);
    const tool = next[0] as { name: string; title: string };
    expect(tool.name).toBe("purge");
    expect(tool.title).toBe("Document Purge");
  });

  it("attaches an icon and a component to the registered tool", () => {
    const plugin = bulkDeleteTool({ apiVersion: "2024-10-01" });
    const next = (plugin.tools as (prev: unknown[]) => unknown[])([]);
    const tool = next[0] as { icon: unknown; component: unknown };
    expect(tool.icon).toBeTruthy();
    expect(typeof tool.component).toBe("function");
  });
});
