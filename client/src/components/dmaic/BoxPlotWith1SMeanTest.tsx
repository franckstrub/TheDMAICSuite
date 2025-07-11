import React from 'react';
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Line,
  Scatter,
  ComposedChart
} from 'recharts';

interface BoxPlotWith1SMeanTestProps {
  data: number[];
  h0Value: number;
  confidenceInterval: [number, number];
  title?: string;
}

export function BoxPlotWith1SMeanTest({
  data,
  h0Value,
  confidenceInterval,
  title
} : BoxPlotWith1SMeanTestProps): JSX.Element {

  if (!data || data.length === 0) {
    return <div>No data available for visualization</div>;
  }

  // Calculate statistics for box plot
  const sortedData = [...data].sort((a, b) => a - b);
  const q1 = quantile(sortedData, 0.25);
  const median = quantile(sortedData, 0.5);
  const q3 = quantile(sortedData, 0.75);
  const iqr = q3 - q1;
  const min = Math.max(sortedData[0], q1 - 1.5 * iqr);
  const max = Math.min(sortedData[sortedData.length - 1], q3 + 1.5 * iqr);
  const outliers = sortedData.filter(d => d < min || d > max);

  // Prepare data for Recharts
  const boxPlotData = [{
    name: 'Data',
    min,
    q1,
    median,
    q3,
    max,
    outliers
  }];

  return (
    <div className="w-full h-[400px]">
      <h3 className="text-center font-medium mb-2">{title}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={boxPlotData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />

          {/* Box (using Bars) */}
          <Bar dataKey="q3" stackId="a" fill="none" />
          <Bar dataKey="median" stackId="a" fill="#1e3a8a" />
          <Bar dataKey="q1" stackId="a" fill="none" />

          {/* Whiskers (using Lines) */}
          <Line
            dataKey="min"
            type="monotone"
            stroke="#1e3a8a"
            dot={false}
            activeDot={false}
          />
          <Line
            dataKey="max"
            type="monotone"
            stroke="#1e3a8a"
            dot={false}
            activeDot={false}
          />

          {/* Outliers (using Scatter) */}
          <Scatter
            dataKey="outliers"
            fill="#ff0000"
            name="Outliers"
          />

          {/* H₀ reference line */}
          <ReferenceLine
            y={h0Value}
            stroke="red"
            strokeDasharray="5 5"
            label={{
              position: 'right',
              value: 'H₀',
              fill: 'red'
            }}
          />

          {/* Confidence interval */}
          <ReferenceLine
            y={confidenceInterval[0]}
            stroke="green"
            label={{
              position: 'right',
              value: 'CI Lower',
              fill: 'green'
            }}
          />
          <ReferenceLine
            y={confidenceInterval[1]}
            stroke="green"
            label={{
              position: 'right',
              value: 'CI Upper',
              fill: 'green'
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// Helper function to calculate quantiles
function quantile(values: number[], q: number): number {
  const pos = (values.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (values[base + 1] !== undefined) {
    return values[base] + rest * (values[base + 1] - values[base]);
  }
  return values[base];
}

// Default export
export default BoxPlotWith1SMeanTest;