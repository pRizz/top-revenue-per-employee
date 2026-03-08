import { createMemo, createSignal } from "solid-js";
import { ArrowDownUp } from "lucide-solid";

import {
  describeMoneyNormalization,
  formatComparableMoney,
  formatInteger,
  formatIsoDate,
  formatReportedMoney,
} from "@/lib/formatters";
import type {
  CompanyRecord,
  MetricRecord,
  MonetaryAmount,
} from "@/types/company-data";

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

function MoneyCell(props: {
  maybeMoney: MonetaryAmount | null | undefined;
  emphasize?: boolean;
}) {
  const money = () => props.maybeMoney ?? null;
  const normalizationLabel = () => describeMoneyNormalization(money());
  const showReportedAmount = () =>
    money() !== null &&
    (money()!.reportedCurrency !== "USD" ||
      money()!.normalizationMethod === "unavailable");

  return (
    <div class={`flex flex-col gap-1 ${props.emphasize ? "font-semibold text-primary" : ""}`}>
      <span>{formatComparableMoney(money())}</span>
      {showReportedAmount() ? (
        <span class="text-xs font-normal text-muted-foreground">
          Reported: {formatReportedMoney(money())}
        </span>
      ) : null}
      {normalizationLabel() ? (
        <span class="text-xs font-normal text-muted-foreground">
          {normalizationLabel()}
        </span>
      ) : null}
    </div>
  );
}

function revenuePerEmployeeMoney(
  maybeMetric: MetricRecord | undefined,
): MonetaryAmount | null {
  const maybeRevenuePerEmployeeUsd = maybeMetric?.revenuePerEmployeeUsd;
  if (maybeRevenuePerEmployeeUsd === null || maybeRevenuePerEmployeeUsd === undefined) {
    return null;
  }

  return {
    reportedAmount: maybeRevenuePerEmployeeUsd,
    reportedCurrency: "USD",
    usdAmount: maybeRevenuePerEmployeeUsd,
    normalizationMethod: "reported_usd",
  };
}

function periodSummary(maybeMetric: MetricRecord | undefined): string | null {
  if (!maybeMetric) {
    return null;
  }

  const maybePeriodEnd = maybeMetric.periodEnd
    ? `ended ${formatIsoDate(maybeMetric.periodEnd)}`
    : null;

  return maybePeriodEnd
    ? `${maybeMetric.displayLabel} · ${maybePeriodEnd}`
    : maybeMetric.displayLabel;
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
            <th class="px-4 py-3">Sources</th>
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
                {periodSummary(row.metric) ? (
                  <p class="text-xs text-muted-foreground">
                    {periodSummary(row.metric)}
                  </p>
                ) : null}
              </td>
              <td class="px-4 py-3">
                <MoneyCell maybeMoney={row.metric?.marketCap} />
              </td>
              <td class="px-4 py-3">
                <MoneyCell maybeMoney={row.metric?.revenue} />
              </td>
              <td class="px-4 py-3">{formatInteger(row.metric?.employeeCount ?? null)}</td>
              <td class="px-4 py-3">
                <MoneyCell maybeMoney={revenuePerEmployeeMoney(row.metric)} emphasize />
              </td>
              <td class="px-4 py-3 text-xs text-muted-foreground">
                <div class="flex flex-col gap-1">
                  {row.metric?.sources.revenue ? (
                    <a
                      href={row.metric.sources.revenue.url}
                      target="_blank"
                      rel="noreferrer"
                      class="inline-flex w-fit rounded bg-muted px-2 py-1 hover:bg-accent"
                      title={`Revenue source: ${row.metric.sources.revenue.provider}`}
                    >
                      Revenue: {row.metric.sources.revenue.provider}
                    </a>
                  ) : (
                    <span class="inline-flex w-fit rounded bg-muted px-2 py-1">Revenue: —</span>
                  )}

                  {row.metric?.sources.employeeCount ? (
                    <a
                      href={row.metric.sources.employeeCount.url}
                      target="_blank"
                      rel="noreferrer"
                      class="inline-flex w-fit rounded bg-muted px-2 py-1 hover:bg-accent"
                      title={`Employee source: ${row.metric.sources.employeeCount.provider}`}
                    >
                      Employees: {row.metric.sources.employeeCount.provider}
                    </a>
                  ) : (
                    <span class="inline-flex w-fit rounded bg-muted px-2 py-1">Employees: —</span>
                  )}

                  {row.metric?.flags.includes("market_cap_snapshot_fallback") ? (
                    <span class="inline-flex w-fit rounded bg-muted px-2 py-1">
                      Market cap: snapshot fallback
                    </span>
                  ) : null}
                  {row.metric?.flags.includes("employee_snapshot_fallback") ? (
                    <span class="inline-flex w-fit rounded bg-muted px-2 py-1">
                      Employees: snapshot fallback
                    </span>
                  ) : null}
                  {row.metric?.bucketType === "ttm" ? (
                    <span class="inline-flex w-fit rounded bg-muted px-2 py-1">
                      Revenue period: TTM
                    </span>
                  ) : null}
                  {row.metric?.flags.includes("revenue_fx_converted") ? (
                    <span class="inline-flex w-fit rounded bg-muted px-2 py-1">
                      Revenue: FX converted
                    </span>
                  ) : null}
                  {row.metric?.revenue?.fx?.coverageStatus === "partial" ? (
                    <span class="inline-flex w-fit rounded bg-muted px-2 py-1">
                      Revenue: partial FX coverage
                    </span>
                  ) : null}
                  {row.metric?.flags.includes("market_cap_fx_converted") ? (
                    <span class="inline-flex w-fit rounded bg-muted px-2 py-1">
                      Market cap: FX converted
                    </span>
                  ) : null}
                  {row.metric?.flags.includes("annual_revenue_cross_source_mismatch") ? (
                    <span class="inline-flex w-fit rounded bg-muted px-2 py-1">
                      Revenue: source mismatch
                    </span>
                  ) : null}
                  {row.metric?.flags.includes("revenue_currency_conversion_unavailable") ? (
                    <span class="inline-flex w-fit rounded bg-muted px-2 py-1">
                      Revenue: conversion unavailable
                    </span>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
