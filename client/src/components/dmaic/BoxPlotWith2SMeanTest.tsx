import React from 'react';
import Plot from 'react-plotly.js';

interface BoxPlotWith2SMeanTestProps {
  data1: number[];
  data2: number[];
  ctqName: string;
  mean1: number
  mean2: number;
  Ha: string;
  h0Value: number;
  confidenceInterval: [number, number];
  title?: string;
  pValue: number;
  alphalevel: string;
  description1: string | undefined;
  description2: string | undefined;
  equalVariances: boolean;
}

export default function BoxPlotWith2SMeanTest({
  data1,
  data2,
  ctqName,
  mean1,
  mean2,
  Ha,
  h0Value,
  confidenceInterval,
  title,
  pValue,
  alphalevel,
  description1,
  description2,
  equalVariances,
}: BoxPlotWith2SMeanTestProps): JSX.Element {
  if (!data1 || data1.length === 0 || !data2 || data2.length === 0) {
    return <div>Not enough data available for box plot and means visualization</div>;
  }
  
  const boldTitle = `<b>${title}</b>`;

  var Hatext: string;
  switch (Ha) {
    case "Less than":
      Hatext = `Ha: (μ1 - μ2) < ${h0Value}`;
      break;
    case "Greater than":
      Hatext = `Ha: (μ1 - μ2) > ${h0Value}`;
      break;
    case "Different":
      Hatext = `Ha: (μ1 - μ2) ≠ ${h0Value}`;
      break;
    default:
      Hatext = `Ha: (μ1 - μ2) ≠ ${h0Value}`;
  }
  {/*
    let shownconfidenceInterval: [number, number] = [...confidenceInterval];
  let CIminustext: string = 'CI-';
  let CIplustext: string = 'CI+';

  if (confidenceInterval[0]=== -Infinity) {
    shownconfidenceInterval[0]= Math.min(...data1, h0Value);
    CIminustext = '-∞';
  }
  else if (confidenceInterval[1]=== Infinity) {
    shownconfidenceInterval[1]=Math.max(...data1, h0Value);
    CIplustext = '+∞';
  }
  */}
  const yExtraScale=(Math.max(...data1, ...data2)-Math.min(...data1, ...data2))/5;  
  const yBadge = (Math.max(...data1, ...data2)-Math.min(...data1, ...data2))+ Math.min(...data1, ...data2) + yExtraScale;

  let textequalityofvariances = "Equal Variances";
  if (!equalVariances) {textequalityofvariances = "Unequal Variances"}
  
  let BadgetextH0 = textequalityofvariances + '<br>H0: (μ1 - μ2) ';
  if (Ha==='Less than'){
    BadgetextH0 = BadgetextH0 + ` ≥ ${h0Value}`
  }
  else if (Ha==='Greater than') {
    BadgetextH0 = BadgetextH0 + ` ≤ ${h0Value}`
  }
  else {
    BadgetextH0 = BadgetextH0 + ` = ${h0Value}`
  }

  let Badgetext=BadgetextH0+'<br>Ha: (μ1 - μ2) ';
  if (Ha==='Less than'){
    Badgetext = Badgetext + ` < ${h0Value}`
  }
  else if (Ha==='Greater than') {
    Badgetext = Badgetext + ` > ${h0Value}`
  }
  else {
    Badgetext = Badgetext + ` ≠ ${h0Value}`
  }
  if( pValue < parseFloat(alphalevel)) {
    Badgetext = Badgetext + `<br>Result => Reject H0. Accept Ha (P-Value ${pValue.toFixed(4)} < ${alphalevel})`;
  }
  else {
    Badgetext = Badgetext + `<br>Result => Accept H0. Reject Ha (P-Value ${pValue.toFixed(4)} ≥ ${alphalevel})`;
  }

  const ctq1 = description1 || 'Dataset #1';
  const ctq2 = description2 || 'Dataset #2';

  const boxplotofctq1txt = 'Boxplot of '  + ctq1;
  const boxplotofctq2txt = 'Boxplot of '  + ctq2;

  return (
    <div className="w-full h-[400px]">
      {/*<h3 className="text-center font-medium mb-2">{title}</h3>*/}
      <Plot
        data={[
          {
            x: [0],
            y: [mean1],
            type: 'scatter',
            mode: 'markers',
            name: 'μ1',
            marker: { color: 'red', size: 8, symbol: 'circle' },
          },
          {
            y: data1,
            type: 'box',
            name: ctq1,
            boxpoints: 'outliers',
            marker: { color: '#1e3a8a', symbol: 'star' },
            line: { color: '#1e3a8a' },
            fillcolor: '#bfdbfe',
            boxmean: false, // optionally set to 'sd' or true
          }, 
          {
            x: [1],
            y: [mean2],
            type: 'scatter',
            mode: 'markers',
            name: 'μ2',
            marker: { color: 'red', size: 8, symbol: 'circle' },
          },
          {
            y: data2,
            type: 'box',
            name: ctq2,
            boxpoints: 'outliers',
            marker: { color: '#1e3a8a', symbol: 'star' },
            line: { color: '#1e3a8a' },
            fillcolor: '#bfdbfe',
            boxmean: false, // optionally set to 'sd' or true
          },  
          // Add this trace for the line between means
          {
            x: [0, 1],
            y: [mean1, mean2],
            type: 'scatter',
            mode: 'lines',
            name: 'Mean Connection',
            line: { 
              color: 'red', 
              width: 1,
              dash: 'dash' // Optional: makes it a dashed line
            },
            showlegend: false, // Hide from legend since you have showlegend: false
          },        
        ]}
        layout={{
          title: {text: boldTitle, font: { size: 16} },
          height: 360,
          width: 860,
          margin: { l: 70, r: 160, t: 30, b: 20 },
          xaxis: {
            tickvals: [0, 1, 1.5],
            ticktext: [boxplotofctq1txt, boxplotofctq2txt, '(μ1-μ2)'],
            range: [-0.5, 1.75],
            showline: true,
            zeroline: false,
          },
          yaxis: { 
            title: {
              text: ctqName
            },
          showline: true,
          },
          shapes: [            
            // Confidence Interval vertical line
            {
              type: 'line',
              xref: 'x',
              x0: 1.5,
              x1: 1.5,
              yref: 'y',
              y0: mean2,
              y1: mean1,
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
              x0: 1.475,
              x1: 1.525,
              yref: 'y',
              y0: mean2,
              y1: mean2,
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
              x0: 1.475,
              x1: 1.525,
              yref: 'y',
              y0: mean1,
              y1: mean1,
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
                y: mean1,
                text: 'μ1',
                showarrow: false,
                font: { size: 12, color: 'red' },
                xanchor: 'center',
                yanchor: 'bottom',
                yshift: 5,
              },
              {
                x: 1.0,
                y: mean2,
                text: 'μ2',
                showarrow: false,
                font: { size: 12, color: 'red' },
                xanchor: 'center',
                yanchor: 'bottom',
                yshift: 5,
              },
              {
                x: 1.60,
                y: mean2+(mean1-mean2)/2,
                text: (mean1-mean2).toFixed(4),
                showarrow: false,
                font: { size: 12, color: 'red' },
                xanchor: 'center',
                yanchor: 'middle',
                yshift: 0,
              },
              {
                x: 0.6,
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
                    modeBarButtonsToRemove: ['lasso2d', 'select2d'], // Remove specific tools
                    toImageButtonOptions: {
                        format: 'png',
                        filename: '2-sample Student Mean test',
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

