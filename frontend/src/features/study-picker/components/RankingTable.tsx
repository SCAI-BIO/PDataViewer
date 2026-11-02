import { cn } from "cn";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { RankingTableInstance } from "../hooks/useRankingTable";

interface RankingTableProps {
  table: RankingTableInstance;
}

export function RankingTable({ table }: RankingTableProps) {
  const rows = table.getRowModel().rows;

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table
        aria-label="Cohorts ranked by variable availability"
        className="min-w-212.5 table-fixed"
      >
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow
              key={group.id}
              className="border-b-0 hover:bg-transparent"
            >
              {group.headers.map((header) => (
                <TableHead
                  key={header.id}
                  colSpan={header.colSpan}
                  className={cn(
                    "bg-brand px-4 py-3 font-semibold text-white",
                    header.column.id === "missing" && "w-[32%]",
                  )}
                >
                  {header.isPlaceholder ? null : (
                    <table.FlexRender header={header} />
                  )}
                </TableHead>
              ))}
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
                No cohorts matched the selected variables.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                {row.getAllCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      "px-4 py-3 align-top",
                      cell.column.id === "missing" &&
                        "whitespace-normal wrap-anywhere",
                    )}
                  >
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
