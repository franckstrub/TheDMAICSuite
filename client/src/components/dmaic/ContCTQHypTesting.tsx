import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ContCTQOneSampleHypTesting } from "./ContCTQOneSampleHypTesting";
import { ContCTQTwoSampleHypTesting } from "./ContCTQTwoSampleHypTesting";
import { ContCTQPairedSampleHypTesting } from "./ContCTQPairedSampleHypTesting";
import { ContCTQMultipleSampleHypTesting } from "./ContCTQMultipleSampleHypTesting";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface DataPoint {
  indexNumber: number;
  dataValue: number;
}

interface ContCTQHypTestData {
  id?: number;
  ctq: string;
  ctqId?: number;
  testType: string;
  enableOneSampleTest?: boolean;
  enableTwoSampleTest?: boolean;
  enableMultipleSampleTest?: boolean;
  enablePairedSampleTest?: boolean;
}

interface ContCTQHypTestingProps {
  projectId: number;
  ctqId: number;
  ctqName: string;
  activeTab?: string;
  onSave?: (data: string) => void;
}

export function ContCTQHypTesting({ projectId, ctqId, ctqName, activeTab, onSave }: ContCTQHypTestingProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize ContCTQHypTestData with default values
  const [ContCTQHypTestData, setContCTQHypTestData] = useState<{ [ctqId: number]: ContCTQHypTestData }>(() => ({
    [ctqId]: {
      ctq: ctqName,
      testType: "One Sample Hyp-Test",
      enableOneSampleTest: true,
      enableTwoSampleTest: false,
      enableMultipleSampleTest: false,
      enablePairedSampleTest: false,
    }
  }));

  // TanStack Query for loading data from database
  const { data: configData, isLoading, error } = useQuery({
    queryKey: [`/api/projects/${projectId}/ctq/${ctqId}/hypothesis-testing-config`],
    enabled: !!projectId && !!ctqId,
    retry: false, // Don't retry on 404 - it's expected when no config exists yet
  });

  // Mutation for saving data to database
  const saveConfigMutation = useMutation({
    mutationFn: async (configData: any) => {
      const response = await fetch(`/api/projects/${projectId}/ctq/${ctqId}/hypothesis-testing-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(configData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuration Saved",
        description: "Hypothesis testing configuration has been saved successfully.",
      });
      // Invalidate the query to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/ctq/${ctqId}/hypothesis-testing-config`] });
    },
    onError: (error: any) => {
      console.error('Save configuration error details:', error);
      console.error('Error message:', error.message);
      
      let errorMessage = "Failed to save configuration. Please try again.";
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Save Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Initialize data from database when loaded
  useEffect(() => {
    if (configData?.config) {
      // Use setTimeout to avoid React timing issues
      setTimeout(() => {
        setContCTQHypTestData(prev => ({
          ...prev,
          [ctqId]: {
            id: configData.config.id,
            ctq: configData.config.ctq,
            ctqId: configData.config.ctqId,
            testType: configData.config.testType || "One Sample Hyp-Test",
            enableOneSampleTest: configData.config.enableOneSampleTest ?? true,
            enableTwoSampleTest: configData.config.enableTwoSampleTest ?? false,
            enableMultipleSampleTest: configData.config.enableMultipleSampleTest ?? false,
            enablePairedSampleTest: configData.config.enablePairedSampleTest ?? false,
          }
        }));
      }, 0);
    }
  }, [configData, ctqId]);

  const currentTestType = ContCTQHypTestData[ctqId]?.testType || "One Sample Hyp-Test";

  const updateContCTQHypTestDataField = (
    ctqId: number, 
    field: keyof ContCTQHypTestData, 
    value: any
  ) => {
    setContCTQHypTestData(prev => ({
      ...prev,
      [ctqId]: {
        ...prev[ctqId],
        [field]: value,
      }
    }));
  };

  // Save configuration handler
  const handleSaveConfiguration = () => {
    const currentConfig = ContCTQHypTestData[ctqId];
    if (!currentConfig) {
      toast({
        title: "Save Failed",
        description: "No configuration data to save.",
        variant: "destructive",
      });
      return;
    }

    const configToSave = {
      enableOneSampleTest: currentConfig.enableOneSampleTest ?? true,
      enableTwoSampleTest: currentConfig.enableTwoSampleTest ?? false,
      enablePairedSampleTest: currentConfig.enablePairedSampleTest ?? false,
      enableMultipleSampleTest: currentConfig.enableMultipleSampleTest ?? false,
    };


    
    saveConfigMutation.mutate(configToSave);
  };

  // Clear all handler
  const handleClearAll = () => {
    setContCTQHypTestData(prev => ({
      ...prev,
      [ctqId]: {
        ctq: ctqName,
        testType: "One Sample Hyp-Test",
        enableOneSampleTest: true,
        enableTwoSampleTest: false,
        enableMultipleSampleTest: false,
        enablePairedSampleTest: false,
      }
    }));
  };

  return (
  // Validate or invalidate assumptions and determine if differences are statistically significant or insignificant.
    <Card>
      <CardHeader>
        <CardTitle>Hypothesis Testing</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">
          CTQ: {ctqName}
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Validate or invalidate assumptions and determine if differences are statistically significant or insignificant.
        </p>
        <div>
          <Label htmlFor="Sample-Number">Select Number of Samples in Hypothesis Test</Label>
          <div className="max-w-4xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`${ctqId}-OneSampleTest`}
                  checked={ContCTQHypTestData[ctqId]?.enableOneSampleTest || false}
                  onCheckedChange={(checked) => updateContCTQHypTestDataField(ctqId, "enableOneSampleTest", checked)}
                />
                <Label htmlFor={`${ctqId}-OneSampleTest`} className="text-sm font-medium text-gray-700">
                  One-Sample Hypothesis Test
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`${ctqId}-TwoSampleTest`}
                  checked={ContCTQHypTestData[ctqId]?.enableTwoSampleTest || false}
                  onCheckedChange={(checked) => updateContCTQHypTestDataField(ctqId, "enableTwoSampleTest", checked)}
                />
                <Label htmlFor={`${ctqId}-TwoSampleTest`} className="text-sm font-medium text-gray-700">
                  Two-Sample Hypothesis Test
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`${ctqId}-PairedSampleTest`}
                  checked={ContCTQHypTestData[ctqId]?.enablePairedSampleTest || false}
                  onCheckedChange={(checked) => updateContCTQHypTestDataField(ctqId, "enablePairedSampleTest", checked)}
                />
                <Label htmlFor={`${ctqId}-PairedSampleTest`} className="text-sm font-medium text-gray-700">
                  Paired-Sample Hypothesis Test
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`${ctqId}-MultipleSampleTest`}
                  checked={ContCTQHypTestData[ctqId]?.enableMultipleSampleTest || false}
                  onCheckedChange={(checked) => updateContCTQHypTestDataField(ctqId, "enableMultipleSampleTest", checked)}
                />
                <Label htmlFor={`${ctqId}-MultipleSampleTest`} className="text-sm font-medium text-gray-700">
                  Multiple-Sample Hypothesis Test
                </Label>
              </div>
            </div>
          </div>
        </div>
        
        {/* Show selected analysis types */}
        
        {(ContCTQHypTestData[ctqId]?.enableOneSampleTest || 
          ContCTQHypTestData[ctqId]?.enableTwoSampleTest || 
          ContCTQHypTestData[ctqId]?.enablePairedSampleTest || 
          ContCTQHypTestData[ctqId]?.enableMultipleSampleTest) && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Selected Analysis Types:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {ContCTQHypTestData[ctqId]?.enableOneSampleTest && (
                <li>• One-Sample Hypothesis Test</li>
              )}
              {ContCTQHypTestData[ctqId]?.enableTwoSampleTest && (
                <li>• Two-Sample Hypothesis Test</li>
              )}
              {ContCTQHypTestData[ctqId]?.enablePairedSampleTest && (
                <li>• Paired-Sample Hypothesis Test</li>
              )}
              {ContCTQHypTestData[ctqId]?.enableMultipleSampleTest && (
                <li>• Multiple-Sample Hypothesis Test</li>
              )}
            </ul>
          </div>
        )}
        
        <div className="mt-4 mb-2 flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={handleClearAll}
          >
            Clear All
          </Button>
          <Button 
            onClick={handleSaveConfiguration}
            disabled={saveConfigMutation.isPending || !ContCTQHypTestData[ctqId]}
          >
            {saveConfigMutation.isPending ? 'Saving...' : 'Save Hypothesis Testing Configuration'}
          </Button>
        </div>
        <div className="space-y-4">
          {ContCTQHypTestData[ctqId]?.enableOneSampleTest && (
            <ContCTQOneSampleHypTesting projectId={projectId} ctqId={ctqId} ctqName={ctqName} activeTab={activeTab} />
          )}
          {ContCTQHypTestData[ctqId]?.enableTwoSampleTest && (
            <ContCTQTwoSampleHypTesting projectId={projectId} ctqId={ctqId} ctqName={ctqName} activeTab={activeTab} />
          )}
          {ContCTQHypTestData[ctqId]?.enablePairedSampleTest && (
            <ContCTQPairedSampleHypTesting projectId={projectId} ctqId={ctqId} ctqName={ctqName} activeTab={activeTab} />
          )}
          {ContCTQHypTestData[ctqId]?.enableMultipleSampleTest && (
            <ContCTQMultipleSampleHypTesting projectId={projectId} ctqId={ctqId} ctqName={ctqName} activeTab={activeTab} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}