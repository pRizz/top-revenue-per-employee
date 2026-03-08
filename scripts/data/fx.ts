import { DATA_CONFIG } from "./config";
import type {
  CurrencyCode,
  MonetaryAmount,
  MoneyNormalizationMethod,
} from "@/types/company-data";

interface EcbSeriesPoint {
  date: string;
  value: number;
}

interface SpotFxQuote {
  provider: string;
  rate: number;
  asOf: string;
}

interface FxConversionQuote extends SpotFxQuote {
  baseCurrency: CurrencyCode;
  aggregation: "point_in_time" | "month_end_average" | "fixed_peg";
  rangeStart?: string;
  rangeEnd?: string;
  sampleCount?: number;
  expectedSampleCount?: number;
  coverageStatus?: "complete" | "partial";
}

const FIXED_USD_PER_CURRENCY: Partial<Record<CurrencyCode, number>> = {
  SAR: 1 / 3.75,
};

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function earliestFxDate(): string {
  return `${Math.min(...DATA_CONFIG.annualYears)}-01-01`;
}

function normalizeCurrencyCode(currency: string): CurrencyCode {
  return currency.trim().toUpperCase();
}

function lowerCurrencyCode(currency: string): string {
  return normalizeCurrencyCode(currency).toLowerCase();
}

function monthEndDatesBetween(startDate: string, endDate: string): string[] {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || start > end) {
    return [];
  }

  const dates: string[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));

  while (cursor <= end) {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth();
    const monthEnd = new Date(Date.UTC(year, month + 1, 0));
    if (monthEnd >= start && monthEnd <= end) {
      dates.push(toIsoDate(monthEnd));
    }

    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return dates;
}

function uniqueProviders(quotes: SpotFxQuote[]): string {
  const providers = [...new Set(quotes.map((quote) => quote.provider))];
  return providers.join(" + ");
}

function parseEcbSeriesPayload(payload: unknown): EcbSeriesPoint[] {
  if (
    !payload ||
    typeof payload !== "object" ||
    !("dataSets" in payload) ||
    !("structure" in payload)
  ) {
    return [];
  }

  const maybeDataSets = payload.dataSets;
  const maybeStructure = payload.structure;
  if (!Array.isArray(maybeDataSets) || maybeDataSets.length === 0) {
    return [];
  }

  const firstDataSet = maybeDataSets[0];
  if (
    !firstDataSet ||
    typeof firstDataSet !== "object" ||
    !("series" in firstDataSet)
  ) {
    return [];
  }

  const maybeSeries = firstDataSet.series;
  if (!maybeSeries || typeof maybeSeries !== "object") {
    return [];
  }

  const seriesKey = Object.keys(maybeSeries)[0];
  if (!seriesKey) {
    return [];
  }

  const firstSeries = maybeSeries[seriesKey];
  if (
    !firstSeries ||
    typeof firstSeries !== "object" ||
    !("observations" in firstSeries)
  ) {
    return [];
  }

  const maybeObservations = firstSeries.observations;
  if (!maybeObservations || typeof maybeObservations !== "object") {
    return [];
  }

  if (
    !maybeStructure ||
    typeof maybeStructure !== "object" ||
    !("dimensions" in maybeStructure)
  ) {
    return [];
  }

  const maybeDimensions = maybeStructure.dimensions;
  if (
    !maybeDimensions ||
    typeof maybeDimensions !== "object" ||
    !("observation" in maybeDimensions)
  ) {
    return [];
  }

  const maybeObservationDimensions = maybeDimensions.observation;
  if (!Array.isArray(maybeObservationDimensions) || maybeObservationDimensions.length === 0) {
    return [];
  }

  const maybeTimeDimension = maybeObservationDimensions[0];
  if (
    !maybeTimeDimension ||
    typeof maybeTimeDimension !== "object" ||
    !("values" in maybeTimeDimension)
  ) {
    return [];
  }

  const maybeTimeValues = maybeTimeDimension.values;
  if (!Array.isArray(maybeTimeValues)) {
    return [];
  }

  const points: EcbSeriesPoint[] = [];
  for (const [observationIndex, maybeObservation] of Object.entries(maybeObservations)) {
    const timeValue = maybeTimeValues[Number(observationIndex)];
    if (!timeValue || typeof timeValue !== "object" || !("id" in timeValue)) {
      continue;
    }

    const maybeDate = timeValue.id;
    if (typeof maybeDate !== "string") {
      continue;
    }

    if (!Array.isArray(maybeObservation) || typeof maybeObservation[0] !== "number") {
      continue;
    }

    points.push({
      date: maybeDate,
      value: maybeObservation[0],
    });
  }

  return points.sort((left, right) => left.date.localeCompare(right.date));
}

function seriesValueOnOrBefore(points: EcbSeriesPoint[], targetDate: string): number | null {
  let matchedValue: number | null = null;

  for (const point of points) {
    if (point.date > targetDate) {
      break;
    }

    matchedValue = point.value;
  }

  return matchedValue;
}

