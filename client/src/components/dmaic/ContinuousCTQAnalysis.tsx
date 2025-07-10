import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line, LineChart, ScatterChart, Scatter, ZAxis } from "recharts";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Value } from '@radix-ui/react-select';
import { ContCTQHypTesting } from "./ContCTQHypTesting";
import { ContCTQSimpleRegression } from "./ContCTQSimpleRegression";
import { ContCTQMultiVariChart } from "./ContCTQMultiVariChart";
import { ContCTQANOVA2Way } from "./ContCTQANOVA2Way";
import { ContCTQMultipleRegression } from "./ContCTQMultipleRegression";
import { ContCTQDOE } from "./ContCTQDOE";
import { ParetoAnalysis } from "./ParetoAnalysis";

interface CTQAnalysisData {
  id?: number;
  ctq: string;
  ctqId?: number; // Foreign key to CTS characteristics
  // Boolean enablers for each analysis type
  enableContYHypothesisTest?: boolean;
  enableContYSimpleRegression?: boolean;
  enableContYMultiVariChart?: boolean;
  enableContYANOVA2way?: boolean;
  enableContYMultipleRegression?: boolean;
  enableContYDOE?: boolean;
  enablePareto?: boolean;
}

interface ContinuousCTQAnalysisProps {
  projectId: number;
  ctqId: number;
  ctqName: string;
  activeTab?: string;
  onSave?: (data: string) => void;
}

