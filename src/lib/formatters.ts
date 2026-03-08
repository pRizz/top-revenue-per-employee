import type { MonetaryAmount } from "@/types/company-data";

export function formatUsd(maybeValue: number | null): string {
  if (maybeValue === null || Number.isNaN(maybeValue)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: maybeValue >= 1_000_000_000 ? "compact" : "standard",
    maximumFractionDigits: maybeValue >= 1_000_000_000 ? 2 : 0,
  }).format(maybeValue);
}

export function formatInteger(maybeValue: number | null): string {
  if (maybeValue === null || Number.isNaN(maybeValue)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    maybeValue,
  );
}

function formatCurrencyValue(
  amount: number,
  currency: string,
  maximumFractionDigits: number,
): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      currencyDisplay: "code",
      notation: amount >= 1_000_000_000 ? "compact" : "standard",
      maximumFractionDigits:
        amount >= 1_000_000_000 ? Math.min(maximumFractionDigits, 2) : maximumFractionDigits,
    }).format(amount);
  } catch {
    return `${formatInteger(amount)} ${currency}`;
  }
}

export function formatReportedMoney(maybeMoney: MonetaryAmount | null): string {
  if (!maybeMoney) {
    return "—";
  }

  return formatCurrencyValue(
    maybeMoney.reportedAmount,
    maybeMoney.reportedCurrency,
    2,
  );
}

export function formatComparableMoney(maybeMoney: MonetaryAmount | null): string {
  if (!maybeMoney || maybeMoney.usdAmount === null) {
    return "—";
  }

  return formatUsd(maybeMoney.usdAmount);
}

export function describeMoneyNormalization(
  maybeMoney: MonetaryAmount | null,
): string | null {
  if (!maybeMoney) {
    return null;
  }

  if (maybeMoney.normalizationMethod === "snapshot_fallback") {
    return "snapshot fallback";
  }

  if (maybeMoney.normalizationMethod === "reported_usd") {
    return maybeMoney.reportedCurrency === "USD" ? null : "reported in USD";
  }

  if (maybeMoney.normalizationMethod === "unavailable") {
    return "USD normalization unavailable";
  }

  const aggregationLabel =
    maybeMoney.fx?.aggregation === "month_end_average"
      ? "month-end average FX"
      : maybeMoney.fx?.aggregation === "fixed_peg"
        ? "fixed USD peg"
        : "spot FX";

  return `converted via ${aggregationLabel}`;
}
