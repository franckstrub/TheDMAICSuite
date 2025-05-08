  const generateMitigationPlan = (rowNumber: number) => {
    console.log(`Generating mitigation plan for row ${rowNumber}`);
    
    // Get the field names based on row number
    const riskNameField = rowNumber === 1 ? 'riskName' : `riskName${rowNumber}`;
    const probabilityField = rowNumber === 1 ? 'probability' : `probability${rowNumber}`;
    const impactField = rowNumber === 1 ? 'impact' : `impact${rowNumber}`;
    const mitigationPlanField = rowNumber === 1 ? 'mitigationPlan' : `mitigationPlan${rowNumber}`;
    
    console.log(`Using fields: riskName=${riskNameField}, probability=${probabilityField}, impact=${impactField}, mitigationPlan=${mitigationPlanField}`);
    
    // Get the current values
    const riskName = riskForm.getValues(riskNameField as any) || "";
    const probability = riskForm.getValues(probabilityField as any) || "Low";
    const impact = riskForm.getValues(impactField as any) || "Low";
    
    console.log(`Current values: riskName="${riskName}", probability="${probability}", impact="${impact}"`)
    
    // If risk name is empty, show an error
    if (!riskName.trim()) {
      toast({
        title: "Risk description required",
        description: "Please provide a risk description first to generate mitigation suggestions.",
        variant: "destructive"
      });
      return;
    }
    
    // Generate appropriate mitigation plan based on risk details
    const criticality = calculateRiskCriticality(probability, impact);
    
    // Show initial toast notification
    toast({
      title: "Generating mitigation plan",
      description: "Creating concise mitigation suggestions...",
      variant: "default"
    });
    
    // Extract key themes from risk name for targeted suggestions
    const riskNameLower = riskName.toLowerCase();
    let suggestion = '';
    let specificRiskType = "";
    
    // Technology risk
    if (riskNameLower.includes("technology") || riskNameLower.includes("technical") || riskNameLower.includes("system") || riskNameLower.includes("software") || riskNameLower.includes("it")) {
      specificRiskType = "Technology";
      suggestion = "Technology Risk Mitigation Plan:\n\n";
      
      // Maximum 3 high-value, specific points as requested
      suggestion += "• Develop functional prototype/MVP before full implementation\n";
      suggestion += "• Hire external technical experts with specific domain experience\n";
      suggestion += "• Conduct technical benchmarking with similar implementations";
    } 
    // Change management/acceptance risk
    else if (riskNameLower.includes("change") || riskNameLower.includes("accept") || riskNameLower.includes("resist") || riskNameLower.includes("adopt") || riskNameLower.includes("culture") || riskNameLower.includes("people")) {
      specificRiskType = "Change Management";
      suggestion = "People Acceptance Risk Mitigation Plan:\n\n";
      
      // Maximum 3 high-value, specific points as requested
      suggestion += "• Create targeted 'What's in it for me?' communications for each stakeholder group\n";
      suggestion += "• Establish change champion network with representatives from each affected area\n";
      suggestion += "• Implement regular feedback mechanisms to identify and address resistance early";
    }
    // Financial/budget risk
    else if (riskNameLower.includes("budget") || riskNameLower.includes("cost") || riskNameLower.includes("financial") || riskNameLower.includes("expense") || riskNameLower.includes("funding")) {
      specificRiskType = "Financial";
      suggestion = "Financial Risk Mitigation Plan:\n\n";
      
      // Maximum 3 high-value, specific points as requested
      suggestion += "• Conduct comprehensive ROI analysis with detailed CAPEX justification\n";
      suggestion += "• Implement tiered funding approach with stage-gates for continued investment\n";
      suggestion += "• Establish regular financial reviews with clear variance thresholds";
    }
    // Planning/timeline/execution risk
    else if (riskNameLower.includes("schedule") || riskNameLower.includes("timeline") || riskNameLower.includes("deadline") || riskNameLower.includes("delay") || riskNameLower.includes("execution") || riskNameLower.includes("planning")) {
      specificRiskType = "Planning";
      suggestion = "Planning Execution Risk Mitigation Plan:\n\n";
      
      // Maximum 3 high-value, specific points as requested
      suggestion += "• Implement bi-weekly steering committee meetings with executive escalation paths\n";
      suggestion += "• Establish formal scope management process with impact assessment\n";
      suggestion += "• Create multi-generation planning approach with flexible resource allocation";
    }
    // Resource/staffing risk
    else if (riskNameLower.includes("resource") || riskNameLower.includes("staffing") || riskNameLower.includes("personnel") || riskNameLower.includes("team") || riskNameLower.includes("employee")) {
      specificRiskType = "Resource";
      suggestion = "Resource Risk Mitigation Plan:\n\n";
      
      // Maximum 3 high-value, specific points as requested
      suggestion += "• Develop cross-training program for critical skill areas\n";
      suggestion += "• Establish relationships with external staffing partners/consultants\n";
      suggestion += "• Create detailed skill inventory and resource allocation matrix";
    }
    // Quality/performance risk
    else if (riskNameLower.includes("quality") || riskNameLower.includes("performance") || riskNameLower.includes("defect") || riskNameLower.includes("standard") || riskNameLower.includes("compliance")) {
      specificRiskType = "Quality";
      suggestion = "Quality Risk Mitigation Plan:\n\n";
      
      // Maximum 3 high-value, specific points as requested
      suggestion += "• Implement stage-gate quality reviews with clear acceptance criteria\n";
      suggestion += "• Establish independent verification and validation process\n";
      suggestion += "• Create detailed performance monitoring with automated alerts";
    }
    // Scope risk
    else if (riskNameLower.includes("scope") || riskNameLower.includes("requirement") || riskNameLower.includes("specification") || riskNameLower.includes("definition") || riskNameLower.includes("creep")) {
      specificRiskType = "Scope";
      suggestion = "Scope Risk Mitigation Plan:\n\n";
      
      // Maximum 3 high-value, specific points as requested
      suggestion += "• Implement formal change control process with impact assessment\n";
      suggestion += "• Conduct regular scope verification sessions with stakeholders\n";
      suggestion += "• Create detailed requirements traceability matrix";
    }
    // Generic risk with no specific category identified
    else {
      specificRiskType = "General";
      suggestion = "Risk Mitigation Plan:\n\n";
      
      // Maximum 3 high-value, specific points based on criticality
      if (criticality >= 7) {
        suggestion += "• Assign executive sponsor with direct oversight responsibility\n";
        suggestion += "• Implement weekly monitoring with defined threshold indicators\n";
        suggestion += "• Develop comprehensive contingency plan with dedicated resources";
      } else if (criticality >= 4) {
        suggestion += "• Assign dedicated risk owner with clear monitoring responsibilities\n";
        suggestion += "• Establish bi-weekly review process with defined escalation paths\n";
        suggestion += "• Develop targeted mitigation actions with measurable outcomes";
      } else {
        suggestion += "• Assign risk owner for monitoring responsibilities\n";
        suggestion += "• Implement monthly review process with basic tracking\n";
        suggestion += "• Document acceptance criteria and threshold for increased response";
      }
    }
    
    // Update the form with the generated suggestion
    console.log(`Setting value for field ${mitigationPlanField} to suggestion (length: ${suggestion.length})`);
    riskForm.setValue(mitigationPlanField as any, suggestion);
    
    // Force form to recognize the change
    riskForm.trigger(mitigationPlanField as any);
    
    // Check if the textarea ref exists
    const textareaElement = textareaRefs.current[mitigationPlanField];
    if (!textareaElement) {
      console.warn(`Textarea ref for ${mitigationPlanField} does not exist!`);
    } else {
      console.log(`Textarea ref for ${mitigationPlanField} exists, will resize it.`);
      // Set value directly on the element as a backup
      textareaElement.value = suggestion;
    }
    
    // Adjust textarea height to fit the new content with multiple retries using longer timeouts
    // First immediate adjustment
    adjustTextareaHeight(mitigationPlanField);
    
    // Staggered adjustments with increasing timeouts for better reliability
    setTimeout(() => {
      adjustTextareaHeight(mitigationPlanField);
      
      setTimeout(() => {
        adjustTextareaHeight(mitigationPlanField);
        
        setTimeout(() => {
          adjustTextareaHeight(mitigationPlanField);
          
          // Final adjustment after DOM has fully updated
          setTimeout(() => {
            // Make one last adjustment
            adjustTextareaHeight(mitigationPlanField);
            
            // Force update the textarea if ref exists
            const textarea = textareaRefs.current[mitigationPlanField];
            if (textarea) {
              textarea.style.height = 'auto';
              const scrollHeight = textarea.scrollHeight;
              textarea.style.height = `${scrollHeight + 16}px`;
            }
          }, 800);
        }, 400);
      }, 200);
    }, 100);
    
    // Show success notification with specific risk type
    toast({
      title: `${specificRiskType} Risk Mitigation Plan`,
      description: `Created concise, targeted suggestions for risk mitigation.`,
      variant: "default",
      className: "bg-green-50 border-green-200 text-green-700"
    });
  };        
        setTimeout(() => {
          adjustTextareaHeight(mitigationPlanField);
          
          // Final adjustment after DOM has fully updated
          setTimeout(() => {
            // Make one last adjustment
            adjustTextareaHeight(mitigationPlanField);
            
            // Force update the textarea if ref exists
            const textarea = textareaRefs.current[mitigationPlanField];
            if (textarea) {
              textarea.style.height = 'auto';
              const scrollHeight = textarea.scrollHeight;
              textarea.style.height = `${scrollHeight + 16}px`;
            }
          }, 800);
        }, 400);
      }, 200);
    }, 100);
    
    // No need for a second toast notification - we already showed one above
  };

  // Calculate risk criticality based on probability and impact
  const calculateRiskCriticality = (probability: string, impact: string): number => {
    if (!probability || !impact) return 1;
    return riskCriticalityMatrix[probability as keyof typeof riskCriticalityMatrix]?.[impact as keyof typeof riskCriticalityMatrix[keyof typeof riskCriticalityMatrix]] || 1;
  };
  
  // Update risk criticality when probability or impact changes
  const updateRiskCriticality = (rowNumber: number, fieldType: 'probability' | 'impact', value: string) => {
    const rowPrefix = rowNumber === 1 ? '' : rowNumber;
    
    const probabilityField = `probability${rowPrefix}` as const;
    const impactField = `impact${rowPrefix}` as const;
    const riskCriticalityField = `riskCriticality${rowPrefix}` as const;
    
    const probability = fieldType === 'probability' ? value : riskForm.getValues(probabilityField as any);
    const impact = fieldType === 'impact' ? value : riskForm.getValues(impactField as any);
    
    const criticality = calculateRiskCriticality(probability, impact);
    riskForm.setValue(riskCriticalityField as any, criticality);
  };
  
  const handleSaveRisk = (data: RiskFormData) => {
    console.log("Saving risk assessment data:", data);
    
    // Make sure to capture current values before mutation
    const currentValues = {
      probability: data.probability,
      impact: data.impact, 
      probability2: data.probability2,
      impact2: data.impact2,
      probability3: data.probability3,
      impact3: data.impact3,
      probability4: data.probability4,
      impact4: data.impact4,
      probability5: data.probability5,
      impact5: data.impact5,
      probability6: data.probability6,
      impact6: data.impact6,
    };
    
    // Ensure all criticality values are correctly calculated before saving
    const processedData = { ...data };
    
    // Row 1
    if (data.probability && data.impact) {
      const criticality = calculateRiskCriticality(data.probability, data.impact);
      processedData.riskCriticality = criticality;
      console.log("Recalculated criticality for row 1:", criticality);
    }
    
    // Row 2
    if (data.probability2 && data.impact2) {
      const criticality = calculateRiskCriticality(data.probability2, data.impact2);
      processedData.riskCriticality2 = criticality;
      console.log("Recalculated criticality for row 2:", criticality);
    }
    
    // Row 3
    if (data.probability3 && data.impact3) {
      const criticality = calculateRiskCriticality(data.probability3, data.impact3);
      processedData.riskCriticality3 = criticality;
      console.log("Recalculated criticality for row 3:", criticality);
    }
    
    // Row 4
    if (data.probability4 && data.impact4) {
      const criticality = calculateRiskCriticality(data.probability4, data.impact4);
      processedData.riskCriticality4 = criticality;
      console.log("Recalculated criticality for row 4:", criticality);
    }
    
    // Row 5
    if (data.probability5 && data.impact5) {
      const criticality = calculateRiskCriticality(data.probability5, data.impact5);
      processedData.riskCriticality5 = criticality;
      console.log("Recalculated criticality for row 5:", criticality);
    }
    
    // Row 6
    if (data.probability6 && data.impact6) {
      const criticality = calculateRiskCriticality(data.probability6, data.impact6);
      processedData.riskCriticality6 = criticality;
      console.log("Recalculated criticality for row 6:", criticality);
    }
    
