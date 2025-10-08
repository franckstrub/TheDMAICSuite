// File: MultiVariChartFunctions.tsx
import React, { useEffect, useRef } from 'react';
import Plot from 'react-plotly.js';

export interface DataPoint {
  factor1: string;
  factor2: string;
  factor3: string | null;
  response: number;
}

export interface TwoFactorChartProps {
  data: DataPoint[];
  factor1Name: string;
  factor2Name: string;
  ctqName: string;
  showMean?: boolean;
  showRange?: boolean;
}

export interface ThreeFactorChartProps {
  data: DataPoint[];
  factor1Name: string;
  factor2Name: string;
  factor3Name: string;
  ctqName: string;
  showMean?: boolean;
  showRange?: boolean;
}

// Dynamic x-offset calculation for n levels of Factor 2 (n between 2-7)
// This distributes the points evenly around the center position
// EXAMPLES OF HOW IT WORKS:
// n=2: offsets = [-0.25, +0.25]
// n=3: offsets = [-0.25, 0, +0.25]
// n=4: offsets = [-0.25, -0.083, +0.083, +0.25]
// n=5: offsets = [-0.25, -0.125, 0, +0.125, +0.25]
// n=6: offsets = [-0.25, -0.15, -0.05, +0.05, +0.15, +0.25]
// n=7: offsets = [-0.25, -0.167, -0.083, 0, +0.083, +0.167, +0.25]
/**
 * Calculate x-offset for a given factor level index
 * @param factorIndex - The index of the current factor level (0-based)
 * @param totalLevels - Total number of factor levels
 * @param spacing - The spacing between adjacent levels (default: 0.5)
 * @returns The x-offset value
 */
function calculateXOffset(factorIndex: number, totalLevels: number, spacing: number = 0.5): number {
  // For n levels, we want to distribute them symmetrically around 0
  // Formula: offset = (index - (n-1)/2) * (spacing / (n-1))
  
  if (totalLevels === 1) return 0;
  
  const centerIndex = (totalLevels - 1) / 2;
  const step = spacing / (totalLevels - 1);
  return (factorIndex - centerIndex) * step;
}

/**
 * Two-Factor Multi-Vari Chart using React-Plotly
 * Displays the relationship between two factors and a response variable
 * - Blue lines: Factor2 level means across Factor1
 * - Red dashed line: Overall means for each Factor1 setting
 */