async function fetchJson(url: string): Promise<unknown | null> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": DATA_CONFIG.userAgent,
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    return null;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  return JSON.parse(text) as unknown;
}

interface CurrencyApiUsdSnapshot {
  date: string;
  usd: Record<string, number>;
}

function parseCurrencyApiSnapshot(payload: unknown): CurrencyApiUsdSnapshot | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  if (!("date" in payload) || !("usd" in payload)) {
    return null;
  }

  const { date, usd } = payload as {
    date?: unknown;
    usd?: unknown;
  };

  if (typeof date !== "string" || !usd || typeof usd !== "object") {
    return null;
  }

  return {
    date,
    usd: usd as Record<string, number>,
  };
}

export class FxRateService {
  private readonly ecbSeriesPromiseByCurrency = new Map<CurrencyCode, Promise<EcbSeriesPoint[]>>();
  private readonly currencyApiSnapshotPromiseByDate = new Map<string, Promise<CurrencyApiUsdSnapshot | null>>();
  private readonly usedQuotes = new Map<string, FxConversionQuote>();

  async toComparableMoney(
    reportedAmount: number,
    reportedCurrency: CurrencyCode,
    mode: "point_in_time" | "month_end_average",
    context: {
      date?: string;
      rangeStart?: string;
      rangeEnd?: string;
    },
  ): Promise<MonetaryAmount> {
    const currency = normalizeCurrencyCode(reportedCurrency);

    if (!Number.isFinite(reportedAmount) || reportedAmount <= 0) {
      return {
        reportedAmount,
        reportedCurrency: currency,
        usdAmount: null,
        normalizationMethod: "unavailable",
      };
    }

    if (currency === "USD") {
      return {
        reportedAmount,
        reportedCurrency: currency,
        usdAmount: reportedAmount,
        normalizationMethod: "reported_usd",
      };
    }

    const quote =
      mode === "point_in_time"
        ? await this.getPointInTimeQuote(currency, context.date ?? "")
        : await this.getMonthEndAverageQuote(
            currency,
            context.rangeStart ?? "",
            context.rangeEnd ?? "",
          );

    if (!quote) {
      return {
        reportedAmount,
        reportedCurrency: currency,
        usdAmount: null,
        normalizationMethod: "unavailable",
      };
    }

    this.usedQuotes.set(
      `${currency}:${quote.aggregation}:${quote.asOf}:${quote.rangeStart ?? ""}:${quote.rangeEnd ?? ""}`,
      quote,
    );

    const normalizationMethod: MoneyNormalizationMethod =
      currency === "USD" ? "reported_usd" : "fx_converted";

    return {
      reportedAmount,
      reportedCurrency: currency,
      usdAmount: reportedAmount * quote.rate,
      normalizationMethod,
      fx: {
        provider: quote.provider,
        quoteCurrency: "USD",
        rate: quote.rate,
        asOf: quote.asOf,
        aggregation: quote.aggregation,
        rangeStart: quote.rangeStart,
        rangeEnd: quote.rangeEnd,
        sampleCount: quote.sampleCount,
        expectedSampleCount: quote.expectedSampleCount,
        coverageStatus: quote.coverageStatus,
      },
    };
  }

  getUsageSnapshot(): FxConversionQuote[] {
    return [...this.usedQuotes.values()].sort((left, right) => {
      const leftKey = `${left.baseCurrency}:${left.provider}:${left.aggregation}:${left.asOf}:${left.rangeStart ?? ""}:${left.rangeEnd ?? ""}`;
      const rightKey = `${right.baseCurrency}:${right.provider}:${right.aggregation}:${right.asOf}:${right.rangeStart ?? ""}:${right.rangeEnd ?? ""}`;
      return leftKey.localeCompare(rightKey);
    });
  }

  private async getPointInTimeQuote(
    currency: CurrencyCode,
    date: string,
  ): Promise<FxConversionQuote | null> {
    if (!date) {
      return null;
    }

    const maybeFixedRate = FIXED_USD_PER_CURRENCY[currency];
    if (maybeFixedRate) {
      return {
        baseCurrency: currency,
        provider: "Fixed USD peg",
        rate: maybeFixedRate,
        asOf: date,
        aggregation: "fixed_peg",
        coverageStatus: "complete",
        sampleCount: 1,
        expectedSampleCount: 1,
      };
    }

    const maybeEcbRate = await this.getUsdPerCurrencyFromEcb(currency, date);
    if (maybeEcbRate) {
      return {
        baseCurrency: currency,
        provider: "ECB EXR",
        rate: maybeEcbRate.rate,
        asOf: maybeEcbRate.asOf,
        aggregation: "point_in_time",
        coverageStatus: "complete",
        sampleCount: 1,
        expectedSampleCount: 1,
      };
    }

    const maybeFallbackRate = await this.getUsdPerCurrencyFromCurrencyApi(currency, date);
    if (!maybeFallbackRate) {
      return null;
    }

    return {
      baseCurrency: currency,
      provider: maybeFallbackRate.provider,
      rate: maybeFallbackRate.rate,
      asOf: maybeFallbackRate.asOf,
      aggregation: "point_in_time",
      coverageStatus: "complete",
      sampleCount: 1,
      expectedSampleCount: 1,
    };
  }

