import { createMemo, createSignal } from "solid-js";
import { ArrowDownUp } from "lucide-solid";

import { formatInteger, formatUsd } from "@/lib/formatters";
import type { CompanyRecord, MetricRecord } from "@/types/company-data";

type SortKey = "rank" | "marketCapUsd" | "revenueUsd" | "employeeCount" | "revenuePerEmployeeUsd";
type SortDirection = "asc" | "desc";

interface TableRow {
  company: CompanyRecord;
  metric: MetricRecord | undefined;
}

interface CompaniesTableProps {
  rows: TableRow[];
}

function numericValue(row: TableRow, key: SortKey): number {
  if (key === "rank") {
    return row.company.rank;
  }

  const maybeValue = row.metric?.[key] ?? null;
  return maybeValue === null ? Number.NEGATIVE_INFINITY : maybeValue;
}

export function CompaniesTable(props: CompaniesTableProps) {
  const [sortKey, setSortKey] = createSignal<SortKey>("revenuePerEmployeeUsd");
  const [sortDirection, setSortDirection] = createSignal<SortDirection>("desc");

  const sortedRows = createMemo(() => {
    const nextRows = [...props.rows];
    const directionMultiplier = sortDirection() === "asc" ? 1 : -1;

    nextRows.sort((left, right) => {
      const leftValue = numericValue(left, sortKey());
      const rightValue = numericValue(right, sortKey());
      if (leftValue === rightValue) {
        return left.company.rank - right.company.rank;
      }

      return (leftValue - rightValue) * directionMultiplier;
    });

    return nextRows;
  });

  const toggleSort = (nextSortKey: SortKey): void => {
    if (sortKey() === nextSortKey) {
      setSortDirection(sortDirection() === "desc" ? "asc" : "desc");
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection("desc");
  };

  return (
    <div class="overflow-hidden rounded-xl border bg-card shadow-soft">
      <table class="w-full border-collapse text-sm">
        <thead class="bg-muted">
          <tr class="text-left text-muted-foreground">
            <th class="px-4 py-3">Company</th>
            <th class="px-4 py-3">
              <button class="inline-flex items-center gap-1" onClick={() => toggleSort("marketCapUsd")}>
                Market cap
                <ArrowDownUp class="h-3 w-3" />
              </button>
            </th>
            <th class="px-4 py-3">
              <button class="inline-flex items-center gap-1" onClick={() => toggleSort("revenueUsd")}>
                Revenue
                <ArrowDownUp class="h-3 w-3" />
              </button>
            </th>
            <th class="px-4 py-3">
              <button class="inline-flex items-center gap-1" onClick={() => toggleSort("employeeCount")}>
                Employees
                <ArrowDownUp class="h-3 w-3" />
              </button>
            </th>
            <th class="px-4 py-3">
              <button class="inline-flex items-center gap-1" onClick={() => toggleSort("revenuePerEmployeeUsd")}>
                Revenue / employee
                <ArrowDownUp class="h-3 w-3" />
              </button>
            </th>
            <th class="px-4 py-3">Source</th>
          </tr>
        </thead>
        <tbody>
          {sortedRows().map((row) => (
            <tr class="border-t">
              <td class="px-4 py-3">
                <p class="font-medium">{row.company.name}</p>
                <p class="text-xs text-muted-foreground">
                  #{row.company.rank} · {row.company.symbol} · {row.company.country}
                </p>
              </td>
              <td class="px-4 py-3">{formatUsd(row.metric?.marketCapUsd ?? null)}</td>
              <td class="px-4 py-3">{formatUsd(row.metric?.revenueUsd ?? null)}</td>
              <td class="px-4 py-3">{formatInteger(row.metric?.employeeCount ?? null)}</td>
              <td class="px-4 py-3 font-semibold text-primary">
                {formatUsd(row.metric?.revenuePerEmployeeUsd ?? null)}
              </td>
              <td class="px-4 py-3 text-xs text-muted-foreground">
                {row.metric?.sources.revenue?.provider ?? "—"} /{" "}
                {row.metric?.sources.employeeCount?.provider ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
