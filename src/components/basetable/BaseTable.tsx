import { type ColumnDef } from "@tanstack/react-table";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { ChevronDown } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  useReactTable,
  type Row,
  type RowSelectionState,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Pagination } from "./Pagination";
import { Checkbox } from "@/components/ui/checkbox";

export interface SelectionConfig<T> {
  enabled: boolean;
  selectedIds: Array<string | number>;
  onSelectedIdsChange: (ids: Array<string | number>) => void;
  getId?: (row: T, index: number) => string | number;
  /** total record sesuai filter aktif — dipakai buat tau apakah "semua" sudah kepilih */
  totalCount?: number;
  /** fetch SEMUA id tanpa limit/pagination, dipanggil saat user klik "select all" */
  onSelectAll?: () => Promise<Array<string | number>>;
  isSelectAllLoading?: boolean;
}

// Extended ColumnDef type with alignment support
export type ExtendedColumnDef<T> = ColumnDef<T> & {
  justify?: "start" | "center" | "end";
  align?: "start" | "center" | "end";
};

type BaseTableState<T> = {
  data: T[];
  columns: ColumnDef<T>[];
};

// Type for simplified column definition (original style)
export type SimpleColumnDef<T, COL extends Exclude<keyof T, symbol | number>> =
  | COL
  | {
      name: COL;
      header?: ReactNode;
      render?: (opt: {
        table: BaseTableState<T>;
        row: T;
        index: number;
        el: {
          tbody: { current: HTMLTableSectionElement | null };
          container: { current: HTMLDivElement | null };
        };
      }) => ReactElement;
    };

// Meta type for pagination
export type TableMeta = {
  page?: number;
  offset?: number;
  pageCount?: number;
};

// Enhanced interface
interface BaseTableProps<
  T extends Record<string, any>,
  COL extends Exclude<keyof T, symbol | number>,
> {
  getRowId?: (row: T, index: number) => string;
  data: T[];
  columns: SimpleColumnDef<T, COL>[] | ColumnDef<T>[];
  pagination?: {
    enabled: boolean;
    initialPageIndex?: number;
    initialPageSize?: number;
    mode?: "client" | "server";
    pageCount?: number;
  };
  isShowNumbering?: boolean;
  renderExpansion?: (row: Row<T>) => ReactElement;
  isLoading?: boolean;
  hideColumns?: string[];
  onRowClick?: (row: Row<T>) => void;
  noDataText?: string;
  className?: string;
  meta?: TableMeta;
  onPaginationChange?: (pageIndex: number, pageSize: number) => void;
  selection?: SelectionConfig<T>;
}

export const BaseTable = <
  T extends Record<string, any>,
  COL extends Exclude<keyof T, symbol | number>,
