import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Button,
  Card,
  Flex,
  Select,
  Text,
  TextInput,
  Spinner,
  Stack,
  Inline,
  ToastProvider,
  useToast,
  Tooltip,
} from "@sanity/ui";
import { CopyIcon } from "@sanity/icons";
import { useClient, useSchema } from "sanity";
import { useRouter } from "sanity/router";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type RowSelectionState,
} from "@tanstack/react-table";

import type { BulkDeleteOptions, SanityDocSummary } from "./types";
import {
  applyFiltersAndSort,
  filterDocumentTypes,
  type SortOrder,
  type StatusFilter,
} from "./filters";

/**
 * Use the registered Sanity schema to list document types available for
 * bulk deletion, applying the plugin's whitelist/blocklist options.
 */
function useDocumentTypeOptions(options: BulkDeleteOptions) {
  const schema = useSchema();
  return useMemo(() => {
    const registered = schema
      .getTypeNames()
      .map((name) => {
        const t = schema.get(name) as
          | { name: string; type?: { name?: string }; title?: string }
          | null
          | undefined;
        if (!t || t.type?.name !== "document") return null;
        return { name: t.name, title: t.title || t.name };
      })
      .filter(
        (d): d is { name: string; title: string } => d !== null
      );

    return filterDocumentTypes(registered, {
      documentTypes: options.documentTypes,
      hiddenDocumentTypes: options.hiddenDocumentTypes,
    });
  }, [schema, options.documentTypes, options.hiddenDocumentTypes]);
}

interface BulkDeleteToolProps {
  options: BulkDeleteOptions;
}

