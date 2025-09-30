import React from 'react';
import Plot from 'react-plotly.js';

interface ConfidenceIntervalsNSVarianceProps {
  ctqName: string;
  stdevs: number[];
  confidenceIntervals: Array<{
    lower: number;
    upper: number;
  }>;
  descriptions?: (string | undefined)[];
  title?: string;
  pValue: number;
  alphalevel: string;
  Ha: string;
  df1?: number;
  df2?: number;
}

export default function ConfidenceIntervalsNSVariance({
  ctqName,
  stdevs,
  confidenceIntervals,
  descriptions,
  title,
  pValue,
  alphalevel,
  Ha,
  df1,
  df2,
}: ConfidenceIntervalsNSVarianceProps) {
  
  const boldTitle = title ? `<b>${title}</b>` : `<b>Confidence Intervals for Multiple Sample Variances</b>`;

  // Calculate min and max y values for positioning the badge
  const allYValues = [
    ...stdevs,
    ...confidenceIntervals.flatMap(ci => [ci.lower, ci.upper])
  ].filter(value => isFinite(value));
  
  const yMin = Math.min(...allYValues);
  const yMax = Math.max(...allYValues);
  const yRange = yMax - yMin;
  const yBadge = yMax + (yRange * 0.20);

  // Create badge text for variance test
  let Badgetext = 'H0: σ1² = σ2² = ... = σn²';
  Badgetext += '<br>Ha: At least one variance is different';
  
  if (df1 !== undefined && df2 !== undefined) {
    Badgetext += `<br>df1: ${df1}, df2: ${df2}`;
  }
  
  if (pValue < parseFloat(alphalevel)) {
    Badgetext += `<br>Result => Reject H0. Accept Ha (P-Value ${pValue.toFixed(4)} < ${alphalevel})`;
  } else {
    Badgetext += `<br>Result => Accept H0. Reject Ha (P-Value ${pValue.toFixed(4)} ≥ ${alphalevel})`;
  }

  // Generate colors for different datasets
  const colors = [
    '#1e3a8a', '#dc2626', '#059669', '#d97706', '#7c3aed', 
    '#be185d', '#0891b2', '#65a30d', '#c2410c', '#9333ea'
  ];

  // Create error arrays for asymmetric error bars
  const errorUpper = confidenceIntervals.map((ci, index) => 
    isFinite(ci.upper) ? ci.upper - stdevs[index] : 0
  );
  const errorLower = confidenceIntervals.map((ci, index) => 
    isFinite(ci.lower) ? stdevs[index] - ci.lower : 0
  );

  // Create x-axis positions
  const xPositions = Array.from({ length: stdevs.length }, (_, i) => i);
  
  // Create tick labels for x-axis
  const ticktext = stdevs.map((_, index) => {
    const description = descriptions?.[index] || `Dataset #${index + 1}`;
    return `${description}`;
  });

  // Create the main confidence intervals trace
  const plotData = [
    {
      x: xPositions,
      y: stdevs,
      type: 'scatter' as const,
      mode: 'markers' as const,
      name: 'Confidence Intervals',
      marker: { 
        color: colors.slice(0, stdevs.length),
        size: 10,
        symbol: 'circle',
        line: { color: 'black', width: 1 }
      },
      error_y: {
        type: 'data' as const,
        symmetric: false,
        array: errorUpper,
        arrayminus: errorLower,
        color: 'black',
        thickness: 2,
        width: 3,
      },
      showlegend: false,
    }
  ];

  // Add connection lines between stdevs if there are multiple stdevs
  if (stdevs.length > 1) {
    plotData.push({
      x: xPositions,
      y: stdevs,
      type: 'scatter',
      mode: 'lines',
      name: 'StDev Connection',
      line: { 
        color: 'red', 
        width: 2,
        dash: 'dash'
      },
      showlegend: false,
    } as any);
  }

  // Add standard deviation value annotations
  const annotations: any[] = [];
  
  stdevs.forEach((stdev, index) => {
    annotations.push({
      x: index,
      y: stdev,
      text: `σ${index + 1}`,
      showarrow: false,
      font: { size: 12, color: 'red', weight: 'bold' },
      xanchor: 'center',
      yanchor: 'bottom',
      yshift: 8,
    });
  });

  // Add badge annotation
  annotations.push({
    x: stdevs.length / 2,
    y: yBadge,
    text: Badgetext,
    showarrow: false,
    font: { size: 12, color: 'black' },
    xanchor: 'center',
    yanchor: 'middle'
  });

  return (
    <div className="w-full h-[400px]" data-testid="confidence-intervals-variance-display">
      <Plot
        data={plotData}
        layout={{
          title: { text: boldTitle, font: { size: 16 } },
          height: 360,
          width: Math.max(860, stdevs.length * 10),
          margin: { l: 70, r: 160, t: 30, b: 60 },
          xaxis: {
            tickvals: xPositions,
            ticktext: ticktext,
            range: [-0.5, stdevs.length - 0.5],
            showline: true,
            zeroline: false,
            tickfont: { size: 10 }
          },
          yaxis: { 
            title: {
              text: `${ctqName} (Std Dev)`
            },
            showline: true,
          },
          annotations: annotations,
          showlegend: false,
        }}
        config={{ 
          responsive: true,
          displayModeBar: true,
          displaylogo: false,
          modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
          toImageButtonOptions: {
            format: 'png',
            filename: 'Confidence-Intervals-Multiple-Sample-Variances',
            height: 500,
            width: Math.max(600, stdevs.length * 120),
            scale: 1
          },
        }}
        style={{
          width: "100%", 
          height: "100%",
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '10px'
        }}
      />
    </div>
  );
}
