import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAppContext } from "@/store/AppContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function DefinePhase() {
  const { user, currentProject, currency } = useAppContext();
  const { toast } = useToast();
  const projectId = currentProject?.id || 1; // Fallback to 1 for demo

  // Project Charter form
  const charterForm = useForm({
    defaultValues: {
      projectTitle: "",
      businessCase: "",
      problemStatement: "",
      goals: "",
      scope: "",
      startDate: "",
      targetEndDate: "",
      savingsPerYear: "",
      workingCapitalGains: "",
      waccPercentage: "10",
      financialSavings: "",
      fteBenefits: "",
      totalFinancialSavings: "",
      softBenefits: "",
      // Project cost fields
      oneOffPeopleCost: "",
      oneOffTechnologyCost: "",
      oneOffOtherCost: "",
      oneOffOtherExplanation: "",
      capexCost: "",
      capexExplanation: "",
    },
  });

  // SIPOC form
  const sipocForm = useForm({
    defaultValues: {
      suppliers: "",
      inputs: "",
      process: "",
      outputs: "",
      customers: "",
    },
  });

  // Customer Requirements state
  const [requirements, setRequirements] = useState([
    { requirement: "Fast delivery", importance: 4, satisfaction: 2 },
    { requirement: "Order accuracy", importance: 5, satisfaction: 3 },
    { requirement: "", importance: 3, satisfaction: 3 },
  ]);
  
  // FTE calculation state
  const [fteParams, setFteParams] = useState({
    workingDaysPerYear: 245,
    workingHoursPerDay: 8,
    timeUnit: "day",
    savedHours: 0,
    fteCostPerYear: 100000,
    calculatedFte: 0,
    calculatedValue: 0
  });

  // Function to calculate FTE and its value
  const calculateFte = () => {
    const { workingDaysPerYear, workingHoursPerDay, timeUnit, savedHours, fteCostPerYear } = fteParams;
    const totalAnnualHours = workingDaysPerYear * workingHoursPerDay;
    
    let annualSavedHours = 0;
    
    // Convert saved hours to annual basis
    if (timeUnit === "day") {
      annualSavedHours = savedHours * workingDaysPerYear;
    } else if (timeUnit === "week") {
      annualSavedHours = savedHours * (workingDaysPerYear / 5);
    } else if (timeUnit === "month") {
      annualSavedHours = savedHours * (workingDaysPerYear / 20);
    }
    
    // Calculate FTE and monetary value
    const calculatedFte = annualSavedHours / totalAnnualHours;
    const calculatedValue = calculatedFte * fteCostPerYear;
    
    setFteParams({
      ...fteParams,
      calculatedFte: parseFloat(calculatedFte.toFixed(2)),
      calculatedValue: parseFloat(calculatedValue.toFixed(2))
    });
    
    // Set the hidden input value for form submission
    const formattedValue = formatCurrency(calculatedValue, currency);
    const fteString = `${calculatedFte.toFixed(2)} FTE (${formattedValue})`;
    document.getElementById("fteBenefits")?.setAttribute("value", fteString);
  };

  // Function to handle FTE parameter changes with automatic calculation
  const handleFteParamChange = (param: string, value: number | string) => {
    const newParams = {
      ...fteParams,
      [param]: typeof value === 'string' ? value : parseFloat(value.toString())
    };
    
    setFteParams(newParams);
    
    // Automatically calculate FTE after parameter change
    setTimeout(() => {
      // Extract parameters from the updated state
      const { workingDaysPerYear, workingHoursPerDay, timeUnit, savedHours, fteCostPerYear } = newParams;
      const totalAnnualHours = workingDaysPerYear * workingHoursPerDay;
      
      let annualSavedHours = 0;
      
      // Convert saved hours to annual basis
      if (timeUnit === "day") {
        annualSavedHours = savedHours * workingDaysPerYear;
      } else if (timeUnit === "week") {
        annualSavedHours = savedHours * (workingDaysPerYear / 5);
      } else if (timeUnit === "month") {
        annualSavedHours = savedHours * (workingDaysPerYear / 20);
      }
      
      // Calculate FTE and monetary value
      const calculatedFte = annualSavedHours / totalAnnualHours;
      const calculatedValue = calculatedFte * fteCostPerYear;
      
      setFteParams(prevParams => ({
        ...prevParams,
        calculatedFte: parseFloat(calculatedFte.toFixed(2)),
        calculatedValue: parseFloat(calculatedValue.toFixed(2))
      }));
      
      // Set the hidden input value for form submission
      const formattedValue = formatCurrency(calculatedValue, currency);
      const fteString = `${calculatedFte.toFixed(2)} FTE (${formattedValue})`;
      document.getElementById("fteBenefits")?.setAttribute("value", fteString);
      
      // Update total financial savings
      setTimeout(updateTotalFinancialSavings, 0);
    }, 0);
  };

  // Fetch project charter if exists
  const { data: charter } = useQuery({
    queryKey: [`/api/projects/${projectId}/charter`],
    enabled: !!user?.id && !!projectId,
    onSuccess: (data) => {
      if (data?.charter) {
        charterForm.reset({
          projectTitle: currentProject?.title || "",
          businessCase: data.charter.businessCase || "",
          problemStatement: data.charter.problemStatement || "",
          goals: data.charter.goals || "",
          scope: data.charter.scope || "",
          startDate: currentProject?.startDate 
            ? new Date(currentProject.startDate).toISOString().split('T')[0] 
            : "",
          targetEndDate: currentProject?.targetEndDate 
            ? new Date(currentProject.targetEndDate).toISOString().split('T')[0] 
            : "",
          savingsPerYear: data.charter.savingsPerYear || "",
          workingCapitalGains: data.charter.workingCapitalGains || "",
          waccPercentage: data.charter.waccPercentage || "10",
          financialSavings: data.charter.financialSavings || "",
          fteBenefits: data.charter.fteBenefits || "",
          softBenefits: data.charter.softBenefits || "",
          // Project cost fields
          oneOffPeopleCost: data.charter.oneOffPeopleCost || "",
          oneOffTechnologyCost: data.charter.oneOffTechnologyCost || "",
          oneOffOtherCost: data.charter.oneOffOtherCost || "",
          oneOffOtherExplanation: data.charter.oneOffOtherExplanation || "",
          capexCost: data.charter.capexCost || "",
          capexExplanation: data.charter.capexExplanation || "",
        });
      }
    },
  });

  // Fetch SIPOC diagram if exists
  const { data: sipoc } = useQuery({
    queryKey: [`/api/projects/${projectId}/sipoc`],
    enabled: !!user?.id && !!projectId,
    onSuccess: (data) => {
      if (data?.sipoc) {
        sipocForm.reset({
          suppliers: data.sipoc.suppliers || "",
          inputs: data.sipoc.inputs || "",
          process: data.sipoc.process || "",
          outputs: data.sipoc.outputs || "",
          customers: data.sipoc.customers || "",
        });
      }
    },
  });

  // Fetch customer requirements
  const { data: requirementsData } = useQuery({
    queryKey: [`/api/projects/${projectId}/requirements`],
    enabled: !!user?.id && !!projectId,
    onSuccess: (data) => {
      if (data?.requirements && data.requirements.length > 0) {
        setRequirements(data.requirements.map((r: any) => ({
          requirement: r.requirement,
          importance: r.importance,
          satisfaction: r.satisfaction,
        })));
      }
    },
  });

  // Save project charter mutation
  const saveCharterMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        projectId,
        businessCase: data.businessCase,
        problemStatement: data.problemStatement,
        goals: data.goals,
        scope: data.scope,
        savingsPerYear: data.savingsPerYear,
        workingCapitalGains: data.workingCapitalGains,
        waccPercentage: data.waccPercentage,
        financialSavings: data.financialSavings,
        fteBenefits: data.fteBenefits,
        softBenefits: data.softBenefits,
        // Project cost fields
        oneOffPeopleCost: data.oneOffPeopleCost,
        oneOffTechnologyCost: data.oneOffTechnologyCost,
        oneOffOtherCost: data.oneOffOtherCost,
        oneOffOtherExplanation: data.oneOffOtherExplanation,
        capexCost: data.capexCost,
        capexExplanation: data.capexExplanation,
        userId: user?.id,
      };

      // Check if charter exists
      if (charter?.charter?.id) {
        return apiRequest("PUT", `/api/charters/${charter.charter.id}`, payload);
      } else {
        return apiRequest("POST", `/api/projects/${projectId}/charter`, payload);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Project charter saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/charter`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save project charter: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Save SIPOC diagram mutation
  const saveSipocMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        projectId,
        ...data,
        userId: user?.id,
      };

      // Check if SIPOC exists
      if (sipoc?.sipoc?.id) {
        return apiRequest("PUT", `/api/sipocs/${sipoc.sipoc.id}`, payload);
      } else {
        return apiRequest("POST", `/api/projects/${projectId}/sipoc`, payload);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "SIPOC diagram saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/sipoc`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save SIPOC diagram: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Save customer requirements mutation
  const saveRequirementsMutation = useMutation({
    mutationFn: async (requirements: any[]) => {
      const validRequirements = requirements.filter(r => r.requirement.trim() !== "");
      
      // For simplicity, just create/update each requirement
      const promises = validRequirements.map(r => {
        const payload = {
          projectId,
          requirement: r.requirement,
          importance: r.importance,
          satisfaction: r.satisfaction,
          userId: user?.id,
        };
        
        return apiRequest("POST", `/api/projects/${projectId}/requirements`, payload);
      });
      
      return Promise.all(promises);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Customer requirements saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/requirements`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save customer requirements: ${error}`,
        variant: "destructive",
      });
    },
  });

  const handleSaveCharter = (data: any) => {
    saveCharterMutation.mutate(data);
  };

  const handleSaveSipoc = (data: any) => {
    saveSipocMutation.mutate(data);
  };

  // Function to calculate and update total financial savings
  const updateTotalFinancialSavings = () => {
    // Get values from form
    const qualityCostSavings = parseFloat(charterForm.getValues("savingsPerYear")) || 0;
    const financialSavings = parseFloat(charterForm.getValues("financialSavings")) || 0;
    
    // Get FTE benefits value from the state
    const fteBenefits = fteParams.calculatedValue || 0;
    
    // Calculate total project financial savings
    const totalFinancialSavings = qualityCostSavings + financialSavings + fteBenefits;
    
    // Update the form field
    charterForm.setValue("totalFinancialSavings", totalFinancialSavings.toFixed(2));
  };

  const handleSaveRequirements = () => {
    saveRequirementsMutation.mutate(requirements);
  };

  const updateRequirement = (index: number, field: string, value: any) => {
    const newRequirements = [...requirements];
    newRequirements[index] = { ...newRequirements[index], [field]: value };
    setRequirements(newRequirements);
  };

  const addRequirement = () => {
    if (requirements[requirements.length - 1].requirement.trim() !== "") {
      setRequirements([...requirements, { requirement: "", importance: 3, satisfaction: 3 }]);
    }
  };

  const removeRequirement = (index: number) => {
    const newRequirements = [...requirements];
    newRequirements.splice(index, 1);
    setRequirements(newRequirements);
  };

  const calculateGap = (importance: number, satisfaction: number) => {
    return importance - satisfaction;
  };

  return (
    <div className="space-y-6">
      {/* Project Charter */}
      <Card>
        <CardHeader>
          <CardTitle>Project Charter</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={charterForm.handleSubmit(handleSaveCharter)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="projectTitle">Project Title</Label>
                  <Input
                    id="projectTitle"
                    placeholder="Order Processing Optimization"
                    {...charterForm.register("projectTitle")}
                  />
                </div>
                <div>
                  <Label htmlFor="businessCase">Business Case</Label>
                  <Textarea
                    id="businessCase"
                    placeholder="Describe the business reason for this project..."
                    rows={3}
                    {...charterForm.register("businessCase")}
                  />
                </div>
                <div>
                  <Label htmlFor="problemStatement">Problem Statement</Label>
                  <Textarea
                    id="problemStatement"
                    placeholder="Define the problem to be solved..."
                    rows={3}
                    {...charterForm.register("problemStatement")}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="goals">Goals & Objectives</Label>
                  <Textarea
                    id="goals"
                    placeholder="List specific, measurable goals..."
                    rows={3}
                    {...charterForm.register("goals")}
                  />
                </div>
                <div>
                  <Label htmlFor="scope">Project Scope</Label>
                  <Textarea
                    id="scope"
                    placeholder="Define what is in and out of scope..."
                    rows={3}
                    {...charterForm.register("scope")}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      {...charterForm.register("startDate")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="targetEndDate">Target End Date</Label>
                    <Input
                      id="targetEndDate"
                      type="date"
                      {...charterForm.register("targetEndDate")}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Project Benefits Section */}
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4">Project Benefits</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="savingsPerYear">Quality Cost Savings (p.a.) ({currency})</Label>
                    <Input
                      id="savingsPerYear"
                      placeholder={`e.g. 100000`}
                      {...charterForm.register("savingsPerYear")}
                      onChange={(e) => {
                        charterForm.setValue("savingsPerYear", e.target.value);
                        // Update total financial savings
                        updateTotalFinancialSavings();
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-1">Annual cost savings expected from quality improvements</p>
                  </div>
                  <div>
                    <Label htmlFor="workingCapitalGains">Working Capital Gains (Cash) ({currency})</Label>
                    <Input
                      id="workingCapitalGains"
                      placeholder={`e.g. 75000`}
                      {...charterForm.register("workingCapitalGains")}
                      onChange={(e) => {
                        charterForm.setValue("workingCapitalGains", e.target.value);
                        // Calculate Financial Savings based on WACC
                        const wcg = parseFloat(e.target.value) || 0;
                        const wacc = parseFloat(charterForm.getValues("waccPercentage")) / 100 || 0;
                        const financialSavings = (wcg * wacc).toFixed(2);
                        charterForm.setValue("financialSavings", financialSavings);
                        
                        // Update total financial savings
                        updateTotalFinancialSavings();
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-1">Cash flow and working capital improvements</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="waccPercentage">WACC (%)</Label>
                      <Input
                        id="waccPercentage"
                        placeholder="e.g. 10"
                        {...charterForm.register("waccPercentage")}
                        onChange={(e) => {
                          charterForm.setValue("waccPercentage", e.target.value);
                          // Calculate Financial Savings based on WACC
                          const wcg = parseFloat(charterForm.getValues("workingCapitalGains")) || 0;
                          const wacc = parseFloat(e.target.value) / 100 || 0;
                          const financialSavings = (wcg * wacc).toFixed(2);
                          charterForm.setValue("financialSavings", financialSavings);
                          
                          // Update total financial savings
                          updateTotalFinancialSavings();
                        }}
                      />
                      <p className="text-xs text-gray-500 mt-1">Weighted Average Cost of Capital</p>
                    </div>
                    <div>
                      <Label htmlFor="financialSavings">Financial Savings (p.a.) ({currency})</Label>
                      <Input
                        id="financialSavings"
                        readOnly
                        className="bg-gray-50"
                        {...charterForm.register("financialSavings")}
                      />
                      <p className="text-xs text-gray-500 mt-1">WCG * WACC</p>
                    </div>
                  </div>
                  
                  {/* Total Project Financial Savings */}
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="totalFinancialSavings" className="font-medium text-green-800">Total Project Financial Savings (p.a.) ({currency})</Label>
                      <Input
                        id="totalFinancialSavings"
                        readOnly
                        className="max-w-[200px] bg-white border-green-200 text-green-800 font-bold"
                        {...charterForm.register("totalFinancialSavings")}
                      />
                    </div>
                    <p className="text-xs text-green-600 mt-1">Sum of Quality Cost Savings + Financial Savings + FTE Benefits</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="fteBenefits">FTE Benefits (Full Time Employee)</Label>
                    <div className="space-y-4 mt-2 p-3 border border-gray-200 rounded-md">
                      <div>
                        <Label htmlFor="fteAssumptions" className="text-xs font-medium">FTE Assumptions</Label>
                        <div className="grid grid-cols-2 gap-4 mt-1">
                          <div>
                            <Label htmlFor="workingDaysPerYear" className="text-xs">Working Days/Year</Label>
                            <Input
                              id="workingDaysPerYear"
                              type="number"
                              value={fteParams.workingDaysPerYear}
                              onChange={(e) => handleFteParamChange('workingDaysPerYear', e.target.value)}
                              placeholder="e.g. 245"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label htmlFor="workingHoursPerDay" className="text-xs">Working Hours/Day</Label>
                            <Input
                              id="workingHoursPerDay"
                              type="number"
                              value={fteParams.workingHoursPerDay}
                              onChange={(e) => handleFteParamChange('workingHoursPerDay', e.target.value)}
                              placeholder="e.g. 8"
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="savedTime" className="text-xs font-medium">Saved Working Time</Label>
                        <div className="grid grid-cols-2 gap-4 mt-1">
                          <div>
                            <select 
                              className="w-full h-8 text-sm border border-gray-300 rounded-md" 
                              value={fteParams.timeUnit}
                              onChange={(e) => handleFteParamChange('timeUnit', e.target.value)}
                            >
                              <option value="day">Per Day</option>
                              <option value="week">Per Week</option>
                              <option value="month">Per Month</option>
                            </select>
                          </div>
                          <div>
                            <Input
                              id="savedHours"
                              type="number"
                              value={fteParams.savedHours}
                              onChange={(e) => handleFteParamChange('savedHours', e.target.value)}
                              placeholder="Hours saved"
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="fteCostPerYear" className="text-xs">FTE Cost per Year ({currency})</Label>
                        <Input
                          id="fteCostPerYear"
                          type="number"
                          value={fteParams.fteCostPerYear}
                          onChange={(e) => handleFteParamChange('fteCostPerYear', e.target.value)}
                          placeholder="e.g. 100000"
                          className="h-8 text-sm"
                        />
                      </div>
                      
                      <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                        <div>
                          <p className="text-sm font-medium">Calculated FTE: <span className="text-blue-600">{fteParams.calculatedFte}</span></p>
                          <p className="text-sm font-medium">Calculated Value: <span className="text-green-600">{formatCurrency(fteParams.calculatedValue, currency)}</span></p>
                        </div>
                        <div className="text-xs text-gray-500">Auto-calculated</div>
                      </div>
                    </div>
                    
                    <Input
                      id="fteBenefits"
                      className="hidden"
                      {...charterForm.register("fteBenefits")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="softBenefits">Soft Benefits (Non-Quantifiable)</Label>
                    <Textarea
                      id="softBenefits"
                      placeholder="Categories include: Employee Satisfaction, Quality Improvement, Customer Satisfaction, Project Enabler, Other"
                      rows={4}
                      {...charterForm.register("softBenefits")}
                    />
                    <p className="text-xs text-gray-500 mt-1">List any Employee Satisfaction, Quality Improvement, Customer Satisfaction, Project Enabler and Other benefits</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Project Cost Section */}
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4">Project Costs</h3>
              
              {/* One-off Project Costs */}
              <div className="mb-6">
                <h4 className="text-md font-medium mb-3">One-off Project Costs</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="oneOffPeopleCost">People ({currency})</Label>
                    <Input
                      id="oneOffPeopleCost"
                      placeholder="e.g. 5000"
                      {...charterForm.register("oneOffPeopleCost")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="oneOffTechnologyCost">Technology ({currency})</Label>
                    <Input
                      id="oneOffTechnologyCost"
                      placeholder="e.g. 10000"
                      {...charterForm.register("oneOffTechnologyCost")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="oneOffOtherCost">Others ({currency})</Label>
                    <Input
                      id="oneOffOtherCost"
                      placeholder="e.g. 2000"
                      {...charterForm.register("oneOffOtherCost")}
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <Label htmlFor="oneOffOtherExplanation">Please explain Others</Label>
                  <Textarea
                    id="oneOffOtherExplanation"
                    placeholder="Detail any other one-off costs..."
                    rows={2}
                    {...charterForm.register("oneOffOtherExplanation")}
                  />
                </div>
              </div>
              
              {/* CAPEX Costs */}
              <div>
                <h4 className="text-md font-medium mb-3">CAPEX Costs</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="capexCost">CAPEX Cost ({currency})</Label>
                    <Input
                      id="capexCost"
                      placeholder="e.g. 25000"
                      {...charterForm.register("capexCost")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="capexExplanation">Please explain</Label>
                    <Textarea
                      id="capexExplanation"
                      placeholder="Detail capital expenditure costs..."
                      rows={2}
                      {...charterForm.register("capexExplanation")}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <Button type="submit" disabled={saveCharterMutation.isPending} className="mt-6">
              {saveCharterMutation.isPending ? "Saving..." : "Save Project Charter"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* SIPOC Diagram */}
      <Card>
        <CardHeader>
          <CardTitle>SIPOC Diagram</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Identify the Suppliers, Inputs, Process, Outputs, and Customers involved in the project.
          </p>
          
          <form onSubmit={sipocForm.handleSubmit(handleSaveSipoc)}>
            <div className="grid grid-cols-5 gap-2 mb-4">
              <div className="p-3 bg-blue-50 rounded-md text-center">
                <h4 className="font-medium text-primary text-sm">Suppliers</h4>
              </div>
              <div className="p-3 bg-indigo-50 rounded-md text-center">
                <h4 className="font-medium text-indigo-600 text-sm">Inputs</h4>
              </div>
              <div className="p-3 bg-purple-50 rounded-md text-center">
                <h4 className="font-medium text-purple-600 text-sm">Process</h4>
              </div>
              <div className="p-3 bg-green-50 rounded-md text-center">
                <h4 className="font-medium text-green-600 text-sm">Outputs</h4>
              </div>
              <div className="p-3 bg-yellow-50 rounded-md text-center">
                <h4 className="font-medium text-yellow-600 text-sm">Customers</h4>
              </div>
            </div>
            
            <div className="grid grid-cols-5 gap-2">
              <div className="border border-blue-100 rounded-md p-2 bg-white">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={6}
                  placeholder="Who provides inputs to the process?"
                  {...sipocForm.register("suppliers")}
                />
              </div>
              <div className="border border-indigo-100 rounded-md p-2 bg-white">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={6}
                  placeholder="What inputs are required for the process?"
                  {...sipocForm.register("inputs")}
                />
              </div>
              <div className="border border-purple-100 rounded-md p-2 bg-white">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={6}
                  placeholder="What are the steps in the process?"
                  {...sipocForm.register("process")}
                />
              </div>
              <div className="border border-green-100 rounded-md p-2 bg-white">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={6}
                  placeholder="What are the outputs of the process?"
                  {...sipocForm.register("outputs")}
                />
              </div>
              <div className="border border-yellow-100 rounded-md p-2 bg-white">
                <Textarea
                  className="w-full p-2 border-0 focus:ring-0 text-sm"
                  rows={6}
                  placeholder="Who receives the outputs?"
                  {...sipocForm.register("customers")}
                />
              </div>
            </div>
            
            <div className="mt-4">
              <Button type="submit" disabled={saveSipocMutation.isPending}>
                {saveSipocMutation.isPending ? "Saving..." : "Save SIPOC Diagram"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Voice of Customer */}
      <Card>
        <CardHeader>
          <CardTitle>Voice of Customer</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Identify and prioritize customer requirements and needs.
          </p>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Need</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Importance (1-5)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Satisfaction (1-5)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gap</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requirements.map((req, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2">
                      <Input
                        type="text"
                        value={req.requirement}
                        onChange={(e) => updateRequirement(index, "requirement", e.target.value)}
                        placeholder={index === requirements.length - 1 ? "Add new requirement..." : ""}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        className="w-full p-2 border border-gray-300 rounded-md"
                        value={req.importance}
                        onChange={(e) => updateRequirement(index, "importance", parseInt(e.target.value))}
                      >
                        {[1, 2, 3, 4, 5].map((val) => (
                          <option key={val} value={val}>{val}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <select
                        className="w-full p-2 border border-gray-300 rounded-md"
                        value={req.satisfaction}
                        onChange={(e) => updateRequirement(index, "satisfaction", parseInt(e.target.value))}
                      >
                        {[1, 2, 3, 4, 5].map((val) => (
                          <option key={val} value={val}>{val}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${calculateGap(req.importance, req.satisfaction) > 0 ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"}`}>
                        {calculateGap(req.importance, req.satisfaction)}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {index === requirements.length - 1 && req.requirement ? (
                        <Button variant="ghost" size="sm" onClick={addRequirement}>
                          <i className="fas fa-plus"></i>
                        </Button>
                      ) : index === requirements.length - 1 ? (
                        <Button variant="ghost" size="sm" disabled className="text-gray-400">
                          <i className="fas fa-plus"></i>
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => removeRequirement(index)} className="text-red-500 hover:text-red-700">
                          <i className="fas fa-trash"></i>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4">
            <Button 
              onClick={handleSaveRequirements}
              disabled={saveRequirementsMutation.isPending || requirements.every(r => !r.requirement)}
            >
              {saveRequirementsMutation.isPending ? "Saving..." : "Save Customer Requirements"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