export function BulkDeleteTool({ options }: BulkDeleteToolProps) {
  const client = useClient({ apiVersion: options.apiVersion });
  const router = useRouter();
  const toast = useToast();
  const types = useDocumentTypeOptions(options);

  const [docType, setDocType] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOrder>("updatedDesc");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [documents, setDocuments] = useState<SanityDocSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Default to the first available type once the schema is loaded.
  useEffect(() => {
    if (types.length > 0 && !docType) {
      setDocType(types[0].name);
    }
  }, [types, docType]);

  // Fetch documents when filters change.
  useEffect(() => {
    if (!docType) return;
    let cancelled = false;

    setLoading(true);
    setSelected([]);
    setRowSelection({});

    const query = `*[_type == $docType]{
      _id,
      _type,
      title,
      internalTitle,
      _updatedAt,
      "referencedBy": *[references(^._id)]{_id, _type, title, internalTitle}
    }`;

    client
      .fetch<SanityDocSummary[]>(query, { docType })
      .then((docs) => {
        if (cancelled) return;
        setDocuments(applyFiltersAndSort(docs, { search, statusFilter, sort }));
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.error("[sanity-plugin-bulk-delete] Fetch error:", err);
        setDocuments([]);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [client, docType, search, sort, statusFilter]);

  // Sync TanStack row selection back to the local id array.
  useEffect(() => {
    const selectedIds = Object.keys(rowSelection)
      .filter((idx) => rowSelection[idx])
      .map((idx) => documents[Number(idx)]?._id)
      .filter((v): v is string => Boolean(v));
    setSelected(selectedIds);
  }, [rowSelection, documents]);

  const handleDelete = async () => {
    if (selected.length === 0) return;
    if (
      !window.confirm(
        `Are you sure you want to delete ${selected.length} document(s)?`
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const tx = client.transaction();
      selected.forEach((id) => tx.delete(id));
      await tx.commit();
      setDocuments((docs) =>
        docs.filter((doc) => !selected.includes(doc._id))
      );
      setSelected([]);
      setRowSelection({});
      toast.push({
        status: "success",
        title: "Deleted",
        description: `${selected.length} document(s) deleted.`,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete documents.";
      toast.push({ status: "error", title: "Error", description: message });
    } finally {
      setDeleting(false);
    }
  };

  const tanstackColumns = useMemo<ColumnDef<SanityDocSummary>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllRowsSelected()}
            ref={(el) => {
              if (el) el.indeterminate = table.getIsSomeRowsSelected();
            }}
            onChange={table.getToggleAllRowsSelectedHandler()}
            style={{ marginRight: 8 }}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            ref={(el) => {
              if (el) el.indeterminate = row.getIsSomeSelected();
            }}
            onChange={row.getToggleSelectedHandler()}
            style={{ marginRight: 8 }}
          />
        ),
        size: 40,
      },
      {
        accessorKey: "_id",
        header: () => (
          <Text size={1} weight="medium">
            ID
          </Text>
        ),
        cell: (info) => {
          const id = info.getValue() as string;
          return (
            <Tooltip content="Copy ID" placement="top">
              <Button
                mode="bleed"
                icon={CopyIcon}
                aria-label="Copy ID"
                onClick={() => {
                  navigator.clipboard.writeText(id);
                  toast.push({
                    status: "success",
                    title: "Copied",
                    description: `Document ID "${id}" copied to clipboard`,
                  });
                }}
                style={{ minWidth: 0, padding: 0 }}
              />
            </Tooltip>
          );
        },
        size: 120,
      },
      {
        id: "name",
        header: () => (
          <Text size={1} weight="medium">
            Name
          </Text>
        ),
        accessorFn: (row) =>
          row.title || row.internalTitle || "Untitled",
        cell: (info) => (
          <span
            style={{
              textDecoration: "underline",
              color: "#0074d9",
              cursor: "pointer",
              fontSize: 12,
            }}
            onClick={() =>
              router.navigateIntent(
                "edit",
                {
                  id: info.row.original._id.replace(/^drafts\./, ""),
                  type: docType,
                },
                { replace: false }
              )
            }
          >
            {info.getValue() as string}
          </span>
        ),
        size: 180,
      },
      {
        id: "status",
        header: () => (
          <Text size={1} weight="medium">
            Status
          </Text>
        ),
        accessorFn: (row) =>
          row._id.startsWith("drafts.") ? "Draft" : "Published",
        cell: (info) => <Text size={1}>{info.getValue() as string}</Text>,
        size: 80,
      },
      {
        id: "referencedBy",
        header: () => (
          <Text size={1} weight="medium">
            Referenced By
          </Text>
        ),
        cell: (info) => {
          const refs = info.row.original.referencedBy || [];
          if (refs.length === 0) {
            return (
              <Text size={1} muted>
                No refs
              </Text>
            );
          }
          return (
            <Stack space={2}>
              {refs.map((ref) => (
                <span
                  key={ref._id}
                  style={{
                    textDecoration: "underline",
                    color: "#0074d9",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    router.navigateIntent(
                      "edit",
                      {
                        id: ref._id.replace(/^drafts\./, ""),
                        type: ref._type,
                      },
                      { replace: false }
                    )
                  }
                >
                  {ref.title || ref.internalTitle || ref._id}
                </span>
              ))}
            </Stack>
          );
        },
        size: 200,
      },
      {
        id: "updated",
        header: () => (
          <Text size={1} weight="medium">
            Last Updated
          </Text>
        ),
        accessorFn: (row) =>
          row._updatedAt ? new Date(row._updatedAt).toLocaleString() : "",
        cell: (info) => (
          <Text size={1} style={{ color: "#888" }}>
            {info.getValue() as string}
          </Text>
        ),
        size: 160,
      },
    ],
    [docType, router, toast]
  );

  const table = useReactTable({
    data: documents,
    columns: tanstackColumns,
    state: { rowSelection },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <Box padding={4}>
      <Card padding={4} radius={2} shadow={1}>
        <Flex gap={3} align="flex-end" marginBottom={3}>
          <Box flex={2}>
            <Text size={1} weight="medium">
              Search
            </Text>
            <TextInput
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              placeholder="Search by title…"
            />
          </Box>
          <Box flex={1}>
            <Text size={1} weight="medium">
              Status
            </Text>
            <Select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.currentTarget.value as StatusFilter)
              }
            >
              <option value="all">All</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </Select>
          </Box>
          <Box flex={1}>
            <Text size={1} weight="medium">
              Sort
            </Text>
            <Select
              value={sort}
              onChange={(e) => setSort(e.currentTarget.value as SortOrder)}
            >
              <option value="updatedDesc">Last Updated (desc)</option>
              <option value="updatedAsc">Last Updated (asc)</option>
              <option value="titleAsc">Title (A–Z)</option>
              <option value="titleDesc">Title (Z–A)</option>
            </Select>
          </Box>
        </Flex>
        <Flex gap={3} align="flex-end">
          <Box flex={1}>
            <Text size={1} weight="medium">
              Document Type
            </Text>
            {types.length === 0 ? (
              <Spinner muted />
            ) : (
              <Select
                value={docType}
                onChange={(e) => setDocType(e.currentTarget.value)}
              >
                {types.map((type) => (
                  <option key={type.name} value={type.name}>
                    {type.title}
                  </option>
                ))}
              </Select>
            )}
          </Box>
        </Flex>
      </Card>

      <Box marginY={4}>
        {loading ? (
          <Flex justify="center" align="center" style={{ height: 200 }}>
            <Spinner muted size={4} />
          </Flex>
        ) : (
          <Card padding={4} radius={2} shadow={1}>
            {documents.length === 0 ? (
              <Text muted>No matching documents.</Text>
            ) : (
              <>
                <Flex
                  align="center"
                  justify="space-between"
                  marginBottom={3}
                >
                  <Inline space={3}>
                    <Text size={1} weight="medium">
                      Select rows below
                    </Text>
                  </Inline>
                  <Text size={1} muted>
                    {selected.length} selected
                  </Text>
                </Flex>
                <Card tone="default" radius={2} shadow={1} padding={0}>
                  <Box style={{ overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "separate",
                        borderSpacing: 0,
                        minWidth: 800,
                      }}
                    >
                      <thead>
                        {table.getHeaderGroups().map((headerGroup) => (
                          <tr key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                              <th
                                key={header.id}
                                style={{
                                  minWidth: header.getSize(),
                                  padding: "10px 14px",
                                  fontWeight: 600,
                                  fontSize: 13,
                                  borderBottom: "1px solid #e3e3e3",
                                  textAlign: "left",
                                }}
                              >
                                {header.isPlaceholder
                                  ? null
                                  : flexRender(
                                      header.column.columnDef.header,
                                      header.getContext()
                                    )}
                              </th>
                            ))}
                          </tr>
                        ))}
                      </thead>
                      <tbody>
                        {table.getRowModel().rows.map((row) => (
                          <tr
                            key={row.id}
                            style={{
                              transition: "background 0.1s",
                              borderBottom: "1px solid #e3e3e3",
                              boxShadow: row.getIsSelected()
                                ? "0 0 0 2px #d1c4e9"
                                : undefined,
                              background: row.getIsSelected()
                                ? "#f3f0ff"
                                : undefined,
                            }}
                          >
                            {row.getVisibleCells().map((cell) => (
                              <td
                                key={cell.id}
                                style={{
                                  minWidth: cell.column.getSize(),
                                  padding: "10px 14px",
                                  fontSize: 13,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  verticalAlign: "middle",
                                }}
                              >
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Box>
                </Card>
                <Flex justify="flex-end" marginTop={4} gap={2}>
                  <Button
                    tone="critical"
                    disabled={selected.length === 0 || deleting}
                    loading={deleting}
                    onClick={handleDelete}
                    text={`Delete Selected${
                      selected.length > 0 ? ` (${selected.length})` : ""
                    }`}
                  />
                </Flex>
                <Flex justify="center" align="center" marginTop={4} gap={2}>
                  <Button
                    text="Previous"
                    disabled={!table.getCanPreviousPage()}
                    onClick={() => table.previousPage()}
                  />
                  <Text size={1}>
                    Page {table.getState().pagination.pageIndex + 1} of{" "}
                    {table.getPageCount()}
                  </Text>
                  <Button
                    text="Next"
                    disabled={!table.getCanNextPage()}
                    onClick={() => table.nextPage()}
                  />
                </Flex>
              </>
            )}
          </Card>
        )}
      </Box>
    </Box>
  );
}

/**
 * Wrapper that provides the `<ToastProvider>` context. Use this when
 * mounting `BulkDeleteTool` outside a Sanity tool that already wraps in
 * a Toast provider.
 */
export function BulkDeleteToolWithToasts(props: BulkDeleteToolProps) {
  return (
    <ToastProvider>
      <BulkDeleteTool {...props} />
    </ToastProvider>
  );
}
