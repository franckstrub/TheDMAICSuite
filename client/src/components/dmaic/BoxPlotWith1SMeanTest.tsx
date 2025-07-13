import React from 'react';
import Plot from 'react-plotly.js';
import { number } from 'zod';

interface BoxPlotWith1SMeanTestProps {
  data: number[];
  ctqName: string;
  mean: number
  Ha: string;
  h0Value: number;
  confidenceInterval: [number, number];
  title?: string;
  pValue: number;
  alphalevel: string;
}

export default function BoxPlotWith1SMeanTest({
  data,
  ctqName,
  mean,
  Ha,
  h0Value,
  confidenceInterval,
  title,
  pValue,
  alphalevel
}: BoxPlotWith1SMeanTestProps): JSX.Element {
  if (!data || data.length === 0) {
    return <div>No data available for visualization</div>;
  }
  const boldTitle = `<b>${title}</b>`;

  var Hatext: string;
  switch (Ha) {
    case "Less than":
      Hatext = "Ha: Mean < H0";
      break;
    case "Greater than":
      Hatext = "Ha: Mean > H0";
      break;
    case "Different":
      Hatext = "Ha: Mean ≠ H0";
      break;
    default:
      Hatext = "Ha: Mean ≠ H0";
  }
  let shownconfidenceInterval: [number, number] = [...confidenceInterval];
  let CIminustext: string = 'CI-';
  let CIplustext: string = 'CI+';

  if (confidenceInterval[0]=== -Infinity) {
    shownconfidenceInterval[0]= Math.min(...data);
    CIminustext = '-∞';
  }
  else if (confidenceInterval[1]=== Infinity) {
    shownconfidenceInterval[1]=Math.max(...data);
    CIplustext = '+∞';
  }
  const yBadge=0.95*(Math.max(...data)-Math.min(...data))+ Math.min(...data);

  let Badgetext='Ha: Mean ';
  if (Ha==='less than'){
    Badgetext = Badgetext + " < Target H0";
  }
  else if (Ha==='greater than') {
    Badgetext = Badgetext + " > Target H0";
  }
  else {
    Badgetext = Badgetext + " ≠ Target H0";
  }
  if( pValue < parseFloat(alphalevel)) {
    Badgetext = Badgetext + `<br>Result => Reject H0. Accept Ha (P-Value ${pValue.toFixed(4)} < ${alphalevel})`;
  }
  else {
    Badgetext = Badgetext + `<br>Result => Accept H0. Reject Ha (P-Value ${pValue.toFixed(4)} >= ${alphalevel})`;
  }

  return (
    <div className="w-full h-[400px]">
      {/*<h3 className="text-center font-medium mb-2">{title}</h3>*/}
      <Plot
        data={[
          {
            x: [ctqName,ctqName],
            y: [mean],
            type: 'scatter',
            mode: 'markers',
            name: 'Mean',
            marker: { color: 'red', size: 8, symbol: 'circle' },
          },
          {
            y: data,
            type: 'box',
            name: ctqName,
            boxpoints: 'outliers',
            marker: { color: '#1e3a8a' },
            line: { color: '#1e3a8a' },
            fillcolor: '#bfdbfe',
            boxmean: false, // optionally set to 'sd' or true
          },          
          {
            x:[Hatext],
            y: [mean],
            type: 'scatter',
            mode: 'markers',
            name: 'Mean',
            marker: { color: 'red', size: 8, symbol: 'circle' },
          },
          {
            x:[Hatext],
            y: [h0Value],
            type: 'scatter',
            mode: 'markers',
            name: 'H0',
            marker: { color: 'black', size: 8, symbol: 'square' },
          },
          {
            x:[Hatext],
            y: [shownconfidenceInterval[0]],
            type: 'scatter',
            mode: 'markers',
            name: 'CI-',
            marker: { color: 'black', size: 8, symbol: 'line-ns' },
          },
          {
            x:[Hatext],
            y: [shownconfidenceInterval[1]],
            type: 'scatter',
            mode: 'markers',
            name: 'CI+',
            marker: { color: 'black', size: 8, symbol: 'line-ns' },
          },
        ]}
        layout={{
          title: {text: boldTitle, font: { size: 16} },
          height: 360,
          margin: { l: 70, r: 160, t: 30, b: 20 },
          yaxis: { 
            title: {
              text: 'Y values'
            },
          showline: true,
          },
          shapes: [            
            // Confidence Interval vertical line
            {
              type: 'line',
              xref: 'paper',
              x0: 0.9175,
              x1: 0.9175,
              y0: shownconfidenceInterval[0],
              y1: shownconfidenceInterval[1],
              line: {
                color: 'black',
                width: 1,
                dash: 'solid'
              }
            },
            
            // Confidence Interval lower bound
            {
              type: 'line',
              xref: 'paper',
              x0: 0.9075,
              x1: 0.9275,
              y0: shownconfidenceInterval[0],
              y1: shownconfidenceInterval[0],
              line: {
                color: 'black',
                width: 1,
                dash: 'solid'
              },
              arrowhead: 2,
  arrowsize: 1.5,
  arrowwidth: 1,
  arrowcolor: 'black',
  arrowside: 'end',
  visible: true,
  layer: 'above',
            },
            // Confidence Interval upper bound
            {
              type: 'line',
              xref: 'paper',
              x0: 0.9075,
              x1: 0.9275,
              y0: shownconfidenceInterval[1],
              y1: shownconfidenceInterval[1],
              line: {
                color: 'black',
                width: 1,
                dash: 'solid'
              }
            }
          ],
          annotations: [
              {
                x: 0.0,
                y: mean,
                text: 'Mean',
                showarrow: false,
                font: { size: 12, color: 'red' },
                xanchor: 'center',
                yanchor: 'bottom'
              },
              {
                x: 1.05,
                y: mean,
                text: 'Mean',
                showarrow: false,
                font: { size: 12, color: 'red' },
                xanchor: 'left',
                yanchor: 'middle'
              },
              {
                x: 1.05,
                y: h0Value,
                text: 'H0',
                showarrow: false,
                font: { size: 12, color: 'black' },
                xanchor: 'left',
                yanchor: 'middle'
              },
              {
                x: 1.05,
                y: shownconfidenceInterval[0],
                text: CIminustext,
                showarrow: false,
                font: { size: 12, color: 'black' },
                xanchor: 'left',
                yanchor: 'middle'
              },
              {
                x: 1.05,
                y: shownconfidenceInterval[1],
                text: CIplustext,
                showarrow: false,
                font: { size: 12, color: 'black' },
                xanchor: 'left',
                yanchor: 'middle'
              },
              {
                x: 0.5,
                y: yBadge,
                text: Badgetext,
                showarrow: false,
                font: { size: 12, color: 'black' },
                xanchor: 'center',
                yanchor: 'middle'
              },
            ],
          showlegend: false,
        }}
        config={{ responsive: true }}
        style={{
          border: '1px solid #ddd', // Additional div border
          borderRadius: '8px',
          padding: '10px'
        }}
      />
    </div>
  );
}

