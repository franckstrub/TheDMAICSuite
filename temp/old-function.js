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
      description: "Creating mitigation suggestions based on risk details...",
      variant: "default"
    });
    
    // Get suggestions based on probability and impact - without repeating the risk information
    let suggestion = `Recommended Mitigation Strategies:\n\n`;
    
    // Determine risk characteristics based on probability and impact
    const isProbabilityHigh = probability === "High";
    const isProbabilityMedium = probability === "Medium";
    const isImpactHigh = impact === "High";
    const isImpactMedium = impact === "Medium";
    
    // Generate more tailored suggestions based on risk criticality
    if (criticality >= 7) {
      // High criticality (7-9)
      suggestion += "• Implement multiple preventative controls with overlapping coverage\n";
      
      if (isProbabilityHigh) {
        suggestion += "• Develop prevention strategies to reduce likelihood of occurrence\n";
      }
      
      if (isImpactHigh) {
        suggestion += "• Create detailed contingency and recovery plans to minimize impact\n";
        suggestion += "• Consider risk transfer options (insurance, partnerships, contracts)\n";
      }
      
      suggestion += "• Assign dedicated risk owner with executive oversight\n";
      suggestion += "• Schedule frequent monitoring on weekly/bi-weekly basis\n";
      suggestion += "• Implement early warning indicators and thresholds\n";
      suggestion += "• Create detailed response and escalation procedures\n";
    } else if (criticality >= 4) {
      // Medium criticality (4-6)
      suggestion += "• Implement key preventative controls\n";
      
      if (isProbabilityMedium || isProbabilityHigh) {
        suggestion += "• Develop strategies to reduce occurrence probability\n";
      }
      
      if (isImpactMedium || isImpactHigh) {
        suggestion += "• Prepare specific response plans for impact reduction\n";
      }
      
      suggestion += "• Assign dedicated risk owner for regular monitoring\n";
      suggestion += "• Schedule monthly review of risk status\n";
      suggestion += "• Define clear triggers for escalation\n";
      suggestion += "• Document and communicate mitigation approach";
    } else {
      // Low criticality (1-3)
      suggestion += "• Implement basic monitoring controls\n";
      
      if (isProbabilityHigh) {
        suggestion += "• Consider low-cost preventative measures\n";
      }
      
      if (isImpactHigh) {
        suggestion += "• Document simple response procedures\n";
      }
      
      suggestion += "• Assign risk owner for awareness\n";
      suggestion += "• Review quarterly or if conditions change\n";
      suggestion += "• Accept risk with minimal controls\n";
      suggestion += "• Document acceptance rationale";
    }
    
    // Extract key themes from risk name for more targeted suggestions
    const riskNameLower = riskName.toLowerCase();
    
    // Risk type specific suggestions
    let specificRiskType = "";
    
    if (riskNameLower.includes("technology") || riskNameLower.includes("technical") || riskNameLower.includes("system") || riskNameLower.includes("software") || riskNameLower.includes("it")) {
      specificRiskType = "Technology";
      suggestion += "\n\nTechnology Risk Specific:\n";
      
      if (isProbabilityHigh) {
        suggestion += "• Conduct comprehensive technical assessments and penetration testing\n";
        suggestion += "• Implement redundant systems or fallback options\n";
      } else {
        suggestion += "• Conduct targeted technical assessments based on risk areas\n";
      }
      
      if (isImpactHigh) {
        suggestion += "• Develop detailed disaster recovery procedures\n";
        suggestion += "• Establish 24/7 technical support protocols\n";
      } else {
        suggestion += "• Establish standard technical support channels\n";
      }
      
      suggestion += "• Ensure knowledge transfer and documentation\n";
      suggestion += "• Consider prototype or pilot implementations before full deployment\n";
      suggestion += "• Provide specialized training for technical staff";
      
    } else if (riskNameLower.includes("resource") || riskNameLower.includes("staffing") || riskNameLower.includes("personnel") || riskNameLower.includes("team") || riskNameLower.includes("employee")) {
      specificRiskType = "Resource";
      suggestion += "\n\nResource Risk Specific:\n";
      
      if (isProbabilityHigh) {
        suggestion += "• Develop comprehensive succession and continuity plans\n";
        suggestion += "• Prioritize critical resource retention strategies\n";
      } else {
        suggestion += "• Create basic succession plans for key roles\n";
      }
      
      if (isImpactHigh) {
        suggestion += "• Establish partnerships with staffing agencies for rapid response\n";
        suggestion += "• Create detailed knowledge transfer procedures\n";
      } else {
        suggestion += "• Maintain relationship with staffing resources\n";
      }
      
      suggestion += "• Cross-train team members on critical functions\n";
      suggestion += "• Implement knowledge sharing and documentation systems\n";
      suggestion += "• Develop hiring or contractor contingencies as backup";
      
    } else if (riskNameLower.includes("schedule") || riskNameLower.includes("timeline") || riskNameLower.includes("deadline") || riskNameLower.includes("delay")) {
      specificRiskType = "Schedule";
      suggestion += "\n\nSchedule Risk Specific:\n";
      
      if (isProbabilityHigh) {
        suggestion += "• Build substantial buffer time (20-30%) into critical path activities\n";
        suggestion += "• Implement formal change control procedures for timeline changes\n";
      } else {
        suggestion += "• Build reasonable buffer time (10-15%) into critical path activities\n";
      }
      
      if (isImpactHigh) {
        suggestion += "• Prepare contingency plan for deadline failure scenarios\n";
        suggestion += "• Identify potential scope reduction options if necessary\n";
      } else {
        suggestion += "• Document potential scope adjustment options\n";
      }
      
      suggestion += "• Map and monitor all schedule dependencies\n";
      suggestion += "• Create detailed milestone tracking system\n";
      suggestion += "• Develop acceleration options if delays occur\n";
      suggestion += "• Establish clear escalation paths for timeline issues";
      
    } else if (riskNameLower.includes("budget") || riskNameLower.includes("cost") || riskNameLower.includes("financial") || riskNameLower.includes("expense") || riskNameLower.includes("funding")) {
      specificRiskType = "Financial";
      suggestion += "\n\nFinancial Risk Specific:\n";
      
      if (isProbabilityHigh) {
        suggestion += "• Include substantial contingency reserves (15-20%) in budget\n";
        suggestion += "• Implement stricter spending controls and approvals\n";
      } else {
        suggestion += "• Include reasonable contingency reserves (10%) in budget\n";
      }
      
      if (isImpactHigh) {
        suggestion += "• Prepare detailed cost reduction options for emergency scenarios\n";
        suggestion += "• Establish emergency funding sources or protocols\n";
      } else {
        suggestion += "• Document potential cost-saving measures if needed\n";
      }
      
      suggestion += "• Implement detailed cost tracking system with frequent reviews\n";
      suggestion += "• Set clear spending approval thresholds and authority\n";
      suggestion += "• Create key financial performance indicators and alerts\n";
      suggestion += "• Establish regular financial review schedule";
      
    } else if (riskNameLower.includes("quality") || riskNameLower.includes("performance") || riskNameLower.includes("defect") || riskNameLower.includes("standard") || riskNameLower.includes("compliance")) {
      specificRiskType = "Quality";
      suggestion += "\n\nQuality Risk Specific:\n";
      
      if (isProbabilityHigh) {
        suggestion += "• Implement comprehensive quality management system\n";
        suggestion += "• Conduct preventative quality reviews at multiple stages\n";
      } else {
        suggestion += "• Implement targeted quality control procedures\n";
      }
      
      if (isImpactHigh) {
        suggestion += "• Develop rapid response protocols for critical quality issues\n";
        suggestion += "• Create remediation plans with dedicated resources\n";
      } else {
        suggestion += "• Prepare standard remediation approaches for common issues\n";
      }
      
      suggestion += "• Establish clear quality criteria, standards and metrics\n";
      suggestion += "• Conduct regular testing throughout process\n";
      suggestion += "• Implement independent quality verification\n";
      suggestion += "• Provide quality-focused training to team members";
      
    } else if (riskNameLower.includes("change") || riskNameLower.includes("adoption") || riskNameLower.includes("resistance") || riskNameLower.includes("acceptance") || riskNameLower.includes("stakeholder")) {
      specificRiskType = "Change Management";
      suggestion += "\n\nChange Management Risk Specific:\n";
      
      if (isProbabilityHigh) {
        suggestion += "• Develop comprehensive change management and communication plan\n";
        suggestion += "• Conduct stakeholder impact analysis and prioritization\n";
      } else {
        suggestion += "• Create standard change management approach\n";
      }
      
      if (isImpactHigh) {
        suggestion += "• Engage executive sponsors to champion the change\n";
        suggestion += "• Establish formal feedback and concern resolution processes\n";
      } else {
        suggestion += "• Identify key stakeholders for targeted engagement\n";
      }
      
      suggestion += "• Provide clear and frequent communications on rationale and benefits\n";
      suggestion += "• Create targeted training and support materials\n";
      suggestion += "• Establish feedback channels for concerns and suggestions\n";
      suggestion += "• Identify and engage change champions within organization";
    }
    
    // If no specific risk type was identified, provide general suggestions
    if (!specificRiskType) {
      suggestion += "\n\nGeneral Risk Response Recommendations:\n";
      suggestion += "• Document clear assumptions and conditions\n";
      suggestion += "• Establish regular review and reassessment cycle\n";
      suggestion += "• Create communication plan for status updates\n";
      suggestion += "• Identify key stakeholders to involve in mitigation\n";
      suggestion += "• Define clear success criteria for mitigation efforts";
    }
    
    // Add conclusion based on criticality
    suggestion += "\n\nMonitoring and Review:";
    if (criticality >= 7) {
      suggestion += "\n• Review risk status weekly";
      suggestion += "\n• Report to executive leadership monthly";
      suggestion += "\n• Reassess mitigation effectiveness quarterly";
    } else if (criticality >= 4) {
      suggestion += "\n• Review risk status bi-weekly";
      suggestion += "\n• Report to project leadership monthly";
      suggestion += "\n• Reassess mitigation effectiveness quarterly";
    } else {
      suggestion += "\n• Review risk status monthly";
      suggestion += "\n• Report in standard project updates";
      suggestion += "\n• Reassess if conditions change";
    }
    
    // Show success toast when plan is generated with specific risk type and criticality if detected
    let criticalityLevel = "Low";
    if (criticality >= 7) criticalityLevel = "High";
    else if (criticality >= 4) criticalityLevel = "Medium";
    
    toast({
      title: "Mitigation plan generated",
      description: specificRiskType 
        ? `AI-suggested strategies for ${criticalityLevel} ${specificRiskType} risk are ready.` 
        : `AI-suggested strategies for ${criticalityLevel} risk (${criticality}/9) are ready.`,
      variant: "default",
      className: "bg-green-50 border-green-200 text-green-700"
    });
    
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
