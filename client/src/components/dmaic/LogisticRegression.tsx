import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2 } from "lucide-react";
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { parseTwoColumnPaste } from '@/lib/excelPasteUtils';
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
  
  const [datasetYDescription, setDatasetYDescription] = useState("Y Binary Response (0/1)");
  const [datasetXDescription, setDatasetXDescription] = useState("X Predictor");
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
  const [showFittedCurve, setShowFittedCurve] = useState(false);

  const configQuery = useQuery({
    queryKey: [`/api/projects/${projectId}/solutions/${solutionId}/logistic-regression`],
    retry: false,
  });

  useEffect(() => {
    if (configQuery.data && !loadedRef.current) {
      loadedRef.current = true;
      
      const config = configQuery.data as any;
      setDatasetYDescription(config.datasetYDescription || "Y Binary Response (0/1)");
      setDatasetXDescription(config.datasetXDescription || "X Predictor");
      
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

  const calculateLogisticRegression = () => {
    const validPoints = dataPoints.filter(p => !isNaN(p.x) && (p.y === 0 || p.y === 1));
    
    if (validPoints.length < 2) {
      toast({
        title: "Insufficient data",
        description: "Need at least 2 valid data points for logistic regression",
        variant: "destructive",
      });
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
      if (y === 1) return Math.sqrt(-2 * Math.log(p));
      else return -Math.sqrt(-2 * Math.log(1 - p));
    });

    const deviance = devianceResiduals.reduce((sum: number, r) => sum + r * r, 0);
    const ySum = ys.reduce((a: number, b: number) => a + b, 0);
    const p0 = ySum / ys.length;
    const nullDeviance = ys.reduce((sum: number, y) => {
      if (y === 1) return sum - 2 * Math.log(p0);
      else return sum - 2 * Math.log(1 - p0);
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
    });
  };

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

    calculateLogisticRegression();
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
              <div>
                <Label htmlFor="y-desc">Y Variable Description (Binary 0/1)</Label>
                <Input
                  id="y-desc"
                  value={datasetYDescription}
                  onChange={(e) => setDatasetYDescription(e.target.value)}
                  placeholder="e.g., Success/Failure"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="x-desc">X Variable Description (Predictor)</Label>
                <Input
                  id="x-desc"
                  value={datasetXDescription}
                  onChange={(e) => setDatasetXDescription(e.target.value)}
                  placeholder="e.g., Temperature"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="sig-level">Significance Level</Label>
                <Input
                  id="sig-level"
                  type="number"
                  value={significanceLevel}
                  onChange={(e) => setSignificanceLevel(parseFloat(e.target.value) || 0.05)}
                  min="0.01"
                  max="0.1"
                  step="0.01"
                  className="mt-2"
                />
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
                Save Data & Calculate
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
                  <p className="text-sm font-semibold mb-4">Logistic Model: P(Y=1) = 1 / (1 + e^(-β₀ - β₁*X))</p>
                  <p className="text-sm text-gray-600">
                    Model: P(Y=1) = 1 / (1 + e^(-{logisticResult.intercept.toFixed(4)} - {logisticResult.slope.toFixed(4)}*X))
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="scatter"
                      checked={showScatterPlot}
                      onCheckedChange={(checked) => setShowScatterPlot(!!checked)}
                    />
                    <Label htmlFor="scatter">Show Data Points</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="curve"
                      checked={showFittedCurve}
                      onCheckedChange={(checked) => setShowFittedCurve(!!checked)}
                    />
                    <Label htmlFor="curve">Show Fitted Curve</Label>
                  </div>
                </div>

                {(showScatterPlot || showFittedCurve) && (
                  <div>
                    <Plot
                      data={[
                        ...(showScatterPlot ? [{
                          x: dataPoints.filter(p => !isNaN(p.x)).map(p => p.x) as any,
                          y: dataPoints.filter(p => !isNaN(p.x)).map(p => p.y) as any,
                          mode: 'markers',
                          type: 'scatter' as any,
                          marker: { color: 'rgba(99, 102, 241, 0.7)', size: 8 },
                          name: 'Data Points'
                        }] : []),
                        ...(showFittedCurve ? [{
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
                        }] : [])
                      ] as any}
                      layout={{
                        title: { text: 'Logistic Regression' },
                        xaxis: { title: { text: datasetXDescription } },
                        yaxis: { title: { text: 'Probability' }, range: [-0.1, 1.1] },
                        hovermode: 'closest',
                        margin: { l: 60, r: 40, t: 40, b: 60 },
                      }}
                      style={{ width: '100%', height: '400px' }}
                      useResizeHandler
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