export function TwoFactorMultiVariChart({
  data,
  factor1Name,
  factor2Name,
  ctqName,
  showMean = true,
  showRange = false,
}: TwoFactorChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center text-gray-500">
        <p>No data available to display chart.</p>
      </div>
    );
  }
  const layoutTitle = `<b>Multi-Vari Chart for ${ctqName} by ${factor1Name} - ${factor2Name}</b>`;
  const uniqueFactor1 = Array.from(new Set(data.map(d => d.factor1))).sort();
  const uniqueFactor2 = Array.from(new Set(data.map(d => d.factor2))).sort();
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

  const traces: any[] = [];

  // Create traces for each Factor2 level
  uniqueFactor2.forEach((f2, f2Idx) => {
    const color = colors[f2Idx % colors.length];

    // Individual data points for this factor2
    const pointsX: number[] = [];
    const pointsY: number[] = [];
    const pointsText: string[] = [];

    data.filter(d => d.factor2 === f2).forEach(d => {
      const xPos =  + uniqueFactor1.indexOf(d.factor1) + 1;
      const f2Index = uniqueFactor2.indexOf(f2);
      const xOffset = calculateXOffset(f2Index, uniqueFactor2.length);
      
      pointsX.push(xPos+xOffset);
      pointsY.push(d.response);
      pointsText.push(`${d.factor1} - ${d.factor2}<br>Response: ${d.response.toFixed(2)}`);
    });

    // Add scatter trace for individual points
    traces.push({
      x: pointsX,
      y: pointsY,
      mode: 'markers',
      type: 'scatter',
      name: f2,
      marker: {
        color: color,
        size: 10,
      },
      text: pointsText,
      hovertemplate: '%{text}<extra></extra>',
      legendgroup: 'f2',
    });
  });

  // Add overall mean line (red dashed)
  if (showMean) {
    const overallMeanX: number[] = [];
    const overallMeanY: number[] = [];
    const overallMeanText: string[] = [];
    const legendgroupText: string[] = [];

    uniqueFactor1.forEach((f1, idx) => {

      const meanX: number[] = [];
      const meanY: number[] = [];
      const meanText: string[] = [];
      //const color = colors[idx % colors.length];
      
      uniqueFactor2.forEach((f2, f2Idx) => {
        
        const values = data
          .filter(d => d.factor1 === f1 && d.factor2 === f2)
          .map(d => d.response);
        const f2Index = uniqueFactor2.indexOf(f2);
        const xOffset = calculateXOffset(f2Index, uniqueFactor2.length);

        if (values.length > 0) {
          const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
          meanX.push(idx + 1 + xOffset);
          meanY.push(mean);
          //meanText.push(`${f2} mean line`);
          meanText.push(`${f1} - ${f2}<br>Mean: ${mean.toFixed(2)}`);
          legendgroupText.push(f2);
        }          
      });

      traces.push({
          x: meanX,
          y: meanY,
          mode: 'lines+markers',
          type: 'scatter',
          name: `${factor2Name} ${f1} means`,
          line: {
            color: 'gray',
            width: 2,
            dash: 'dash',
          },
          marker: {
            color: 'gray',
            size: 8,
            symbol: 'diamond',
          },
          legendgroup: 'means',
          showlegend: true,
          text: meanText,
          hovertemplate: '%{text}<extra></extra>',
        });
      
      const values = data.filter(d => d.factor1 === f1).map(d => d.response);
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      overallMeanX.push(idx + 1);
      overallMeanY.push(mean);
      overallMeanText.push(`${f1}<br>Overall Mean: ${mean.toFixed(2)}`);

    });

    traces.push({
      x: overallMeanX,
      y: overallMeanY,
      mode: 'lines+markers',
      type: 'scatter',
      name: `${factor1Name} Means`,
      line: {
        color: '#222222ff',
        width: 2,
        dash: 'dash',
      },
      marker: {
        color: '#222222ff',
        size: 8,
        symbol: 'diamond',
      },
      text: overallMeanText,
      hovertemplate: '%{text}<extra></extra>',
      legendgroup: 'means',
    });
  }

  return (
    <div className="border rounded-lg p-4 bg-white">
      <Plot
        data={traces}
        layout={{
          title: {text: layoutTitle},
          xaxis: {
            title: {
              text: factor1Name
            },
            tickmode: 'array',
            tickvals: uniqueFactor1.map((_, i) => i + 1),
            ticktext: uniqueFactor1,
            showgrid: true,
            gridcolor: '#e0e0e0',
          },
          yaxis: {
            title: { text: ctqName},
            showgrid: true,
            gridcolor: '#e0e0e0',
          },
          showlegend: true,
          legend: {
            x: 1.05,
            y: 1,
            xanchor: 'left',
            yanchor: 'top',
            title: {text: factor2Name},
          },
          plot_bgcolor: 'white',
          paper_bgcolor: 'white',
          margin: { l: 60, r: 150, t: 40, b: 60 },
          hovermode: 'closest',
          autosize: true,
        }}
        config={{
          responsive: true,
          displayModeBar: true,
          displaylogo: false,
          modeBarButtonsToRemove: ['lasso2d', 'select2d'],
          toImageButtonOptions: {
                        format: 'png',
                        filename: 'Multi-Vari chart',
                        height: 400,
                        width: 800,
                        scale: 1}
        }}
        style={{ width: '100%', height: '400px' }}
        useResizeHandler={true}
      />
    </div>
  );
}

/**
 * Three-Factor Multi-Vari Chart using React-Plotly
 * Displays paneled charts for each Factor3 level showing Factor1 and Factor2 relationships
 * - Green diamonds: Overall Factor3 level mean
 * - Black dashed diamonds: Factor2 level means
 * - Gray dashed diamonds: Factor1 level means within each Factor2 section
 * - Colored circles: Individual data points grouped by Factor1
 */
