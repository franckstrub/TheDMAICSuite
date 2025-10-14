import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from "@/components/ui/badge";
import { parseNumericValue } from "@/lib/statisticsUtils";
import { HypothesisTestingTabs } from "./common/HypothesisTestingTabs";

interface AttrCTQTwoProportionHypTestData {
  id?: number;
  ctq: string;
  ctqId?: number;
  testType: string;
  hypothesizedDifference?: number;
  sample1Size?: number;
  sample1Events?: number;
  sample2Size?: number;
  sample2Events?: number;
  sample1Description?: string;
  sample2Description?: string;
  enablePowerAnalysis: boolean;
  powerTargetPower?: number;
  powerAlpha?: number;
  powerHa?: string;
  powerP1?: number;
  powerP2?: number;
}

interface AttrCTQTwoProportionHypTestingProps {
  projectId: number;
  ctqId: number;
  ctqName: string;
  activeTab?: string;
  onSave?: (data: string) => void;
}

interface PowerSampleSizeResults {
  sampleSize: number;
  actualPower: number;
}

interface TestResults {
  p1: number;
  p2: number;
  pDiff: number;
  pooledP: number;
  se: number;
  zStatistic: number;
  zCritical: number | { lower: number; upper: number };
  pValue: number;
  ciLower: number;
  ciUpper: number;
}

