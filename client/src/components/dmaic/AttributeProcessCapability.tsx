import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Save, Calculator, BarChart3, Sparkles, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";
import {
  calculateNonConformity,
  calculateDPMO,
  calculateRolledThroughputYield,
  calculateOEE,
  calculateParetoOfDefects,
  calculateZEquivalentFromDefectRate
} from "@/lib/attributeCapabilityUtils";
import { inverseNormCDF } from "@/lib/statisticsUtils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface ProcessCapabilityData {
  id?: number;
  ctq: string;
  lsl: string;
  usl: string;
  target: string;
  zShift: number;
  dataSetTerm: "Long Term" | "Short Term";
  capabilityIndex: "Z" | "Cp/Cpk";
  showPercentage: boolean;
  showZ: boolean;
  showStatistics: boolean;
  capabilityAssessment?: string;
  enableNonConformity?: boolean;
  enableDpmo?: boolean;
  enableRty?: boolean;
  enableOee?: boolean;
  enablePareto?: boolean;
  nonConformityUnits?: number;
  totalUnits?: number;
  dpmoDefects?: number;
  dpmoUnits?: number;
  dpmoOpportunitiesPerUnit?: number;
  rtyProcessSteps?: Array<{stepName: string; passed: number; total: number}>;
  oeeScheduledTime?: number;
  oeeAvailableTime?: number;
  oeeNominalCapacity?: number;
  oeePartsManufactured?: number;
  oeeBadParts?: number;
  paretoDefectCategories?: Array<{category: string; count: number}>;
}

interface AttributeProcessCapabilityProps {
  projectId: string | number;
  ctq: string;
  ctqType: "Continuous" | "Attribute";
  capabilityData: { [ctq: string]: ProcessCapabilityData };
  setCapabilityData: React.Dispatch<React.SetStateAction<{ [ctq: string]: ProcessCapabilityData }>>;
  showStatistics: { [ctq: string]: boolean };
  setShowStatistics: React.Dispatch<React.SetStateAction<{ [ctq: string]: boolean }>>;
  isStatisticsLoaded: boolean;
}

