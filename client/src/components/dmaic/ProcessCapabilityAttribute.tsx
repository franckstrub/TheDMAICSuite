{/*   Attribute CTQ Process Capability Utils */}
import * as jStat from 'jstat';
import { 
    normalCDF, inverseNormCDF,
} from "@/lib/statisticsUtils";
import { infiniteQueryOptions } from "@tanstack/react-query";

// Function to calculate Non-Conformity analysis results

export const calculateNonConformityResults = (ctq: string, capabilityData: any) => {
  const data = capabilityData[ctq];
  if (!data || data.nonConformityUnits === undefined || !data.totalUnits || data.totalUnits <= 0) {
    return null;
  }

  const x = data.nonConformityUnits; // Number of successes (non-conforming units)
  const n = data.totalUnits;         // Total number of trials
  const defectRate = x / n;          // Sample proportion
  let nonConformityRate = defectRate * 100;

  // Calculate Clopper-Pearson 95% confidence interval using F-distribution
  const alpha = 0.05; // For 95% confidence interval
  let CI_minus = 0;
  let CI_plus = 100;

  if (x === 0) {
    // Special case: no non-conforming units observed
    CI_minus = 0;
  } else {
    // General case for x>0: use F-distribution    
    // Lower bound calculation
    // p_lower = x / (x + (n-x+1) * F_(alpha/2, 2*(n-x+1), 2*x))
    //C13/(C13+(1+C12-C13)*INVERSE.LOI.F((1-D12)/2;2*(1+C12-C13);2*C13))))
    const df1_lower = 2 * (n - x + 1);
    const df2_lower = 2 * x;
    
    if (df2_lower > 0) {
      const f_lower = jStat.centralF.inv(1-alpha/2, df1_lower, df2_lower);
      const denominator_lower = x + (n - x + 1) * f_lower;
      CI_minus = 100 * (x / denominator_lower);
    } else {
      CI_minus = 0;
    }
  }

  // Upper bound calculation  
  // p_upper = (x+1) * F_(1-alpha/2, 2*(x+1), 2*(n-x)) / ((n-x) + (x+1) * F_(1-alpha/2, 2*(x+1), 2*(n-x)))
  // (C13+1)*INVERSE.LOI.F((1-D12)/2;2*(C13+1);2*(C12-C13))/(C12-C13+(C13+1)*INVERSE.LOI.F((1-D12)/2;2*(C13+1);2*(C12-C13))))
  if (x === n) {
      CI_plus = 100;
  } else
  {
    const df1_upper = 2 * (x + 1);
    const df2_upper = 2 * (n - x);
    
    if (df1_upper > 0 && df2_upper > 0) {
      const f_upper = jStat.centralF.inv(1 - alpha/2, df1_upper, df2_upper);
      const numerator_upper = (x + 1) * f_upper;
      const denominator_upper = (n - x) + (x + 1) * f_upper;
      CI_plus = 100 * (numerator_upper / denominator_upper);
    } else if (df2_upper === 0) {
      CI_plus = 100;
    } else {
      CI_plus = 100 * (x + 1) / n; // Fallback approximation
    }
  }

  // Ensure bounds are within [0, 100] range
  CI_minus = Math.max(0, Math.min(100, CI_minus));
  CI_plus = Math.max(0, Math.min(100, CI_plus));

  // Ensure CI_minus <= CI_plus (should already be true with proper calculation)
  if (CI_minus > CI_plus) {
    [CI_minus, CI_plus] = [CI_plus, CI_minus];
  }
    
    // Calculate Z equivalent from defect rate using inverse normal CDF
    let zValue = null;
    let zValue_LT=null;
    let zValue_ST=null;
    
    if (defectRate > 0 && defectRate < 1) {
      try {
        // Use inverseNormCDF(1 - defectRate) to get Z equivalent
        // This gives us the Z value corresponding to the conformity rate
        const conformityRate = 1 - defectRate;
        //console.log('Calculating Z value for conformity rate:', conformityRate);
        if (typeof inverseNormCDF === 'function') {
          zValue = inverseNormCDF(conformityRate);
          //console.log('Raw Z value:', zValue);
        } else {
          console.error('inverseNormCDF function not available');
          zValue = null;
        }
        
        // Adjust for short term vs long term
        if (data.dataSetTerm === "Short Term") {
          // Z short term is typically 1.5 sigma higher than long term
          zValue_ST = zValue;
          zValue_LT = zValue_ST - (data.zShift ?? 1.5);
        }
        else {
          // Z long term term is typically 1.5 sigma lower than short term
          zValue_LT = zValue;
          zValue_ST = zValue_LT + (data.zShift ?? 1.5);
        }
        
        // Ensure positive Z value
        //zValue = Math.abs(zValue);
      } catch (error) {
        console.error('Error calculating Z value:', error);
        zValue = null;
        zValue_LT = null;
        zValue_ST = null;
      }
    }
    else if (defectRate <= 0 ) {
      nonConformityRate = 0;
      zValue_LT = Infinity;
      zValue_ST = Infinity;
    }
    else if (defectRate >= 1) {
      nonConformityRate = 100;
      zValue_LT = -Infinity;
      zValue_ST = -Infinity;
    }

    return {
      nonConformityRate,
      CI_minus,
      CI_plus,
      zValue_LT,
      zValue_ST
    };
  };

  // Function to calculate Non-Conformity analysis results
    export const calculateDPMOResults = (ctq: string, capabilityData: any) => {
      const data = capabilityData[ctq];
      if (!data || data.dpmoDefects === undefined || data.dpmoDefects < 0 ||!data.dpmoUnits || data.dpmoUnits <= 0 || !data.dpmoOpportunitiesPerUnit || data.dpmoOpportunitiesPerUnit<=0) {
        return null;
      }
      //const nonConformityRate = (data.nonConformityUnits / data.totalUnits) * 100;
      
      // Calculate Z equivalent from defect rate using inverse normal CDF
      const dpo = data.dpmoDefects / (data.dpmoUnits * data.dpmoOpportunitiesPerUnit);
      //const dpmo = 1000000 * dpo);
      
      let zValue = null;
      let zDPMOValue_LT=null;
      let zDPMOValue_ST=null;
      let DPMOValue_LT=null;
      let DPMOValue_ST=null;
      
      if (dpo > 0 && dpo < 1) {
        try {
          // Use inverseNormCDF(1 - defectRate) to get Z equivalent
          // This gives us the Z value corresponding to the conformity rate
          //const conformityRate = 1 - defectRate;
          //console.log('Calculating Z value for conformity rate:', conformityRate);
          if (typeof inverseNormCDF === 'function') {
            zValue = inverseNormCDF(1 - dpo);
            //console.log('Raw Z value:', zValue);
          } else {
            console.error('inverseNormCDF function not available');
            zValue = null;
          }
          
          // Adjust for short term vs long term
          if (data.dataSetTerm === "Short Term") {
            // Z short term is typically 1.5 sigma higher than long term
            zDPMOValue_ST = zValue;
            zDPMOValue_LT = zDPMOValue_ST - (data.zShift ?? 1.5);
            DPMOValue_ST = dpo*1000000;
            DPMOValue_LT = (1 - normalCDF(zDPMOValue_LT))*1000000;            
          }
          else {
            // Z long term term is typically 1.5 sigma lower than short term
            zDPMOValue_LT = zValue;
            zDPMOValue_ST = zDPMOValue_LT + (data.zShift ?? 1.5);
            DPMOValue_LT = dpo*1000000;
            DPMOValue_ST = (1 - normalCDF(zDPMOValue_ST))*1000000; 
          }
          
          // Ensure positive Z value
          //zValue = Math.abs(zValue);
        } catch (error) {
          console.error('Error calculating Z value:', error);
          zValue = null;
          zDPMOValue_LT = null;
          zDPMOValue_ST = null;
          DPMOValue_LT = null;
          DPMOValue_ST = null;
        }
      }
      else if (dpo <= 0 ) {
        zDPMOValue_LT = Infinity;
        zDPMOValue_ST = Infinity;
        DPMOValue_LT = null;
        DPMOValue_ST = null;
      }
      else {
        zDPMOValue_LT = -Infinity;
        zDPMOValue_ST = -Infinity;
        DPMOValue_LT = 1000000;
        DPMOValue_ST = 1000000;
      }
      return {
        zDPMOValue_LT,
        zDPMOValue_ST,
        DPMOValue_LT,
        DPMOValue_ST
      };
    };