export function ThreeFactorMultiVariChart({
  data,
  factor1Name,
  factor2Name,
  factor3Name,
  ctqName,
  showMean = true,
  showRange = false,
}: ThreeFactorChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center text-gray-500">
        <p>No data available to display chart.</p>
      </div>
    );
  }

  const uniqueFactor3 = Array.from(new Set(data.map(d => d.factor3).filter(Boolean))).sort();

  if (uniqueFactor3.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center text-gray-500">
        <p>No Factor 3 data available.</p>
      </div>
    );
  }

  // Helper function for calculating x-offset
  /*const calculateXOffset = (factorIndex: number, totalLevels: number, spacing: number = 0.5): number => {
    if (totalLevels === 1) return 0;
    const centerIndex = (totalLevels - 1) / 2;
    const step = spacing / (totalLevels - 1);
    return (factorIndex - centerIndex) * step;
  };*/

  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

  return (
    <div className="space-y-4">
      {uniqueFactor3.map((f3) => {
        const panelData = data.filter(d => d.factor3 === f3);
        const uniqueFactor1 = Array.from(new Set(panelData.map(d => d.factor1))).sort();
        const uniqueFactor2 = Array.from(new Set(panelData.map(d => d.factor2))).sort();
        
        const layoutTitle = `<b>Multi-Vari Chart for ${ctqName} by ${factor1Name} - ${factor2Name}</b><br>${factor3Name} = ${f3}`;
        const traces: any[] = [];

        uniqueFactor2.forEach((f2, f2Idx) => {
          const color = colors[f2Idx % colors.length];

          // Individual data points for this factor2
          const pointsX: number[] = [];
          const pointsY: number[] = [];
          const pointsText: string[] = [];

          panelData.filter(d => d.factor2 === f2).forEach(d => {
            const xPos =  + uniqueFactor1.indexOf(d.factor1) + 1;
            const f2Index = uniqueFactor2.indexOf(f2);
            const xOffset = calculateXOffset(f2Index, uniqueFactor2.length);
            
            pointsX.push(xPos+xOffset);
            pointsY.push(d.response);
            pointsText.push(`${d.factor1} - ${d.factor2}<br>Response: ${d.response.toFixed(2)}`);
          });

          // Add scatter trace for individual points
          traces.push({
            x: pointsX,
            y: pointsY,
            mode: 'markers',
            type: 'scatter',
            name: f2,
            marker: {
              color: color,
              size: 10,
            },
            text: pointsText,
            hovertemplate: '%{text}<extra></extra>',
            legendgroup: 'f2',
          });
        });

        // Add overall mean line (red dashed)
        if (showMean) {
          const overallMeanX: number[] = [];
          const overallMeanY: number[] = [];
          const overallMeanText: string[] = [];
          const legendgroupText: string[] = [];

          uniqueFactor1.forEach((f1, idx) => {

            const meanX: number[] = [];
            const meanY: number[] = [];
            const meanText: string[] = [];
            const color = colors[idx % colors.length];
            
            uniqueFactor2.forEach((f2, f2Idx) => {
              
              const values = panelData
                .filter(d => d.factor1 === f1 && d.factor2 === f2)
                .map(d => d.response);
              const f2Index = uniqueFactor2.indexOf(f2);
              const xOffset = calculateXOffset(f2Index, uniqueFactor2.length);

              if (values.length > 0) {
                const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
                meanX.push(idx + 1 + xOffset);
                meanY.push(mean);
                //meanText.push(`${f2} mean line`);
                meanText.push(`${f1} - ${f2}<br>Mean: ${mean.toFixed(2)}`);
                legendgroupText.push(f2);
              }  
              
            });

            traces.push({
                x: meanX,
                y: meanY,
                mode: 'lines+markers',
                type: 'scatter',
                name: `${factor2Name} ${f1} means`,
                line: {
                  color: 'gray',
                  width: 2,
                  dash: 'dash',
                },
                marker: {
                  color: 'gray',
                  size: 8,
                  symbol: 'diamond',
                },
                legendgroup: 'means',
                showlegend: true,
                text: meanText,
                hovertemplate: '%{text}<extra></extra>',
              });
            
            const values = panelData.filter(d => d.factor1 === f1).map(d => d.response);
            const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
            overallMeanX.push(idx + 1);
            overallMeanY.push(mean);
            overallMeanText.push(`${f1}<br>Overall Mean: ${mean.toFixed(2)}`);

          });

          traces.push({
            x: overallMeanX,
            y: overallMeanY,
            mode: 'lines+markers',
            type: 'scatter',
            name: `${factor1Name} Means`,
            line: {
              color: '#222222ff',
              width: 2,
              dash: 'dash',
            },
            marker: {
              color: '#222222ff',
              size: 8,
              symbol: 'diamond',
            },
            text: overallMeanText,
            hovertemplate: '%{text}<extra></extra>',
            legendgroup: 'means',
          });
        }

        return (
          <div key={f3} className="border rounded-lg p-4 bg-white">
            <Plot
              data={traces}
              layout={{
                title: { text: layoutTitle },
                xaxis: {
                  title: {
                    text: factor1Name
                  },
                  tickmode: 'array',
                  tickvals: uniqueFactor1.map((_, i) => i + 1),
                  ticktext: uniqueFactor1,
                  showgrid: true,
                  gridcolor: '#e0e0e0',
                },
                yaxis: {
                  title: { text: ctqName },
                  showgrid: true,
                  gridcolor: '#e0e0e0',
                },
                showlegend: true,
                legend: {
                  x: 1.05,
                  y: 1,
                  xanchor: 'left',
                  yanchor: 'top',
                  title: { text: factor2Name },
                },
                plot_bgcolor: 'white',
                paper_bgcolor: 'white',
                margin: { l: 60, r: 150, t: 40, b: 60 },
                hovermode: 'closest',
                autosize: true,
              }}
              config={{
                responsive: true,
                displayModeBar: true,
                displaylogo: false,
                modeBarButtonsToRemove: ['lasso2d', 'select2d'],
                toImageButtonOptions: {
                  format: 'png',
                  filename: `Multi-Vari_chart_${f3}`,
                  height: 400,
                  width: 800,
                  scale: 1
                }
              }}
              style={{ width: '100%', height: '400px' }}
              useResizeHandler={true}
            />
          </div>
        );
      })}
    </div>
  );
}