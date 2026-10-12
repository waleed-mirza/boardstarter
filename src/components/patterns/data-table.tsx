"use client";

import { ArrowDownIcon, ArrowUpIcon, ArrowUpDownIcon } from "lucide-react";
import { useState, type ReactNode } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc";

export type DataTableColumn<T> = {
  key: string;
  header: ReactNode;
  /** Sort value; omit to make the column unsortable. */
  value?: (row: T) => string | number;
  align?: "left" | "right";
  className?: string;
  cell: (row: T) => ReactNode;
};

export type SortState = { key: string; dir: SortDirection };

/**
 * Sortable headers, sticky header, empty slot (§5.4). Mobile card fallback
 * arrives with the employer dashboard (§5.6). Numbers in cells use the
 * `tabular` utility.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  initialSort = null,
  empty,
  mobileRow,
  className,
}: {
  columns: DataTableColumn<T>[];
  rows: readonly T[];
  getRowKey: (row: T) => string;
  initialSort?: SortState | null;
  empty?: ReactNode;
  /** Optional card renderer used below the md breakpoint. */
  mobileRow?: (row: T) => ReactNode;
  className?: string;
}) {
  const [sort, setSort] = useState<SortState | null>(initialSort);
  const sortColumn = sort ? columns.find((column) => column.key === sort.key) : undefined;

  const sortedRows =
    sort && sortColumn?.value
      ? [...rows].sort((a, b) => {
          const av = sortColumn.value!(a);
          const bv = sortColumn.value!(b);
          const cmp =
            typeof av === "number" && typeof bv === "number"
              ? av - bv
              : String(av).localeCompare(String(bv));
          return sort.dir === "asc" ? cmp : -cmp;
        })
      : rows;

  function toggleSort(key: string) {
    setSort((current) => {
      if (current?.key !== key) return { key, dir: "asc" };
      if (current.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  }

  return (
    <div className={cn("overflow-hidden rounded-lg border border-border", className)}>
      <div className={cn(mobileRow ? "hidden md:block" : undefined)}>
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-bg">
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => {
                const sortable = Boolean(column.value);
                const isSorted = sort?.key === column.key;
                const SortIcon = !isSorted
                  ? ArrowUpDownIcon
                  : sort.dir === "asc"
                    ? ArrowUpIcon
                    : ArrowDownIcon;
                return (
                  <TableHead
                    key={column.key}
                    aria-sort={
                      isSorted ? (sort.dir === "asc" ? "ascending" : "descending") : undefined
                    }
                    className={cn(column.align === "right" && "text-right", column.className)}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-sm font-medium outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                          column.align === "right" && "flex-row-reverse",
                          isSorted ? "text-fg" : "text-fg-muted hover:text-fg",
                        )}
                      >
                        {column.header}
                        <SortIcon className="size-3.5" aria-hidden />
                      </button>
                    ) : (
                      column.header
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-0">
                  {empty ?? <p className="p-6 text-center text-sm text-fg-muted">No results.</p>}
                </TableCell>
              </TableRow>
            ) : (
              sortedRows.map((row) => (
                <TableRow key={getRowKey(row)}>
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(column.align === "right" && "text-right", column.className)}
                    >
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {mobileRow ? (
        <div className="divide-y divide-border md:hidden">
          {sortedRows.length === 0
            ? (empty ?? <p className="p-6 text-center text-sm text-fg-muted">No results.</p>)
            : sortedRows.map((row) => <div key={getRowKey(row)}>{mobileRow(row)}</div>)}
        </div>
      ) : null}
    </div>
  );
}
