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
            onClick={() => setContCTQHypTestData({})}
          >
            Clear All
          </Button>
          <Button 
            //onClick={handleSaveAnalysis}
            //disabled={saveConfigMutation.isPending || !ContCTQHypTestData[ctqId] || Object.keys(ContCTQHypTestData[ctqId]).length < 0}
          >
            {/*{saveConfigMutation.isPending ? 'Saving...' : 'Save Analysis Configuration'} */}
            Save Hypothesis Testing Configuration
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