export default function AttributeProcessCapability({
  projectId,
  ctq,
  ctqType,
  capabilityData,
  setCapabilityData,
  showStatistics,
  setShowStatistics,
  isStatisticsLoaded
}: AttributeProcessCapabilityProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isGeneratingAssessment, setIsGeneratingAssessment] = useState<{ [ctq: string]: boolean }>({});
  const [autoSaveTimers, setAutoSaveTimers] = useState<{ [ctq: string]: NodeJS.Timeout }>({});

  // Save Process Capability mutation
  const saveCapabilityMutation = useMutation({
    mutationFn: async (data: ProcessCapabilityData) => {
      const response = await fetch(`/api/projects/${projectId}/process-capability`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to save");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Process capability analysis saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/process-capability`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save process capability analysis: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Update capability field
  const updateCapabilityField = (ctqName: string, field: keyof ProcessCapabilityData, value: any) => {
    setCapabilityData(prev => {
      const updated = {
        ...prev,
        [ctqName]: {
          ...prev[ctqName],
          [field]: value,
        },
      };
      
      // Auto-calculate if the field affects calculations
      if (['nonConformityUnits', 'totalUnits', 'dpmoDefects', 'dpmoUnits', 'dpmoOpportunitiesPerUnit', 'oeeScheduledTime', 'oeeAvailableTime', 'oeeNominalCapacity', 'oeePartsManufactured', 'oeeBadParts'].includes(field)) {
        setTimeout(() => autoCalculateOnValueChange(ctqName, field), 100);
      }
      
      return updated;
    });
  };

  // Auto-calculate when values change
  const autoCalculateOnValueChange = (ctqName: string, field: string) => {
    const data = capabilityData[ctqName];
    if (!data) return;

    // Clear any existing timer
    if (autoSaveTimers[ctqName]) {
      clearTimeout(autoSaveTimers[ctqName]);
    }

    // Set new timer for auto-save
    const timer = setTimeout(() => {
      saveData(ctqName);
    }, 2000);

    setAutoSaveTimers(prev => ({
      ...prev,
      [ctqName]: timer
    }));
  };

  // Toggle statistics visibility
  const toggleStatistics = async (ctqName: string) => {
    const newState = !showStatistics[ctqName];
    
    setShowStatistics(prev => ({
      ...prev,
      [ctqName]: newState
    }));

    try {
      await apiRequest('PATCH', `/api/projects/${projectId}/process-capability/${ctqName}/statistics`, {
        showStatistics: newState
      });
    } catch (error) {
      setShowStatistics(prev => ({
        ...prev,
        [ctqName]: !newState
      }));
    }
  };

  // Save capability data
  const saveData = (ctqName: string) => {
    const data = capabilityData[ctqName];
    if (!data) return;

    const transformedData = {
      ctq: ctqName,
      lsl: data.lsl || null,
      usl: data.usl || null,
      target: data.target || null,
      zShift: data.zShift,
      dataSetTerm: data.dataSetTerm,
      capabilityIndex: data.capabilityIndex,
      showPercentage: data.showPercentage,
      showZ: data.showZ,
      showStatistics: data.showStatistics,
      capabilityAssessment: data.capabilityAssessment,
      enableNonConformity: data.enableNonConformity,
      enableDpmo: data.enableDpmo,
      enableRty: data.enableRty,
      enableOee: data.enableOee,
      enablePareto: data.enablePareto,
      nonConformityUnits: data.nonConformityUnits,
      totalUnits: data.totalUnits,
      dpmoDefects: data.dpmoDefects,
      dpmoUnits: data.dpmoUnits,
      dpmoOpportunitiesPerUnit: data.dpmoOpportunitiesPerUnit,
      rtyProcessSteps: data.rtyProcessSteps,
      oeeScheduledTime: data.oeeScheduledTime,
      oeeAvailableTime: data.oeeAvailableTime,
      oeeNominalCapacity: data.oeeNominalCapacity,
      oeePartsManufactured: data.oeePartsManufactured,
      oeeBadParts: data.oeeBadParts,
      paretoDefectCategories: data.paretoDefectCategories
    };
    
    saveCapabilityMutation.mutate(transformedData);
  };

  // Add RTY process step
  const addRtyProcessStep = (ctqName: string) => {
    const data = capabilityData[ctqName];
    const currentSteps = data?.rtyProcessSteps || [];
    const newStep = {
      stepName: `Step ${currentSteps.length + 1}`,
      passed: 0,
      total: 0
    };
    
    updateCapabilityField(ctqName, 'rtyProcessSteps', [...currentSteps, newStep]);
  };

  // Remove RTY process step
  const removeRtyProcessStep = (ctqName: string, index: number) => {
    const data = capabilityData[ctqName];
    const currentSteps = data?.rtyProcessSteps || [];
    const updatedSteps = currentSteps.filter((_, i) => i !== index);
    updateCapabilityField(ctqName, 'rtyProcessSteps', updatedSteps);
  };

  // Update RTY process step
  const updateRtyProcessStep = (ctqName: string, index: number, field: string, value: any) => {
    const data = capabilityData[ctqName];
    const currentSteps = data?.rtyProcessSteps || [];
    const updatedSteps = [...currentSteps];
    updatedSteps[index] = { ...updatedSteps[index], [field]: value };
    updateCapabilityField(ctqName, 'rtyProcessSteps', updatedSteps);
  };

  // Add Pareto defect category
  const addParetoCategory = (ctqName: string) => {
    const data = capabilityData[ctqName];
    const currentCategories = data?.paretoDefectCategories || [];
    const newCategory = {
      category: `Defect Type ${currentCategories.length + 1}`,
      count: 0
    };
    
    updateCapabilityField(ctqName, 'paretoDefectCategories', [...currentCategories, newCategory]);
  };

  // Remove Pareto defect category
  const removeParetoCategory = (ctqName: string, index: number) => {
    const data = capabilityData[ctqName];
    const currentCategories = data?.paretoDefectCategories || [];
    const updatedCategories = currentCategories.filter((_, i) => i !== index);
    updateCapabilityField(ctqName, 'paretoDefectCategories', updatedCategories);
  };

  // Update Pareto defect category
  const updateParetoCategory = (ctqName: string, index: number, field: string, value: any) => {
    const data = capabilityData[ctqName];
    const currentCategories = data?.paretoDefectCategories || [];
    const updatedCategories = [...currentCategories];
    updatedCategories[index] = { ...updatedCategories[index], [field]: value };
    updateCapabilityField(ctqName, 'paretoDefectCategories', updatedCategories);
  };

  // Calculate attribute analysis results
  const calculateAttributeResults = (ctqName: string) => {
    const data = capabilityData[ctqName];
    if (!data) return null;

    const results: any = {};

    // Non-Conformity Analysis
    if (data.enableNonConformity && data.nonConformityUnits !== undefined && data.totalUnits) {
      const nonConformityResult = calculateNonConformity(data.nonConformityUnits, data.totalUnits);
      const zValueLT = inverseNormCDF(1 - nonConformityResult.rate);
      const zValueST = zValueLT ? zValueLT + (data.zShift || 1.5) : null;
      
      results.nonConformity = {
        ...nonConformityResult,
        zValueLT,
        zValueST
      };
    }

    // DPMO Analysis
    if (data.enableDpmo && data.dpmoDefects !== undefined && data.dpmoUnits && data.dpmoOpportunitiesPerUnit) {
      const dpmoResult = calculateDPMO(data.dpmoDefects, data.dpmoUnits, data.dpmoOpportunitiesPerUnit);
      const zValueLT = calculateZEquivalentFromDefectRate(dpmoResult.dpmo / 1000000);
      const zValueST = zValueLT ? zValueLT + (data.zShift || 1.5) : null;
      
      results.dpmo = {
        ...dpmoResult,
        zValueLT,
        zValueST
      };
    }

    // RTY Analysis
    if (data.enableRty && data.rtyProcessSteps && data.rtyProcessSteps.length > 0) {
      results.rty = calculateRolledThroughputYield(data.rtyProcessSteps);
    }

    // OEE Analysis
    if (data.enableOee && data.oeeScheduledTime && data.oeeAvailableTime && 
        data.oeeNominalCapacity && data.oeePartsManufactured !== undefined && data.oeeBadParts !== undefined) {
      results.oee = calculateOEE(
        data.oeeScheduledTime,
        data.oeeAvailableTime,
        data.oeeNominalCapacity,
        data.oeePartsManufactured,
        data.oeeBadParts
      );
    }

    // Pareto Analysis
    if (data.enablePareto && data.paretoDefectCategories && data.paretoDefectCategories.length > 0) {
      results.pareto = calculateParetoOfDefects(data.paretoDefectCategories);
    }

    return results;
  };

  const data = capabilityData[ctq];
  const results = calculateAttributeResults(ctq);

  return (
    <div className="space-y-6">
      {/* Analysis Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Attribute Analysis Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`${ctq}-nonconformity`}
                checked={data?.enableNonConformity || false}
                onCheckedChange={(checked) => updateCapabilityField(ctq, "enableNonConformity", checked)}
              />
              <Label htmlFor={`${ctq}-nonconformity`} className="text-sm font-medium text-gray-700">
                Non Conformity Analysis
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`${ctq}-dpmo`}
                checked={data?.enableDpmo || false}
                onCheckedChange={(checked) => updateCapabilityField(ctq, "enableDpmo", checked)}
              />
              <Label htmlFor={`${ctq}-dpmo`} className="text-sm font-medium text-gray-700">
                DPMO (Defects Per Million Opportunities)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`${ctq}-rty`}
                checked={data?.enableRty || false}
                onCheckedChange={(checked) => updateCapabilityField(ctq, "enableRty", checked)}
              />
              <Label htmlFor={`${ctq}-rty`} className="text-sm font-medium text-gray-700">
                RTY (Rolled Throughput Yield)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`${ctq}-oee`}
                checked={data?.enableOee || false}
                onCheckedChange={(checked) => updateCapabilityField(ctq, "enableOee", checked)}
              />
              <Label htmlFor={`${ctq}-oee`} className="text-sm font-medium text-gray-700">
                OEE (Overall Equipment Effectiveness)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`${ctq}-pareto`}
                checked={data?.enablePareto || false}
                onCheckedChange={(checked) => updateCapabilityField(ctq, "enablePareto", checked)}
              />
              <Label htmlFor={`${ctq}-pareto`} className="text-sm font-medium text-gray-700">
                Pareto of Defects
              </Label>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={() => saveData(ctq)} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save Configuration
            </Button>
            <Button 
              onClick={() => toggleStatistics(ctq)}
              variant={showStatistics[ctq] ? "default" : "outline"}
              className="flex items-center gap-2"
            >
              <Calculator className="h-4 w-4" />
              {showStatistics[ctq] ? "Hide" : "Calculate"} Statistics
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Input Cards */}
      <div className="space-y-6">
        {/* Non-Conformity Analysis */}
        {data?.enableNonConformity && (
          <Card className="p-4 bg-blue-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="h-5 w-5 text-blue-600" />
                Non-Conformity Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Number of Non-Conform Units</label>
                  <Input
                    type="number"
                    min="0"
                    value={data?.nonConformityUnits !== undefined ? data.nonConformityUnits : ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "" || /^\d+$/.test(value)) {
                        updateCapabilityField(ctq, "nonConformityUnits", value === "" ? undefined : parseInt(value));
                      }
                    }}
                    placeholder="Enter non-conform units"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Total Units Inspected</label>
                  <Input
                    type="number"
                    min="1"
                    value={data?.totalUnits || ""}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      updateCapabilityField(ctq, "totalUnits", value > 0 ? value : undefined);
                    }}
                    placeholder="Enter total units"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* DPMO Analysis */}
        {data?.enableDpmo && (
          <Card className="p-4 bg-green-50 border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-green-600" />
                DPMO Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Number of Defects</label>
                  <Input
                    type="number"
                    min="0"
                    value={data?.dpmoDefects !== undefined ? data.dpmoDefects : ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "" || /^\d+$/.test(value)) {
                        updateCapabilityField(ctq, "dpmoDefects", value === "" ? undefined : parseInt(value));
                      }
                    }}
                    placeholder="Enter defects"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Number of Units</label>
                  <Input
                    type="number"
                    min="1"
                    value={data?.dpmoUnits || ""}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      updateCapabilityField(ctq, "dpmoUnits", value > 0 ? value : undefined);
                    }}
                    placeholder="Enter units"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Opportunities per Unit</label>
                  <Input
                    type="number"
                    min="1"
                    value={data?.dpmoOpportunitiesPerUnit || ""}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      updateCapabilityField(ctq, "dpmoOpportunitiesPerUnit", value > 0 ? value : undefined);
                    }}
                    placeholder="Enter opportunities"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* RTY Analysis */}
        {data?.enableRty && (
          <Card className="p-4 bg-yellow-50 border-yellow-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-yellow-600" />
                RTY (Rolled Throughput Yield) Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(data?.rtyProcessSteps || []).map((step, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 bg-white rounded border">
                    <div className="flex-1">
                      <Input
                        value={step.stepName}
                        onChange={(e) => updateRtyProcessStep(ctq, index, 'stepName', e.target.value)}
                        placeholder="Step name"
                        className="mb-2"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          min="0"
                          value={step.passed}
                          onChange={(e) => updateRtyProcessStep(ctq, index, 'passed', parseInt(e.target.value) || 0)}
                          placeholder="Passed"
                        />
                        <Input
                          type="number"
                          min="0"
                          value={step.total}
                          onChange={(e) => updateRtyProcessStep(ctq, index, 'total', parseInt(e.target.value) || 0)}
                          placeholder="Total"
                        />
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeRtyProcessStep(ctq, index)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={() => addRtyProcessStep(ctq)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Process Step
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* OEE Analysis */}
        {data?.enableOee && (
          <Card className="p-4 bg-purple-50 border-purple-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                OEE (Overall Equipment Effectiveness) Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Scheduled Time (hours)</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={data?.oeeScheduledTime || ""}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      updateCapabilityField(ctq, "oeeScheduledTime", value > 0 ? value : undefined);
                    }}
                    placeholder="Hours"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Available Time (hours)</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={data?.oeeAvailableTime || ""}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      updateCapabilityField(ctq, "oeeAvailableTime", value > 0 ? value : undefined);
                    }}
                    placeholder="Hours"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Nominal Capacity (parts/hour)</label>
                  <Input
                    type="number"
                    min="0"
                    value={data?.oeeNominalCapacity || ""}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      updateCapabilityField(ctq, "oeeNominalCapacity", value > 0 ? value : undefined);
                    }}
                    placeholder="Parts/hour"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Parts Manufactured</label>
                  <Input
                    type="number"
                    min="0"
                    value={data?.oeePartsManufactured !== undefined ? data.oeePartsManufactured : ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "" || /^\d+$/.test(value)) {
                        updateCapabilityField(ctq, "oeePartsManufactured", value === "" ? undefined : parseInt(value));
                      }
                    }}
                    placeholder="Parts"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Bad Parts</label>
                  <Input
                    type="number"
                    min="0"
                    value={data?.oeeBadParts !== undefined ? data.oeeBadParts : ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "" || /^\d+$/.test(value)) {
                        updateCapabilityField(ctq, "oeeBadParts", value === "" ? undefined : parseInt(value));
                      }
                    }}
                    placeholder="Bad parts"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pareto Analysis */}
        {data?.enablePareto && (
          <Card className="p-4 bg-red-50 border-red-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-red-600" />
                Pareto of Defects Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(data?.paretoDefectCategories || []).map((category, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 bg-white rounded border">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <Input
                        value={category.category}
                        onChange={(e) => updateParetoCategory(ctq, index, 'category', e.target.value)}
                        placeholder="Defect category"
                      />
                      <Input
                        type="number"
                        min="0"
                        value={category.count}
                        onChange={(e) => updateParetoCategory(ctq, index, 'count', parseInt(e.target.value) || 0)}
                        placeholder="Count"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeParetoCategory(ctq, index)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={() => addParetoCategory(ctq)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Defect Category
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Results Section */}
      {showStatistics[ctq] && results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Attribute Analysis Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Non-Conformity Results */}
              {results.nonConformity && (
                <div>
                  <h4 className="font-medium mb-3">Non-Conformity Analysis Results</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-3 rounded">
                      <div className="text-sm text-blue-600">Non-Conformity Rate</div>
                      <div className="font-medium">{(results.nonConformity.rate * 100).toFixed(2)}%</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded">
                      <div className="text-sm text-blue-600">Conformity Rate</div>
                      <div className="font-medium">{(results.nonConformity.conformityRate * 100).toFixed(2)}%</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded">
                      <div className="text-sm text-blue-600">Z-Value (LT)</div>
                      <div className="font-medium">{results.nonConformity.zValueLT?.toFixed(2) || "N/A"}</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded">
                      <div className="text-sm text-blue-600">Z-Value (ST)</div>
                      <div className="font-medium">{results.nonConformity.zValueST?.toFixed(2) || "N/A"}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* DPMO Results */}
              {results.dpmo && (
                <div>
                  <h4 className="font-medium mb-3">DPMO Analysis Results</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-green-50 p-3 rounded">
                      <div className="text-sm text-green-600">DPMO</div>
                      <div className="font-medium">{results.dpmo.dpmo.toFixed(0)}</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded">
                      <div className="text-sm text-green-600">Yield</div>
                      <div className="font-medium">{(results.dpmo.yield * 100).toFixed(2)}%</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded">
                      <div className="text-sm text-green-600">Z-Value (LT)</div>
                      <div className="font-medium">{results.dpmo.zValueLT?.toFixed(2) || "N/A"}</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded">
                      <div className="text-sm text-green-600">Z-Value (ST)</div>
                      <div className="font-medium">{results.dpmo.zValueST?.toFixed(2) || "N/A"}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* RTY Results */}
              {results.rty && (
                <div>
                  <h4 className="font-medium mb-3">RTY Analysis Results</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-yellow-50 p-3 rounded">
                      <div className="text-sm text-yellow-600">RTY</div>
                      <div className="font-medium">{(results.rty.rty * 100).toFixed(2)}%</div>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded">
                      <div className="text-sm text-yellow-600">Total Defects</div>
                      <div className="font-medium">{results.rty.totalDefects}</div>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded">
                      <div className="text-sm text-yellow-600">Total Units</div>
                      <div className="font-medium">{results.rty.totalUnits}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* OEE Results */}
              {results.oee && (
                <div>
                  <h4 className="font-medium mb-3">OEE Analysis Results</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-purple-50 p-3 rounded">
                      <div className="text-sm text-purple-600">Availability</div>
                      <div className="font-medium">{(results.oee.availability * 100).toFixed(1)}%</div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded">
                      <div className="text-sm text-purple-600">Performance</div>
                      <div className="font-medium">{(results.oee.performance * 100).toFixed(1)}%</div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded">
                      <div className="text-sm text-purple-600">Quality</div>
                      <div className="font-medium">{(results.oee.quality * 100).toFixed(1)}%</div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded">
                      <div className="text-sm text-purple-600">OEE</div>
                      <div className="font-medium">{(results.oee.oee * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Pareto Results */}
              {results.pareto && (
                <div>
                  <h4 className="font-medium mb-3">Pareto Analysis Results</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={results.pareto.paretoData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="category" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}