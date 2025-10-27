import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { AttrCTQTwoProportionHypTesting } from "./AttrCTQTwoProportionHypTesting";
import { AttrCTQChiSquareHypTesting } from "./AttrCTQChiSquareHypTesting";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface DataPoint {
  indexNumber: number;
  dataValue: number;
}

interface AttrCTQHypTestData {
  id?: number;
  ctq: string;
  ctqId?: number;
  testType: string;
  enableTwoProportionTest?: boolean;
  enableChiSquareTest?: boolean;
}

interface AttrCTQHypTestingProps {
  projectId: number;
  ctqId: number;
  ctqName: string;
  activeTab?: string;
  onSave?: (data: string) => void;
}

export function AttrCTQHypTesting({ projectId, ctqId, ctqName, activeTab, onSave }: AttrCTQHypTestingProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize AttrCTQHypTestData with default values
  const [AttrCTQHypTestData, setAttrCTQHypTestData] = useState<{ [ctqId: number]: AttrCTQHypTestData }>(() => ({
    [ctqId]: {
      ctq: ctqName,
      testType: "Attribute Hyp-Test",
      enableTwoProportionTest: true,
      enableChiSquareTest: false,
    }
  }));

  // TanStack Query for loading data from database
  const { data: configData, isLoading, error } = useQuery({
    queryKey: [`/api/projects/${projectId}/ctq/${ctqId}/attribute-hypothesis-testing-config`],
    enabled: !!projectId && !!ctqId,
    retry: false, // Don't retry on 404 - it's expected when no config exists yet
  });

  // Mutation for saving data to database
  const saveConfigMutation = useMutation({
    mutationFn: async (configData: any) => {
      const response = await fetch(`/api/projects/${projectId}/ctq/${ctqId}/attribute-hypothesis-testing-config`, {
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
        description: "Attribbute CTQ Hypothesis testing configuration has been saved successfully.",
      });
      // Invalidate the query to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/ctq/${ctqId}/attribute-hypothesis-testing-config`] });
    },
    onError: (error: any) => {
      console.error('Save configuration error details:', error);
      console.error('Error message:', error.message);
      
      let errorMessage = "Failed to save attribute test configuration. Please try again.";
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
    if (configData?.config && !isLoading) {
      // Use setTimeout to avoid React timing issues
      setTimeout(() => {
        setAttrCTQHypTestData(prev => ({
          ...prev,
          [ctqId]: {
            id: configData.config.id,
            ctq: configData.config.ctq,
            ctqId: configData.config.ctqId,
            testType: configData.config.testType || "Attribute Hyp-Test",
            enableTwoProportionTest: configData.config.enableTwoProportionTest ?? true,
            enableChiSquareTest: configData.config.enableChiSquareTest ?? false,
          }
        }));
      }, 0);
    }
  }, [configData, ctqId, isLoading]);

  const currentTestType = AttrCTQHypTestData[ctqId]?.testType || "Attribute Hyp-Test";

  const updateAttrCTQHypTestDataField = (
    ctqId: number, 
    field: keyof AttrCTQHypTestData, 
    value: any
  ) => {
    setAttrCTQHypTestData(prev => ({
      ...prev,
      [ctqId]: {
        ...prev[ctqId],
        [field]: value,
      }
    }));
  };

  // Save configuration handler
  const handleSaveConfiguration = () => {
    const currentConfig = AttrCTQHypTestData[ctqId];
    if (!currentConfig) {
      toast({
        title: "Save Failed",
        description: "No configuration data to save.",
        variant: "destructive",
      });
      return;
    }

    const configToSave = {
      testType: currentConfig.testType || "Attribute Hyp-Test",
      enableTwoProportionTest: currentConfig.enableTwoProportionTest ?? true,
      enableChiSquareTest: currentConfig.enableChiSquareTest ?? false,
    };

    saveConfigMutation.mutate(configToSave);
  };

  // Clear all handler
  const handleClearAll = () => {
    setAttrCTQHypTestData(prev => ({
      ...prev,
      [ctqId]: {
        ctq: ctqName,
        testType: "Attribute Hyp-Test",
        enableTwoProportionTest: true,
        enableChiSquareTest: false,
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
          <Label htmlFor="Sample-Number">Select Hypothesis Tests (select multiple)</Label>
          <div className="max-w-4xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`${ctqId}-OneSampleTest`}
                  checked={AttrCTQHypTestData[ctqId]?.enableTwoProportionTest || false}
                  onCheckedChange={(checked) => updateAttrCTQHypTestDataField(ctqId, "enableTwoProportionTest", checked)}
                />
                <Label htmlFor={`${ctqId}-TwoProportionTest`} className="text-sm font-medium text-gray-700">
                  Two-Proportion Test
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`${ctqId}-TwoSampleTest`}
                  checked={AttrCTQHypTestData[ctqId]?.enableChiSquareTest || false}
                  onCheckedChange={(checked) => updateAttrCTQHypTestDataField(ctqId, "enableChiSquareTest", checked)}
                />
                <Label htmlFor={`${ctqId}-ChiSquareTest`} className="text-sm font-medium text-gray-700">
                  Chi Square Test (n-Sample Test of Independence)
                </Label>
              </div>
            </div>
          </div>
        </div>
        
        {/* Show selected analysis types */}
        
        {(AttrCTQHypTestData[ctqId]?.enableTwoProportionTest || 
          AttrCTQHypTestData[ctqId]?.enableChiSquareTest) && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Selected Hypotesis Tests:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {AttrCTQHypTestData[ctqId]?.enableTwoProportionTest && (
                <li>• Two-Proportion Test</li>
              )}
              {AttrCTQHypTestData[ctqId]?.enableChiSquareTest && (
                <li>• Chi Square Test (n-Sample Test of Independence)</li>
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
            disabled={saveConfigMutation.isPending || !AttrCTQHypTestData[ctqId]}
          >
            {saveConfigMutation.isPending ? 'Saving...' : 'Save Hypothesis Testing Configuration'}
          </Button>
        </div>
        <div className="space-y-4">
          {AttrCTQHypTestData[ctqId]?.enableTwoProportionTest && (
            <AttrCTQTwoProportionHypTesting projectId={projectId} ctqId={ctqId} ctqName={ctqName} activeTab={activeTab} />
          )}
          {AttrCTQHypTestData[ctqId]?.enableChiSquareTest && (
            <AttrCTQChiSquareHypTesting projectId={projectId} ctqId={ctqId} ctqName={ctqName} activeTab={activeTab} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}