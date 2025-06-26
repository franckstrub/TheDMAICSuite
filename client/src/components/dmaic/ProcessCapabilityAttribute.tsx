import { 
    inverseNormCDF,
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
          }
          else {
            // Z long term term is typically 1.5 sigma lower than short term
            zDPMOValue_LT = zValue;
            zDPMOValue_ST = zDPMOValue_LT + (data.zShift || 1.5);
          }
          
          // Ensure positive Z value
          //zValue = Math.abs(zValue);
        } catch (error) {
          console.error('Error calculating Z value:', error);
          zValue = null;
          zDPMOValue_LT = null;
          zDPMOValue_ST = null;
        }
      }
  
      return {
        zDPMOValue_LT,
        zDPMOValue_ST
      };
    };