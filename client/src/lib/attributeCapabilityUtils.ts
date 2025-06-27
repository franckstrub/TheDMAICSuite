// Attribute CTQ Process Capability Utilities for Lean Six Sigma calculations

/**
 * Calculate Non Conformity metrics for attribute data
 * @param defects Number of defects found
 * @param opportunities Number of opportunities for defects
 * @returns Non conformity rate and related metrics
 */
export function calculateNonConformity(defects: number, opportunities: number): {
  nonConformityRate: number;
  conformityRate: number;
  defectRate: number;
} {
  if (opportunities === 0) {
    return {
      nonConformityRate: 0,
      conformityRate: 100,
      defectRate: 0
    };
  }

  const nonConformityRate = (defects / opportunities) * 100;
  const conformityRate = 100 - nonConformityRate;
  const defectRate = defects / opportunities;

  return {
    nonConformityRate: Math.max(0, Math.min(100, nonConformityRate)),
    conformityRate: Math.max(0, Math.min(100, conformityRate)),
    defectRate: Math.max(0, defectRate)
  };
}

/**
 * Calculate DPMO (Defects Per Million Opportunities)
 * @param defects Number of defects found
 * @param units Number of units inspected
 * @param opportunitiesPerUnit Number of opportunities for defects per unit
 * @returns DPMO and related metrics
 */
export function calculateDPMO(defects: number, units: number, opportunitiesPerUnit: number): {
  dpmo: number;
  dpu: number;
  dpo: number;
  totalOpportunities: number;
} {
  if (units === 0 || opportunitiesPerUnit === 0) {
    return {
      dpmo: 0,
      dpu: 0,
      dpo: 0,
      totalOpportunities: 0
    };
  }

  const totalOpportunities = units * opportunitiesPerUnit;
  const dpu = defects / units; // Defects Per Unit
  const dpo = defects / totalOpportunities; // Defects Per Opportunity
  const dpmo = dpo * 1000000; // Defects Per Million Opportunities

  return {
    dpmo: Math.max(0, dpmo),
    dpu: Math.max(0, dpu),
    dpo: Math.max(0, dpo),
    totalOpportunities
  };
}

/**
 * Calculate Rolled Throughput Yield
 * @param processSteps Array of process steps with their yield rates
 * @returns Rolled Throughput Yield and related metrics
 */
export function calculateRolledThroughputYield(processSteps: Array<{
  stepName: string;
  passed: number | null;
  total: number;
}>): {
  rty: number;
  rtyPercentage: number;
  individualYields: Array<{
    stepName: string;
    yield: number;
    yieldPercentage: number;
  }>;
  totalDefects: number;
  totalUnits: number;
} {
  if (processSteps.length === 0) {
    return {
      rty: 1,
      rtyPercentage: 100,
      individualYields: [],
      totalDefects: 0,
      totalUnits: 0
    };
  }

  let rty = 1;
  const individualYields = processSteps.map(step => {
    const passedUnits = step.passed !== null ? (step.passed || 0) : 0;
    const yieldRate = step.total > 0 ? passedUnits / step.total : 0;
    rty *= yieldRate;
    return {
      stepName: step.stepName,
      yield: yieldRate,
      yieldPercentage: yieldRate * 100
    };
  });

  const totalDefects = processSteps.reduce((sum, step) => {
    const passedUnits = step.passed !== null ? (step.passed || 0) : 0;
    return sum + (step.total - passedUnits);
  }, 0);
  const totalUnits = processSteps.reduce((sum, step) => sum + step.total, 0);

  return {
    rty: Math.max(0, Math.min(1, rty)),
    rtyPercentage: Math.max(0, Math.min(100, rty * 100)),
    individualYields,
    totalDefects,
    totalUnits
  };
}

/**
 * Calculate Overall Equipment Effectiveness (OEE) from production inputs
 * @param scheduledTime Total scheduled production time in hours
 * @param availableTime Available time for production in hours
 * @param goodCount Good count (parts per hour)
 * @param nominalCapacity Nominal production capacity (parts per hour)
 * @param partsManufactured Total number of parts manufactured
 * @param badCounts Number of bad/defective parts (default: 0)
 * @returns OEE and related metrics
 */
