import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { useCohortsTable } from "../hooks/useCohortsTable";

interface CohortsTableProps {
  table: ReturnType<typeof useCohortsTable>;
}

export function CohortsTable({ table }: CohortsTableProps) {
  const rows = table.getRowModel().rows;

  return (
    <section
      aria-label="Cohort comparison table"
      tabIndex={0}
      className="max-h-[80vh] w-full overflow-auto rounded-lg border focus-visible:outline-2 focus-visible:outline-primary"
    >
      <table
        aria-label="Cohort study comparison"
        className="w-full min-w-287.5 border-collapse text-sm"
      >
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id} className="hover:bg-transparent">
              {group.headers.map((header) => {
                const column = header.column;
                const sorted = column.getIsSorted();
                const sortable = column.getCanSort();

                const SortIcon =
                  sorted === "asc"
                    ? ArrowUp
                    : sorted === "desc"
                      ? ArrowDown
                      : ArrowUpDown;

                return (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    aria-sort={
                      sorted === "asc"
                        ? "ascending"
                        : sorted === "desc"
                          ? "descending"
                          : undefined
                    }
                    className={cn(
                      "sticky top-0 z-20 bg-brand text-white",
                      column.id === "cohort" && "left-0 z-30 min-w-40",
                    )}
                  >
                    {header.isPlaceholder ? null : sortable ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={column.getToggleSortingHandler()}
                        className="text-white hover:bg-white/15 hover:text-white"
                      >
                        <table.FlexRender header={header} />
                        <SortIcon className="size-3.5" aria-hidden="true" />
                      </Button>
                    ) : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={table.getAllLeafColumns().length}
                className="h-24 text-center text-muted-foreground"
              >
                No cohort data available.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id} className="group">
                {row.getAllCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      "px-3 py-3 align-middle",
                      cell.column.id === "cohort" &&
                        "sticky left-0 z-10 min-w-40 bg-background group-hover:bg-muted/50",
                    )}
                  >
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </table>
    </section>
  );
}
