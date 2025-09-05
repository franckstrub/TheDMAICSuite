import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Undo } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  mean, 
  standardDeviation, 
  variance,
  calculateMultipleSMeanSampleSize,
} from "@/lib/statisticsUtils";


interface DataPoint {
  indexRowNumber: number;
  dataValue: number;
}

interface ContCTQMultipleSampleHypTestData {
  id?: number;
  ctq: string;
  ctqId?: number;
  testType: 'Multiple-Sample Hyp test'
  enableMeanTest: boolean;
  enableMeanMultipleSPower: boolean;
  powerPower: string;
  powerAlpha: string;
  powerNbrDistri: number;
  powerDifference: number;
  powerStdev: number;
  significanceLevel: string;
  alternateMean: string;
  enableVarianceTest?: boolean;
  alternateVariance: string;
  enableMedianTest: boolean;
  alternateMedian: string;
  dataPoints: DataPoint[];
  datasetDescription: string[];
}

interface PowerSampleSizeResults {
  multipleSMeansampleSize: number;
  multipleSMeanactualPower: number;
}

interface ContCTQMultipleSampleHypTestingProps {
  projectId: number;
  ctqId: number;
  ctqName: string;
  activeTab?: string;
  onSave?: (data: string) => void;
}

export function ContCTQMultipleSampleHypTesting({ projectId, ctqId, ctqName, activeTab, onSave }: ContCTQMultipleSampleHypTestingProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [significanceLevel, setSignificanceLevel] = useState("0.05");
  const [alternateMean, setAlternateMean] = useState("Less than");
  const [alternateVariance, setAlternateVariance] = useState("Less than");
  const [alternateMedian, setAlternateMedian] = useState("Less than");
  const [PowerMultipleSMeanPower, setPowerMultipleSMeanPower] = useState("0.90");
  const [powerMultipleSMeanAlpha, setPowerMultipleSMeanAlpha] = useState("0.05");
  const [powerMultipleSMeanHa, setPowerMultipleSMeanHa] = useState('≠');
  const [PowerSampleSizeResults, setPowerSampleSizeResults] = useState<PowerSampleSizeResults>({
      multipleSMeansampleSize: 0,
      multipleSMeanactualPower: 0,
    });
  const [testResult, setTestResult] = useState({
    MeanTestStatistic: -3.45,
    MeanTestCriteria: 3.12,
    MeanTestpValue: 0.002,
    VarianceTestStatistic: 2.45,
    VarianceTestCriteria: 2.12,
    VarianceTestpValue: 0.022,
    MedianTestStatistic: -1.45,
    MedianTestCriteria: -1.12,
    MedianTestpValue: 0.004,
  });

  // Data input state for One Sample test

  // Initialize ContCTQMultipleSampleHypTestData with default values
  // Fixed state initialization
  const [ContCTQMultipleSampleHypTestData, setContCTQMultipleSampleHypTestData] = useState<{ [ctqId: number]: ContCTQMultipleSampleHypTestData }>(() => ({
  [ctqId]: {
    ctq: ctqName,
    testType: "Multiple-Sample Hyp test", // Fixed: added missing hyphen to match interface
    enableMeanTest: false,
    enableMeanMultipleSPower: false,
    powerPower: "0.90" ,
    powerAlpha: "0.05" ,
    powerNbrDistri: 2,
    powerDifference: 0,
    powerStdev: 0,
    significanceLevel: "0.05",
    alternateMean: "Less than",
    enableVarianceTest: false,
    alternateVariance: "Less than",
    enableMedianTest: false,
    alternateMedian: "Less than",
    dataPoints: [], 
    datasetDescription: [""],
  } 
  }));

  // Mutation for saving data to database
    const saveConfigMutation = useMutation({
      mutationFn: async (configData: any) => {
        const response = await fetch(`/api/projects/${projectId}/ctq/${ctqId}/multiple-sample-hypothesis-config`, {
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
          description: "Multiple-sample hypothesis testing configuration has been saved successfully.",
        });
        // Invalidate the query to refresh data
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/ctq/${ctqId}/multiple-sample-hypothesis-config`] });
      },
      onError: (error: any) => {
        toast({
          title: "Save Failed",
          description: "Failed to save configuration. Please try again.",
          variant: "destructive",
        });
      },
    });

  // Function to save current configuration to database
  const saveConfiguration = () => {
    const currentConfig = ContCTQMultipleSampleHypTestData[ctqId];
    if (!currentConfig) return;
    
    const configToSave = {
      testType: currentConfig.testType,
      enableMeanTest: currentConfig.enableMeanTest,
      enableMeanMultipleSPower: currentConfig.enableMeanMultipleSPower,
      powerPower: currentConfig.powerPower,
      powerAlpha: currentConfig.powerAlpha ,
      powerNbrDistri: currentConfig.powerNbrDistri,
      powerDifference: currentConfig.powerDifference,
      powerStdev: currentConfig.powerStdev,
      significanceLevel: currentConfig.significanceLevel,
      alternateMean: currentConfig.alternateMean,
      enableVarianceTest: currentConfig.enableVarianceTest,
      alternateVariance: currentConfig.alternateVariance,
      enableMedianTest: currentConfig.enableMedianTest,
      alternateMedian: currentConfig.alternateMedian,
      dataPoints: currentConfig.dataPoints,
      datasetDescription: currentConfig.datasetDescription,
    };
    
    saveConfigMutation.mutate(configToSave);
  };

  const updateContCTQMultipleSampleHypTestDataField = (
    ctqId: number, 
    field: keyof ContCTQMultipleSampleHypTestData, 
    value: any
  ) => {
    setContCTQMultipleSampleHypTestData(prev => ({
      ...prev,
      [ctqId]: {
        ...prev[ctqId],
        [field]: value,
      }
    }));
  };

  const handlePowerSampleSize = (    
    enableMeanMultipleSPower: boolean,
    powerPower:string,
    powerAlpha: string,
    powerNbrDistri: number,
    powerDifference: number,
    powerStdev: number,
  ): PowerSampleSizeResults => {
  
    // Initialize with default values
    
    let nMean = 0;
    let actualMeanPower=0;
    let nVariance = 0;
    let actualVariancePower=0;
  
    if(enableMeanMultipleSPower) {
      if(isNaN(parseFloat(powerPower))) {
        toast({
          title: "Multiple Sample-Mean Power & Sample Size test run Unsuccessfully",
          description: "No valid Mean Power value. The Mean Power & Sample Size test has not been executed.",
        });
      }
      else {
        const result = calculateMultipleSMeanSampleSize(
          powerPower,
          powerNbrDistri,
          powerDifference,
          powerStdev,
          powerAlpha,
        );
        nMean=result.sampleSize;
        actualMeanPower= result.actualPower;      
      }
    };
  
    setPowerSampleSizeResults(PowerSampleSizeResults);
    toast({
          title: "Power & Sample Size test Run Successfully",
          description: "The Power & Sample Size tests have been executed.",
        });
    return {
      multipleSMeansampleSize: nMean,
      multipleSMeanactualPower: actualMeanPower,
    };  
  }
  
  {/* on input change, update ContCTQTwoSampleHypTestData state */}
  useEffect(() => {
    const currentConfig = ContCTQMultipleSampleHypTestData[ctqId];
    if (!currentConfig) return;
  
    const results = handlePowerSampleSize(
      //testType: currentConfig.testType,
      //enableMeanTest: currentConfig.enableMeanTest,
      currentConfig.enableMeanMultipleSPower ?? false,
      currentConfig.powerPower ?? "0.90",
      currentConfig.powerAlpha ?? "0.05",
      currentConfig.powerNbrDistri ?? 2,
      currentConfig.powerDifference ?? 0,
      currentConfig.powerStdev ?? 0,
      //currentConfig.significanceLevel,
      //currentConfig.alternateMean,
      //currentConfig.enableVarianceTest,
      //currentConfig.alternateVariance,
      //currentConfig.enableMedianTest,
      //currentConfig.alternateMedian,
      //currentConfig.dataPoints,
      //currentConfig.datasetDescription,
    );
  
    setPowerSampleSizeResults(results);
  }, [
    ContCTQMultipleSampleHypTestData[ctqId]?.enableMeanMultipleSPower,
    ContCTQMultipleSampleHypTestData[ctqId]?.powerPower,
    ContCTQMultipleSampleHypTestData[ctqId]?.powerAlpha,
    ContCTQMultipleSampleHypTestData[ctqId]?.powerNbrDistri,
    ContCTQMultipleSampleHypTestData[ctqId]?.powerDifference,
    ContCTQMultipleSampleHypTestData[ctqId]?.powerStdev,
  ]);

  const handleRunTest = () => {
    toast({
      title: "Test Run Successfully",
      description: "The hypothesis test has been executed.",
    });
  };

  // useEffect

  return (
    <Card>
      <CardHeader>
        <CardTitle>Multiple-Sample Hypothesis Testing</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">
            CTQ: {ctqName}
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Validate or invalidate assumptions and determine if differences are statistically significant or insignificant in N samples.
        </p>
        
        <div className="space-y-4">
          <label className="block text-sm font-medium mb-3">
            Statistical parameter to test (Select Multiple)
          </label>
          <div className="max-w-4xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`${ctqId}-MeanTest`}
                  checked={ContCTQMultipleSampleHypTestData[ctqId]?.enableMeanTest || false}
                  onCheckedChange={(checked) => updateContCTQMultipleSampleHypTestDataField(ctqId, "enableMeanTest", checked)}
                />
                <Label htmlFor={`${ctqId}-enableMeanTest`} className="text-sm font-medium text-gray-700">
                  Mean
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`${ctqId}-VarianceTest`}
                  checked={ContCTQMultipleSampleHypTestData[ctqId]?.enableVarianceTest || false}
                  onCheckedChange={(checked) => updateContCTQMultipleSampleHypTestDataField(ctqId, "enableVarianceTest", checked)}
                />
                <Label htmlFor={`${ctqId}-VarianceTest`} className="text-sm font-medium text-gray-700">
                  Variance
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`${ctqId}-MedianTest`}
                  checked={ContCTQMultipleSampleHypTestData[ctqId]?.enableMedianTest || false}
                  onCheckedChange={(checked) => updateContCTQMultipleSampleHypTestDataField(ctqId, "enableMedianTest", checked)}
                />
                <Label htmlFor={`${ctqId}-MedianTest`} className="text-sm font-medium text-gray-700">
                  Median
                </Label>
              </div>
            </div>
          </div> 
          <div className="grid grid-cols-3 gap-12 items-stretch">
            <div className="flex items-top ml-1 h-full space-x-1">
            <Checkbox
              id={`${ctqId}-enableMeanMultipleSPower`}
              checked={ContCTQMultipleSampleHypTestData[ctqId]?.enableMeanMultipleSPower || false}
              onCheckedChange={(checked) => updateContCTQMultipleSampleHypTestDataField(ctqId, "enableMeanMultipleSPower", checked)}
            />
            {!ContCTQMultipleSampleHypTestData[ctqId]?.enableMeanMultipleSPower ? (
              <Label htmlFor={`${ctqId}-enableMeanMultipleSPower`} className="items-top text-sm font-sm text-gray-400">
                Power & Sample Size
              </Label>
              ) : (
              <div>
                <Label htmlFor={`${ctqId}-enableMeanMultipleSPower`} className="text-sm font-medium text-gray-700">
                Power & Sample Size
                </Label>
                <Card className="bg-gray-50 min-h-[420px] flex flex-col mt-1">
                  <CardHeader>
                    <CardTitle className="text-sm">Power & Sample Size Multiple-Sample Mean Hypothesis Testing</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm font-medium">
                    <div>                      
                      <Label htmlFor='powerMultipleSMeanPower'>Power of test(1-β):</Label>
                      <Select value={PowerMultipleSMeanPower} onValueChange={(value: string) => {
                        setPowerMultipleSMeanPower(value);
                      }}>
                      <SelectTrigger id='powerMultipleSMeanPower'>
                          <SelectValue placeholder="Select Power of test" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.99">99%</SelectItem>
                        <SelectItem value="0.95">95%</SelectItem>
                        <SelectItem value="0.90">90%</SelectItem>
                        <SelectItem value="0.85">85%</SelectItem>
                        <SelectItem value="0.80">80%</SelectItem>
                      </SelectContent>
                      </Select>                     
                    </div>

                    <div className="mt-2 mb-2">                    
                      Ha: At least one mean is ≠ than the other means                    
                    </div>

                    <div>
                      <Label htmlFor="powerMultipleSMeanAlpha">Alpha (α):</Label> 
                      <Select value={powerMultipleSMeanAlpha} onValueChange={(value: string) => {
                        setPowerMultipleSMeanAlpha(value);
                        //updateContCTQMultipleSampleHypTestDataField(ctqId, 'powerMultipleSMeanAlpha', value);
                      }}>
                      <SelectTrigger id="powerMultipleSMeanAlpha">
                          <SelectValue placeholder="Select Alpha significance level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.01">1%</SelectItem>
                        <SelectItem value="0.05">5%</SelectItem>
                        <SelectItem value="0.10">10%</SelectItem>
                        <SelectItem value="0.15">15%</SelectItem>
                        <SelectItem value="0.20">20%</SelectItem>
                      </SelectContent>
                      </Select>  
                    </div>
                    
                    <div>Number of distributions to test: 
                      <Input
                        type="number"
                        min="2"
                        step="any"
                        value={ContCTQMultipleSampleHypTestData[ctqId]?.powerNbrDistri ?? ''}
                        onChange={(e) => updateContCTQMultipleSampleHypTestDataField(
                            ctqId, 
                            "powerNbrDistri", 
                            e.target.value === '' ? '' : parseFloat(e.target.value)
                        )}
                        placeholder="Enter Number of distributions to test:"
                        className="mt-1"
                      />
                    </div>  
                    
                    <div>Maximum difference between means (δ): 
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={ContCTQMultipleSampleHypTestData[ctqId]?.powerDifference?? ''}
                        onChange={(e) => updateContCTQMultipleSampleHypTestDataField(
                            ctqId, 
                            "powerDifference", 
                            e.target.value === '' ? '' : parseFloat(e.target.value)
                        )}
                        placeholder="Enter Maximum difference between means (δ)"
                        className="mt-1"
                      />
                    </div>  
                    
                    <div>Standard Deviation (σ): 
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={ContCTQMultipleSampleHypTestData[ctqId]?.powerStdev ?? ''}
                        onChange={(e) => updateContCTQMultipleSampleHypTestDataField(
                            ctqId, 
                            "powerStdev", 
                            e.target.value === '' ? '' : parseFloat(e.target.value)
                        )}
                        placeholder="Enter standard deviation value (σ)"
                        className="mt-1"
                      />
                    </div>                   

                    <div className="font-medium text-sm">
                    <Badge
                      variant="default"
                      className={`mt-2 font-medium text-sm text-center justify-center text-white bg-blue-400`}
                      title={ "Estimated minimum size of each data sample and actual power of the test" }
                    >
                      Sample Size (n): {PowerSampleSizeResults.multipleSMeansampleSize.toFixed(0)} <br />
                      Actual Power: {(PowerSampleSizeResults.multipleSMeanactualPower*100).toFixed(2)}%
                    </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            </div>
        </div>
        {(ContCTQMultipleSampleHypTestData[ctqId]?.enableMeanMultipleSPower) && (    
          <Button 
              className="w-full" 
              onClick={saveConfiguration} 
              disabled={saveConfigMutation.isPending}
              //variant="outline"
            >
              {saveConfigMutation.isPending ? "Saving..." : "Save Configuration and Data"}
          </Button>
        )}          

          <div className="grid grid-cols-2 gap-4">
            <div>
            <Label htmlFor="significance">Significance Level (α)</Label>
            <Select value={significanceLevel} onValueChange={setSignificanceLevel}>
            <SelectTrigger id="significance">
                <SelectValue placeholder="Select significance level" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="0.01">1%</SelectItem>
                <SelectItem value="0.05">5%</SelectItem>
                <SelectItem value="0.10">10%</SelectItem>
            </SelectContent>
            </Select>
            </div>
            <div>
            <Label htmlFor="alternateMean">Alternative Hypothesis</Label>
            <Select value={alternateMean} onValueChange={setAlternateMean}>
            <SelectTrigger id="alternative">
                <SelectValue placeholder="Select alternative" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="Different">Different</SelectItem>
                <SelectItem value="Less than">Less than</SelectItem>
                <SelectItem value="Greater than">Greater than</SelectItem>
            </SelectContent>
            </Select>
            </div>
          </div>

          <div>
            <Label>Characterize your tested dataset:</Label>
            <Input
                type="text"
                value={ContCTQMultipleSampleHypTestData[ctqId]?.datasetDescription[0] || ""}
                onChange={(e) => updateContCTQMultipleSampleHypTestDataField(
                    ctqId, 
                    "datasetDescription", 
                    e.target.value
                )}
                placeholder="Enter a description of your tested dataset"
                className="mt-1"
            />

          {/* Data Input Section for Multiple Sample Hypothesis Test */}
          
          <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
            <h4 className="font-medium text-sm mb-2">Results</h4>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <div className="text-gray-600">Mean test statistic:</div>
                <div className="font-medium">{testResult.MeanTestStatistic}</div>
                <div className="text-gray-600">Mean test criteria:</div>
                <div className="font-medium">{testResult.MeanTestStatistic}</div>
                <div className="text-gray-600">Mean test p-value:</div>
                <div className="font-medium text-green-600">{testResult.MeanTestpValue}</div>
              </div>
              <div>
                <div className="text-gray-600">Variance test statistic:</div>
                <div className="font-medium">{testResult.VarianceTestStatistic}</div>
                <div className="text-gray-600">Variance test criteria:</div>
                <div className="font-medium">{testResult.VarianceTestStatistic}</div>
                <div className="text-gray-600">Variance test p-value:</div>
                <div className="font-medium text-green-600">{testResult.VarianceTestpValue}</div>
              </div>
              <div> 
                <div className="text-gray-600">Median test statistic:</div>
                <div className="font-medium">{testResult.MedianTestStatistic}</div>
                <div className="text-gray-600">Median test criteria:</div>
                <div className="font-medium">{testResult.MedianTestStatistic}</div>
                <div className="text-gray-600">Median test p-value:</div>
                <div className="font-medium text-green-600">{testResult.MedianTestpValue}</div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}