export function calculateOEE(
  scheduledTime: number,
  availableTime: number,
  nominalCapacity: number,
  partsManufactured: number,
  badParts: number = 0
): {
  oee: number;
  oeePercentage: number;
  availability: number;
  availabilityPercentage: number;
  performance: number;
  performancePercentage: number;
  quality: number;
  qualityPercentage: number;
  classification: string;
} {
  // Calculate OEE components from production inputs
  // Good count is automatically calculated from parts manufactured minus bad parts
  const goodCount = Math.max(0, partsManufactured - badParts);
  
  const availability = scheduledTime > 0 ? availableTime / scheduledTime : 0;
  const performance = (nominalCapacity > 0 && availableTime > 0) ? 
    partsManufactured / (nominalCapacity * availableTime) : 0;
  const quality = partsManufactured > 0 ? 
    goodCount / partsManufactured : 1;
  
  const oee = availability * performance * quality;
  
  let classification = "Poor";
  if (oee >= 0.85) classification = "World Class";
  else if (oee >= 0.65) classification = "Good";
  else if (oee >= 0.40) classification = "Fair";

  return {
    oee: Math.max(0, Math.min(1, oee)),
    oeePercentage: Math.max(0, Math.min(100, oee * 100)),
    availability: Math.max(0, Math.min(1, availability)),
    availabilityPercentage: Math.max(0, Math.min(100, availability * 100)),
    performance: Math.max(0, Math.min(1, performance)),
    performancePercentage: Math.max(0, Math.min(100, performance * 100)),
    quality: Math.max(0, Math.min(1, quality)),
    qualityPercentage: Math.max(0, Math.min(100, quality * 100)),
    classification
  };
}

/**
 * Calculate Pareto analysis for defects
 * @param defectCategories Array of defect categories with their counts
 * @returns Pareto analysis with cumulative percentages
 */
/**
 * Calculate DPU (Defects per Unit) analysis
 * @param defects Number of defects
 * @param units Number of units
 * @returns DPU calculation results
 */
export function calculateDPU(
  defects: number = 0,
  units: number = 0
): {
  dpu: number;
  classification: string;
  interpretation: string;
} {
  if (units === 0) {
    return {
      dpu: 0,
      classification: "No Data",
      interpretation: "Cannot calculate DPU without units"
    };
  }

  const dpu = defects / units;
  
  let classification = "Excellent";
  let interpretation = "";

  if (dpu === 0) {
    classification = "Perfect";
    interpretation = "Zero defects per unit - perfect quality";
  } else if (dpu <= 0.01) {
    classification = "Excellent";
    interpretation = "Very low defect rate - excellent quality";
  } else if (dpu <= 0.05) {
    classification = "Good";
    interpretation = "Low defect rate - good quality";
  } else if (dpu <= 0.1) {
    classification = "Fair";
    interpretation = "Moderate defect rate - improvement needed";
  } else {
    classification = "Poor";
    interpretation = "High defect rate - significant improvement required";
  }

  return {
    dpu: Math.max(0, dpu),
    classification,
    interpretation
  };
}

export function calculateParetoOfDefects(defectCategories: Array<{
  category: string;
  count: number;
}>): {
  sortedCategories: Array<{
    category: string;
    count: number;
    percentage: number;
    cumulativePercentage: number;
    isVital: boolean; // Top 80% of defects
  }>;
  totalDefects: number;
  vitalFew: string[]; // Categories that make up 80% of defects
  trivialMany: string[]; // Remaining categories
} {
  if (defectCategories.length === 0) {
    return {
      sortedCategories: [],
      totalDefects: 0,
      vitalFew: [],
      trivialMany: []
    };
  }

  const totalDefects = defectCategories.reduce((sum, cat) => sum + cat.count, 0);
  
  // Sort by count in descending order
  const sorted = [...defectCategories].sort((a, b) => b.count - a.count);
  
  let cumulativeCount = 0;
  const vitalFew: string[] = [];
  const trivialMany: string[] = [];
  
  const sortedCategories = sorted.map(category => {
    cumulativeCount += category.count;
    const percentage = totalDefects > 0 ? (category.count / totalDefects) * 100 : 0;
    const cumulativePercentage = totalDefects > 0 ? (cumulativeCount / totalDefects) * 100 : 0;
    const isVital = cumulativePercentage <= 80;
    
    if (isVital) {
      vitalFew.push(category.category);
    } else {
      trivialMany.push(category.category);
    }
    
    return {
      category: category.category,
      count: category.count,
      percentage,
      cumulativePercentage,
      isVital
    };
  });

  return {
    sortedCategories,
    totalDefects,
    vitalFew,
    trivialMany
  };
}
