import React from 'react';
import Plot from 'react-plotly.js';

interface OneSVarianceTestCIProps {
  data: number[];
  ctqName: string;
  stdev: number
  Ha: string;
  h0Value: number;
  confidenceInterval: [number, number];
  title?: string;
  pValue: number;
  alphalevel: string;
}

export default function OneSVarianceTestCI({
  data,
  ctqName,
  stdev,
  Ha,
  h0Value,
  confidenceInterval,
  title,
  pValue,
  alphalevel
}: OneSVarianceTestCIProps): JSX.Element {
  if (!data || data.length === 0) {
    return <div>No data available for visualization</div>;
  }
  const boldTitle = `<b>${title}</b>`;

  var Hatext: string;
  switch (Ha) {
    case "Less than":
      Hatext = "Ha: Standard deviation < H0";
      break;
    case "Greater than":
      Hatext = "Ha: Standard deviation > H0";
      break;
    case "Different":
      Hatext = "Ha: Standard deviation ≠ H0";
      break;
    default:
      Hatext = "Ha: Standard deviation ≠ H0";
  }
  let shownconfidenceInterval: [number, number] = [...confidenceInterval];
  let CIminustext: string = 'CI-';
  let CIplustext: string = 'CI+';

  if (confidenceInterval[0]=== -Infinity) {
    shownconfidenceInterval[0]= Math.min(stdev, h0Value) - 2*Math.abs(stdev - h0Value);
    CIminustext = '-∞';
  }
  else if (confidenceInterval[1]=== Infinity) {
    shownconfidenceInterval[1]= Math.max(stdev, h0Value) + 2*Math.abs(stdev - h0Value);
    CIplustext = '+∞';
  }
  const yExtraScale=(shownconfidenceInterval[1]-shownconfidenceInterval[0])/5;
  const yBadge=0.99*(shownconfidenceInterval[1] + yExtraScale);

  let Badgetext='Ha: Standard deviation ';
  if (Ha==='Less than'){
    Badgetext = Badgetext + " < Target H0";
  }
  else if (Ha==='Greater than') {
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
          /*
          {
            x: [0],
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
          */          
          {
            x:[0],
            y: [stdev],
            type: 'scatter',
            mode: 'markers',
            name: 'Standard Deviation',
            marker: { color: 'green', size: 8, symbol: 'square' },
          },
          {
            x:[0],
            y: [h0Value],
            type: 'scatter',
            mode: 'markers',
            name: 'H0',
            marker: { color: 'black', size: 8, symbol: 'square' },
          },
          {
            x:[0],
            y: [shownconfidenceInterval[0]],
            type: 'scatter',
            mode: 'markers',
            name: 'CI-',
            marker: { color: 'black', size: 8, symbol: 'line-ns' },
          },
          {
            x:[0],
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
          width: 860,
          margin: { l: 70, r: 160, t: 30, b: 20 },
          xaxis: {
            tickvals: [0],
            ticktext: [Hatext],
            range: [-0.5, 0.5],
            showline: true,
            zeroline: false,
          },
          yaxis: { 
            title: {
              text: 'Y'
            },
            range: [(shownconfidenceInterval[0]-yExtraScale), (shownconfidenceInterval[1]+yExtraScale)],
            showline: true,
          },
          shapes: [            
            // Confidence Interval vertical line
            {
              type: 'line',
              xref: 'x',
              x0: 0,
              x1: 0,
              yref: 'y',
              y0: shownconfidenceInterval[0],
              y1: shownconfidenceInterval[1],
              line: {
                color: 'black',
                width: 1,
                dash: 'solid'
              },
            },
            
            // Confidence Interval lower bound
            {
              type: 'line',
              xref: 'x',
              x0: -0.025,
              x1: 0.025,
              yref: 'y',
              y0: shownconfidenceInterval[0],
              y1: shownconfidenceInterval[0],
              line: {
                color: 'black',
                width: 1,
                dash: 'solid'
              },
            },
            
            // Confidence Interval upper bound
            {
              type: 'line',
              xref: 'x',
              x0: -0.025,
              x1: 0.025,
              yref: 'y',
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
              /*
              {
                x: 0,
                y: stdev,
                text: 'Standard Deviation',
                showarrow: false,
                font: { size: 12, color: 'red' },
                xanchor: 'center',
                yanchor: 'bottom',
                yshift: 5,
              },
              */
              {
                x: 0.15,
                y: stdev,
                text: 'Standard Deviation',
                showarrow: false,
                font: { size: 12, color: 'green' },
                xanchor: 'left',
                yanchor: 'middle'
              },
              {
                x: 0.15,
                y: h0Value,
                text: 'H0',
                showarrow: false,
                font: { size: 12, color: 'black' },
                xanchor: 'left',
                yanchor: 'middle'
              },
              {
                x: 0.15,
                y: shownconfidenceInterval[0],
                text: CIminustext,
                showarrow: false,
                font: { size: 12, color: 'black' },
                xanchor: 'left',
                yanchor: 'middle'
              },
              {
                x: 0.15,
                y: shownconfidenceInterval[1],
                text: CIplustext,
                showarrow: false,
                font: { size: 12, color: 'black' },
                xanchor: 'left',
                yanchor: 'middle'
              },
              {
                x: 0,
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
          config={{ responsive: true,
                    displayModeBar: true,
                    displaylogo: false, // Remove Plotly logo
                    modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'], // Remove specific tools
                    toImageButtonOptions: {
                        format: 'png',
                        filename: '1-sample Student Mean test',
                        height: 500,
                        width: 700,
                        scale: 1
                    },
          }}
    
        style={{
            width: "100%", height: "100%",
            border: '1px solid #ddd', // Additional div border
            borderRadius: '8px',
            padding: '10px'
            }}
      />
    </div>
  );
}
