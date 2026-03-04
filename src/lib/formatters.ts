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