// Function to calculate Non-Conformity analysis results
    export const calculateDPUResults = (ctq: string, capabilityData: any) => {
      const data = capabilityData[ctq];
      if (!data || data.dpuDefects === undefined || !data.dpuUnits || data.dpuUnits <= 0 ) {
        return null;
      }
      //const nonConformityRate = (data.nonConformityUnits / data.totalUnits) * 100;
      
      // Calculate Z equivalent from defect rate using inverse normal CDF
      const dpu = data.dpuDefects / data.dpuUnits;      
      let zValue = null;
      let zDPUValue_LT=null;
      let zDPUValue_ST=null;
      let DPUValue_LT=null;
      let DPUValue_ST=null;
      
      if (dpu > 0 && dpu < 1) {
        try {
          // Use inverseNormCDF(1 - defectRate) to get Z equivalent
          // This gives us the Z value corresponding to the conformity rate
          //const conformityRate = 1 - defectRate;
          //console.log('Calculating Z value for conformity rate:', conformityRate);
          if (typeof inverseNormCDF === 'function') {
            zValue = inverseNormCDF(1 - dpu);
            //console.log('Raw Z value:', zValue);
          } else {
            console.error('inverseNormCDF function not available');
            zValue = null;
          }
          
          // Adjust for short term vs long term
          if (data.dataSetTerm === "Short Term") {
            // Z short term is typically 1.5 sigma higher than long term
            zDPUValue_ST = zValue;
            zDPUValue_LT = zDPUValue_ST - (data.zShift ?? 1.5);
            DPUValue_ST = dpu;
            DPUValue_LT = (1 - normalCDF(zDPUValue_LT));            
          }
          else {
            // Z long term term is typically 1.5 sigma lower than short term
            zDPUValue_LT = zValue;
            zDPUValue_ST = zDPUValue_LT + (data.zShift ?? 1.5);
            DPUValue_LT = dpu;
            DPUValue_ST = (1 - normalCDF(zDPUValue_ST)); 
          }
          
          // Ensure positive Z value
          //zValue = Math.abs(zValue);
        } catch (error) {
          console.error('Error calculating Z value:', error);
          zValue = null;
          zDPUValue_LT = null;
          zDPUValue_ST = null;
          DPUValue_LT = null;
          DPUValue_ST = null;
        }
      }
      else if (dpu <= 0 ) {
        zDPUValue_LT = Infinity;
        zDPUValue_ST = Infinity;
        DPUValue_LT = null;
        DPUValue_ST = null;
      }
      else {
        zDPUValue_LT = -Infinity;
        zDPUValue_ST = -Infinity;
        DPUValue_LT = 1;
        DPUValue_ST = 1;
      }
  
      return {
        zDPUValue_LT,
        zDPUValue_ST,
        DPUValue_LT,
        DPUValue_ST
      };
    };
