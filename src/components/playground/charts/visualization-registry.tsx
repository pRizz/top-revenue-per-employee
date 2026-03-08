import type { MonetaryAmount } from "@/types/company-data";
import type { JSX } from "solid-js";

import { BubbleChart } from "@/components/playground/charts/bubble-chart";

export interface ComparisonPoint {
  label: string;
  marketCapUsd: number;
  revenuePerEmployeeUsd: number;
  employeeCount: number;
  marketCap: MonetaryAmount;
  revenue: MonetaryAmount;
}

interface VisualizationDefinition {
  id: string;
  label: string;
  render: (points: ComparisonPoint[]) => JSX.Element;
}

export const visualizationRegistry: VisualizationDefinition[] = [
  {
    id: "bubble",
    label: "Bubble (market cap vs revenue / employee)",
    render: (points) => (
      <BubbleChart
        points={points.map((point) => ({
          label: point.label,
          x: point.marketCapUsd,
          y: point.revenuePerEmployeeUsd,
          size: point.employeeCount,
        }))}
      />
    ),
  },
];