  private async getMonthEndAverageQuote(
    currency: CurrencyCode,
    rangeStart: string,
    rangeEnd: string,
  ): Promise<FxConversionQuote | null> {
    const sampleDates = monthEndDatesBetween(rangeStart, rangeEnd);
    if (sampleDates.length === 0) {
      return null;
    }

    const quotes = (
      await Promise.all(sampleDates.map((sampleDate) => this.getPointInTimeQuote(currency, sampleDate)))
    ).filter((quote): quote is FxConversionQuote => quote !== null);

    if (quotes.length === 0) {
      return null;
    }

    const averageRate =
      quotes.reduce((sum, quote) => sum + quote.rate, 0) / quotes.length;

    return {
      baseCurrency: currency,
      provider: uniqueProviders(quotes),
      rate: averageRate,
      asOf: sampleDates[sampleDates.length - 1] ?? rangeEnd,
      aggregation: "month_end_average",
      rangeStart,
      rangeEnd,
      sampleCount: quotes.length,
      expectedSampleCount: sampleDates.length,
      coverageStatus: quotes.length === sampleDates.length ? "complete" : "partial",
    };
  }

  private async getUsdPerCurrencyFromEcb(
    currency: CurrencyCode,
    date: string,
  ): Promise<SpotFxQuote | null> {
    const usdPerEur = await this.getEcbEuroToCurrencyOnOrBefore("USD", date);
    if (usdPerEur === null) {
      return null;
    }

    if (currency === "EUR") {
      return {
        provider: "ECB EXR",
        rate: usdPerEur,
        asOf: date,
      };
    }

    const maybeCurrencyPerEur = await this.getEcbEuroToCurrencyOnOrBefore(
      currency,
      date,
    );
    if (maybeCurrencyPerEur === null || maybeCurrencyPerEur <= 0) {
      return null;
    }

    return {
      provider: "ECB EXR",
      rate: usdPerEur / maybeCurrencyPerEur,
      asOf: date,
    };
  }

  private async getEcbEuroToCurrencyOnOrBefore(
    currency: CurrencyCode,
    date: string,
  ): Promise<number | null> {
    if (currency === "EUR") {
      return 1;
    }

    const series = await this.getEcbSeries(currency);
    if (series.length === 0) {
      return null;
    }

    return seriesValueOnOrBefore(series, date);
  }

  private async getEcbSeries(currency: CurrencyCode): Promise<EcbSeriesPoint[]> {
    const normalizedCurrency = normalizeCurrencyCode(currency);
    const existingPromise = this.ecbSeriesPromiseByCurrency.get(normalizedCurrency);
    if (existingPromise) {
      return await existingPromise;
    }

    const nextPromise = (async () => {
      const url =
        `https://data-api.ecb.europa.eu/service/data/EXR/D.${normalizedCurrency}.EUR.SP00.A` +
        `?startPeriod=${earliestFxDate()}&endPeriod=${toIsoDate(new Date())}&format=jsondata`;
      const payload = await fetchJson(url);
      return parseEcbSeriesPayload(payload);
    })();

    this.ecbSeriesPromiseByCurrency.set(normalizedCurrency, nextPromise);
    return await nextPromise;
  }

  private async getUsdPerCurrencyFromCurrencyApi(
    currency: CurrencyCode,
    date: string,
  ): Promise<SpotFxQuote | null> {
    const snapshot = await this.getCurrencyApiSnapshot(date);
    if (!snapshot) {
      return null;
    }

    const maybeUnitsPerUsd = snapshot.usd[lowerCurrencyCode(currency)];
    if (!Number.isFinite(maybeUnitsPerUsd) || maybeUnitsPerUsd <= 0) {
      return null;
    }

    return {
      provider: "FawazAhmed Currency API",
      rate: 1 / maybeUnitsPerUsd,
      asOf: snapshot.date,
    };
  }

  private async getCurrencyApiSnapshot(
    date: string,
  ): Promise<CurrencyApiUsdSnapshot | null> {
    const existingPromise = this.currencyApiSnapshotPromiseByDate.get(date);
    if (existingPromise) {
      return await existingPromise;
    }

    const nextPromise = (async () => {
      const urls = [
        `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/currencies/usd.min.json`,
        `https://${date}.currency-api.pages.dev/v1/currencies/usd.min.json`,
      ];

      for (const url of urls) {
        const payload = await fetchJson(url);
        const snapshot = parseCurrencyApiSnapshot(payload);
        if (snapshot) {
          return snapshot;
        }
      }

      return null;
    })();

    this.currencyApiSnapshotPromiseByDate.set(date, nextPromise);
    return await nextPromise;
  }
}

export const __testing = {
  monthEndDatesBetween,
  parseCurrencyApiSnapshot,
  parseEcbSeriesPayload,
  seriesValueOnOrBefore,
};