>(
  opt: BaseTableProps<T, COL>,
) => {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [searchParams, setSearchParams] = useSearchParams();

  const div = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const tbody = useRef<HTMLTableSectionElement>(null);

  // Determine pagination mode
  const isServerPagination =
    opt.pagination?.mode === "server" ||
    (opt.pagination?.mode !== "client" && !!opt.onPaginationChange);

  // Get page from URL (1-based)
  const getPageFromUrl = useCallback((): number => {
    const pageParam = searchParams.get("page");
    if (pageParam) {
      const page = parseInt(pageParam, 10);
      if (!isNaN(page) && page >= 1) {
        return page;
      }
    }
    return 1;
  }, [searchParams]);

  // Initialize pagination state - when server mode, prefer meta values
  const getInitialPagination = useCallback(() => {
    // Server mode: use meta if available, otherwise derive from initial values
    if (isServerPagination) {
      return {
        pageIndex:
          (opt.meta?.page ?? opt.pagination?.initialPageIndex ?? 1) - 1,
        pageSize: opt.meta?.offset ?? opt.pagination?.initialPageSize ?? 10,
      };
    }
    // Client mode: derive from URL
    const urlPage = getPageFromUrl();
    return {
      pageIndex: urlPage - 1,
      pageSize: opt.pagination?.initialPageSize || 10,
    };
  }, [
    isServerPagination,
    opt.meta,
    opt.pagination?.initialPageIndex,
    opt.pagination?.initialPageSize,
    getPageFromUrl,
  ]);

  const [pagination, setPagination] = useState(getInitialPagination);

  // Sync pagination when meta changes (for server-side pagination)
  useEffect(() => {
    if (isServerPagination) {
      setPagination({
        pageIndex: (opt.meta?.page ?? 1) - 1,
        pageSize: opt.meta?.offset ?? opt.pagination?.initialPageSize ?? 10,
      });
    }
  }, [
    isServerPagination,
    opt.meta?.page,
    opt.meta?.offset,
    opt.pagination?.initialPageSize,
  ]);

  // Sync pagination with URL when URL changes (handles back/forward navigation, direct URL changes)
  useEffect(() => {
    if (!isServerPagination) return;

    const pageParam = searchParams.get("page");
    const urlPage = pageParam ? parseInt(pageParam, 10) : 1;
    const currentPageIndex = urlPage - 1;

    // Only update if different from current state
    if (pagination.pageIndex !== currentPageIndex) {
      setPagination((prev) => ({ ...prev, pageIndex: currentPageIndex }));
    }
  }, [searchParams, isServerPagination]);

  // Sync pagination changes to URL search params - FIXED: use ref to track previous pageIndex
  const prevPageIndexRef = useRef<number>(pagination.pageIndex);

  useEffect(() => {
    if (!opt.pagination?.enabled) return;

    const prevPageIndex = prevPageIndexRef.current;

    // Initial render
    if (prevPageIndex === undefined) {
      prevPageIndexRef.current = pagination.pageIndex;
      return;
    }

    // Page tidak berubah
    if (prevPageIndex === pagination.pageIndex) {
      return;
    }

    const newSearchParams = new URLSearchParams(window.location.search);
    const newPage = (pagination.pageIndex + 1).toString();

    if (newPage === "1") {
      newSearchParams.delete("page");
    } else {
      newSearchParams.set("page", newPage);
    }

    setSearchParams(newSearchParams, { replace: true });

    prevPageIndexRef.current = pagination.pageIndex;
  }, [pagination.pageIndex, opt.pagination?.enabled, setSearchParams]);

  // Handle edge case: when data becomes empty and page > 1, go to previous page
  useEffect(() => {
    if (opt.isLoading) return;

    const currentPage = parseInt(searchParams.get("page") || "1", 10);
    if (currentPage > 1 && opt.data.length === 0) {
      const newPage = (currentPage - 1).toString();
      const newSearchParams = new URLSearchParams(searchParams);
      if (newPage === "1") {
        newSearchParams.delete("page");
      } else {
        newSearchParams.set("page", newPage);
      }
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [opt.data.length, searchParams, setSearchParams, opt.isLoading]);

  // Handle edge case: when pageCount becomes less than pageIndex (e.g., after filtering)
  useEffect(() => {
    if (opt.isLoading) return;

    const pageCount = opt.pagination?.pageCount ?? 1;
    if (pagination.pageIndex >= pageCount) {
      setPagination((prev) => ({
        ...prev,
        pageIndex: pageCount > 0 ? pageCount - 1 : 0,
      }));
    }
  }, [opt.pagination?.pageCount, opt.isLoading]);

  // Helper function to get page from URL (1-based)
  const getPageFromUrlFn = () => {
    const pageParam = searchParams.get("page");
    if (pageParam) {
      const page = parseInt(pageParam, 10);
      if (!isNaN(page) && page >= 1) {
        return page;
      }
    }
    return 1;
  };

  // Checkbox
  const [isFetchingAll, setIsFetchingAll] = useState(false);

  const getSelectionId = useCallback(
    (row: T, index: number): string | number => {
      if (opt.selection?.getId) return opt.selection.getId(row, index);
      if (opt.getRowId) return opt.getRowId(row, index);
      return (row as any).id ?? index;
    },
    [opt.selection, opt.getRowId],
  );

  const idsOnCurrentPage = useMemo(
    () => opt.data.map((row, idx) => getSelectionId(row, idx)),
    [opt.data, getSelectionId],
  );

  const handleToggleRow = useCallback(
    (id: string | number) => {
      if (!opt.selection) return;
      const { selectedIds, onSelectedIdsChange } = opt.selection;
      const isSelected = selectedIds.includes(id);
      onSelectedIdsChange(
        isSelected
          ? selectedIds.filter((sid) => sid !== id)
          : [...selectedIds, id],
      );
    },
    [opt.selection],
  );

  const handleToggleAll = useCallback(async () => {
    if (!opt.selection) return;
    const { selectedIds, onSelectedIdsChange, onSelectAll, totalCount } =
      opt.selection;

    const hasGlobalTotal = totalCount !== undefined;
    const isAllSelected = hasGlobalTotal
      ? totalCount! > 0 && selectedIds.length === totalCount
      : idsOnCurrentPage.length > 0 &&
        idsOnCurrentPage.every((id) => selectedIds.includes(id));

    // Sudah full-checked -> uncheck semua
    if (isAllSelected) {
      onSelectedIdsChange(
        hasGlobalTotal
          ? []
          : selectedIds.filter((id) => !idsOnCurrentPage.includes(id)),
      );
      return;
    }

    // Belum full / indeterminate -> select all
    if (onSelectAll) {
      try {
        setIsFetchingAll(true);
        const allIds = await onSelectAll(); // <-- ini yg fetch API tanpa limit
        onSelectedIdsChange(allIds);
      } catch (err) {
        console.error("Gagal fetch semua data untuk select all:", err);
      } finally {
        setIsFetchingAll(false);
      }
    } else {
      // fallback kalau parent nggak kasih onSelectAll: select yg ke-load di page ini aja
      onSelectedIdsChange(
        Array.from(new Set([...selectedIds, ...idsOnCurrentPage])),
      );
    }
  }, [opt.selection, idsOnCurrentPage]);

  // Enhanced column processing - uses context.table to avoid stale closure
  const visibleColumns = useMemo<ColumnDef<T>[]>(() => {
    let processedColumns: ColumnDef<T>[] = [];

    // Check if columns are already in ColumnDef format
    const isColumnDefFormat =
      opt.columns.length > 0 &&
      typeof opt.columns[0] === "object" &&
      ("accessorKey" in opt.columns[0] ||
        "header" in opt.columns[0] ||
        "cell" in opt.columns[0]) &&
      !("name" in opt.columns[0]);

    if (isColumnDefFormat) {
      processedColumns = [...(opt.columns as ColumnDef<T>[])];
    } else {
      // Convert simplified format to ColumnDef format
      processedColumns = (opt.columns as SimpleColumnDef<T, COL>[]).map(
        (col) => {
          const colName = typeof col === "string" ? col : col.name;
          return {
            accessorFn: (row) => row[colName],
            id: colName as string,
            header: typeof col === "string" ? col : col.header || col.name,
            cell(props) {
              const cell = props.getValue();
              if (typeof col === "string") {
                return cell;
              }
              if (col.render) {
                return col.render({
                  table: {
                    data: opt.data,
                    columns: processedColumns,
                  } as any,
                  row: props.row.original,
                  index: props.row.index,
                  el: {
                    tbody: tbody,
                    container: container,
                  },
                });
              }
              return cell;
            },
          } as ColumnDef<T>;
        },
      );
    }

    // Filter hidden columns
    const filteredColumns = processedColumns.filter((col) => {
      if ("accessorKey" in col && col.accessorKey) {
        return !opt.hideColumns?.includes(col.accessorKey as string);
      }
      return true;
    });

    // Add numbering column if enabled
    if (opt.isShowNumbering) {
      filteredColumns.unshift({
        id: "no",
        header: "No.",
        size: 50,
        minSize: 50,
        maxSize: 50,
        cell: (context) => {
          // For server-side: use meta if available, otherwise derive from pagination config
          if (isServerPagination) {
            const page = opt.meta?.page ?? pagination.pageIndex + 1;
            const pageSize = opt.meta?.offset ?? pagination.pageSize;
            const rowNumber = (page - 1) * pageSize + context.row.index + 1;
            return <span className="text-sm font-medium">{rowNumber}</span>;
          }
          // For client-side: derive page directly from URL searchParams
          const currentPage = getPageFromUrlFn();
          const pageIndex = currentPage - 1;
          const pageSize = pagination.pageSize;
          const rowNumber = pageIndex * pageSize + context.row.index + 1;
          // console.log('[DEBUG] cell render:', {
          //   currentPage,
          //   pageIndex,
          //   pageSize,
          //   rowIndex: context.row.index,
          //   positionInPage,
          //   rowNumber,
          //   searchParamsPage: searchParams.get('page')
          // });
          return <span className="text-sm font-medium">{rowNumber}</span>;
        },
      } as ColumnDef<T>);
    }

    if (opt.selection?.enabled) {
      const sel = opt.selection;
      const hasGlobalTotal = sel.totalCount !== undefined;
      const isAllSelected = hasGlobalTotal
        ? sel.totalCount! > 0 && sel.selectedIds.length === sel.totalCount
        : idsOnCurrentPage.length > 0 &&
          idsOnCurrentPage.every((id) => sel.selectedIds.includes(id));
      const isIndeterminate = sel.selectedIds.length > 0 && !isAllSelected;

      filteredColumns.unshift({
        id: "select",
        size: 56,
        minSize: 56,
        maxSize: 56,
        header: () => (
          <div className="flex items-center justify-center ml-2 mr-5">
            <Checkbox
              checked={
                isAllSelected ? true : isIndeterminate ? "indeterminate" : false
              }
              onCheckedChange={handleToggleAll}
              disabled={isFetchingAll || sel.isSelectAllLoading}
              aria-label="Select all rows"
              className="border-white data-[state=checked]:bg-white data-[state=checked]:text-[#087F5B]"
            />
          </div>
        ),
        cell: ({ row }) => {
          const id = getSelectionId(row.original, row.index);
          const checked = sel.selectedIds.includes(id);
          return (
            <div
              className="flex items-center justify-center ml-2 mr-5"
              onClick={(e) => e.stopPropagation()} // biar gak trigger onRowClick / expand
            >
              <Checkbox
                checked={checked}
                onCheckedChange={() => handleToggleRow(id)}
                aria-label={`Select row ${id}`}
              />
            </div>
          );
        },
      } as ColumnDef<T>);
    }

    // Add expansion column if enabled
    if (opt.renderExpansion) {
      filteredColumns.push({
        accessorKey: "expansion",
        header: "",
        id: "expansion",
        maxSize: 40,
        cell: ({ row }) => {
          return (
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform cursor-pointer text-muted-foreground hover:text-foreground",
                row.getIsExpanded() && "rotate-180",
              )}
            />
          );
        },
      } as ColumnDef<T>);
    }

    return filteredColumns;
  }, [
    opt.columns,
    opt.hideColumns,
    opt.isShowNumbering,
    opt.renderExpansion,
    opt.meta,
    opt.data,
    searchParams,
    pagination.pageSize,
    opt.selection, // checkbox
    idsOnCurrentPage, // checkbox
    isFetchingAll, // checkbox
    handleToggleAll, // checkbox
    handleToggleRow, // checkbox
    getSelectionId, // checkbox
  ]);

  // Build table instance
  const table = useReactTable({
    data: opt.data as T[],
    columns: visibleColumns,
    state: {
      pagination: opt.pagination?.enabled ? pagination : undefined,
      rowSelection,
    },
    onPaginationChange: (updater) => {
      const newState =
        typeof updater === "function" ? updater(pagination) : updater;
      setPagination(newState);

      if (isServerPagination && opt.onPaginationChange) {
        opt.onPaginationChange(newState.pageIndex, newState.pageSize);
      }
    },
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: opt.pagination?.enabled
      ? getPaginationRowModel()
      : undefined,
    getExpandedRowModel: getExpandedRowModel(),
    manualPagination: isServerPagination,
    manualExpanding: true,
    autoResetPageIndex: !isServerPagination,
    // getRowId: (row, index) => {
    //   // @ts-ignore
    //   return row.id?.toString() || index.toString();

    // },
    getRowId: opt.getRowId
      ? opt.getRowId
      : (row, index) => {
          return row.id?.toString() || index.toString();
        },
    pageCount: isServerPagination ? opt.pagination?.pageCount || -1 : undefined,
  });

  useEffect(() => {
    if (!div.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        void entry.contentRect.height;
      }
    });

    observer.observe(div.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      className={cn(
        "w-full h-full relative border rounded-lg overflow-hidden",
        opt.className,
      )}
      ref={div}
    >
      <div className="absolute inset-0 flex flex-col">
        {visibleColumns.length > 0 && (
          <>
            <div className="flex-1 overflow-auto relative">
              {/* Loading overlay for pagination - shows when loading and there's existing data */}
              {opt.isLoading && table.getRowModel().rows?.length > 0 && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-slate-600"></div>
                    <span className="text-sm font-medium text-slate-600">
                      Loading...
                    </span>
                  </div>
                </div>
              )}
              <Table
                className="w-full"
                style={{
                  tableLayout: "auto",
                  width: "max-content",
                  minWidth: "100%",
                }}
              >
                <TableHeader
                  className="sticky top-0 z-20 bg-[#087F5B]"
                  style={{ position: "sticky" }}
                >
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow
                      key={headerGroup.id}
                      // className="border-b border-[#066649]"
                    >
                      {headerGroup.headers.map((header) => {
                        const columnSize = header.column.columnDef.size;
                        const columnMinSize = header.column.columnDef.minSize;
                        const columnMaxSize = header.column.columnDef.maxSize;

                        // Default sizes for different column types
                        const getDefaultWidth = () => {
                          const columnId = header.column.id;
                          if (columnId === "no") return "60px";
                          if (columnId === "actions") return "auto";
                          if (columnId === "color") return "100px";
                          if (columnId === "expansion") return "50px";
                          return "auto";
                        };

                        const finalWidth = columnSize
                          ? `${columnSize}px`
                          : getDefaultWidth();

                        return (
                          <TableHead
                            key={header.id}
                            className={cn(
                              "bg-[#087F5B] text-white font-semibold border-r last:border-r-0 h-12 px-4 text-center",
                            )}
                            style={{
                              width: columnSize ? `${columnSize}px` : "auto",
                              minWidth: columnMinSize
                                ? `${columnMinSize}px`
                                : "max-content",
                              maxWidth: columnMaxSize
                                ? `${columnMaxSize}px`
                                : undefined,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody className="bg-white" ref={tbody}>
                  {table.getRowModel().rows?.length ? (
                    <Fragment>
                      {table.getRowModel().rows.map((row) => (
                        <Fragment key={row.id}>
                          <TableRow
                            className={cn(
                              "border-b border-slate-200 hover:bg-slate-50 transition-colors",
                              opt.renderExpansion && "cursor-pointer",
                              row.getIsExpanded() && "bg-slate-50",
                            )}
                            onClick={() => {
                              if (opt.renderExpansion) {
                                row.toggleExpanded();
                              }
                              opt.onRowClick?.(row);
                            }}
                          >
                            {row.getVisibleCells().map((cell) => {
                              const columnJustify =
                                (cell.column.columnDef as any).justify ||
                                "start";

                              const getCellTextAlignClass = (
                                justify: string,
                              ) => {
                                switch (justify) {
                                  case "center":
                                    return "text-center";
                                  case "end":
                                    return "text-right";
                                  case "start":
                                  default:
                                    return "text-left";
                                }
                              };

                              const cellTextAlignClass =
                                getCellTextAlignClass(columnJustify);

                              return (
                                <TableCell
                                  key={cell.id}
                                  className={cn(
                                    "py-3 px-4 border-r border-slate-200 last:border-r-0",
                                    cellTextAlignClass,
                                    cell.column.id === "no" && "text-center",
                                    cell.column.id === "color" && "text-center",
                                  )}
                                >
                                  {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext(),
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                          {row.getIsExpanded() && opt.renderExpansion ? (
                            <TableRow className="bg-slate-50/50 border-b border-slate-200">
                              <TableCell
                                className="p-0 border-l-4 border-l-[#0BA875]"
                                colSpan={table.getAllColumns().length}
                              >
                                <div className="p-4">
                                  {opt.renderExpansion(row)}
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : null}
                        </Fragment>
                      ))}
                    </Fragment>
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={visibleColumns.length}
                        className="h-24 text-center text-slate-500 whitespace-normal"
                        style={{ minWidth: "auto" }}
                      >
                        {opt.isLoading ? (
                          <div className="flex flex-col items-center justify-center gap-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-slate-600"></div>
                            <span className="text-sm font-medium">
                              Loading data...
                            </span>
                          </div>
                        ) : (
                          opt.noDataText || "No data available"
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {opt.pagination?.enabled && (
              <div className="flex-shrink-0 bg-white border-t border-slate-200">
                <Pagination
                  pageIndex={table.getState().pagination.pageIndex}
                  pageCount={table.getPageCount()}
                  canPreviousPage={table.getCanPreviousPage()}
                  canNextPage={table.getCanNextPage()}
                  setPageIndex={(pageIndex) => {
                    table.setPageIndex(pageIndex);
                  }}
                  setPageSize={(pageSize) => {
                    table.setPageSize(pageSize);
                  }}
                  pageSize={table.getState().pagination.pageSize}
                  isLoading={opt.isLoading}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
