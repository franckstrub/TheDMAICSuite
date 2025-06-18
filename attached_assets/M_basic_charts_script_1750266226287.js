// display individual control chart
function calc_variance_for_MR_array(length, yValues, mean, sample) {
  var variance = 0;
  var n = length - 1;
  if (length > 1) {
    for (let i = 1; i < length; i++) {
      var numbr = parseFloat(yValues[i]);
      if (!isNaN(numbr)) {
        variance = variance + ((numbr - mean) ** 2);
      }
      else {
        n = n - 1;
      }
    }
    if (sample) {
      if (n > 1) {
        variance = variance / (n - 1);
      }
    }
    else if (n > 0) {
      variance = variance / n;
    }
  }
  else {
    variance = NULL;
  }
  return variance;
}
function calc_stdev_for_MR_array(length, yValues, mean, sample) {
  var stdev;
  var variance = calc_variance_for_MR_array(length, yValues, mean, sample);
  if (isNaN(variance) || variance < 0) {
    stdev = undefined;
  }
  else {
    stdev = Math.sqrt(variance);
  }
  return stdev;
}
function M_control_chart(type, canvasId, last, myfinal_Array, mean, LCL, UCL) {
  const xValues = new Array;
  const yValues = new Array;
  min = Infinity;
  max = -Infinity;
  var sum_MRi = null;
  if (last > 1) {
    for (let i = 1; i < last; i++) {
      xValues[i - 1] = myfinal_Array[i][0];
      if (type == 'Individual') {
        yValues[i - 1] = myfinal_Array[i][1];
        if (min > yValues[i - 1]) { min = yValues[i - 1] };
        if (max < yValues[i - 1]) { max = yValues[i - 1] };
      }
      else if (type == 'Moving Range') {
        if (i > 1) {
          yValues[i - 1] = Math.abs(AI_round((myfinal_Array[i][1] - myfinal_Array[i - 1][1]), precision, 'true'));
          if (min > yValues[i - 1]) { min = yValues[i - 1] };
          if (max < yValues[i - 1]) { max = yValues[i - 1] };
          sum_MRi = sum_MRi + yValues[i - 1];
        }
        else {
          yValues[0] = null;
        }
      }
    }
  }
  var fixed = true;
  var fixed_LCL = true;
  if (type == 'Moving Range') {
    datalabel = 'MR';
    meanlabel = 'M\u0305R\u0305';
    length = yValues.length;
    fixed_LCL = false;
    if (length > 1) {
      mean = sum_MRi / (length - 1);
    }
    sample = true;
    stdevMR = calc_stdev_for_MR_array(length, yValues, mean, sample);
    LCL = mean - (3 * stdevMR);
    if (LCL < 0) {
      LCL = 0;
    };
    UCL = mean + (3 * stdevMR);
  }
  else if (type == 'Individual') {
    datalabel = myfinal_Array[0][1];
    meanlabel = 'X\u0305';
  };

  if (LCL < min) { min = LCL };
  Yscalemin = min - ((UCL - LCL) / 3);

  if (type == 'Moving Range' && LCL == 0) {
    Yscalemin = LCL - ((UCL - LCL) / 10);
  };

  if (UCL > max) { max = UCL };
  Yscalemax = max + ((UCL - LCL) / 3);

  new Chart(canvasId, {
    type: "line",
    data: {
      labels: xValues,
      datasets: [{
        label: datalabel,
        data: yValues,
        lineTension: 0,
        borderWidth: 1,
        spanGaps: true,
        borderColor: "black",
        fill: false,
        pointRadius: function (context) {
          var index = context.dataIndex
          var value = context.dataset.data[index]
          return value < LCL || value > UCL ? 6 : 3
        },
        pointBackgroundColor: function (context) {
          var index = context.dataIndex
          var value = context.dataset.data[index]
          return value < LCL || value > UCL ? 'red' : 'SeaGreen'
        },
      },
      ]
    },
    options: {
      scales: {
        y: {
          min: Yscalemin,
          max: Yscalemax,
          title: {
            display: true,
            text: type + ' Values',
            font: {
              size: 14
            }
          }
        },
        x: {
          title: {
            display: true,
            text: myfinal_Array[0][0]
          },
        },
      },
      legend: { display: true },
      plugins:
      {
        title:
        {
          display: true,
          font: {
            size: 16,
          },
          text: type + ' Control Chart of ' + CTQ_CTB_name
        },
        legend: {
          labels: {
            usePointStyle: true,
          },
        },
        tooltip: {
          usePointStyle: true,
          callbacks: {
            label: function (context) {
              let label = context.dataset.label || '';
              if (context.parsed.y < LCL || context.parsed.y > UCL) {
                label += ': ' + context.parsed.y + ' Out of control limits!';
              }
              else {
                label += ': ' + context.parsed.y;
              }
              return label;
            }
          }
        },
        annotation: {
          annotations: {
            line1: {
              type: 'line',
              yMin: LCL,
              yMax: LCL,
              borderColor: 'red',
              borderWidth: 2,
              label: {
                backgroundColor: 'rgba(0,0,0,0.9)',
                content: ['LCL=' + AI_round(LCL, precision, fixed_LCL)],
                display: true,
                position: 'start',
                //opacity: 0.5,
                font: {
                  size: 14
                }
              },
            },
            line2: {
              type: 'line',
              yMin: mean,
              yMax: mean,
              borderColor: 'green',
              borderWidth: 2,
              label: {
                backgroundColor: 'rgba(0,0,0,0.9)',
                content: [meanlabel + '=' + AI_round(mean, precision, fixed)],
                display: true,
                position: 'start',
                //opacity: 0.5,
                font: {
                  size: 14
                }
              },
            },
            line3: {
              type: 'line',
              yMin: UCL,
              yMax: UCL,
              borderColor: 'red',
              borderWidth: 2,
              label: {
                backgroundColor: 'rgba(0,0,0,0.9)',
                content: ['UCL=' + AI_round(UCL, precision, fixed)],
                display: true,
                position: 'start',
                //opacity: 0.5,
                font: {
                  size: 14
                }
              },
            },
            /* label3: {
              type: 'label',
              xValue: last-1,
              xAdjust:-60,
              Yadjust:0,
              yValue: LCL,
              backgroundColor: 'rgba(245,245,245)',
              content: ['LCL=' + AI_round(LCL,precision,fixed_LCL)],
              opacity: 0.5,
              font: {
                size: 14
              }
            }
            */
          }
        }
      }
    }
  });
  return yValues;
}
function M_density_histogram(canvasid, last, yValues, label, mean, stdev, LSL, USL, Ymin, Ymax) {
  var barColors = new Array;
  var barBorders = new Array;
  var xValues = new Array;
  var yHistoValues = new Array;
  var Ymin_histo = parseFloat(Ymin);
  var Ymax_histo = parseFloat(Ymax);
  var Histo_range = 0;
  var Nbr_classes = 0;
  var Class_width = 0;
  var Half_class_width = 0;
  var max_count = 0;
  var LSL_xValue = undefined;
  var USL_xValue = undefined;
  var mean_xValue = undefined;
  var stdev_xValue = undefined;
  var Gaussian = new Array;
  var xshift_for_Gaussian = 0;
  const categorypercent = 1;
  const barpercent = 1;
  var coeff = 1.250;
  var ylabel_adjust = 30;

  function find_histograsm_xValues(yValues) {
    if (yValues.length > 0) {
      if (LSL < Ymin) {
        Ymin_histo = LSL;
      }
      if (USL > Ymax) {
        Ymax_histo = USL;
      }
      if (USL >= LSL) {
        Histo_range = Ymax_histo - Ymin_histo;
      }
      /* Square-root choice (same as in Excel Analysis Toolpak)
      */
      Nbr_classes = Math.sqrt(yValues.length);
      Nbr_classes = Math.round(Nbr_classes + Number.EPSILON) + 1;
      console.log("Nbr_classes= " + Nbr_classes);
      if (Nbr_classes > 0) {
        Class_width = Histo_range / Nbr_classes;
        Half_class_width = Class_width / 2;
        // Insure Ymin and Y max are in classes
        Ymin_histo = Ymin_histo - Half_class_width;
        Ymax_histo = Ymax_histo + Half_class_width;
        Histo_range = Ymax_histo - Ymin_histo;
        Class_width = Histo_range / Nbr_classes;
        Half_class_width = Class_width / 2;
      }
      console.log("Ymin_histo= " + Ymin_histo);
      console.log("Ymax_histo= " + Ymax_histo);
      console.log("Histo_range= " + Histo_range);
      fixed = false;

      console.log("Class_width= " + Class_width);
      console.log("Half_class_width= " + Half_class_width);

      if (Nbr_classes > 0) {
        xValues[0] = Ymin_histo + Half_class_width;
        fixed = true;
        for (let i = 1; i < Nbr_classes; i++) {
          xValues[i] = xValues[i - 1] + Class_width;
          xValues[i - 1] = AI_round(xValues[i - 1], precision, fixed);
        }
        xValues[Nbr_classes - 1] = AI_round(xValues[Nbr_classes - 1], precision, fixed);
      }
    }
    xValues[Nbr_classes] = Nbr_classes;
    xValues[Nbr_classes + 1] = Class_width;
    xValues[Nbr_classes + 2] = Ymin_histo;
    xValues[Nbr_classes + 3] = Ymax_histo;
    return xValues;
  };
  function countNumber(myarray, ymin, ymax) {
    let count = 0;
    for (const number of myarray) {
      if (number >= ymin && number <= ymax) {
        count++;
      }
    }
    return count;
  };
  function find_histogram_yValues(xValues, yValues) {
    const yHistoValues = new Array;
    var Nbr_classes = 0;
    var Class_width = 0;
    var Half_class_width = 0;
    var xValues_len = xValues.length;
    var Ymin_histo = 0;
    var Ymax_histo = 0;
    var max_count = 0;
    var fixed = true;
    var LSL_float = parseFloat(LSL);
    var USL_float = parseFloat(USL);
    var LSL_xValue = undefined;
    var USL_xValue = undefined;
    var mean_xValue = undefined;
    var stdev_xValue = undefined;

    if (xValues_len > 4) {
      Nbr_classes = xValues[xValues_len - 4];
      Class_width = xValues[xValues_len - 3];
      Ymin_histo = xValues[xValues_len - 2];
      Ymax_histo = xValues[xValues_len - 1];
      Half_class_width = Class_width / 2;

      bar_Ymin = Ymin_histo;
      bar_Ymax = bar_Ymin + Class_width - Number.EPSILON;

      for (let i = 0; i < Nbr_classes; i++) {
        if (bar_Ymax <= LSL || bar_Ymin >= USL) {
          barColors[i] = "#FF0000"; // red
        }
        else {
          barColors[i] = "rgb(46, 139, 87)"; // SeaGreen
        }
        barBorders[i] = ["black"];
        if (Class_width != 0) {
          if (LSL_float >= bar_Ymin && LSL_float <= bar_Ymax) {
            LSL_xValue = i + ((LSL_float - (bar_Ymin + Half_class_width)) / Class_width);
          }
          if (USL_float >= bar_Ymin && USL_float <= bar_Ymax) {
            USL_xValue = i + ((USL_float - (bar_Ymin + Half_class_width)) / Class_width);
          }
          if (mean >= bar_Ymin && mean <= bar_Ymax) {
            mean_xValue = i + ((mean - (bar_Ymin + Half_class_width)) / Class_width);
          }
          if ((mean + stdev) >= bar_Ymin && (mean + stdev) <= bar_Ymax) {
            stdev_xValue = i + (((mean + stdev) - (bar_Ymin + Half_class_width)) / Class_width);
          }
        }
        yHistoValues[i] = countNumber(yValues, bar_Ymin, bar_Ymax);
        if (max_count < yHistoValues[i]) { max_count = yHistoValues[i] }
        console.log('bar_Ymin= ' + bar_Ymin + ' bar_Ymax= ' + bar_Ymax);
        console.log('count values in bar: ' + yHistoValues[i]);
        bar_Ymin = bar_Ymin + Class_width;
        bar_Ymax = bar_Ymax + Class_width;
      }
    }
    yHistoValues[Nbr_classes] = max_count;
    yHistoValues[Nbr_classes + 1] = LSL_xValue;
    yHistoValues[Nbr_classes + 2] = USL_xValue;
    yHistoValues[Nbr_classes + 3] = mean_xValue;
    yHistoValues[Nbr_classes + 4] = stdev_xValue;
    return yHistoValues;
  };
  function build_Gauss_curve(xminGauss, xmaxGauss) {
    const Gaussian = new Array;
    const xpoints = new Array;
    const ypoints = new Array;
    const nbr_points = 31;
    const mean0 = 0;
    const sigma = 1;
    const xstep = (xmaxGauss - xminGauss) / (nbr_points - 1);
    var x = undefined;
    var y = undefined;

    for (let i = 0; i < nbr_points; i++) {
      xpoints[i] = xminGauss + (i * xstep);
      x = AI_round(xpoints[i], 4, 'false');
      ypoints[i] = NORMDIST(x, mean0, sigma);
      y = AI_round(ypoints[i], 4, 'false');
      var coordinates = { x: x, y: y };
      Gaussian.push(coordinates);
    }
    return Gaussian;
  };
  //-------------------------------------
  if (last > -1) {
    // find xValues
    xValues = find_histograsm_xValues(yValues);
    yHistoValues = find_histogram_yValues(xValues, yValues);
    var len_histo = yHistoValues.length;
    if (len_histo > 0) {
      max_count = yHistoValues[len_histo - 5];
      LSL_xValue = yHistoValues[len_histo - 4];
      USL_xValue = yHistoValues[len_histo - 3];
      mean_xValue = yHistoValues[len_histo - 2];
      stdev_xValue = yHistoValues[len_histo - 1];
      yHistoValues.splice(len_histo - 5, 5);
    }
    var max_count_scale = max_count * coeff;
    var Ymax = undefined;
    var Ymin = undefined;
    var xminGauss = undefined;
    var xmaxGauss = undefined;
    var len = xValues.length;
    if (len > 3) {
      Ymin = xValues[len - 2];
      Ymax = xValues[len - 1];

      if (stdev != 0) {
        xminGauss = -(mean - Ymin) / stdev;
        xmaxGauss = (Ymax - mean) / stdev;
      }
      xValues.splice(len - 4, 4);
    }
    Gaussian = build_Gauss_curve(xminGauss, xmaxGauss);
  }
  new Chart(canvasid, {

    data: {
      labels: xValues,
      datasets:
        [{
          type: "bar",
          backgroundColor: barColors,
          borderColor: barBorders,
          borderRadius: 6,
          borderWidth: 1,
          data: yHistoValues,
          categoryPercentage: categorypercent,
          barPercentage: barpercent,
          label: label,
          order: 2,
          hoverBackgroundColor: barColors,
          hoverBorderWidth: 4,
          hoverBorderRadius: 8,
        },
        {
          type: 'line',
          label: 'Ideal Gauss curve',
          borderColor: 'blue',
          backgroundColor: 'blue',
          tension: 0.5,
          data: Gaussian,
          xAxisID: 'xGaussian',
          yAxisID: 'yGaussian',
          order: 1,
          pointStyle: false,
          borderWidth: 2,
        },
        ]
    },
    options:
    {
      legend:
      {
        display: true
      },
      scales: {
        x: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Y values',
          },
          grid: {
            display: true,
            offset: false,
            width: 4
          },
        },
        xGaussian: {
          type: "linear",
          position: "top",
          min: xminGauss,
          max: xmaxGauss,
          display: false
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Frequency',
            font: {
              size: 14
            }
          },
          max: max_count_scale,
          ticks: {
            // For a category axis, the val is the index so the lookup via getLabelForValue is needed
            callback: function (val, index) {
              // Hide all tick labels above max_count
              return val <= max_count ? this.getLabelForValue(val) : '';
            },
          },
        },
        yGaussian: {
          type: "linear",
          min: 0,
          max: 0.399 * coeff,
          position: "right",
          display: false
        },
      },
      plugins:
      {
        title:
        {
          display: true,
          font: {
            size: 16,
          },
          text: 'Density Histogram of ' + CTQ_CTB_name
        },
        tooltip: {
          xAlign: 'center',
          yAlign: 'bottom',
          bodyFont: { weight: 'bold' },
          callbacks: {
            label: function (context) {
              var label = context.dataset.label || '';
              let datasetindex = context.datasetIndex;
              if (datasetindex == 0 && (context.chart.data.labels[context.dataIndex] < parseFloat(LSL) || context.chart.data.labels[context.dataIndex] > parseFloat(USL))) {
                label = ['Frequency: ' + context.parsed.y];
                label.push('Out of specification limits!');
              }
              else if (datasetindex == 0) {
                label = 'Frequency: ' + context.parsed.y;
              }
              else {
                label = ' y= ' + context.parsed.y;
              }
              return label;
            },
            title: function (context) {
              let dataset_index = context[0].datasetIndex; //magic is within context[0]!!
              let label = context[0].dataset.label || '';
              let title = '';
              let indexvalue = context[0].chart.data.labels[context[0].dataIndex];
              let class_min = AI_round((parseFloat(indexvalue) - Half_class_width), precision, true);
              let class_max = AI_round((parseFloat(indexvalue) + Half_class_width), precision, true);
              if (dataset_index == 0) {
                title = ['Class: [' + class_min + ', ' + class_max + ']'];
                title.push('centered on ' + indexvalue);
              }
              else {
                title = [label + ':'];
                title.push('      x: ' + context[0].parsed.x);
              }
              return title;
            },
          }
        },
        annotation: {
          annotations: {
            line1: {
              type: 'line',
              xMin: LSL_xValue,
              yMin: 0,
              xMax: LSL_xValue,
              yMax: max_count,
              borderColor: 'red',
              borderWidth: 3,
              label: {
                backgroundColor: 'rgba(0,0,0,0.9)',
                content: ['LSL=' + AI_round(parseFloat(LSL), precision, fixed)],
                display: true,
                position: 'end',
                //opacity: 0.5,
                font: {
                  size: 14
                }
              },
            },
            line2: {
              type: 'line',
              xMin: mean_xValue,
              yMin: 0,
              xMax: mean_xValue,
              yMax: max_count_scale,
              borderColor: 'blue',
              borderWidth: 3,
              arrowHeads: { end: { display: true, length: 12 } },
              label: {
                backgroundColor: 'rgba(0,0,0,0.9)',
                content: [meanlabel + '=' + AI_round(mean, precision, fixed)],
                display: true,
                position: 'end',
                //opacity: 0.5,
                font: {
                  size: 14
                },
                yAdjust: 14,
              },
            },
            line3: {
              type: 'line',
              xMin: USL_xValue,
              yMin: 0,
              xMax: USL_xValue,
              yMax: max_count,
              borderColor: 'red',
              borderWidth: 3,
              label: {
                backgroundColor: 'rgba(0,0,0,0.9)',
                content: ['USL=' + AI_round(parseFloat(USL), precision, fixed)],
                display: true,
                position: 'end',
                //opacity: 0.5,
                font: {
                  size: 14
                }
              },
            },
            line4: {
              type: 'line',
              xMin: mean_xValue,
              yMin: max_count * 0.241970725 / 0.3939,
              xMax: stdev_xValue,
              yMax: max_count * 0.241970725 / 0.3939,
              borderColor: 'blue',
              borderWidth: 3,
              arrowHeads: { end: { display: true, length: 10 } },
              label: {
                backgroundColor: 'rgba(0,0,0,0.9)',
                content: ['s=' + AI_round(stdev, precision + 1, fixed)],
                display: true,
                position: 'center',
                //opacity: 0.5,
                font: {
                  size: 14
                },
                yAdjust: -18,
              },
            },
          }
        }
      }
    }
  });
}
function M_Box_Plot(canvasid, last, yValues, label, mean, min, Q1, median, Q3, max, LSL, USL) {
  const barColors = ["blue"];
  const xValues = [''];
  if (last > -1) {
    var median_Q1 = median - Q1;
    var Q3_median = Q3 - median;
    var max_Q3 = max - Q3;
    var IQR = Q3 - Q1;
    var max_whisker = parseFloat(Q3) + (1.5 * IQR);
    var min_whisker = parseFloat(Q1) - (1.5 * IQR);
    min_whisker = Math.max(parseFloat(min), min_whisker);
    max_whisker = Math.min(parseFloat(max), max_whisker);
    var range = parseFloat(max) - parseFloat(min);
    var scale_min = parseFloat(min) - (range / 10);
    var scale_max = parseFloat(max) + (range / 10);
    var meanlabel = 'X\u0305';
  }
  new Chart(canvasid, {
    type: "bar",
    data: {
      labels: xValues,
      datasets: [{
        backgroundColor: 'transparent',
        data: [Q1],
        label: label + ' 1st quartile',
      },
      {
        backgroundColor: 'lightSkyBlue',
        borderColor: 'black',
        borderWidth: 2,
        data: [median_Q1],
        label: label + ' 2nd quartile',
      },
      {
        backgroundColor: 'lightSkyBlue',
        borderColor: 'black',
        borderWidth: 2,
        data: [Q3_median],
        label: label + ' 3rd quartile',
      },
      {
        backgroundColor: 'transparent',
        data: [max_Q3],
        label: label+ ' 4th quartile',
      },
      ]
    },
    options:
    {
      responsive: true,
      scales: {
        x: {
          stacked: true,
          grid: {display: false},
        },
        y: {
          min: scale_min,
          max: scale_max,
          stacked: true,
          grid: {display: false},
          title: {
            display: true,
            text: 'Y values',
            font: {
              size: 14
            }
          },
        }
      },
      plugins:
      {
        title:
        {
          display: true,
          font: {
            size: 16,
          },
          text: 'Box Plot of ' + CTQ_CTB_name,
        },
        legend:
        {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              var label = context.dataset.label || '';
              return label;
            },
          },
        },
        annotation: {
          annotations: {
            line0: {
              type: 'line',
              xMin: -0.361,
              yMin: Q1,
              xMax: 0.361,
              yMax: Q1,
              borderColor: 'black',
              borderWidth: 2,
              label: {
                backgroundColor: 'rgba(0,0,0,0.9)',
                content: ['Q1=' + AI_round(parseFloat(Q1), precision, fixed)],
                display: true,
                position: 'end',
                xAdjust: 50,
                //opacity: 0.5,
                font: {
                  size: 14
                }
              },
            },
            line1: {
              type: 'line',
              xMin: -0.361,
              yMin: median,
              xMax: 0.361,
              yMax: median,
              borderColor: 'black',
              borderWidth: 2,
              label: {
                backgroundColor: 'rgba(0,0,0,0.9)',
                content: ['Median=' + AI_round(parseFloat(median), precision, fixed)],
                display: true,
                position: 'end',
                xAdjust: 48,
                //opacity: 0.5,
                font: {
                  size: 14
                }
              },
            },
            line2: {
              type: 'line',
              xMin: -0.361,
              yMin: Q3,
              xMax: 0.361,
              yMax: Q3,
              borderColor: 'black',
              borderWidth: 2,
              label: {
                backgroundColor: 'rgba(0,0,0,0.9)',
                content: ['Q3=' + AI_round(parseFloat(Q3), precision, fixed)],
                display: true,
                position: 'end',
                xAdjust: 50,
                //opacity: 0.5,
                font: {
                  size: 14
                }
              },
            },
            line3: {
              type: 'line',
              xMin: -0.5,
              yMin: LSL,
              xMax: 0.5,
              yMax: LSL,
              borderColor: 'red',
              borderWidth: 3,
              label: {
                backgroundColor: 'rgba(0,0,0,0.9)',
                content: ['LSL=' + AI_round(parseFloat(LSL), precision, fixed)],
                display: true,
                position: 'end',
                //opacity: 0.5,
                font: {
                  size: 14
                }
              },
            },
            line4: {
              type: 'line',
              xMin: -0.5,
              yMin: USL,
              xMax: 0.5,
              yMax: USL,
              borderColor: 'red',
              borderWidth: 3,
              label: {
                backgroundColor: 'rgba(0,0,0,0.9)',
                content: ['USL=' + AI_round(parseFloat(USL), precision, fixed)],
                display: true,
                position: 'end',
                //opacity: 0.5,
                font: {
                  size: 14
                },
              },
            },
            line5: {
              type: 'line',
              xMin: 0,
              yMin: min_whisker,
              xMax: 0,
              yMax: Q1,
              borderColor: 'black',
              borderWidth: 2,
            },
            line6: {
              type: 'line',
              xMin: 0,
              yMin: Q3,
              xMax: 0,
              yMax: max_whisker,
              borderColor: 'black',
              borderWidth: 2,
            },
            point1: {
              type: 'point',
              pointStyle: 'star',
              xValue: 0,
              yValue: min,
              backgroundColor: 'rgba(255, 99, 132, 0.25)',
            },
            label1: {
              type: 'label',
              xValue: 0,
              yValue: min,
              content: ['Minimum=' + AI_round(parseFloat(min), precision, fixed)],
              display: true,
              yAdjust: 18,
              //opacity: 0.5,
              font: {
                size: 14
              },
            },
            point2: {
              type: 'point',
              pointStyle: 'star',
              xValue: 0,
              yValue: max,
              backgroundColor: 'rgba(255, 99, 132, 0.25)',
            },
            label2: {
              type: 'label',
              xValue: 0,
              yValue: max,
              content: ['Maximum=' + AI_round(parseFloat(max), precision, fixed)],
              yAdjust: -18,
              display: true,
              //opacity: 0.5,
              font: {
                size: 14
              },
            },
            point3: {
              type: 'point',
              pointStyle: 'rectRounded',
              xValue: 0,
              yValue: mean,
              backgroundColor: 'green',
            },
            label3: {
              type: 'label',
              xValue: 0,
              yValue: mean,
              content: [meanlabel + '=' + AI_round(parseFloat(mean),precision,fixed)],
              yAdjust: -18,
              display: true,
              //opacity: 0.5,
              font: {
                size: 14
              },
            },
          }
        }
      }
    }
  });
}
var x = "Hello M_basic_charts_script+js!";
console.log(x);
var LCL = mean - (3 * stdev);
var UCL = mean + (3 * stdev);
var Individuals = new Array;
Individuals = M_control_chart('Individual', 'myChart1', last, myfinal_Array, mean, LCL, UCL);
var label = myfinal_Array[0][1];
M_density_histogram('myChart2', last, Individuals, label, mean, stdev, LSL, USL, quartiles_display[0], quartiles_display[4]);
var Moving_Ranges = new Array;
Moving_Ranges = M_control_chart('Moving Range', 'myChart3', last, myfinal_Array, mean, LCL, UCL);
M_Box_Plot('myChart4', last, Individuals, label, mean, quartiles_display[0], Q1, median, Q3, quartiles_display[4], LSL, USL);