/**
 * Process Capability Statistical Calculations
 * Supports both Continuous and Attribute CTQ analysis
 */

import { mean, standardDeviation } from 'simple-statistics';

export interface ContinuousCapabilityData {
  dataPoints: number[];
  lsl: number;
  usl: number;
  target?: number;
  zShift: number;
  dataSetTerm: 'Long Term' | 'Short Term';
}

export interface ContinuousCapabilityResults {
  sampleSize: number;
  mean: number;
  standardDeviation: number;
  cp: number;
  cpk: number;
  pp: number;
  ppk: number;
  sigma: number;
  dpmo: number;
  processYield: number;
  withinTolerance: number;
  aboveTolerance: number;
  belowTolerance: number;
}

export interface AttributeCapabilityData {
  calculationType: 'DPMO' | 'DPU' | 'YRT' | 'OEE';
  zShift: number;
  dataSetTerm: 'Long Term' | 'Short Term';
  
  // DPMO/DPU fields
  totalUnits?: number;
  defectiveUnits?: number;
  totalDefects?: number;
  opportunities?: number;
  
  // OEE fields
  availability?: number;
  performance?: number;
  quality?: number;
  
  // YRT fields
  stepYields?: number[];
}

export interface AttributeCapabilityResults {
  dpmo?: number;
  dpu?: number;
  processYield?: number;
  sigma?: number;
  oeeValue?: number;
  rolledThroughputYield?: number;
  availability?: number;
  performance?: number;
  quality?: number;
}

/**
 * Calculate Continuous Process Capability Statistics
 */
export function calculateContinuousCapability(data: ContinuousCapabilityData): ContinuousCapabilityResults {
  const { dataPoints, lsl, usl, zShift } = data;
  
  if (dataPoints.length === 0) {
    throw new Error('No data points provided');
  }
  
  const sampleSize = dataPoints.length;
  const processMean = mean(dataPoints);
  const processStd = standardDeviation(dataPoints);
  
  // Calculate specification width
  const specWidth = usl - lsl;
  const processWidth = 6 * processStd; // 6-sigma process width
  
  // Process Capability Indices
  const cp = specWidth / processWidth;
  
  // CPK calculation (capability relative to closest spec limit)
  const cpkUpper = (usl - processMean) / (3 * processStd);
  const cpkLower = (processMean - lsl) / (3 * processStd);
  const cpk = Math.min(cpkUpper, cpkLower);
  
  // Process Performance Indices (same as CP/CPK for now)
  const pp = cp;
  const ppk = cpk;
  
  // Count parts within/outside tolerance
  const withinTolerance = dataPoints.filter(x => x >= lsl && x <= usl).length;
  const belowTolerance = dataPoints.filter(x => x < lsl).length;
  const aboveTolerance = dataPoints.filter(x => x > usl).length;
  
  // Process yield
  const processYield = (withinTolerance / sampleSize) * 100;
  
  // Sigma level calculation
  const sigma = cpk * 3 + zShift;
  
  // DPMO calculation
  const defectRate = 1 - (processYield / 100);
  const dpmo = Math.round(defectRate * 1000000);
  
  return {
    sampleSize,
    mean: processMean,
    standardDeviation: processStd,
    cp,
    cpk,
    pp,
    ppk,
    sigma,
    dpmo,
    processYield,
    withinTolerance,
    belowTolerance,
    aboveTolerance
  };
}

/**
 * Calculate Attribute Process Capability Statistics
 */
export function calculateAttributeCapability(data: AttributeCapabilityData): AttributeCapabilityResults {
  const { calculationType } = data;
  
  switch (calculationType) {
    case 'DPMO':
      return calculateDPMO(data);
    case 'DPU':
      return calculateDPU(data);
    case 'YRT':
      return calculateYRT(data);
    case 'OEE':
      return calculateOEE(data);
    default:
      throw new Error(`Unknown calculation type: ${calculationType}`);
  }
}

/**
 * Calculate DPMO (Defects Per Million Opportunities)
 */
function calculateDPMO(data: AttributeCapabilityData): AttributeCapabilityResults {
  const { totalUnits = 0, totalDefects = 0, opportunities = 1, zShift } = data;
  
  if (totalUnits === 0 || opportunities === 0) {
    return { dpmo: 0, processYield: 100, sigma: 0 };
  }
  
  const totalOpportunities = totalUnits * opportunities;
  const dpmo = (totalDefects / totalOpportunities) * 1000000;
  const processYield = ((totalOpportunities - totalDefects) / totalOpportunities) * 100;
  
  // Convert DPMO to Sigma level
  const defectRate = dpmo / 1000000;
  const sigma = Math.max(0, sigmaToDPMOInverse(defectRate) + zShift);
  
  return {
    dpmo: Math.round(dpmo),
    processYield,
    sigma
  };
}

