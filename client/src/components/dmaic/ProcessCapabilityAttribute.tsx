{/*   Attribbute CTQ Process Capability Utils */}
import { 
    normalCDF, inverseNormCDF,
} from "@/lib/statisticsUtils";

// Function to calculate Non-Conformity analysis results
  export const calculateNonConformityResults = (ctq: string, capabilityData: any) => {
    const data = capabilityData[ctq];
    if (!data || data.nonConformityUnits === undefined || !data.totalUnits || data.totalUnits <= 0) {
      return null;
    }

    const nonConformityRate = (data.nonConformityUnits / data.totalUnits) * 100;
    
    // Calculate Z equivalent from defect rate using inverse normal CDF
    const defectRate = data.nonConformityUnits / data.totalUnits;
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
          zValue_LT = zValue_ST - (data.zShift || 1.5);
        }
        else {
          // Z long term term is typically 1.5 sigma lower than short term
          zValue_LT = zValue;
          zValue_ST = zValue_LT + (data.zShift || 1.5);
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

    return {
      nonConformityRate,
      zValue_LT,
      zValue_ST
    };
  };

  // Function to calculate Non-Conformity analysis results
    export const calculateDPMOResults = (ctq: string, capabilityData: any) => {
      const data = capabilityData[ctq];
      if (!data || data.dpmoDefects === undefined || !data.dpmoUnits || data.dpmoUnits <= 0 || !data.dpmoOpportunitiesPerUnit || data.dpmoOpportunitiesPerUnit<=0) {
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
            zDPMOValue_LT = zDPMOValue_ST - (data.zShift || 1.5);
            DPMOValue_ST = dpo*10000000;
            DPMOValue_LT = (1 - normalCDF(zDPMOValue_LT))*1000000;            
          }
          else {
            // Z long term term is typically 1.5 sigma lower than short term
            zDPMOValue_LT = zValue;
            zDPMOValue_ST = zDPMOValue_LT + (data.zShift || 1.5);
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
            zDPUValue_LT = zDPUValue_ST - (data.zShift || 1.5);
            DPUValue_ST = dpu;
            DPUValue_LT = (1 - normalCDF(zDPUValue_LT));            
          }
          else {
            // Z long term term is typically 1.5 sigma lower than short term
            zDPUValue_LT = zValue;
            zDPUValue_ST = zDPUValue_LT + (data.zShift || 1.5);
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
  
      return {
        zDPUValue_LT,
        zDPUValue_ST,
        DPUValue_LT,
        DPUValue_ST
      };
    };