export function AttrCTQTwoProportionHypTesting({ projectId, ctqId, ctqName, activeTab, onSave }: AttrCTQTwoProportionHypTestingProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [significanceLevel, setSignificanceLevel] = useState("0.05");
  const [alternative, setAlternative] = useState("Different");
  const [powerTargetPower, setPowerTargetPower] = useState("0.90");
  const [powerAlpha, setPowerAlpha] = useState("0.05");
  const [powerHa, setPowerHa] = useState('≠');

  const [powerResults, setPowerResults] = useState<PowerSampleSizeResults>({
    sampleSize: 0,
    actualPower: 0,
  });

  const [testResults, setTestResults] = useState<TestResults | null>(null);

  // Initialize data state
  const [twoProportionData, setTwoProportionData] = useState<AttrCTQTwoProportionHypTestData>({
    ctq: ctqName,
    testType: "Two-Proportion Test",
    hypothesizedDifference: 0,
    sample1Size: 0,
    sample1Events: 0,
    sample2Size: 0,
    sample2Events: 0,
    sample1Description: "",
    sample2Description: "",
    enablePowerAnalysis: false,
    powerTargetPower: 0.90,
    powerAlpha: 0.05,
    powerHa: '≠',
    powerP1: 0,
    powerP2: 0,
  });

  // TanStack Query for loading data from database
  const { data: configData, isLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/ctq/${ctqId}/two-proportion-hypothesis-config`],
    enabled: !!projectId && !!ctqId,
    retry: false,
  });

  // Mutation for saving data to database
  const saveConfigMutation = useMutation({
    mutationFn: async (configData: any) => {
      const response = await fetch(`/api/projects/${projectId}/ctq/${ctqId}/two-proportion-hypothesis-config`, {
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
        description: "Two-proportion hypothesis testing configuration has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/ctq/${ctqId}/two-proportion-hypothesis-config`] });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: "Failed to save configuration. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Load configuration data from database when available
  useEffect(() => {
    if (configData && (configData as any).config && !isLoading) {
      const config = (configData as any).config;
      
      if (config.significanceLevel) setSignificanceLevel(config.significanceLevel);
      if (config.alternative) setAlternative(config.alternative);
      if (config.powerTargetPower) setPowerTargetPower(config.powerTargetPower.toString());
      if (config.powerAlpha) setPowerAlpha(config.powerAlpha.toString());
      if (config.powerHa) setPowerHa(config.powerHa);

      setTwoProportionData(prev => ({
        ...prev,
        hypothesizedDifference: config.hypothesizedDifference ?? 0,
        sample1Size: config.sample1Size ?? 0,
        sample1Events: config.sample1Events ?? 0,
        sample2Size: config.sample2Size ?? 0,
        sample2Events: config.sample2Events ?? 0,
        sample1Description: config.sample1Description || "",
        sample2Description: config.sample2Description || "",
        enablePowerAnalysis: config.enablePowerAnalysis ?? false,
        powerP1: config.powerP1 ?? 0,
        powerP2: config.powerP2 ?? 0,
      }));
    }
  }, [configData, isLoading]);

  // Calculate power and sample size
  useEffect(() => {
    if (twoProportionData.enablePowerAnalysis && twoProportionData.powerP1 !== undefined && twoProportionData.powerP2 !== undefined) {
      const results = calculatePowerSampleSize(
        parseFloat(powerTargetPower),
        powerHa,
        twoProportionData.powerP1,
        twoProportionData.powerP2,
        parseFloat(powerAlpha)
      );
      setPowerResults(results);
    }
  }, [twoProportionData.enablePowerAnalysis, twoProportionData.powerP1, twoProportionData.powerP2, powerTargetPower, powerHa, powerAlpha]);

  // Calculate power and sample size for two-proportion test
  const calculatePowerSampleSize = (
    targetPower: number,
    ha: string,
    p1: number,
    p2: number,
    alpha: number
  ): PowerSampleSizeResults => {
    // Prevent division by zero and invalid probabilities
    if (p1 <= 0 || p1 >= 1 || p2 <= 0 || p2 >= 1 || p1 === p2) {
      return { sampleSize: 0, actualPower: 0 };
    }

    const pDiff = Math.abs(p1 - p2);
    const pBar = (p1 + p2) / 2;
    
    // Z-scores
    const zAlpha = ha === '≠' ? 
      inverseNormalCDF(1 - alpha / 2) : 
      inverseNormalCDF(1 - alpha);
    const zBeta = inverseNormalCDF(targetPower);

    // Sample size calculation
    const numerator = (zAlpha * Math.sqrt(2 * pBar * (1 - pBar)) + zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2;
    const denominator = pDiff ** 2;
    const n = Math.ceil(numerator / denominator);

    // Calculate actual power with this sample size
    const se1 = Math.sqrt(2 * pBar * (1 - pBar) / n);
    const se2 = Math.sqrt((p1 * (1 - p1) + p2 * (1 - p2)) / n);
    const zStatistic = pDiff / se2;
    const actualPower = ha === '≠' ? 
      1 - (normalCDF(zAlpha - zStatistic) - normalCDF(-zAlpha - zStatistic)) :
      1 - normalCDF(zAlpha - zStatistic);

    return {
      sampleSize: n,
      actualPower: Math.max(0, Math.min(1, actualPower)),
    };
  };

  // Normal CDF approximation
  const normalCDF = (z: number): number => {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - p : p;
  };

  // Inverse normal CDF (approximation)
  const inverseNormalCDF = (p: number): number => {
    if (p <= 0 || p >= 1) return 0;
    
    const a = [2.515517, 0.802853, 0.010328];
    const b = [1.432788, 0.189269, 0.001308];
    
    const sign = p < 0.5 ? -1 : 1;
    const x = p < 0.5 ? p : 1 - p;
    const t = Math.sqrt(-2 * Math.log(x));
    
    const numerator = a[0] + a[1] * t + a[2] * t * t;
    const denominator = 1 + b[0] * t + b[1] * t * t + b[2] * t * t * t;
    
    return sign * (t - numerator / denominator);
  };

  // Run the hypothesis test
  const runTest = () => {
    const { sample1Size, sample1Events, sample2Size, sample2Events, hypothesizedDifference } = twoProportionData;
    
    if (!sample1Size || !sample2Size || sample1Events === undefined || sample2Events === undefined) {
      toast({
        title: "Missing Data",
        description: "Please enter all sample data before running the test.",
        variant: "destructive",
      });
      return;
    }

    if (sample1Events > sample1Size || sample2Events > sample2Size) {
      toast({
        title: "Invalid Data",
        description: "Number of events cannot exceed sample size.",
        variant: "destructive",
      });
      return;
    }

    const p1 = sample1Events / sample1Size;
    const p2 = sample2Events / sample2Size;
    const pDiff = p1 - p2;
    const pooledP = (sample1Events + sample2Events) / (sample1Size + sample2Size);
    
    // Standard error using pooled proportion (for hypothesis testing)
    const sePooled = Math.sqrt(pooledP * (1 - pooledP) * (1 / sample1Size + 1 / sample2Size));
    
    // Z-statistic
    const zStatistic = (pDiff - (hypothesizedDifference || 0)) / sePooled;
    
    // Critical value and p-value
    const alpha = parseFloat(significanceLevel);
    let zCritical: number | { lower: number; upper: number };
    let pValue: number;

    if (alternative === "Different") {
      zCritical = { lower: inverseNormalCDF(alpha / 2), upper: inverseNormalCDF(1 - alpha / 2) };
      pValue = 2 * (1 - normalCDF(Math.abs(zStatistic)));
    } else if (alternative === "Less than") {
      zCritical = inverseNormalCDF(alpha);
      pValue = normalCDF(zStatistic);
    } else {
      zCritical = inverseNormalCDF(1 - alpha);
      pValue = 1 - normalCDF(zStatistic);
    }

    // Confidence interval (using unpooled SE)
    const seUnpooled = Math.sqrt(p1 * (1 - p1) / sample1Size + p2 * (1 - p2) / sample2Size);
    const zCriticalCI = inverseNormalCDF(1 - alpha / 2);
    const ciLower = pDiff - zCriticalCI * seUnpooled;
    const ciUpper = pDiff + zCriticalCI * seUnpooled;

    setTestResults({
      p1,
      p2,
      pDiff,
      pooledP,
      se: sePooled,
      zStatistic,
      zCritical,
      pValue,
      ciLower,
      ciUpper,
    });

    toast({
      title: "Test Complete",
      description: "Two-proportion hypothesis test has been completed.",
    });
  };

  // Save configuration
  const saveConfiguration = () => {
    const configToSave = {
      testType: twoProportionData.testType,
      hypothesizedDifference: twoProportionData.hypothesizedDifference,
      significanceLevel,
      alternative,
      sample1Size: twoProportionData.sample1Size,
      sample1Events: twoProportionData.sample1Events,
      sample2Size: twoProportionData.sample2Size,
      sample2Events: twoProportionData.sample2Events,
      sample1Description: twoProportionData.sample1Description,
      sample2Description: twoProportionData.sample2Description,
      enablePowerAnalysis: twoProportionData.enablePowerAnalysis,
      powerTargetPower: parseFloat(powerTargetPower),
      powerAlpha: parseFloat(powerAlpha),
      powerHa,
      powerP1: twoProportionData.powerP1,
      powerP2: twoProportionData.powerP2,
    };
    
    saveConfigMutation.mutate(configToSave);
  };

  const updateField = (field: keyof AttrCTQTwoProportionHypTestData, value: any) => {
    setTwoProportionData(prev => ({ ...prev, [field]: value }));
  };

  // Setup tab content
  const setupContent = (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 mb-4">
        Compare two proportions to determine if there is a statistically significant difference between them.
      </p>
      
      <div className="grid grid-cols-2 gap-6">
        <div>
          <Label htmlFor="significanceLevel">Significance Level (α)</Label>
          <Select value={significanceLevel} onValueChange={setSignificanceLevel}>
            <SelectTrigger id="significanceLevel">
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
          <Label htmlFor="alternative">Alternative Hypothesis</Label>
          <Select value={alternative} onValueChange={setAlternative}>
            <SelectTrigger id="alternative">
              <SelectValue placeholder="Select alternative" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Less than">p1 - p2 &lt; H0</SelectItem>
              <SelectItem value="Greater than">p1 - p2 &gt; H0</SelectItem>
              <SelectItem value="Different">p1 - p2 ≠ H0</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="hypothesizedDifference">Hypothesized Difference (H0)</Label>
        <Input
          id="hypothesizedDifference"
          type="number"
          step="any"
          value={twoProportionData.hypothesizedDifference ?? ''}
          onChange={(e) => updateField('hypothesizedDifference', e.target.value === '' ? '' : parseFloat(e.target.value))}
          placeholder="Enter hypothesized difference of the two proportions (usually 0)"
        />
      </div>

      {/* Power and Sample Size Section */}
      <div className="flex items-center space-x-2 mt-6">
        <Checkbox
          id="enablePowerAnalysis"
          checked={twoProportionData.enablePowerAnalysis}
          onCheckedChange={(checked) => updateField('enablePowerAnalysis', checked)}
        />
        <Label htmlFor="enablePowerAnalysis" className="text-sm font-medium text-gray-700">
          Enable Power & Sample Size Analysis
        </Label>
      </div>

      {twoProportionData.enablePowerAnalysis && (
        <Card className="bg-gray-50">
          <CardHeader>
            <CardTitle className="text-sm">Power & Sample Size for Two-Proportion Test</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-3">
            <div>
              <Label htmlFor="powerTargetPower">Power of test (1-β):</Label>
              <Select value={powerTargetPower} onValueChange={setPowerTargetPower}>
                <SelectTrigger id="powerTargetPower">
                  <SelectValue placeholder="Select Power" />
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

            <div>
              <Label htmlFor="powerHa">Ha:</Label>
              <Select value={powerHa} onValueChange={setPowerHa}>
                <SelectTrigger id="powerHa">
                  <SelectValue placeholder="Select Ha" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=">">&gt;</SelectItem>
                  <SelectItem value="≠">≠</SelectItem>
                  <SelectItem value="<">&lt;</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="powerAlpha">Alpha (α):</Label>
              <Select value={powerAlpha} onValueChange={setPowerAlpha}>
                <SelectTrigger id="powerAlpha">
                  <SelectValue placeholder="Select Alpha" />
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

            <div>
              <Label htmlFor="powerP1">Proportion 1 (p1):</Label>
              <Input
                id="powerP1"
                type="number"
                step="0.0001"
                min="0"
                max="1"
                value={twoProportionData.powerP1 ?? ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? '' : parseFloat(e.target.value);
                  if (value === '' || (typeof value === 'number' && value >= 0 && value <= 1)) {
                    updateField('powerP1', value);
                  }
                }}
                placeholder="Enter expected proportion 1 (0.00-1.00)"
              />
            </div>

            <div>
              <Label htmlFor="powerP2">Proportion 2 (p2):</Label>
              <Input
                id="powerP2"
                type="number"
                step="0.0001"
                min="0"
                max="1"
                value={twoProportionData.powerP2 ?? ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? '' : parseFloat(e.target.value);
                  if (value === '' || (typeof value === 'number' && value >= 0 && value <= 1)) {
                    updateField('powerP2', value);
                  }
                }}
                placeholder="Enter expected proportion 2 (0.00-1.00)"
              />
            </div>

            <div className="font-medium text-sm mt-3">
              δ = |p1 - p2|: {Math.abs((twoProportionData.powerP1 || 0) - (twoProportionData.powerP2 || 0)).toFixed(4)}
            </div>

            <Badge
              variant="default"
              className="mt-2 font-medium text-sm text-center justify-center text-white bg-blue-400"
              title="Estimated minimum sample size per group and actual power"
            >
              Sample Size (n per group): {powerResults.sampleSize} <br />
              Actual Power: {(powerResults.actualPower * 100).toFixed(2)}%
            </Badge>
          </CardContent>
        </Card>
      )}

      <div className="mt-4">
        <Button 
          className="w-full" 
          onClick={saveConfiguration}
          disabled={saveConfigMutation.isPending}
        >
          {saveConfigMutation.isPending ? "Saving..." : "Save Configuration"}
        </Button>
      </div>
    </div>
  );

  // Data tab content
  const dataContent = (
    <div className="space-y-6">
      <p className="text-sm text-gray-500 mb-4">
        Enter the sample size and number of events for each group.
      </p>

      {/* Sample 1 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sample 1</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="sample1Description">Sample 1 Description</Label>
            <Input
              id="sample1Description"
              type="text"
              value={twoProportionData.sample1Description ?? ''}
              onChange={(e) => updateField('sample1Description', e.target.value)}
              placeholder="e.g., Control group, Before treatment"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sample1Size">Sample Size (n1)</Label>
              <Input
                id="sample1Size"
                type="number"
                min="1"
                value={twoProportionData.sample1Size ?? ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? '' : parseInt(e.target.value);
                  if (value === '' || (typeof value === 'number' && value > 0)) {
                    updateField('sample1Size', value);
                  }
                }}
                placeholder="Total sample size in proportion 1"
              />
            </div>

            <div>
              <Label htmlFor="sample1Events">Number of Events (x1)</Label>
              <Input
                id="sample1Events"
                type="number"
                min="0"
                value={twoProportionData.sample1Events ?? ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? '' : parseInt(e.target.value);
                  const sampleSize = twoProportionData.sample1Size;
                  if (value === '' || (typeof value === 'number' && value >= 0 && (!sampleSize || value <= sampleSize))) {
                    updateField('sample1Events', value);
                  }
                }}
                placeholder="Number of events in proportion 1"
              />
            </div>
          </div>

          {twoProportionData.sample1Size && twoProportionData.sample1Size > 0 && (
            <div className="text-sm text-gray-600">
              <strong>Sample 1 Proportion (p1):</strong> {(twoProportionData.sample1Events! / twoProportionData.sample1Size).toFixed(4)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sample 2 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sample 2</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="sample2Description">Sample 2 Description</Label>
            <Input
              id="sample2Description"
              type="text"
              value={twoProportionData.sample2Description ?? ''}
              onChange={(e) => updateField('sample2Description', e.target.value)}
              placeholder="e.g., Treatment group, After improvement"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sample2Size">Sample Size (n2)</Label>
              <Input
                id="sample2Size"
                type="number"
                min="1"
                value={twoProportionData.sample2Size ?? ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? '' : parseInt(e.target.value);
                  if (value === '' || (typeof value === 'number' && value > 0)) {
                    updateField('sample2Size', value);
                  }
                }}
                placeholder="Total sample size in proportion 2"
              />
            </div>

            <div>
              <Label htmlFor="sample2Events">Number of Events (x2)</Label>
              <Input
                id="sample2Events"
                type="number"
                min="0"
                value={twoProportionData.sample2Events ?? ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? '' : parseInt(e.target.value);
                  const sampleSize = twoProportionData.sample2Size;
                  if (value === '' || (typeof value === 'number' && value >= 0 && (!sampleSize || value <= sampleSize))) {
                    updateField('sample2Events', value);
                  }
                }}
                placeholder="Number of events in proportion 2"
              />
            </div>
          </div>

          {twoProportionData.sample2Size && twoProportionData.sample2Size > 0 && (
            <div className="text-sm text-gray-600">
              <strong>Sample 2 Proportion (p2):</strong> {(twoProportionData.sample2Events! / twoProportionData.sample2Size).toFixed(4)}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button 
          className="flex-1" 
          onClick={runTest}
        >
          Run Test
        </Button>
        <Button 
          className="flex-1" 
          onClick={saveConfiguration}
          disabled={saveConfigMutation.isPending}
          variant="outline"
        >
          {saveConfigMutation.isPending ? "Saving..." : "Save Data"}
        </Button>
      </div>
    </div>
  );

  // Chart tab content
  const chartContent = (
    <div className="space-y-4">
      {testResults ? (
        <Card>
          <CardHeader>
            <CardTitle>Proportion Comparison Chart</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-center gap-8">
              {/* Sample 1 Bar */}
              <div className="flex flex-col items-center gap-2">
                <div 
                  className="w-24 bg-blue-500 rounded-t-md transition-all"
                  style={{ height: `${testResults.p1 * 200}px` }}
                />
                <div className="text-center">
                  <div className="font-medium">{twoProportionData.sample1Description || "Sample 1"}</div>
                  <div className="text-sm text-gray-600">p1 = {testResults.p1.toFixed(3)}</div>
                  <div className="text-xs text-gray-500">n = {twoProportionData.sample1Size}</div>
                </div>
              </div>

              {/* Sample 2 Bar */}
              <div className="flex flex-col items-center gap-2">
                <div 
                  className="w-24 bg-green-500 rounded-t-md transition-all"
                  style={{ height: `${testResults.p2 * 200}px` }}
                />
                <div className="text-center">
                  <div className="font-medium">{twoProportionData.sample2Description || "Sample 2"}</div>
                  <div className="text-sm text-gray-600">p2 = {testResults.p2.toFixed(3)}</div>
                  <div className="text-xs text-gray-500">n = {twoProportionData.sample2Size}</div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-md">
              <div className="text-sm space-y-1">
                <div><strong>Difference (p1 - p2):</strong> {testResults.pDiff.toFixed(4)}</div>
                <div><strong>95% CI for Difference:</strong> [{testResults.ciLower.toFixed(4)}, {testResults.ciUpper.toFixed(4)}]</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center text-gray-500 py-8">
          Run the test in the Data tab to see visualization
        </div>
      )}
    </div>
  );

  // Analysis tab content
  const analysisContent = (
    <div className="space-y-4">
      {testResults ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Badge
                variant="default"
                className={`p-2 font-medium text-sm ${
                  testResults.pValue < parseFloat(significanceLevel) 
                    ? "bg-red-600 text-white" 
                    : "bg-green-600 text-white"
                }`}
              >
                {testResults.pValue < parseFloat(significanceLevel)
                  ? "Reject H0: Statistically Significant Difference"
                  : "Fail to Reject H0: No Statistically Significant Difference"}
              </Badge>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Sample 1:</strong>
                  <div className="ml-2">
                    <div>Description: {twoProportionData.sample1Description || "N/A"}</div>
                    <div>Size (n1): {twoProportionData.sample1Size}</div>
                    <div>Events (x1): {twoProportionData.sample1Events}</div>
                    <div>Proportion (p1): {testResults.p1.toFixed(4)}</div>
                  </div>
                </div>

                <div>
                  <strong>Sample 2:</strong>
                  <div className="ml-2">
                    <div>Description: {twoProportionData.sample2Description || "N/A"}</div>
                    <div>Size (n2): {twoProportionData.sample2Size}</div>
                    <div>Events (x2): {twoProportionData.sample2Events}</div>
                    <div>Proportion (p2): {testResults.p2.toFixed(4)}</div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2 text-sm">
                <div><strong>Hypothesized Difference (H0):</strong> {twoProportionData.hypothesizedDifference}</div>
                <div><strong>Observed Difference (p1 - p2):</strong> {testResults.pDiff.toFixed(4)}</div>
                <div><strong>Pooled Proportion:</strong> {testResults.pooledP.toFixed(4)}</div>
                <div><strong>Standard Error:</strong> {testResults.se.toFixed(4)}</div>
                <div><strong>Z-Statistic:</strong> {testResults.zStatistic.toFixed(3)}</div>
                <div>
                  <strong>Z-Critical:</strong>{' '}
                  {typeof testResults.zCritical === 'number'
                    ? testResults.zCritical.toFixed(3)
                    : `[${testResults.zCritical.lower.toFixed(3)}, ${testResults.zCritical.upper.toFixed(3)}]`}
                </div>
                <div><strong>P-Value:</strong> {testResults.pValue.toFixed(4)}</div>
                <div><strong>Significance Level (α):</strong> {significanceLevel}</div>
                <div>
                  <strong>95% Confidence Interval for Difference:</strong>{' '}
                  [{testResults.ciLower.toFixed(4)}, {testResults.ciUpper.toFixed(4)}]
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Interpretation</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>
                {testResults.pValue < parseFloat(significanceLevel) ? (
                  <>
                    The p-value ({testResults.pValue.toFixed(4)}) is less than the significance level ({significanceLevel}),
                    so we <strong>reject the null hypothesis</strong>. There is statistically significant evidence that
                    the proportion in {twoProportionData.sample1Description || "Sample 1"} is different from the proportion
                    in {twoProportionData.sample2Description || "Sample 2"}.
                  </>
                ) : (
                  <>
                    The p-value ({testResults.pValue.toFixed(4)}) is greater than or equal to the significance level ({significanceLevel}),
                    so we <strong>fail to reject the null hypothesis</strong>. There is not enough evidence to conclude
                    that the proportions are different.
                  </>
                )}
              </p>
              <p>
                The 95% confidence interval for the difference (p1 - p2) is [{testResults.ciLower.toFixed(4)}, {testResults.ciUpper.toFixed(4)}].
                {testResults.ciLower <= (twoProportionData.hypothesizedDifference || 0) && 
                 testResults.ciUpper >= (twoProportionData.hypothesizedDifference || 0) ? (
                  <> This interval contains the hypothesized difference, supporting the conclusion.</>
                ) : (
                  <> This interval does not contain the hypothesized difference, supporting the rejection of H0.</>
                )}
              </p>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="text-center text-gray-500 py-8">
          Run the test in the Data tab to see analysis results
        </div>
      )}
    </div>
  );

  return (
    <Card data-component="two-proportion">
      <CardHeader>
        <CardTitle>Two-Proportion Hypothesis Testing</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">
          CTQ: {ctqName}
        </p>

        <HypothesisTestingTabs
          projectId={projectId}
          ctqId={ctqId}
          testType="two-proportion-test"
          setupContent={setupContent}
          dataContent={dataContent}
          chartContent={chartContent}
          analysisContent={analysisContent}
        />
      </CardContent>
    </Card>
  );
}