export default function ContinuousCTQAnalysis({ projectId, ctqId, ctqName, activeTab, onSave }: ContinuousCTQAnalysisProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Default configuration fallback
  const getDefaultConfig = () => ({
    ctq: ctqName,
    ctqId: ctqId,
    enableContYHypothesisTest: true,
    enableContYSimpleRegression: false,
    enableContYMultiVariChart: false,
    enableContYANOVA2way: false,
    enableContYMultipleRegression: false,
    enableContYDOE: false,
    enablePareto: false,
  });

  const [ctqAnalysisData, setCTQAnalysisData] = useState<{ [ctqId: number]: CTQAnalysisData }>({
    [ctqId]: getDefaultConfig(),
  });

  // Query to fetch saved configuration
  const { data: savedConfig, isLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/ctq/${ctqId}/continuous-analysis-config`],
    enabled: !!projectId && !!ctqId,
    retry: (failureCount, error) => {
      // Don't retry on 404 errors - this means no configuration exists yet
      if (error?.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Update state when saved configuration is loaded
  useEffect(() => {
    if (savedConfig?.config) {
      setCTQAnalysisData({
        [ctqId]: {
          id: savedConfig.config.id,
          ctq: savedConfig.config.ctq,
          ctqId: savedConfig.config.ctqId,
          enableContYHypothesisTest: savedConfig.config.enableContYHypothesisTest ?? true,
          enableContYSimpleRegression: savedConfig.config.enableContYSimpleRegression ?? false,
          enableContYMultiVariChart: savedConfig.config.enableContYMultiVariChart ?? false,
          enableContYANOVA2way: savedConfig.config.enableContYANOVA2way ?? false,
          enableContYMultipleRegression: savedConfig.config.enableContYMultipleRegression ?? false,
          enableContYDOE: savedConfig.config.enableContYDOE ?? false,
          enablePareto: savedConfig.config.enablePareto ?? false,
        },
      });
    } else if (!isLoading) {
      // If no saved config exists and not loading, ensure default config is set
      setCTQAnalysisData({
        [ctqId]: getDefaultConfig(),
      });
    }
  }, [savedConfig, isLoading, ctqId, ctqName]);
  // Save mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (configData: any) => {
      const response = await fetch(`/api/projects/${projectId}/ctq/${ctqId}/continuous-analysis-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(configData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuration Saved",
        description: "Continuous CTQ analysis configuration has been saved successfully.",
      });
      // Invalidate and refetch the configuration
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}/ctq/${ctqId}/continuous-analysis-config`],
      });
    },
    onError: (error: any) => {
      console.error('Save configuration error:', error);
      console.error('Error details:', {
        message: error?.message,
        status: error?.status,
        response: error?.response,
        projectId,
        ctqId,
        configData: ctqAnalysisData[ctqId]
      });
      toast({
        title: "Save Failed",
        description: `Failed to save analysis configuration: ${error?.message || 'Please try again.'}`,
        variant: "destructive",
      });
    },
  });

  const updateCTQAnalysisField = (ctqId: number, field: keyof CTQAnalysisData, value: any) => {
    setCTQAnalysisData(prev => {
      const updated = {
        ...prev,
        [ctqId]: {
          ...prev[ctqId],
          [field]: value,
        },
      };
      return updated;
    });
  };

  const handleSaveAnalysis = () => {
    const currentConfig = ctqAnalysisData[ctqId];
    if (currentConfig) {
      // Prepare the data for saving (exclude UI-only fields)
      const configToSave = {
        enableContYHypothesisTest: currentConfig.enableContYHypothesisTest,
        enableContYSimpleRegression: currentConfig.enableContYSimpleRegression,
        enableContYMultiVariChart: currentConfig.enableContYMultiVariChart,
        enableContYANOVA2way: currentConfig.enableContYANOVA2way,
        enableContYMultipleRegression: currentConfig.enableContYMultipleRegression,
        enableContYDOE: currentConfig.enableContYDOE,
        enablePareto: currentConfig.enablePareto,
      };
      
      console.log('Saving configuration:', {
        projectId,
        ctqId,
        configToSave,
        url: `/api/projects/${projectId}/ctq/${ctqId}/continuous-analysis-config`
      });
      
      saveConfigMutation.mutate(configToSave);
    }

    // Also call the legacy onSave if provided
    if (onSave) {
      onSave(JSON.stringify(ctqAnalysisData));
    }
  };

  return (
    <div className="w-full mt-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Continuous CTQ Graphical & Statistical Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            CTQ: {ctqName}
          </p>
          <div>
            <label className="block text-sm font-medium mb-3">
              Continuous CTQ Analysis Types (Select Multiple)
            </label>
            <div className="max-w-4xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`${ctqId}-ContYHypothesisTest`}
                    checked={ctqAnalysisData[ctqId]?.enableContYHypothesisTest || false}
                    onCheckedChange={(checked) => updateCTQAnalysisField(ctqId, "enableContYHypothesisTest", checked)}
                  />
                  <Label htmlFor={`${ctqId}-ContYHypothesisTest`} className="text-sm font-medium text-gray-700">
                    Continuous Y Hypothesis Testing
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`${ctqId}-ContYSimpleRegression`}
                    checked={ctqAnalysisData[ctqId]?.enableContYSimpleRegression || false}
                    onCheckedChange={(checked) => updateCTQAnalysisField(ctqId, "enableContYSimpleRegression", checked)}
                  />
                  <Label htmlFor={`${ctqId}-ContYSimpleRegression`} className="text-sm font-medium text-gray-700">
                    Continuous Y Simple Regression
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`${ctqId}-ContYMultiVariChart`}
                    checked={ctqAnalysisData[ctqId]?.enableContYMultiVariChart || false}
                    onCheckedChange={(checked) => updateCTQAnalysisField(ctqId, "enableContYMultiVariChart", checked)}
                  />
                  <Label htmlFor={`${ctqId}-ContYMultiVariChart`} className="text-sm font-medium text-gray-700">
                    Continuous Y Multi-Vari Chart
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`${ctqId}-ContYANOVA2way`}
                    checked={ctqAnalysisData[ctqId]?.enableContYANOVA2way || false}
                    onCheckedChange={(checked) => updateCTQAnalysisField(ctqId, "enableContYANOVA2way", checked)}
                  />
                  <Label htmlFor={`${ctqId}-ContYANOVA2way`} className="text-sm font-medium text-gray-700">
                    Continuous Y ANOVA Two-way
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`${ctqId}-ContYMultipleRegression`}
                    checked={ctqAnalysisData[ctqId]?.enableContYMultipleRegression || false}
                    onCheckedChange={(checked) => updateCTQAnalysisField(ctqId, "enableContYMultipleRegression", checked)}
                  />
                  <Label htmlFor={`${ctqId}-ContYMultipleRegression`} className="text-sm font-medium text-gray-700">
                    Continuous Y Multiple Regression
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`${ctqId}-ContYDOE`}
                    checked={ctqAnalysisData[ctqId]?.enableContYDOE || false}
                    onCheckedChange={(checked) => updateCTQAnalysisField(ctqId, "enableContYDOE", checked)}
                  />
                  <Label htmlFor={`${ctqId}-ContYDOE`} className="text-sm font-medium text-gray-700">
                    Continuous Y DOE (Design of Experiment)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`${ctqId}-pareto`}
                    checked={ctqAnalysisData[ctqId]?.enablePareto || false}
                    onCheckedChange={(checked) => updateCTQAnalysisField(ctqId, "enablePareto", checked)}
                  />
                  <Label htmlFor={`${ctqId}-pareto`} className="text-sm font-medium text-gray-700">
                    Pareto Analysis
                  </Label>
                </div>
              </div>
            </div>
          </div>
          
          {/* Show selected analysis types */}
          
          {(ctqAnalysisData[ctqId]?.enableContYHypothesisTest || 
            ctqAnalysisData[ctqId]?.enableContYSimpleRegression || 
            ctqAnalysisData[ctqId]?.enableContYMultiVariChart || 
            ctqAnalysisData[ctqId]?.enableContYANOVA2way || 
            ctqAnalysisData[ctqId]?.enableContYMultipleRegression || 
            ctqAnalysisData[ctqId]?.enableContYDOE || 
            ctqAnalysisData[ctqId]?.enablePareto) && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Selected Analysis Types:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {ctqAnalysisData[ctqId]?.enableContYHypothesisTest && (
                  <li>• Continuous Y Hypothesis Testing Analysis</li>
                )}
                {ctqAnalysisData[ctqId]?.enableContYSimpleRegression && (
                  <li>• Continuous Y Simple Regression Analysis</li>
                )}
                {ctqAnalysisData[ctqId]?.enableContYMultiVariChart && (
                  <li>• Continuous Y Multi-Vari Chart</li>
                )}
                {ctqAnalysisData[ctqId]?.enableContYANOVA2way && (
                  <li>• Continuous Y ANOVA Two-way Analysis</li>
                )}
                {ctqAnalysisData[ctqId]?.enableContYMultipleRegression && (
                  <li>• Continuous Y Multiple Regression Analysis</li>
                )}
                {ctqAnalysisData[ctqId]?.enableContYDOE && (
                  <li>• Continuous Y DOE (Design of Experiment) Analysis</li>
                )}
                {ctqAnalysisData[ctqId]?.enablePareto && (
                  <li>• Pareto Analysis</li>
                )}
              </ul>
            </div>
          )}
          
          <div className="mt-6 flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setCTQAnalysisData({})}
            >
              Clear All
            </Button>
            <Button 
              onClick={handleSaveAnalysis}
              disabled={saveConfigMutation.isPending || !ctqAnalysisData[ctqId] || Object.keys(ctqAnalysisData[ctqId]).length === 0}
            >
              {saveConfigMutation.isPending ? 'Saving...' : 'Save Analysis Configuration'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-1 gap-2 mt-4">
        {/* Hypothesis Testing */}
         {ctqAnalysisData[ctqId]?.enableContYHypothesisTest && (
         <ContCTQHypTesting projectId={projectId} ctqId={ctqId} ctqName={ctqName} activeTab={activeTab} />
         
        )}
      
        {/* Simple Rewgression Analysis */}
        {ctqAnalysisData[ctqId]?.enableContYSimpleRegression && (
        <ContCTQSimpleRegression projectId={projectId} ctqId={ctqId} ctqName={ctqName} />
        )}

        {/* Multi-Vari Chart Analysis */}
        {ctqAnalysisData[ctqId]?.enableContYMultiVariChart && (
        <ContCTQMultiVariChart projectId={projectId} ctqId={ctqId} ctqName={ctqName} />
        )}
        
        {/* ANOVA 2-Way Analysis */}
        {ctqAnalysisData[ctqId]?.enableContYANOVA2way && (
        <ContCTQANOVA2Way projectId={projectId} ctqId={ctqId} ctqName={ctqName} />
        )}

         {/* ANOVA 2-Way Analysis */}
        {ctqAnalysisData[ctqId]?.enableContYMultipleRegression && (
        <ContCTQMultipleRegression projectId={projectId} ctqId={ctqId} ctqName={ctqName} />
        )}

        {/* DOE Analysis */}
        {ctqAnalysisData[ctqId]?.enableContYDOE && (
        <ContCTQDOE projectId={projectId} ctqId={ctqId} ctqName={ctqName} />
        )}
       
      {/* Pareto Analysis */}
      {ctqAnalysisData[ctqId]?.enablePareto && (
       <ParetoAnalysis projectId={projectId} ctqId={ctqId} ctqName={ctqName} />
      )}
      </div>        
    </div>
  );
}