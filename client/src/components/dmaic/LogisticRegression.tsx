import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, Save } from "lucide-react";
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { parseTwoColumnPaste } from '@/lib/excelPasteUtils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Plot from 'react-plotly.js';
import jStat from 'jstat';

interface LogisticRegressionProps {
  projectId: number;
  solutionId: string;
}

interface DataPoint {
  x: number;
  y: 0 | 1;
}

export function LogisticRegression({ projectId, solutionId }: LogisticRegressionProps) {
  const { toast } = useToast();
  const loadedRef = useRef(false);
  
  const [datasetYDescription, setDatasetYDescription] = useState("Y Categorical Response (0/1)");
  const [datasetXDescription, setDatasetXDescription] = useState("X Continuous Predictor");
  const [zeroValueLabel, setZeroValueLabel] = useState("");
  const [oneValueLabel, setOneValueLabel] = useState("");
  const [significanceLevel, setSignificanceLevel] = useState(0.05);
  
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([
    { x: NaN, y: 0 },
    { x: NaN, y: 0 },
    { x: NaN, y: 0 },
  ]);
  
  const [dataPointsHistory, setDataPointsHistory] = useState<DataPoint[][]>([]);
  
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [logisticResult, setLogisticResult] = useState<any>(null);
  const [showScatterPlot, setShowScatterPlot] = useState(false);

  const configQuery = useQuery({
    queryKey: [`/api/projects/${projectId}/solutions/${solutionId}/logistic-regression`],
    retry: false,
  });

  useEffect(() => {
    if (configQuery.data && !loadedRef.current) {
      loadedRef.current = true;
      
      const config = configQuery.data as any;
      setDatasetYDescription(config.datasetYDescription || "Y Categorical Response (0/1)");
      setDatasetXDescription(config.datasetXDescription || "X Continuous Predictor");
      setZeroValueLabel(config.zeroValueLabel || "");
      setOneValueLabel(config.oneValueLabel || "");
      
      if (config.dataX && config.dataY && config.dataX.length > 0) {
        const points: DataPoint[] = config.dataX.map((x: number, i: number) => ({
          x,
          y: config.dataY[i] === 1 ? 1 : 0
        }));
        setDataPoints(points);
      }
      
      if (config.significanceLevel !== null && config.significanceLevel !== undefined) {
        setSignificanceLevel(config.significanceLevel);
      }
    }
  }, [configQuery.data]);

  const saveDataMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(
        'POST',
        `/api/projects/${projectId}/solutions/${solutionId}/logistic-regression`,
        data
      );
    },
    onSuccess: () => {
      toast({
        title: "Data saved",
        description: "Your data has been saved successfully.",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}/solutions/${solutionId}/logistic-regression`]
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save data.",
        variant: "destructive",
      });
    },
  });

  const saveSetupMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(
        'POST',
        `/api/projects/${projectId}/solutions/${solutionId}/logistic-regression`,
        data
      );
    },
    onSuccess: () => {
      toast({
        title: "Setup saved",
        description: "Your setup configuration has been saved successfully.",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}/solutions/${solutionId}/logistic-regression`]
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save setup.",
        variant: "destructive",
      });
    },
  });

  const handleSaveSetup = () => {
    const validPoints = dataPoints.filter(p => !isNaN(p.x) && (p.y === 0 || p.y === 1));
    saveSetupMutation.mutate({
      dataX: validPoints.map(p => p.x),
      dataY: validPoints.map(p => p.y),
      datasetYDescription,
      datasetXDescription,
      zeroValueLabel,
      oneValueLabel,
      significanceLevel,
    });
  };

  // Auto-recalculate logistic regression when data or settings change
  useEffect(() => {
    const validPoints = dataPoints.filter(p => !isNaN(p.x) && (p.y === 0 || p.y === 1));
    
    if (validPoints.length < 2) {
      setLogisticResult(null);
      return;
    }

    const xs = validPoints.map(p => p.x);
    const ys = validPoints.map(p => p.y);
    const n = xs.length;

    // Initialize parameters
    let b0 = 0;
    let b1 = 0;
    
    // Newton-Raphson iteration
    for (let iter = 0; iter < 20; iter++) {
      // Compute predictions: p = 1 / (1 + exp(-(b0 + b1*x)))
      const predictions = xs.map(x => 1 / (1 + Math.exp(-(b0 + b1 * x))));
      
      // Compute gradient (first derivatives)
      let g0 = 0; // ∂L/∂b0
      let g1 = 0; // ∂L/∂b1
      
      for (let i = 0; i < n; i++) {
        const error = ys[i] - predictions[i];
        g0 += error;
        g1 += error * xs[i];
      }
      
      // Check convergence
      if (Math.abs(g0) < 1e-6 && Math.abs(g1) < 1e-6) break;
      
      // Compute Hessian (second derivatives)
      let h00 = 0; // ∂²L/∂b0²
      let h01 = 0; // ∂²L/∂b0∂b1
      let h11 = 0; // ∂²L/∂b1²
      
      for (let i = 0; i < n; i++) {
        const p = predictions[i];
        const w = p * (1 - p); // weight
        h00 -= w;
        h01 -= w * xs[i];
        h11 -= w * xs[i] * xs[i];
      }
      
      // Invert 2x2 Hessian matrix
      const det = h00 * h11 - h01 * h01;
      
      if (Math.abs(det) < 1e-10) break; // Singular matrix
      
      // H^-1 for 2x2: [h11, -h01; -h01, h00] / det
      const invH00 = h11 / det;
      const invH01 = -h01 / det;
      const invH11 = h00 / det;
      
      // Newton-Raphson update: θ_new = θ_old - H^-1 * g
      const delta0 = -(invH00 * g0 + invH01 * g1);
      const delta1 = -(invH01 * g0 + invH11 * g1);
      
      b0 += delta0;
      b1 += delta1;
    }

    // Final predictions and diagnostics
    const predictions = xs.map(x => 1 / (1 + Math.exp(-(b0 + b1 * x))));
    const residuals = ys.map((y, i) => y - predictions[i]);
    
    // Compute Fisher Information Matrix (negative Hessian) for standard errors
    let I00 = 0; // Fisher info for b0
    let I01 = 0; // Fisher info for b0, b1
    let I11 = 0; // Fisher info for b1
    
    for (let i = 0; i < n; i++) {
      const p = predictions[i];
      const w = p * (1 - p); // weight
      I00 += w;
      I01 += w * xs[i];
      I11 += w * xs[i] * xs[i];
    }
    
    // Invert Fisher Information Matrix to get covariance matrix
    const detI = I00 * I11 - I01 * I01;
    let se0 = 0;
    let se1 = 0;
    
    if (Math.abs(detI) > 1e-10) {
      const var0 = I11 / detI; // Variance of b0
      const var1 = I00 / detI; // Variance of b1
      se0 = Math.sqrt(Math.max(0, var0)); // Standard error of intercept
      se1 = Math.sqrt(Math.max(0, var1)); // Standard error of slope
    }
    
    // Calculate z-values (Wald statistic)
    const z0 = se0 > 0 ? b0 / se0 : 0;
    const z1 = se1 > 0 ? b1 / se1 : 0;
    
    // Calculate p-values (two-tailed Wald test)
    const pValue0 = se0 > 0 ? 2 * (1 - jStat.normal.cdf(Math.abs(z0), 0, 1)) : 1;
    const pValue1 = se1 > 0 ? 2 * (1 - jStat.normal.cdf(Math.abs(z1), 0, 1)) : 1;
    
    const devianceResiduals = ys.map((y, i) => {
      const p = Math.max(1e-10, Math.min(1 - 1e-10, predictions[i])); // Clamp
      if (y === 1) return Math.sqrt(-2 * Math.log(p));
      else return -Math.sqrt(-2 * Math.log(1 - p));
    });

    const deviance = devianceResiduals.reduce((sum, r) => sum + r * r, 0);
    
    const ySum: number = ys.reduce((a, b) => a + b, 0 as number);
    const p0 = Math.max(1e-10, Math.min(1 - 1e-10, ySum / ys.length));
    const nullDeviance = ys.reduce((sum: number, y) => {
      if (y === 1) return sum - 2 * Math.log(p0);
      else return sum - 2 * Math.log(1 - p0);
    }, 0);

    const mcFaddenR2 = 1 - deviance / nullDeviance;

    setLogisticResult({
      intercept: b0,
      slope: b1,
      interceptSE: se0,
      slopeSE: se1,
      interceptZ: z0,
      slopeZ: z1,
      interceptPValue: pValue0,
      slopePValue: pValue1,
      predictions,
      residuals,
      deviance,
      nullDeviance,
      mcFaddenR2: Math.max(0, Math.min(1, mcFaddenR2)),
      n: validPoints.length,
      significanceLevel,
    });
  }, [dataPoints, significanceLevel]);

  // Auto-recalculate logistic regression when data or settings change
  /*useEffect(() => {
    const validPoints = dataPoints.filter(p => !isNaN(p.x) && (p.y === 0 || p.y === 1));
    
    if (validPoints.length < 2) {
      setLogisticResult(null);
      return;
    }

    const xs = validPoints.map(p => p.x);
    const ys = validPoints.map(p => p.y);

    // Logistic regression: log-odds = β0 + β1*x
    // Using iterative Newton-Raphson method
    let b0 = 0;
    let b1 = 0;
    
    for (let iter = 0; iter < 20; iter++) {
      const predictions = xs.map(x => 1 / (1 + Math.exp(-(b0 + b1 * x))));
      
      const firstDeriv = xs.reduce((sum: number, x, i) => sum + x * (ys[i] - predictions[i]), 0);
      const secondDeriv = xs.reduce((sum: number, x, i) => sum - x * x * predictions[i] * (1 - predictions[i]), 0);
      
      const delta0 = ys.reduce((sum: number, y, i) => sum + (y - predictions[i]), 0);
      const delta1 = firstDeriv;
      
      if (Math.abs(delta0) < 1e-6 && Math.abs(delta1) < 1e-6) break;
      
      const det = secondDeriv * xs.length - (xs.reduce((a, b) => a + b, 0) ** 2) * ys.length / xs.length;
      if (Math.abs(det) < 1e-10) break;
      
      b0 += delta0 / xs.length;
      b1 += delta1 / secondDeriv;
    }

    const predictions = xs.map(x => 1 / (1 + Math.exp(-(b0 + b1 * x))));
    const residuals = ys.map((y, i) => y - predictions[i]);
    const devianceResiduals = ys.map((y, i) => {
      const p = predictions[i];
      if (y === 1) return Math.sqrt(-2 * Math.log(Math.max(p, 1e-10)));
      else return -Math.sqrt(-2 * Math.log(Math.max(1 - p, 1e-10)));
    });

    const deviance = devianceResiduals.reduce((sum: number, r) => sum + r * r, 0);
    const ySum = ys.reduce((a: number, b: number) => a + b, 0);
    const p0 = ySum / ys.length;
    const nullDeviance = ys.reduce((sum: number, y) => {
      if (y === 1) return sum - 2 * Math.log(Math.max(p0, 1e-10));
      else return sum - 2 * Math.log(Math.max(1 - p0, 1e-10));
    }, 0);

    const mcFaddenR2 = 1 - deviance / nullDeviance;

    setLogisticResult({
      intercept: b0,
      slope: b1,
      predictions,
      residuals,
      deviance,
      nullDeviance,
      mcFaddenR2: Math.max(0, Math.min(1, mcFaddenR2)),
      n: validPoints.length,
      significanceLevel,
    });
  }, [dataPoints, significanceLevel]);
  */

  const handleSaveData = () => {
    const validPoints = dataPoints.filter(p => !isNaN(p.x) && (p.y === 0 || p.y === 1));
    if (validPoints.length < 2) {
      toast({
        title: "Insufficient data",
        description: "Need at least 2 valid data points",
        variant: "destructive",
      });
      return;
    }

    saveDataMutation.mutate({
      dataX: validPoints.map(p => p.x),
      dataY: validPoints.map(p => p.y),
      datasetYDescription,
      datasetXDescription,
      significanceLevel,
    });
  };

  const handleAddRow = () => {
    setDataPointsHistory([...dataPointsHistory, dataPoints]);
    setDataPoints([...dataPoints, { x: NaN, y: 0 }]);
  };

  const handleDeleteRow = (index: number) => {
    setDataPointsHistory([...dataPointsHistory, dataPoints]);
    setDataPoints(dataPoints.filter((_, i) => i !== index));
  };

  const handleUndo = () => {
    if (dataPointsHistory.length > 0) {
      const newHistory = [...dataPointsHistory];
      setDataPoints(newHistory.pop()!);
      setDataPointsHistory(newHistory);
    }
  };

  const handleClearAll = () => {
    setDataPointsHistory([...dataPointsHistory, dataPoints]);
    setDataPoints([{ x: NaN, y: 0 }, { x: NaN, y: 0 }, { x: NaN, y: 0 }]);
    setLogisticResult(null);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    try {
      const result = parseTwoColumnPaste(text);
      if (result.success && result.columnX && result.columnY) {
        const newPoints: DataPoint[] = result.columnX.map((x, i) => ({
          x,
          y: (result.columnY![i] === 1 ? 1 : 0) as 0 | 1,
        }));
        setDataPointsHistory([...dataPointsHistory, dataPoints]);
        setDataPoints(newPoints);
      } else {
        throw new Error(result.errors?.join(', ') || 'Failed to parse data');
      }
    } catch (error: any) {
      toast({
        title: "Paste error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="setup" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="data">Data Entry</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        {/* Setup Tab */}
        <TabsContent value="setup">
          <Card>
            <CardHeader>
              <CardTitle>Setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="y-desc">Y Categorical Response (0/1)</Label>
                  <Input
                    id="y-desc"
                    value={datasetYDescription}
                    onChange={(e) => setDatasetYDescription(e.target.value)}
                    placeholder="e.g.,Exam Success"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="zero-label">'0' Value</Label>
                  <Input
                    id="zero-label"
                    value={zeroValueLabel}
                    onChange={(e) => setZeroValueLabel(e.target.value)}
                    placeholder="Fail, NOK, KO, No, Bad, etc."
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="one-label">'1' Value</Label>
                  <Input
                    id="one-label"
                    value={oneValueLabel}
                    onChange={(e) => setOneValueLabel(e.target.value)}
                    placeholder="Pass, Success, OK, Yes, Good, etc."
                    className="mt-2"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="x-desc">X Variable Description (Continuous Predictor)</Label>
                <Input
                  id="x-desc"
                  value={datasetXDescription}
                  onChange={(e) => setDatasetXDescription(e.target.value)}
                  placeholder="e.g., Temperature, Age, Time"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="significance-level">Significance Level (α)</Label>
                <Select
                  value={significanceLevel.toString()}
                  onValueChange={(value) => setSignificanceLevel(parseFloat(value))}
                >
                  <SelectTrigger id="significanceLevel" data-testid="select-significance-level">
                    <SelectValue placeholder="Select significance level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.01" data-testid="option-significance-0.01">1%</SelectItem>
                    <SelectItem value="0.05" data-testid="option-significance-0.05">5%</SelectItem>
                    <SelectItem value="0.10" data-testid="option-significance-0.10">10%</SelectItem>
                    <SelectItem value="0.20" data-testid="option-significance-0.20">20%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-4 border-t">
                <Button
                  onClick={handleSaveSetup}
                  disabled={saveSetupMutation.isPending}
                  data-testid="button-save-setup"
                >
                  {saveSetupMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Setup
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Entry Tab */}
        <TabsContent value="data">
          <Card>
            <CardHeader>
              <CardTitle>Data Entry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-2 text-left font-semibold">#</th>
                      <th className="px-4 py-2 text-left font-semibold">{datasetXDescription}</th>
                      <th className="px-4 py-2 text-left font-semibold">{datasetYDescription} (0 or 1)</th>
                      <th className="px-4 py-2 text-left font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataPoints.map((point, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50 dark:hover:bg-gray-900">
                        <td className="px-4 py-2 text-gray-500">{index + 1}</td>
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            value={isNaN(point.x) ? '' : point.x}
                            onChange={(e) => {
                              const newPoints = [...dataPoints];
                              newPoints[index].x = parseFloat(e.target.value) || NaN;
                              setDataPoints(newPoints);
                            }}
                            placeholder="X value"
                            className="w-24"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={point.y}
                            onChange={(e) => {
                              const newPoints = [...dataPoints];
                              newPoints[index].y = parseInt(e.target.value) as 0 | 1;
                              setDataPoints(newPoints);
                            }}
                            className="border rounded px-2 py-1 w-16"
                          >
                            <option value="0">0</option>
                            <option value="1">1</option>
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRow(index)}
                            data-testid={`button-delete-row-${index}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button onClick={handleAddRow} variant="outline">Add Row</Button>
                <Button onClick={handleUndo} variant="outline" disabled={dataPointsHistory.length === 0}>Undo</Button>
                <Button onClick={handleClearAll} variant="outline">Clear All</Button>
              </div>

              <Button onClick={handleSaveData} disabled={saveDataMutation.isPending} className="w-full">
                {saveDataMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Data
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis">
          {logisticResult ? (
            <Card>
              <CardHeader>
                <CardTitle>Analysis Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Y Response</p>
                    <p className="text-2xl font-bold">{datasetYDescription || 'Y'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Number of '1' Responses{oneValueLabel ? ` (${oneValueLabel})` : ''}</p>
                    <p className="text-2xl font-bold">{dataPoints.filter(p => p.y === 1 && !isNaN(p.x)).length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Number of '0' Responses{zeroValueLabel ? ` (${zeroValueLabel})` : ''}</p>
                    <p className="text-2xl font-bold">{dataPoints.filter(p => p.y === 0 && !isNaN(p.x)).length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Intercept (β₀)</p>
                    <p className="text-2xl font-bold">{logisticResult.intercept.toFixed(6)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Slope (β₁)</p>
                    <p className="text-2xl font-bold">{logisticResult.slope.toFixed(6)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">McFadden R²</p>
                    <p className="text-2xl font-bold">{(logisticResult.mcFaddenR2 * 100).toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Deviance</p>
                    <p className="text-2xl font-bold">{logisticResult.deviance.toFixed(4)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Null Deviance</p>
                    <p className="text-2xl font-bold">{logisticResult.nullDeviance.toFixed(4)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">N Observations</p>
                    <p className="text-2xl font-bold">{logisticResult.n}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-semibold mb-4">Logistic Model (Logit): P(Y=1) = 1 / (1 + e^(-β₀ - β₁*X))</p>
                        <p className="text-sm text-gray-600">
                          Model: P(Y=1) = 1 / (1 + e^({logisticResult.intercept >= 0 ? '-' : '+'}{Math.abs(logisticResult.intercept).toFixed(4)} {logisticResult.slope >= 0 ? '-' : '+'} {Math.abs(logisticResult.slope).toFixed(4)}*X))
                        </p>
                      </div>
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-sm font-semibold mb-2">Odds Ratio for Continuous Predictor</p>
                        <div className="overflow-x-auto">
                          <table className="text-sm">
                            <thead>
                              <tr>
                                <th className="px-3 py-1 text-left"></th>
                                <th className="px-3 py-1 text-right">Odds Ratio</th>
                                <th className="px-3 py-1 text-right">{((1 - significanceLevel) * 100).toFixed(0)}% CI</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="px-3 py-1 font-medium">{datasetXDescription}</td>
                                <td className="px-3 py-1 text-right font-mono">{Math.exp(logisticResult.slope).toFixed(4)}</td>
                                <td className="px-3 py-1 text-right font-mono">
                                  ({Math.exp(logisticResult.slope - jStat.normal.inv(1 - significanceLevel / 2, 0, 1) * (logisticResult.slopeSE || 0)).toFixed(4)}, {Math.exp(logisticResult.slope + jStat.normal.inv(1 - significanceLevel / 2, 0, 1) * (logisticResult.slopeSE || 0)).toFixed(4)})
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold mb-2">Model Evaluation</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse border">
                          <thead>
                            <tr className="bg-muted">
                              <th className="border px-3 py-2 text-left font-semibold"></th>
                              <th className="border px-3 py-2 text-right font-semibold">Coefficient</th>
                              <th className="border px-3 py-2 text-right font-semibold">Std. Error</th>
                              <th className="border px-3 py-2 text-right font-semibold">z-value</th>
                              <th className="border px-3 py-2 text-right font-semibold">p-value (Wald)</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border px-3 py-2 font-medium">Intercept (β₀)</td>
                              <td className="border px-3 py-2 text-right font-mono">{logisticResult.intercept.toFixed(4)}</td>
                              <td className="border px-3 py-2 text-right font-mono">{logisticResult.interceptSE?.toFixed(4) || '-'}</td>
                              <td className="border px-3 py-2 text-right font-mono">{logisticResult.interceptZ?.toFixed(4) || '-'}</td>
                              <td className={`border px-3 py-2 text-right font-mono ${logisticResult.interceptPValue < significanceLevel ? 'text-green-600 font-bold' : ''}`}>
                                {logisticResult.interceptPValue?.toFixed(4) || '-'}
                              </td>
                            </tr>
                            <tr>
                              <td className="border px-3 py-2 font-medium">{datasetXDescription} (β₁)</td>
                              <td className="border px-3 py-2 text-right font-mono">{logisticResult.slope.toFixed(4)}</td>
                              <td className="border px-3 py-2 text-right font-mono">{logisticResult.slopeSE?.toFixed(4) || '-'}</td>
                              <td className="border px-3 py-2 text-right font-mono">{logisticResult.slopeZ?.toFixed(4) || '-'}</td>
                              <td className={`border px-3 py-2 text-right font-mono ${logisticResult.slopePValue < significanceLevel ? 'text-green-600 font-bold' : ''}`}>
                                {logisticResult.slopePValue?.toFixed(4) || '-'}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="scatter"
                      checked={showScatterPlot}
                      onCheckedChange={(checked) => setShowScatterPlot(!!checked)}
                    />
                    <Label htmlFor="scatter">Show Data Points and Logistic Regression Fitted Curve</Label>
                  </div>                  
                </div>

                {(showScatterPlot) && (
                  <div>
                    <Plot
                      data={[
                        ...([{
                          x: dataPoints.filter(p => !isNaN(p.x)).map(p => p.x) as any,
                          y: dataPoints.filter(p => !isNaN(p.x)).map(p => p.y) as any,
                          mode: 'markers',
                          type: 'scatter' as any,
                          marker: { color: 'rgba(99, 102, 241, 0.7)', size: 8 },
                          name: 'Data Points'
                        }]),
                        ...([{
                          x: Array.from({ length: 100 }, (_, i) => {
                            const validPoints = dataPoints.filter(p => !isNaN(p.x)).map(p => p.x);
                            const xMin = Math.min(...validPoints);
                            const xMax = Math.max(...validPoints);
                            return xMin + (xMax - xMin) * i / 99;
                          }) as any,
                          y: Array.from({ length: 100 }, (_, i) => {
                            const validPoints = dataPoints.filter(p => !isNaN(p.x)).map(p => p.x);
                            const xMin = Math.min(...validPoints);
                            const xMax = Math.max(...validPoints);
                            const xVal = xMin + (xMax - xMin) * i / 99;
                            return 1 / (1 + Math.exp(-(logisticResult.intercept + logisticResult.slope * xVal)));
                          }) as any,
                          mode: 'lines',
                          type: 'scatter' as any,
                          line: { color: 'rgba(239, 68, 68, 1)', width: 2 },
                          name: 'Fitted Curve'
                        }])
                      ] as any}
                      layout={{
                        title: { text: '<b>Logistic Regression of ' + datasetYDescription + ' vs ' + datasetXDescription + '</b>', font: { size: 16 } },
                        xaxis: { title: { text: datasetXDescription } },
                        yaxis: { title: { text: 'Probability of ' + datasetYDescription }, range: [-0.1, 1.1] },
                        hovermode: 'closest',
                        margin: { l: 60, r: 80, t: 40, b: 60 },
                        legend: { title: {text: ' Click on any legend below<br> to show/hide the Logistic<br> Regression graph elements'}, font: { size: 10 },
                                x: 0.85, y: 0.95 },
                      }}
                      style={{ width: '100%', height: '400px' }}
                      useResizeHandler
                      config={{
                        responsive: true,
                        displayModeBar: true,
                        displaylogo: false,
                        toImageButtonOptions: {
                          format: 'png',
                          filename: `Logistic Regression of ${datasetYDescription || 'Y CategoricalResponse'} vs ${datasetXDescription || 'X Continuous Predictor'}`,
                          height: 500,
                          width: 800,
                          scale: 1
                        }
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-gray-500">No analysis available. Please enter data and click "Save Data & Calculate" to generate results.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
