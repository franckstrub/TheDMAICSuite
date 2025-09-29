import React from 'react';
import Plot from 'react-plotly.js';

interface ConfidenceIntervalsNSMeanProps {
  ctqName: string;
  means: number[];
  confidenceIntervals: Array<{
    lower: number;
    upper: number;
  }>;
  descriptions?: (string | undefined)[];
  title?: string;
  pValue: number;
  alphalevel: string;
  equalVariances: boolean;
  Ha: string;
}

export default function ConfidenceIntervalsNSMean({
  ctqName,
  means,
  confidenceIntervals,
  descriptions,
  title,
  pValue,
  alphalevel,
  equalVariances,
  Ha,
}: ConfidenceIntervalsNSMeanProps) {
  
  const boldTitle = title ? `<b>${title}</b>` : `<b>Confidence Intervals for Multiple Sample Means</b>`;

  // Calculate min and max y values for positioning the badge
  const allYValues = [
    ...means,
    ...confidenceIntervals.flatMap(ci => [ci.lower, ci.upper])
  ].filter(value => isFinite(value));
  
  const yMin = Math.min(...allYValues);
  const yMax = Math.max(...allYValues);
  const yRange = yMax - yMin;
  const yBadge = yMax + (yRange * 0.15);

  // Create badge text
  let Badgetext = `<b>α = ${alphalevel}</b>`;
  Badgetext += `<br>Ha: ${Ha}`;
  Badgetext += `<br>Equal Variances: ${equalVariances ? 'Yes' : 'No'}`;
  
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
    isFinite(ci.upper) ? ci.upper - means[index] : 0
  );
  const errorLower = confidenceIntervals.map((ci, index) => 
    isFinite(ci.lower) ? means[index] - ci.lower : 0
  );

  // Create x-axis positions
  const xPositions = Array.from({ length: means.length }, (_, i) => i);
  
  // Create tick labels for x-axis
  const ticktext = means.map((_, index) => {
    const description = descriptions?.[index] || `Dataset #${index + 1}`;
    return `${description}`;
  });

  // Create the main confidence intervals trace
  const plotData = [
    {
      x: xPositions,
      y: means,
      type: 'scatter' as const,
      mode: 'markers' as const,
      name: 'Confidence Intervals',
      marker: { 
        color: colors.slice(0, means.length),
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

  // Add mean value annotations
  const annotations: any[] = [];
  
  means.forEach((mean, index) => {
    annotations.push({
      x: index,
      y: mean,
      text: `μ${index + 1}`,
      showarrow: false,
      font: { size: 12, color: 'red', weight: 'bold' },
      xanchor: 'center',
      yanchor: 'bottom',
      yshift: 8,
    });
  });

  // Add badge annotation
  annotations.push({
    x: means.length / 2,
    y: yBadge,
    text: Badgetext,
    showarrow: false,
    font: { size: 12, color: 'black' },
    xanchor: 'center',
    yanchor: 'middle'
  });

  return (
    <div className="w-full h-[400px]" data-testid="confidence-intervals-display">
      <Plot
        data={plotData}
        layout={{
          title: { text: boldTitle, font: { size: 16 } },
          height: 360,
          width: Math.max(600, means.length * 120),
          margin: { l: 70, r: 160, t: 30, b: 60 },
          xaxis: {
            tickvals: xPositions,
            ticktext: ticktext,
            range: [-0.5, means.length - 0.5],
            showline: true,
            zeroline: false,
            tickfont: { size: 10 }
          },
          yaxis: { 
            title: {
              text: ctqName
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
            filename: 'Confidence-Intervals-Multiple-Sample-Means',
            height: 500,
            width: Math.max(600, means.length * 120),
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