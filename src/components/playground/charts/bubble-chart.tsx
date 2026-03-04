interface BubblePoint {
  label: string;
  x: number;
  y: number;
  size: number;
}

interface BubbleChartProps {
  points: BubblePoint[];
}

function normalize(values: number[], maybeValue: number): number {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) {
    return 0.5;
  }

  return (maybeValue - min) / (max - min);
}

export function BubbleChart(props: BubbleChartProps) {
  const width = 720;
  const height = 380;
  const padding = 40;

  if (props.points.length === 0) {
    return (
      <div class="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        Pick at least two companies with complete metrics for this bucket.
      </div>
    );
  }

  const xValues = props.points.map((point) => point.x);
  const yValues = props.points.map((point) => point.y);
  const sizeValues = props.points.map((point) => point.size);

  return (
    <div class="overflow-x-auto rounded-xl border bg-card p-4 shadow-soft">
      <svg viewBox={`0 0 ${width} ${height}`} class="w-full min-w-[680px]">
        <rect x="0" y="0" width={width} height={height} fill="white" />
        {props.points.map((point) => {
          const normalizedX = normalize(xValues, point.x);
          const normalizedY = normalize(yValues, point.y);
          const normalizedSize = normalize(sizeValues, point.size);
          const cx = padding + normalizedX * (width - padding * 2);
          const cy = height - padding - normalizedY * (height - padding * 2);
          const radius = 8 + normalizedSize * 20;

          return (
            <>
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill="hsl(221.2 83.2% 53.3% / 0.4)"
                stroke="hsl(221.2 83.2% 53.3%)"
                stroke-width="1.5"
              />
              <text x={cx + radius + 4} y={cy} font-size="11" fill="#111827">
                {point.label}
              </text>
            </>
          );
        })}
        <text x={width / 2} y={height - 8} text-anchor="middle" font-size="11">
          Market cap (USD)
        </text>
        <text
          x={16}
          y={height / 2}
          text-anchor="middle"
          font-size="11"
          transform={`rotate(-90, 16, ${height / 2})`}
        >
          Revenue per employee (USD)
        </text>
      </svg>
    </div>
  );
}
