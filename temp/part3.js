    
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
    
    saveRiskMutation.mutate(processedData, {
      onSuccess: () => {
        // After successful save, force reset the dropdown values explicitly
        console.log("After save, explicitly setting dropdown values again");
        
        setTimeout(() => {
          if (currentValues.probability) {
            riskForm.setValue("probability", currentValues.probability);
            // Also update criticality
            if (currentValues.impact) {
              const criticality = calculateRiskCriticality(currentValues.probability, currentValues.impact);
              riskForm.setValue("riskCriticality", criticality);
            }
          }
          
          if (currentValues.impact) riskForm.setValue("impact", currentValues.impact);
          
          if (currentValues.probability2) {
            riskForm.setValue("probability2", currentValues.probability2);
            // Also update criticality
            if (currentValues.impact2) {
              const criticality = calculateRiskCriticality(currentValues.probability2, currentValues.impact2);
              riskForm.setValue("riskCriticality2", criticality);
            }
          }
          
          if (currentValues.impact2) riskForm.setValue("impact2", currentValues.impact2);
          
          if (currentValues.probability3) {
            riskForm.setValue("probability3", currentValues.probability3);
            // Also update criticality
            if (currentValues.impact3) {
              const criticality = calculateRiskCriticality(currentValues.probability3, currentValues.impact3);
              riskForm.setValue("riskCriticality3", criticality);
            }
          }
          
          if (currentValues.impact3) riskForm.setValue("impact3", currentValues.impact3);
          
          if (currentValues.probability4) {
            riskForm.setValue("probability4", currentValues.probability4);
            // Also update criticality
            if (currentValues.impact4) {
              const criticality = calculateRiskCriticality(currentValues.probability4, currentValues.impact4);
              riskForm.setValue("riskCriticality4", criticality);
            }
          }
          
          if (currentValues.impact4) riskForm.setValue("impact4", currentValues.impact4);
          
          if (currentValues.probability5) {
            riskForm.setValue("probability5", currentValues.probability5);
            // Also update criticality
            if (currentValues.impact5) {
              const criticality = calculateRiskCriticality(currentValues.probability5, currentValues.impact5);
              riskForm.setValue("riskCriticality5", criticality);
            }
          }
          
          if (currentValues.impact5) riskForm.setValue("impact5", currentValues.impact5);
          
          if (currentValues.probability6) {
            riskForm.setValue("probability6", currentValues.probability6);
            // Also update criticality
            if (currentValues.impact6) {
              const criticality = calculateRiskCriticality(currentValues.probability6, currentValues.impact6);
              riskForm.setValue("riskCriticality6", criticality);
            }
          }
          
          if (currentValues.impact6) riskForm.setValue("impact6", currentValues.impact6);
        }, 200);
      }
    });
  };
  
  if (isRiskLoading) {
    return <p>Loading risk assessment...</p>;
  }
  
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Project Risk Assessment</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={riskForm.handleSubmit(handleSaveRisk)}>
          <p className="text-sm text-gray-500 mb-4">
            Identify, assess, and plan for potential project risks. Add rows as needed for additional risks. Risk criticality = Probability × Impact
          </p>
          
          {/* Headers */}
          <div className="grid grid-cols-12 gap-2 mb-4">
            <div className="p-3 bg-red-50 rounded-md text-center w-[95%] col-span-3">
              <h4 className="font-medium text-red-600 text-sm">Risk</h4>
            </div>
            <div className="p-3 bg-amber-50 rounded-md text-center w-[95%] col-span-1">
              <h4 className="font-small text-amber-600 text-sm">Probability</h4>
            </div>
            <div className="p-3 bg-orange-50 rounded-md text-center w-[95%] col-span-1">
              <h4 className="font-medium text-orange-600 text-sm">Impact</h4>
            </div>
            <div className="p-3 bg-purple-50 rounded-md text-center w-[95%] col-span-1">
              <h4 className="font-medium text-purple-600 text-sm">Criticality</h4>
            </div>
            <div className="p-3 bg-blue-50 rounded-md text-center w-[95%] col-span-4">
              <h4 className="font-medium text-blue-600 text-sm">Mitigation Plan</h4>
            </div>
            <div className="p-3 bg-green-50 rounded-md text-center w-[95%] col-span-2">
              <h4 className="font-medium text-green-600 text-sm">Risk Owner</h4>
            </div>
          </div>
          
          {/* First row of Risk (always visible and mandatory) */}
          <div className="grid grid-cols-12 gap-2 mb-2 relative">
            <div className="border border-red-100 rounded-md p-2 bg-white w-[95%] col-span-3">
              <Textarea
                className="w-full p-2 border-0 focus:ring-0 text-sm"
                rows={3}
                placeholder="Describe the risk"
                {...riskForm.register("riskName")}
              />
            </div>
            <div className="border border-amber-100 rounded-md p-2 bg-white w-[95%] col-span-1">
              <Select
                defaultValue="Low"
                value={riskForm.watch("probability")}
                onValueChange={(value) => {
                  console.log("Probability changed to:", value);
                  riskForm.setValue("probability", value);
                  updateRiskCriticality(1, 'probability', value);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Probability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="border border-orange-100 rounded-md p-2 bg-white w-[95%] col-span-1">
              <Select
                defaultValue="Low"
                value={riskForm.watch("impact")}
                onValueChange={(value) => {
                  console.log("Impact changed to:", value);
                  riskForm.setValue("impact", value);
                  updateRiskCriticality(1, 'impact', value);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Impact" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="border border-purple-100 rounded-md p-2 bg-white w-[95%] col-span-1 flex items-center justify-center">
              <div className="text-lg font-bold">
                {riskForm.watch("riskCriticality") || 1}/9
              </div>
              <input type="hidden" {...riskForm.register("riskCriticality")} />
            </div>
            <div className="border border-blue-100 rounded-md p-2 bg-white w-[95%] col-span-4 relative">
              <div className="min-h-[200px]"> 
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={10}
                  placeholder="How will you mitigate this risk?"
                  {...riskForm.register("mitigationPlan")}
                  ref={(el) => {
                    if (el) {
                      textareaRefs.current["mitigationPlan"] = el;
                      
                      // On ref attachment, force update the height
                      setTimeout(() => {
                        try {
                          if (riskData?.risk?.mitigationPlan && el) {
                            // Force the value to be set directly
                            el.value = riskData.risk.mitigationPlan;
                            // Calculate better height
                            const lineCount = riskData.risk.mitigationPlan.split('\n').length;
                            const minHeight = Math.max(200, lineCount * 24);
                            el.style.height = 'auto';
                            el.style.minHeight = `${minHeight}px`;
                            el.style.height = `${minHeight}px`;
                            console.log(`Direct ref injection for mitigationPlan: ${lineCount} lines, height ${minHeight}px`);
                          }
                        } catch (error) {
                          console.error("Error setting textarea height:", error);
                        }
                      }, 200);
                    }
                  }}
                  style={{ minHeight: '200px' }}
                />
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="absolute top-1 right-1 h-6 w-6 text-primary hover:text-primary/80 hover:bg-primary/10 rounded-full p-1"
                      onClick={() => generateMitigationPlan(1)}
                    >
                      <Sparkles className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">Generate AI-suggested mitigation plan</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="border border-green-100 rounded-md p-2 bg-white w-[95%] col-span-2">
              <Textarea
                className="w-full p-2 border-0 focus:ring-0 text-sm"
                rows={3}
                placeholder="Who is responsible for monitoring this risk?"
                {...riskForm.register("riskOwner")}
              />
            </div>
            {/* No delete button for first row (it's mandatory) */}
          </div>
          
          {/* Second row (conditionally rendered) */}
          {visibleRiskRows >= 2 && (
            <div className="grid grid-cols-12 gap-2 mb-2 relative">
              <div className="border border-red-100 rounded-md p-2 bg-white w-[95%] col-span-3">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={3}
                  placeholder="Describe the risk"
                  {...riskForm.register("riskName2")}
                />
              </div>
              <div className="border border-amber-100 rounded-md p-2 bg-white w-[95%] col-span-1">
                <Select
                  defaultValue="Low"
                  value={riskForm.watch("probability2")}
                  onValueChange={(value) => {
                    console.log("Probability2 changed to:", value);
                    riskForm.setValue("probability2", value);
                    updateRiskCriticality(2, 'probability', value);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Probability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="border border-orange-100 rounded-md p-2 bg-white w-[95%] col-span-1">
                <Select
                  defaultValue="Low"
                  value={riskForm.watch("impact2")}
                  onValueChange={(value) => {
                    console.log("Impact2 changed to:", value);
                    riskForm.setValue("impact2", value);
                    updateRiskCriticality(2, 'impact', value);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Impact" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="border border-purple-100 rounded-md p-2 bg-white w-[95%] col-span-1 flex items-center justify-center">
                <div className="text-lg font-bold">
                  {riskForm.watch("riskCriticality2") || 1}/9
                </div>
                <input type="hidden" {...riskForm.register("riskCriticality2")} />
              </div>
              <div className="border border-blue-100 rounded-md p-2 bg-white w-[95%] col-span-4 relative">
                <div className="min-h-[200px]">
                  <Textarea
                    className="w-full p-2 border-0 focus:ring-0 text-sm"
                    rows={10}
                    placeholder="How will you mitigate this risk?"
                    {...riskForm.register("mitigationPlan2")}
                    ref={(el) => {
                      if (el) {
                        textareaRefs.current["mitigationPlan2"] = el;
                        
                        // On ref attachment, force update the height
                        setTimeout(() => {
                          try {
                            if (riskData?.risk?.mitigationPlan2 && el) {
                              // Force the value to be set directly
                              el.value = riskData.risk.mitigationPlan2;
                              // Calculate better height
                              const lineCount = riskData.risk.mitigationPlan2.split('\n').length;
                              const minHeight = Math.max(200, lineCount * 24);
                              el.style.height = 'auto';
                              el.style.minHeight = `${minHeight}px`;
                              el.style.height = `${minHeight}px`;
                              console.log(`Direct ref injection for mitigationPlan2: ${lineCount} lines, height ${minHeight}px`);
                            }
                          } catch (error) {
                            console.error("Error setting textarea height:", error);
                          }
                        }, 200);
                      }
                    }}
                    style={{ minHeight: '200px' }}
                  />
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="absolute top-1 right-1 h-6 w-6 text-primary hover:text-primary/80 hover:bg-primary/10 rounded-full p-1"
                        onClick={() => generateMitigationPlan(2)}
                      >
                        <Sparkles className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">Generate AI-suggested mitigation plan</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="border border-green-100 rounded-md p-2 bg-white w-[95%] col-span-2">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={3}
                  placeholder="Who is responsible for monitoring this risk?"
                  {...riskForm.register("riskOwner2")}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-[-25px] top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => deleteRiskRow(2)}
                title="Delete Row 2"
              >
                <i className="fas fa-trash"></i>
              </Button>
            </div>
          )}
          
          {/* Third row (conditionally rendered) */}
          {visibleRiskRows >= 3 && (
            <div className="grid grid-cols-12 gap-2 mb-2 relative">
              <div className="border border-red-100 rounded-md p-2 bg-white w-[95%] col-span-3">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={3}
                  placeholder="Describe the risk"
                  {...riskForm.register("riskName3")}
                />
              </div>
              <div className="border border-amber-100 rounded-md p-2 bg-white w-[95%] col-span-1">
                <Select
                  defaultValue="Low"
                  value={riskForm.watch("probability3")}
                  onValueChange={(value) => {
                    console.log("Probability3 changed to:", value);
                    riskForm.setValue("probability3", value);
                    updateRiskCriticality(3, 'probability', value);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Probability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="border border-orange-100 rounded-md p-2 bg-white w-[95%] col-span-1">
                <Select
                  defaultValue="Low"
                  value={riskForm.watch("impact3")}
                  onValueChange={(value) => {
                    console.log("Impact3 changed to:", value);
                    riskForm.setValue("impact3", value);
                    updateRiskCriticality(3, 'impact', value);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Impact" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="border border-purple-100 rounded-md p-2 bg-white w-[95%] col-span-1 flex items-center justify-center">
                <div className="text-lg font-bold">
                  {riskForm.watch("riskCriticality3") || 1}/9
                </div>
                <input type="hidden" {...riskForm.register("riskCriticality3")} />
              </div>
              <div className="border border-blue-100 rounded-md p-2 bg-white w-[95%] col-span-4 relative">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={3}
                  placeholder="How will you mitigate this risk?"
                  {...riskForm.register("mitigationPlan3")}
                  ref={(el) => {
                    if (el) textareaRefs.current["mitigationPlan3"] = el;
                  }}
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="absolute top-1 right-1 h-6 w-6 text-primary hover:text-primary/80 hover:bg-primary/10 rounded-full p-1"
                        onClick={() => generateMitigationPlan(3)}
                      >
                        <Sparkles className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">Generate AI-suggested mitigation plan</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="border border-green-100 rounded-md p-2 bg-white w-[95%] col-span-2">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={3}
                  placeholder="Who is responsible for monitoring this risk?"
                  {...riskForm.register("riskOwner3")}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-[-25px] top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => deleteRiskRow(3)}
                title="Delete Row 3"
              >
                <i className="fas fa-trash"></i>
              </Button>
            </div>
          )}
          
          {/* Fourth row (conditionally rendered) */}
          {visibleRiskRows >= 4 && (
            <div className="grid grid-cols-12 gap-2 mb-2 relative">
              <div className="border border-red-100 rounded-md p-2 bg-white w-[95%] col-span-3">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={3}
                  placeholder="Describe the risk"
                  {...riskForm.register("riskName4")}
                />
              </div>
              <div className="border border-amber-100 rounded-md p-2 bg-white w-[95%] col-span-1">
                <Select
                  value={riskForm.watch("probability4") || "Low"}
                  onValueChange={(value) => {
                    riskForm.setValue("probability4", value);
                    updateRiskCriticality(4, 'probability', value);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Probability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="border border-orange-100 rounded-md p-2 bg-white w-[95%] col-span-1">
                <Select
                  value={riskForm.watch("impact4") || "Low"}
                  onValueChange={(value) => {
                    riskForm.setValue("impact4", value);
                    updateRiskCriticality(4, 'impact', value);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Impact" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="border border-purple-100 rounded-md p-2 bg-white w-[95%] col-span-1 flex items-center justify-center">
                <div className="text-lg font-bold">
                  {riskForm.watch("riskCriticality4") || 1}/9
                </div>
                <input type="hidden" {...riskForm.register("riskCriticality4")} />
              </div>
              <div className="border border-blue-100 rounded-md p-2 bg-white w-[95%] col-span-4 relative">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={3}
                  placeholder="How will you mitigate this risk?"
                  {...riskForm.register("mitigationPlan4")}
                  ref={(el) => {
                    if (el) textareaRefs.current["mitigationPlan4"] = el;
                  }}
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="absolute top-1 right-1 h-6 w-6 text-primary hover:text-primary/80 hover:bg-primary/10 rounded-full p-1"
                        onClick={() => generateMitigationPlan(4)}
                      >
                        <Sparkles className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">Generate AI-suggested mitigation plan</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="border border-green-100 rounded-md p-2 bg-white w-[95%] col-span-2">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={3}
                  placeholder="Who is responsible for monitoring this risk?"
                  {...riskForm.register("riskOwner4")}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-[-25px] top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => deleteRiskRow(4)}
                title="Delete Row 4"
              >
                <i className="fas fa-trash"></i>
              </Button>
            </div>
          )}
          
          {/* Fifth row (conditionally rendered) */}
          {visibleRiskRows >= 5 && (
            <div className="grid grid-cols-12 gap-2 mb-2 relative">
              <div className="border border-red-100 rounded-md p-2 bg-white w-[95%] col-span-3">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={3}
                  placeholder="Describe the risk"
                  {...riskForm.register("riskName5")}
                />
              </div>
              <div className="border border-amber-100 rounded-md p-2 bg-white w-[95%] col-span-1">
                <Select
                  value={riskForm.watch("probability5") || "Low"}
                  onValueChange={(value) => {
                    riskForm.setValue("probability5", value);
                    updateRiskCriticality(5, 'probability', value);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Probability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="border border-orange-100 rounded-md p-2 bg-white w-[95%] col-span-1">
                <Select
                  value={riskForm.watch("impact5") || "Low"}
                  onValueChange={(value) => {
                    riskForm.setValue("impact5", value);
                    updateRiskCriticality(5, 'impact', value);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Impact" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="border border-purple-100 rounded-md p-2 bg-white w-[95%] col-span-1 flex items-center justify-center">
                <div className="text-lg font-bold">
                  {riskForm.watch("riskCriticality5") || 1}/9
                </div>
                <input type="hidden" {...riskForm.register("riskCriticality5")} />
              </div>
              <div className="border border-blue-100 rounded-md p-2 bg-white w-[95%] col-span-4 relative">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={3}
                  placeholder="How will you mitigate this risk?"
                  {...riskForm.register("mitigationPlan5")}
                  ref={(el) => {
                    if (el) textareaRefs.current["mitigationPlan5"] = el;
                  }}
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="absolute top-1 right-1 h-6 w-6 text-primary hover:text-primary/80 hover:bg-primary/10 rounded-full p-1"
                        onClick={() => generateMitigationPlan(5)}
                      >
                        <Sparkles className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">Generate AI-suggested mitigation plan</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="border border-green-100 rounded-md p-2 bg-white w-[95%] col-span-2">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={3}
                  placeholder="Who is responsible for monitoring this risk?"
                  {...riskForm.register("riskOwner5")}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-[-25px] top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => deleteRiskRow(5)}
                title="Delete Row 5"
              >
                <i className="fas fa-trash"></i>
              </Button>
            </div>
          )}
          
          {/* Sixth row (conditionally rendered) */}
          {visibleRiskRows >= 6 && (
            <div className="grid grid-cols-12 gap-2 mb-2 relative">
              <div className="border border-red-100 rounded-md p-2 bg-white w-[95%] col-span-3">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={3}
                  placeholder="Describe the risk"
                  {...riskForm.register("riskName6")}
                />
              </div>
              <div className="border border-amber-100 rounded-md p-2 bg-white w-[95%] col-span-1">
                <Select
                  value={riskForm.watch("probability6") || "Low"}
                  onValueChange={(value) => {
                    riskForm.setValue("probability6", value);
                    updateRiskCriticality(6, 'probability', value);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Probability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="border border-orange-100 rounded-md p-2 bg-white w-[95%] col-span-1">
                <Select
                  value={riskForm.watch("impact6") || "Low"}
                  onValueChange={(value) => {
                    riskForm.setValue("impact6", value);
                    updateRiskCriticality(6, 'impact', value);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Impact" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="border border-purple-100 rounded-md p-2 bg-white w-[95%] col-span-1 flex items-center justify-center">
                <div className="text-lg font-bold">
                  {riskForm.watch("riskCriticality6") || 1}/9
                </div>
                <input type="hidden" {...riskForm.register("riskCriticality6")} />
              </div>
              <div className="border border-blue-100 rounded-md p-2 bg-white w-[95%] col-span-4 relative">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={3}
                  placeholder="How will you mitigate this risk?"
                  {...riskForm.register("mitigationPlan6")}
                  ref={(el) => {
                    if (el) textareaRefs.current["mitigationPlan6"] = el;
                  }}
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="absolute top-1 right-1 h-6 w-6 text-primary hover:text-primary/80 hover:bg-primary/10 rounded-full p-1"
                        onClick={() => generateMitigationPlan(6)}
                      >
                        <Sparkles className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">Generate AI-suggested mitigation plan</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="border border-green-100 rounded-md p-2 bg-white w-[95%] col-span-2">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={3}
                  placeholder="Who is responsible for monitoring this risk?"
                  {...riskForm.register("riskOwner6")}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-[-25px] top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => deleteRiskRow(6)}
                title="Delete Row 6"
              >
                <i className="fas fa-trash"></i>
              </Button>
            </div>
          )}
          
          {/* Add Risk Row Button */}
          <div className="flex justify-start mt-4 mb-4">
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              className="flex items-center"
              onClick={addRiskRow}
              disabled={visibleRiskRows >= 6}
            >
              <PlusCircle className="mr-1 h-4 w-4" />
              Add Risk
            </Button>
          </div>
          
          {/* Save Button */}
          <div className="mt-4">
            <Button 
              type="submit" 
              disabled={saveRiskMutation.isPending}
            >
              {saveRiskMutation.isPending ? "Saving..." : "Save Risk Assessment"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}