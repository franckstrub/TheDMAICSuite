import React from 'react';
import Plot from 'react-plotly.js';

interface TwoSVarianceTestCIProps {
  ctqName: string;
  stdev1: number;
  stdev2: number;
  ratioVariance0: number | undefined;
  Ha: string;
  confidenceInterval: [number, number];
  title?: string;
  pValue: number;
  alphalevel: string;
  description1: string | undefined;
  description2: string | undefined;
}

export default function TwoSVarianceTestCI({
  ctqName,
  stdev1,
  stdev2,
  ratioVariance0,
  Ha,
  confidenceInterval,
  title,
  pValue,
  alphalevel,
  description1,
  description2,
}: TwoSVarianceTestCIProps): JSX.Element {
  
  const boldTitle = `<b>${title}</b>`;
  const Confidence = 100*(1-parseFloat(alphalevel));

  var Hatext: string;
  switch (Ha) {
    case "Less than":
      Hatext = Confidence + `% CI for Ha: σ1/σ2 < ` + ratioVariance0;
      break;
    case "Greater than":
      Hatext = Confidence + `% CI for Ha: σ1/σ2 > ` + ratioVariance0;
      break;
    case "Different":
      Hatext = Confidence + `% CI for Ha: σ1/σ2 ≠ ` + ratioVariance0;
      break;
    default:
      Hatext = Confidence + `% CI for Ha: σ1/σ2 ≠ ` + ratioVariance0;
  }
  let shownconfidenceInterval: [number, number] = [...confidenceInterval];
  let CIminustext: string = 'CI-';
  let CIplustext: string = 'CI+';

  if (confidenceInterval[0]=== -Infinity) {
    shownconfidenceInterval[0]= Math.min(stdev1, ratioVariance0!) - 2*Math.abs(stdev1 - ratioVariance0!);
    CIminustext = '-∞';
  }
  else if (confidenceInterval[1]=== Infinity) {
    shownconfidenceInterval[1]= Math.max(stdev1, ratioVariance0!) + 2*Math.abs(stdev1 - ratioVariance0!);
    CIplustext = '+∞';
  }
  
  const yExtraScale=(shownconfidenceInterval[1]-shownconfidenceInterval[0])/5;
  const yBadge=0.96*(shownconfidenceInterval[1] + yExtraScale);

  let BadgetextH0='H0: σ1/σ2 ';
  if (Ha==='Less than'){
    BadgetextH0 = BadgetextH0 + ` ≥ ` + ratioVariance0
  }
  else if (Ha==='Greater than') {
    BadgetextH0 = BadgetextH0 + ` ≤ ` + ratioVariance0
  }
  else {
    BadgetextH0 = BadgetextH0 + ` = ` + ratioVariance0
  }

  let Badgetext=BadgetextH0+'<br>Ha: σ1/σ2 ';
  if (Ha==='Less than'){
    Badgetext = Badgetext + ` < ` + ratioVariance0
  }
  else if (Ha==='Greater than') {
    Badgetext = Badgetext + ` > ` + ratioVariance0
  }
  else {
    Badgetext = Badgetext + ` ≠ ` + ratioVariance0
  }
  
  if( pValue < parseFloat(alphalevel)) {
    Badgetext = Badgetext + `<br>Result => Reject H0. Accept Ha (P-Value ${pValue.toFixed(4)} < ${alphalevel})`;
  }
  else {
    Badgetext = Badgetext + `<br>Result => Accept H0. Reject Ha (P-Value ${pValue.toFixed(4)} ≥ ${alphalevel})`;
  }
  const ctq1 = ctqName + ' - ' + description1 || ' Dataset #1';
  const ctq2 = description2 || 'Dataset #2';
  const CItext = Hatext + ' (' + ctq1 + ' vs ' + ctq2 + ')';
  
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
            y: [stdev1/stdev2],
            type: 'scatter',
            mode: 'markers',
            name: 'σ1/σ2',
            marker: { color: 'green', size: 8, symbol: 'square' },
          },
          {
            x:[0],
            y: [ratioVariance0!],
            type: 'scatter',
            mode: 'markers',
            name: 'ratio (H0)',
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
            ticktext: [CItext],
            range: [-0.5, 0.5],
            showline: true,
            zeroline: false,
          },
          yaxis: { 
            title: {
              text: 'Ratio'
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
                x: 0.03,
                y: stdev1/stdev2,
                text: 'σ1/σ2',
                showarrow: false,
                font: { size: 12, color: 'green' },
                xanchor: 'left',
                yanchor: 'middle'
              },
              {
                x: 0.03,
                y: ratioVariance0,
                text: 'ratio (H0)',
                showarrow: false,
                font: { size: 12, color: 'black' },
                xanchor: 'left',
                yanchor: 'middle'
              },
              {
                x: 0.13,
                y: shownconfidenceInterval[0],
                text: CIminustext,
                showarrow: false,
                font: { size: 12, color: 'black' },
                xanchor: 'left',
                yanchor: 'middle'
              },
              {
                x: 0.13,
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
                    modeBarButtonsToRemove: ['lasso2d', 'select2d'], // Remove specific tools
                    toImageButtonOptions: {
                        format: 'png',
                        filename: '2-sample Variance test',
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