/**
 * Calculate DPU (Defects Per Unit)
 */
function calculateDPU(data: AttributeCapabilityData): AttributeCapabilityResults {
  const { totalUnits = 0, totalDefects = 0, zShift } = data;
  
  if (totalUnits === 0) {
    return { dpu: 0, processYield: 100, sigma: 0 };
  }
  
  const dpu = totalDefects / totalUnits;
  const processYield = Math.max(0, (1 - dpu) * 100);
  
  // Convert DPU to Sigma level (approximation)
  const defectRate = Math.min(0.999999, dpu);
  const sigma = Math.max(0, sigmaToDPMOInverse(defectRate) + zShift);
  
  return {
    dpu,
    processYield,
    sigma
  };
}

/**
 * Calculate YRT (Rolled Throughput Yield)
 */
function calculateYRT(data: AttributeCapabilityData): AttributeCapabilityResults {
  const { stepYields = [], zShift } = data;
  
  if (stepYields.length === 0) {
    return { rolledThroughputYield: 100, sigma: 0 };
  }
  
  // Convert percentages to decimals and calculate RTY
  const decimalYields = stepYields.map(y => y / 100);
  const rolledThroughputYield = decimalYields.reduce((acc, yieldValue) => acc * yieldValue, 1) * 100;
  
  // Convert RTY to Sigma level
  const defectRate = 1 - (rolledThroughputYield / 100);
  const sigma = Math.max(0, sigmaToDPMOInverse(defectRate) + zShift);
  
  return {
    rolledThroughputYield,
    sigma
  };
}

/**
 * Calculate OEE (Overall Equipment Effectiveness)
 */
function calculateOEE(data: AttributeCapabilityData): AttributeCapabilityResults {
  const { availability = 0, performance = 0, quality = 0, zShift } = data;
  
  // OEE = Availability × Performance × Quality
  const oeeValue = (availability / 100) * (performance / 100) * (quality / 100) * 100;
  
  // Convert OEE to Sigma level (approximation)
  const defectRate = 1 - (oeeValue / 100);
  const sigma = Math.max(0, sigmaToDPMOInverse(defectRate) + zShift);
  
  return {
    oeeValue,
    availability,
    performance,
    quality,
    sigma
  };
}

/**
 * Approximate inverse normal CDF for sigma calculation
 */
function sigmaToDPMOInverse(defectRate: number): number {
  if (defectRate <= 0) return 6;
  if (defectRate >= 1) return -6;
  
  // Simple approximation for common sigma levels
  if (defectRate >= 0.5) return 0;
  if (defectRate >= 0.308) return 0.5;
  if (defectRate >= 0.159) return 1;
  if (defectRate >= 0.067) return 1.5;
  if (defectRate >= 0.023) return 2;
  if (defectRate >= 0.007) return 2.5;
  if (defectRate >= 0.0013) return 3;
  if (defectRate >= 0.00023) return 3.5;
  if (defectRate >= 0.000032) return 4;
  if (defectRate >= 0.0000029) return 4.5;
  if (defectRate >= 0.00000019) return 5;
  if (defectRate >= 0.0000000096) return 5.5;
  return 6;
}

/**
 * Convert Sigma level to DPMO
 */
export function sigmaToDPMO(sigma: number, zShift: number = 1.5): number {
  const adjustedSigma = sigma - zShift;
  
  // Standard sigma to DPMO conversion table
  const sigmaTable: { [key: number]: number } = {
    6: 3.4,
    5.5: 32,
    5: 233,
    4.5: 1350,
    4: 6210,
    3.5: 22750,
    3: 66807,
    2.5: 158655,
    2: 308538,
    1.5: 500000,
    1: 691462,
    0.5: 841345,
    0: 933193
  };
  
  // Find closest sigma level
  const closestSigma = Object.keys(sigmaTable)
    .map(Number)
    .reduce((prev, curr) => 
      Math.abs(curr - adjustedSigma) < Math.abs(prev - adjustedSigma) ? curr : prev
    );
  
  return Math.round(sigmaTable[closestSigma] || 933193);
}