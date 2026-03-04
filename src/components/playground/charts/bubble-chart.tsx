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
  const palette = [
    "hsl(221.2 83.2% 53.3%)",
    "hsl(262.1 83.3% 57.8%)",
    "hsl(142.1 76.2% 36.3%)",
    "hsl(24.6 95% 53.1%)",
    "hsl(346.8 77.2% 49.8%)",
    "hsl(199.4 89.1% 48.2%)",
    "hsl(47.9 95.8% 53.1%)",
    "hsl(173.4 80.4% 40%)",
    "hsl(280.8 89.5% 60.8%)",
    "hsl(0 84.2% 60.2%)",
  ];

  return (
    <div class="overflow-x-auto rounded-xl border bg-card p-4 shadow-soft">
      <svg viewBox={`0 0 ${width} ${height}`} class="w-full min-w-[680px]">
        <rect x="0" y="0" width={width} height={height} fill="white" />
        {props.points.map((point, index) => {
          const normalizedX = normalize(xValues, point.x);
          const normalizedY = normalize(yValues, point.y);
          const normalizedSize = normalize(sizeValues, point.size);
          const cx = padding + normalizedX * (width - padding * 2);
          const cy = height - padding - normalizedY * (height - padding * 2);
          const radius = 8 + normalizedSize * 20;
          const color = palette[index % palette.length];

          return (
            <>
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill={`${color}66`}
                stroke={color}
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
      <div class="mt-3 flex flex-wrap gap-2 text-xs">
        {props.points.map((point, index) => (
          <span class="inline-flex items-center gap-1 rounded bg-muted px-2 py-1">
            <span
              class="inline-block h-2.5 w-2.5 rounded-full"
              style={{ "background-color": palette[index % palette.length] }}
            />
            {point.label}
          </span>
        ))}
      </div>
    </div>
  );
}
