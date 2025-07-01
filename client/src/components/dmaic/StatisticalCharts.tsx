import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
  Bar
} from 'recharts';
import { BarChart3 } from 'lucide-react';

// Define interfaces for props
interface DataPoint {
  dataValue: number;
  // Add other properties as needed
}

interface ControlLimits {
  centerLine: number;
  ucl: number;
  lcl: number;
}

interface Quartiles {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
}

interface CapabilityData {
  lsl?: string;
  usl?: string;
}

interface StatisticalChartsProps {
  ctq: string;
  dataPoints: { [key: string]: DataPoint[] };
  capabilityData: { [key: string]: CapabilityData };
  // Utility functions - you'll need to pass these as props or import them
  calculateIndividualControlLimits: (values: number[]) => ControlLimits;
  calculateMovingRangeControlLimits: (values: number[]) => ControlLimits;
  calculateMovingRange: (values: number[]) => number[];
  getHistogramData: (values: number[], bins: number) => Array<{x: number, y: number}>;
  calculateQuartiles: (values: number[]) => Quartiles;
  mean: (values: number[]) => number;
  standardDeviation: (values: number[]) => number;
}

const StatisticalCharts: React.FC<StatisticalChartsProps> = ({
  ctq,
  dataPoints,
  capabilityData,
  calculateIndividualControlLimits,
  calculateMovingRangeControlLimits,
  calculateMovingRange,
  getHistogramData,
  calculateQuartiles,
  mean,
  standardDeviation
}) => {
  const currentPoints = dataPoints[ctq] || [];
  const numericValues = currentPoints.map(point => point.dataValue);
  
  if (numericValues.length < 3) {
    return (
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-green-600" />
          <h3 className="text-lg font-semibold">Statistical Charts</h3>
        </div>
        <div className="bg-white p-4 border rounded-lg">
          <p className="text-gray-600">Not enough data points to generate charts (minimum 3 required)</p>
        </div>
      </div>
    );
  }

  // Calculate limits first
  const individualLimits = calculateIndividualControlLimits(numericValues);
  const mrLimits = calculateMovingRangeControlLimits(numericValues);
  
  // Calculate Y-axis scale limits for Individual chart
  const dataRange = Math.max(...numericValues) - Math.min(...numericValues);
  const padding = dataRange / 10;
  
  const YscaleMin = Math.min(individualLimits.lcl, Math.min(...numericValues)) - padding;
  const YscaleMax = Math.max(individualLimits.ucl, Math.max(...numericValues)) + padding;

  // Prepare data for charts
  const individualData = numericValues.map((value, index) => ({
    point: index + 1,
    value: value,
    index: index + 1
  }));

  const movingRanges = calculateMovingRange(numericValues);
  // Calculate Y-axis scale limits for MR-chart
  const MR_Range = Math.max(...movingRanges) - Math.min(...movingRanges);
  const MRscale_padding = MR_Range / 10;
  
  const MR_YscaleMin = 0;
  const MR_YscaleMax = Math.max(mrLimits.ucl, Math.max(...movingRanges)) + MRscale_padding;

  const movingRangeData = movingRanges.map((range, index) => ({
    point: index + 2, // MR starts from point 2
    value: range,
    index: index + 2
  }));

  const histogramData = getHistogramData(numericValues, 8);
  const quartiles = calculateQuartiles(numericValues);

  // Calculate Gaussian curve data
  const dataMean = mean(numericValues);
  const dataStdDev = standardDeviation(numericValues);
  const lsl = capabilityData[ctq]?.lsl ?? capabilityData[ctq]?.lsl;
  const usl = capabilityData[ctq]?.usl ?? capabilityData[ctq]?.usl;
  const gaussMinValue = lsl ? Math.min(Math.min(...numericValues), parseFloat(lsl!)) : Math.min(...numericValues);
  const gaussMaxValue = usl ? Math.max(Math.max(...numericValues), parseFloat(usl!)) : Math.max(...numericValues);
  const gaussRange = gaussMaxValue - gaussMinValue;
  const gaussianPadding = gaussRange * 0.05;
  const domainMin = gaussMinValue - gaussianPadding;
  const domainMax = gaussMaxValue + gaussianPadding;
  
  // Find maximum frequency to scale the Gaussian curve
  const maxFrequency = Math.max(...histogramData.map(d => d.y));
  
  // Generate Gaussian curve points and combine with histogram data
  const combinedHistogramData = histogramData.map(bar => {
    const x = bar.x;
    // Calculate normal distribution probability density
    const exponent = -0.5 * Math.pow((x - dataMean) / dataStdDev, 2);
    const probability = (1 / (dataStdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
    // Scale the probability to match histogram frequency scale
    const scaledY = probability * maxFrequency * dataStdDev * Math.sqrt(2 * Math.PI) * 0.8;
    
    return {
      ...bar,
      gaussian: scaledY
    };
  });

  // For box plot (no padding)
  const XscaleMin = gaussMinValue;
  const XscaleMax = gaussMaxValue;
  const boxplotRangewithLSL_USL = XscaleMax - XscaleMin;

  const lslpos = 100 * (parseFloat(lsl || '0') - XscaleMin)/ boxplotRangewithLSL_USL;
  const uslpos = 100 * (parseFloat(usl || '0') - XscaleMin) / boxplotRangewithLSL_USL;
  const minDatapos = 100 * (Math.min(...numericValues) - XscaleMin) / boxplotRangewithLSL_USL;
  const Q1pos = 100 * (quartiles.q1 - XscaleMin) / boxplotRangewithLSL_USL;
  const Medianpos = 100 * (quartiles.median - XscaleMin) / boxplotRangewithLSL_USL;
  const Q3pos = 100 * (quartiles.q3 - XscaleMin) / boxplotRangewithLSL_USL;
  const maxDatapos = 100 * (Math.max(...numericValues) - XscaleMin) / boxplotRangewithLSL_USL;
  const dataMeanpos = 100 * (dataMean - XscaleMin) / boxplotRangewithLSL_USL;

  //const lslpos = 100 * (parseFloat(lsl || '0') - quartiles.min) / dataRange;
  //const uslpos = 100 * (parseFloat(usl || '0') - quartiles.min) / dataRange;

  // Box plot data
  const boxPlotData = [
    {
      name: ctq,
      min: quartiles.min,
      q1: quartiles.q1,
      median: quartiles.median,
      q3: quartiles.q3,
      max: quartiles.max,
      outliers: [], // Could add outlier detection later
    }
  ];

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-5 w-5 text-green-600" />
        <h3 className="text-lg font-semibold">Statistical Charts</h3>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Individual Control Chart (I Chart) */}
        <div className="bg-white p-4 border rounded-lg">
          <h4 className="font-medium text-gray-800 mb-3">Individual Control Chart (I-Chart) of {ctq}</h4>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={individualData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="point" label={{ value: 'Data Point', position: 'insideBottom', offset: -5 }} />
              <YAxis 
                label={{ value: 'Individual Value', angle: -90, position: 'insideBottomLeft' }}
                domain={[YscaleMin, YscaleMax]}
                tickFormatter={(value) => {
                // Custom formatting logic:
                // 1. Fixed decimals:
                return value.toFixed(2); // Always show 2 decimals                
                // 2. Dynamic decimals based on value:
                // return value % 1 === 0 ? value.toString() : value.toFixed(2);
                }}
              />
              <Tooltip 
                formatter={(value: any, name: any, props: any) => {
                  const dataValue = Number(value);
                  const isSpecialCause = dataValue > individualLimits.ucl || dataValue < individualLimits.lcl;
                  
                  const result = [dataValue.toFixed(3), 'Value'];
                  
                  if (isSpecialCause) {
                    const violationType = dataValue > individualLimits.ucl ? 'above UCL' : 'below LCL';
                    return [
                      `${dataValue.toFixed(3)} (${violationType})`,
                      'Value - Rule 1: Special Cause Variation'
                    ];
                  }
                  
                  return result;
                }}
                labelFormatter={(label) => `Data Point: ${label}`}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }}
              />
              <ReferenceLine 
                y={individualLimits.centerLine} 
                stroke="#2563eb" 
                strokeDasharray="8 8" 
                label={{ 
                  value: `X̄=${individualLimits.centerLine.toFixed(3)}`, 
                  position: "insideTopLeft",
                  style: { fill: "#2563eb", fontWeight: "bold", fontSize: "12px" }
                }} 
              />
              <ReferenceLine 
                y={individualLimits.ucl} 
                stroke="#dc2626" 
                label={{ 
                  value: `UCL=${individualLimits.ucl.toFixed(3)}`, 
                  position: "insideTopLeft",
                  style: { fill: "#dc2626", fontWeight: "bold", fontSize: "12px" }
                }} 
              />
              <ReferenceLine 
                y={individualLimits.lcl} 
                stroke="#dc2626" 
                label={{ 
                  value: `LCL=${individualLimits.lcl.toFixed(3)}`, 
                  position: "insideBottomLeft",
                  style: { fill: "#dc2626", fontWeight: "bold", fontSize: "12px" }
                }} 
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#059669" 
                strokeWidth={2}
                dot={(props) => {
                  const { payload, cx, cy } = props;
                  if (!payload) return null;
                  
                  const dataValue = payload.value;
                  const isSpecialCause = dataValue > individualLimits.ucl || dataValue < individualLimits.lcl;
                  
                  if (isSpecialCause) {
                    return (
                      <rect
                        x={cx - 4}
                        y={cy - 4}
                        width={8}
                        height={8}
                        fill="black"
                        stroke="black"
                        strokeWidth={1}
                      />
                    );
                  } else {
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={3}
                        fill="#059669"
                        stroke="#059669"
                        strokeWidth={1}
                      />
                    );
                  }
                }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="text-xs text-gray-600 mt-2">
            CL: {individualLimits.centerLine.toFixed(3)} | 
            UCL: {individualLimits.ucl.toFixed(3)} | 
            LCL: {individualLimits.lcl.toFixed(3)} 
          </div>
        </div>

        {/* Density Histogram with Gaussian Overlay */}
        <div className="bg-white p-4 border rounded-lg">
          <h4 className="font-medium text-gray-800 mb-3">Density Histogram with Normal Distribution of {ctq}</h4>
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={combinedHistogramData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="x" 
                label={{ value: 'Value', position: 'insideBottom', offset: -5 }}
                tickFormatter={(value) => Number(value).toFixed(2)}
                type="number"
                domain={[domainMin, domainMax]}
              />
              <YAxis label={{ value: 'Frequency', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                formatter={(value: any, name: string) => {
                  if (name === 'y') return [value, 'Observed Frequency'];
                  if (name === 'gaussian') return [Number(value).toFixed(2), 'Normal Distribution'];
                  return [value, name];
                }}
                labelFormatter={(value) => `Value: ${Number(value).toFixed(3)}`}
              />
              
              <Bar dataKey="y" fill="#3b82f6" name="Observed Frequency" />
              <Line 
                type="monotone" 
                dataKey="gaussian" 
                stroke="#1e40af" 
                strokeWidth={3}
                dot={false}
                name="Normal Distribution"
              />
              
              {/* Mean vertical line */}
              <ReferenceLine 
                x={dataMean} 
                stroke="green" 
                strokeWidth={2}
                label={{ 
                  value: `Mean: ${dataMean.toFixed(3)}`, 
                  position: "insideTop",
                  style: { fill: "#dc2626", fontWeight: "bold", fontSize: "11px" }
                }} 
              />

              {/* LSL */}
              {lsl && (
                <ReferenceLine 
                  x={parseFloat(lsl)} 
                  stroke="red"
                  strokeWidth={3}
                  label={{ 
                    value: `LSL: ${lsl}`, 
                    position: "insideTop",
                    style: { fill: "#dc2626", fontWeight: "bold", fontSize: "10px" }
                  }} 
                />
              )}
              
              {/* USL */}
              {usl && (
                <ReferenceLine 
                  x={parseFloat(usl)} 
                  stroke="red"
                  strokeWidth={3}
                  label={{ 
                    value: `USL: ${usl}`, 
                    position: "insideTop",
                    style: { fill: "#dc2626", fontWeight: "bold", fontSize: "10px" }
                  }} 
                />
              )}
              
              {/* Standard deviation lines */}
              <ReferenceLine 
                x={dataMean + dataStdDev} 
                stroke="#059669" 
                strokeWidth={1}
                strokeDasharray="3 3"
                label={{ 
                  value: `+1σ: ${(dataMean + dataStdDev).toFixed(3)}`, 
                  position: "middle",
                  style: { fill: "black", fontWeight: "bold", fontSize: "10px" }
                }} 
              />
              
              <ReferenceLine 
                x={dataMean - dataStdDev} 
                stroke="#059669" 
                strokeWidth={1}
                strokeDasharray="3 3"
                label={{ 
                  value: `-1σ: ${(dataMean - dataStdDev).toFixed(3)}`, 
                  position: "middle",
                  style: { fill: "black", fontWeight: "bold", fontSize: "10px" }
                }} 
              />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="text-xs text-gray-600 mt-2">
            <div>Mean: {mean(numericValues).toFixed(3)} | Std Dev: {standardDeviation(numericValues).toFixed(3)} | LSL: {lsl} | USL: {usl}</div>
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500"></div>
                <span>Observed Data</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-1 bg-blue-800"></div>
                <span>Normal Distribution</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-1 bg-green-600 border-dashed border-t-2"></div>
                <span>Mean</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-1 bg-green-600 border-dashed border-t-2"></div>
                <span>±1σ</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-1 bg-red-600 border-dashed border-t-2"></div>
                <span>LSL</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-1 bg-red-600 border-dashed border-t-2"></div>
                <span>USL</span>
              </div>
            </div>
          </div>
        </div>

        {/* Moving Range Control Chart (MR Chart) */}
        <div className="bg-white p-4 border rounded-lg">
          <h4 className="font-medium text-gray-800 mb-3">Moving Range Control Chart (MR-Chart) of {ctq}</h4>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={movingRangeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="point" label={{ value: 'Data Point', position: 'insideBottom', offset: -5 }} />
              <YAxis 
                label={{ value: 'Moving Range', angle: -90, position: 'insideBottomLeft' }}
                domain={[MR_YscaleMin, MR_YscaleMax]}
                tickFormatter={(value) => {
                // Custom formatting logic:
                // 1. Fixed decimals:
                return value.toFixed(3); // Always show 2 decimals                
                // 2. Dynamic decimals based on value:
                // return value % 1 === 0 ? value.toString() : value.toFixed(2);
                }}
              />
              <Tooltip 
                formatter={(value: any, name: any, props: any) => {
                  const dataValue = Number(value);
                  const isSpecialCause = dataValue > mrLimits.ucl || dataValue < mrLimits.lcl;
                  
                  const result = [dataValue.toFixed(3), 'Moving Range'];
                  
                  if (isSpecialCause) {
                    const violationType = dataValue > mrLimits.ucl ? 'above UCL' : 'below LCL';
                    return [
                      `${dataValue.toFixed(3)} (${violationType})`,
                      'Moving Range - Rule 1: Special Cause Variation'
                    ];
                  }
                  
                  return result;
                }}
                labelFormatter={(label) => `Data Point: ${label}`}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }}
              />
              <ReferenceLine 
                y={mrLimits.centerLine} 
                stroke="#2563eb" 
                strokeDasharray="8 8" 
                label={{ 
                  value: `MR̄=${mrLimits.centerLine.toFixed(3)}`, 
                  position: "insideTopLeft",
                  style: { fill: "#2563eb", fontWeight: "bold", fontSize: "12px" }
                }} 
              />
              <ReferenceLine 
                y={mrLimits.ucl} 
                stroke="#dc2626" 
                label={{ 
                  value: `UCL=${mrLimits.ucl.toFixed(3)}`, 
                  position: "insideTopLeft",
                  style: { fill: "#dc2626", fontWeight: "bold", fontSize: "12px" }
                }} 
              />
              <ReferenceLine 
                y={mrLimits.lcl} 
                stroke="#dc2626" 
                label={{ 
                  value: `LCL=${mrLimits.lcl.toFixed(3)}`, 
                  position: "insideBottomLeft",
                  style: { fill: "#dc2626", fontWeight: "bold", fontSize: "12px" }
                }} 
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#7c3aed" 
                strokeWidth={2}
                dot={(props) => {
                  const { payload, cx, cy } = props;
                  if (!payload) return null;
                  
                  const dataValue = payload.value;
                  const isSpecialCause = dataValue > mrLimits.ucl || dataValue < mrLimits.lcl;
                  
                  if (isSpecialCause) {
                    return (
                      <rect
                        x={cx - 4}
                        y={cy - 4}
                        width={8}
                        height={8}
                        fill="blue"
                        stroke="blue"
                        strokeWidth={1}
                      />
                    );
                  } else {
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={3}
                        fill="#7c3aed"
                        stroke="#7c3aed"
                        strokeWidth={1}
                      />
                    );
                  }
                }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="text-xs text-gray-600 mt-2">
            CL: {mrLimits.centerLine.toFixed(3)} | 
            UCL: {mrLimits.ucl.toFixed(3)} | 
            LCL: {mrLimits.lcl.toFixed(3)}
          </div>
        </div>

        {/* Box Plot */}
        <div className="bg-white p-4 border rounded-lg">
          <h4 className="font-medium text-gray-800 mb-3">Box Plot of {ctq}</h4>
          <div className="h-[250px] flex items-center justify-center">
            <div className="relative w-full max-w-md">
              <div className="relative h-32 bg-gray-50 border rounded">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-3/4 h-8">
                    {/* Whiskers */}
                    <div 
                      className="absolute h-0.5 bg-gray-600"
                      style={{
                        left: `${minDatapos}%`,
                        width: `${maxDatapos-minDatapos}%`,
                        top: '50%',
                        transform: 'translateY(-50%)'
                      }}
                    />
                    
                    {/* Min line */}
                    <div 
                      className="absolute w-0.5 h-4 bg-gray-600"
                      title={`Min: ${quartiles.min.toFixed(3)}`}
                      style={{ left: `${minDatapos}%`, top: '25%' }}
                    />

                    {/* LSL line */}
                    {lsl && lslpos !== null && lslpos >= 0 && lslpos <= 100 && (
                    <div>
                      <div 
                      className="absolute w-0.5 h-full bg-red-600"
                      title={`LSL: ${lsl}`}
                      style={{ left: `${lslpos}%`, height: '100%' }}
                      />
                      <div 
                      className="absolute text-xs font-semibold text-red-600 bg-white px-1 py-0.5 rounded shadow border"
                      style={{ 
                        left: `${Math.max(0, Math.min(85, lslpos))}%`,
                        top: '-28px',
                        transform: lslpos > 85 ? 'translateX(12.5%)' : lslpos < 15 ? 'translateX(-50%)' : 'translateX(-50%)',
                        whiteSpace: 'nowrap',
                        zIndex: 10
                      }}
                    >
                      LSL: {lsl}
                      </div>
                    </div>
                    )}

                    {/* Q1-Q3 Box */}
                    <div 
                      className="absolute h-full bg-blue-200 border border-2 border-blue-400"
                      style={{
                        left: `${Q1pos}%`,
                        width: `${Q3pos-Q1pos}%`
                      }}
                    />
                    
                    {/* Q1 line */}
                    <div 
                      className="absolute w-0.5 h-full bg-gray-600"
                      title={`Q1: ${quartiles.q1.toFixed(3)}`}
                      style={{ left: `${Q1pos}%`, top: '0%' }}
                    />
                    
                    {/* Median line */}
                    <div 
                      className="absolute w-0.5 h-full bg-blue-400"
                      title={`Median: ${quartiles.median.toFixed(3)}`}
                      style={{
                        left: `${Medianpos}%`,
                        top: '0%'
                      }}
                    />
                                                      
                    {/* Q3 line */}
                    <div 
                      className="absolute w-0.5 h-full bg-gray-600"
                      title={`Q3: ${quartiles.q3.toFixed(3)}`}
                      style={{ left: `${Q3pos}%`, top: '0%' }}
                    />
                                                      
                    {/* USL line */}
                    {usl && uslpos !== null && uslpos >= 0 && uslpos <= 100 && (
                    <div>
                      <div 
                      className="absolute w-0.5 h-full bg-red-600"
                      title={`USL: ${usl}`}
                      style={{ left: `${uslpos}%`, top: '0%' }}
                      />
                  
                    <div 
                      className="absolute text-xs font-semibold text-red-600 bg-white px-1 py-0.5 rounded shadow border"
                      style={{ 
                        left: `${Math.max(0, Math.min(85, uslpos))}%`,
                        top: '-28px',
                        transform: uslpos > 85 ? 'translateX(12.5%)' : uslpos < 15 ? 'translateX(-50%)' : 'translateX(-50%)',
                        whiteSpace: 'nowrap',
                        zIndex: 10
                      }}
                      >
                      USL: {usl}
                      </div>
                    </div>
                    )}
                    
                    {/* Max line */}
                    <div 
                      className="absolute w-0.5 h-4 bg-gray-600"
                      title={`Max: ${quartiles.max.toFixed(3)}`}
                      style={{ right: `${100-maxDatapos}%`, top: '25%' }}
                    />
                    
                    {/* Mean marker */}
                    <div 
                      className="absolute flex items-center justify-center w-3 h-3 bg-blue-500 text-white text-xs font-bold rounded-full pt-[3px]"
                      style={{
                        left: `${dataMeanpos}%`,
                        top: '25%',
                        transform: 'translateX(-50%)'
                      }}
                      title={`Mean: ${dataMean.toFixed(3)}`}
                    >
                      *
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Labels */}
              <div className="flex justify-between text-xs text-gray-600 mt-2 pl-4 pr-4">
                <span>Min: {quartiles.min.toFixed(2)}</span>
                <span>Q1: {quartiles.q1.toFixed(2)}</span>
                <span>Med: {quartiles.median.toFixed(2)}</span>
                <span>Q3: {quartiles.q3.toFixed(2)}</span>
                <span>Max: {quartiles.max.toFixed(2)}</span>
              </div>
              <div className="text-center text-xs text-orange-600 mt-1">
                <span className="inline-flex items-center gap-1">
                  <span className="w-3 h-3 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center pt-[3px]">*</span>
                  Mean: {dataMean.toFixed(3)} | LSL: {lsl} | USL: {usl}
                </span>
                <span><br></br>IQR [Q3-Q1]: {(quartiles.q3-quartiles.q1).toFixed(3)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticalCharts;