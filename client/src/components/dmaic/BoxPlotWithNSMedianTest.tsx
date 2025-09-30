import React from 'react';
import Plot from 'react-plotly.js';

interface BoxPlotWithNSMedianTestProps {
  data: number[][];
  ctqName: string;
  medians: number[];
  Ha: string;
  title?: string;
  pValue: number;
  alphalevel: string;
  descriptions?: (string | undefined)[];
  df1?: number;
}

export default function BoxPlotWithNSMedianTest({
  data,
  ctqName,
  medians,
  Ha,
  title,
  pValue,
  alphalevel,
  descriptions,
  df1,
}: BoxPlotWithNSMedianTestProps): JSX.Element {
  if (!data || data.length === 0 || data.some(dataset => !dataset || dataset.length === 0)) {
    return <div>Not enough data available for box plot and medians visualization</div>;
  }
  
  const boldTitle = `<b>${title}</b>`;

  // Calculate y-axis positioning for badge
  const allValues = data.flat();
  const yExtraScale = (Math.max(...allValues) - Math.min(...allValues)) / 5;  
  const yBadge = (Math.max(...allValues) - Math.min(...allValues)) + Math.min(...allValues) + yExtraScale;

  // Build hypothesis text for multiple samples
  let BadgetextH0 = 'H0: (η1 = η2 = ... = ηn)';
  let Badgetext = BadgetextH0 + '<br>Ha: At least one median is different';
  
  if (df1 !== undefined) {
    Badgetext += `<br>df: ${df1}`;
  }
  
  if (pValue < parseFloat(alphalevel)) {
    Badgetext = Badgetext + `<br>Result => Reject H0. Accept Ha (P-Value ${pValue.toFixed(4)} < ${alphalevel})`;
  } else {
    Badgetext = Badgetext + `<br>Result => Accept H0. Reject Ha (P-Value ${pValue.toFixed(4)} ≥ ${alphalevel})`;
  }

  // Generate colors for different datasets
  const colors = [
    '#1e3a8a', '#dc2626', '#059669', '#d97706', '#7c3aed', 
    '#be185d', '#0891b2', '#65a30d', '#c2410c', '#9333ea'
  ];

  // Create plot data for each dataset
  const plotData: any[] = [];
  
  // Add box plots and median markers for each dataset
  data.forEach((dataset, index) => {
    const description = descriptions?.[index] || `Dataset #${index + 1}`;
    const color = colors[index % colors.length];
    
    // Add median marker
    plotData.push({
      x: [index],
      y: [medians[index]],
      type: 'scatter',
      mode: 'markers',
      name: `M${index + 1}`,
      marker: { color: 'green', size: 8, symbol: 'diamond' },
      showlegend: false,
    });
    
    // Add box plot
    plotData.push({
      x: new Array(dataset.length).fill(index), // Explicit x positioning
      y: dataset,
      type: 'box',
      name: description,
      boxpoints: 'outliers',
      marker: { color: color, symbol: 'star' },
      line: { color: color },
      fillcolor: color + '40', // Add transparency
      boxmean: false,
    });
  });

  // Add connection lines between medians
  if (medians.length > 1) {
    plotData.push({
      x: Array.from({ length: medians.length }, (_, i) => i),
      y: medians,
      type: 'scatter',
      mode: 'lines',
      name: 'Median Connection',
      line: { 
        color: 'green', 
        width: 1,
        dash: 'dash'
      },
      showlegend: false,
    });
  }

  // Create tick labels for x-axis
  const tickvals = Array.from({ length: data.length }, (_, i) => i);
  const ticktext = data.map((_, index) => {
    const description = descriptions?.[index] || `Dataset #${index + 1}`;
    return `${description}`;
  });

  // Create annotations for medians
  const annotations: any[] = [];
  
  // Add median value annotations
  medians.forEach((median, index) => {
    annotations.push({
      x: index,
      y: median,
      text: `η${index + 1}`,
      showarrow: false,
      font: { size: 12, color: 'red' },
      xanchor: 'center',
      yanchor: 'bottom',
      yshift: 5,
    });
  });

  // Add badge annotation
  annotations.push({
    x: data.length / 2,
    y: yBadge,
    text: Badgetext,
    showarrow: false,
    font: { size: 12, color: 'black' },
    xanchor: 'center',
    yanchor: 'middle'
  });

  return (
    <div className="w-full h-[400px]" data-testid="boxplot-median-display">
      <Plot
        data={plotData}
        layout={{
          title: {text: boldTitle, font: { size: 16} },
          height: 360,
          width: Math.max(860, data.length * 150), // Dynamic width based on number of datasets
          margin: { l: 70, r: 160, t: 30, b: 60 },
          xaxis: {
            tickvals: tickvals,
            ticktext: ticktext,
            range: [-0.5, data.length - 0.5],
            showline: true,
            zeroline: false,
            tickfont: { size: 8 }
          },
          yaxis: { 
            title: {
              text: ctqName
            },
            showline: true,
          },
          shapes: [], // No shapes needed for boxplots only
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
            filename: 'Multiple-sample-Median-test',
            height: 500,
            width: Math.max(700, data.length * 150),
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
