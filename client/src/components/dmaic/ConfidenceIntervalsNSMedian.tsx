import React from 'react';
import Plot from 'react-plotly.js';

interface ConfidenceIntervalsNSMedianProps {
  ctqName: string;
  medians: number[];
  confidenceIntervals: Array<{
    lower: number;
    upper: number;
  }>;
  descriptions?: (string | undefined)[];
  title?: string;
  pValue: number;
  alphalevel: string;
  Ha: string;
}

export default function ConfidenceIntervalsNSMedian({
  ctqName,
  medians,
  confidenceIntervals,
  descriptions,
  title,
  pValue,
  alphalevel,
  Ha,
}: ConfidenceIntervalsNSMedianProps) {
  
  const boldTitle = title ? `<b>${title}</b>` : `<b>Confidence Intervals for Multiple Sample Medians</b>`;

  // Calculate min and max y values for positioning the badge
  const allYValues = [
    ...medians,
    ...confidenceIntervals.flatMap(ci => [ci.lower, ci.upper])
  ].filter(value => isFinite(value));
  
  const yMin = Math.min(...allYValues);
  const yMax = Math.max(...allYValues);
  const yRange = yMax - yMin;
  const yBadge = yMax + (yRange * 0.20);

  // Create badge text
  
  let Badgetext = '<br>H0: η1 = η2 = ... = ηn';
  Badgetext += '<br>Ha: At least one median is different';
  //let Badgetext = `<b>α = ${alphalevel}</b>`;
  //let Badgetext = textequalityofvariances + `<br>Ha: ${Ha}`;
  //Badgetext += `<br>` + textequalityofvariances;
  
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
    isFinite(ci.upper) ? ci.upper - medians[index] : 0
  );
  const errorLower = confidenceIntervals.map((ci, index) => 
    isFinite(ci.lower) ? medians[index] - ci.lower : 0
  );

  // Create x-axis positions
  const xPositions = Array.from({ length: medians.length }, (_, i) => i);
  
  // Create tick labels for x-axis
  const ticktext = medians.map((_, index) => {
    const description = descriptions?.[index] || `Dataset #${index + 1}`;
    return `${description}`;
  });

  // Create the main confidence intervals trace
  const plotData = [
    {
      x: xPositions,
      y: medians,
      type: 'scatter' as const,
      mode: 'markers' as const,
      name: 'Confidence Intervals',
      marker: { 
        color: colors.slice(0, medians.length),
        size: 10,
        symbol: 'diamond',
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

  // Add connection lines between medians if there are multiple medians
  if (medians.length > 1) {
    plotData.push({
      x: xPositions,
      y: medians,
      type: 'scatter',
      mode: 'lines',
      name: 'Median Connection',
      line: { 
        color: 'green', 
        width: 2,
        dash: 'dash'
      },
      showlegend: false,
    } as any);
  }

  // Add median value annotations
  const annotations: any[] = [];
  
  medians.forEach((median, index) => {
    annotations.push({
      x: index,
      y: median,
      text: `η${index + 1}`,
      showarrow: false,
      font: { size: 12, color: 'green', weight: 'bold' },
      xanchor: 'center',
      yanchor: 'bottom',
      yshift: 8,
    });
  });

  // Add badge annotation
  annotations.push({
    x: medians.length / 2,
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
          width: Math.max(860, medians.length * 10),
          margin: { l: 70, r: 160, t: 30, b: 60 },
          xaxis: {
            tickvals: xPositions,
            ticktext: ticktext,
            range: [-0.5, medians.length - 0.5],
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
            filename: 'Confidence-Intervals-Multiple-Sample-Medians',
            height: 500,
            width: Math.max(600, medians.length * 120),
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