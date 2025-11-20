import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Minus } from "lucide-react";
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LogisticRegressionProps {
  projectId: number;
  solutionId: string;
}

export function LogisticRegression({ projectId, solutionId }: LogisticRegressionProps) {
  const { toast } = useToast();
  const loadedRef = useRef(false);

  // Setup tab state
  const [responseVariableName, setResponseVariableName] = useState("Success");
  const [predictorNames, setPredictorNames] = useState<string[]>(["X1", "X2"]);

  // Data tab state (dataX is column-major: [predictor1, predictor2, ...])
  const [dataY, setDataY] = useState<number[]>([0, 1, 0, 1]);
  const [dataX, setDataX] = useState<number[][]>([
    [1, 2, 3, 4],
    [1, 1, 2, 2],
  ]);

  // Analysis state
  const [significanceLevel, setSignificanceLevel] = useState(0.05);
  const [selectedPredictors, setSelectedPredictors] = useState<number[]>([0, 1]);

  // Tab state
  const [activeTab, setActiveTab] = useState("setup");

  // Load config
  const configQuery = useQuery({
    queryKey: [`/api/projects/${projectId}/solutions/${solutionId}/logistic-regression`],
    retry: false,
  });

  // Load data from API
  useEffect(() => {
    if (configQuery.data && !loadedRef.current) {
      loadedRef.current = true;
      const config = configQuery.data as any;

      if (config.responseVariableName) setResponseVariableName(config.responseVariableName);
      if (config.predictorNames) setPredictorNames(config.predictorNames);
      if (config.dataY) setDataY(config.dataY.map((v: any) => v === null ? NaN : v));
      if (config.dataX) setDataX(config.dataX.map((col: any) => col.map((v: any) => v === null ? NaN : v)));
      if (config.significanceLevel !== undefined) setSignificanceLevel(config.significanceLevel);
      if (config.selectedPredictors) setSelectedPredictors(config.selectedPredictors);
    }
  }, [configQuery.data]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(
        'POST',
        `/api/projects/${projectId}/solutions/${solutionId}/logistic-regression`,
        data
      );
    },
    onSuccess: () => {
      toast({
        title: "Configuration saved",
        description: "Your logistic regression setup has been saved.",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}/solutions/${solutionId}/logistic-regression`]
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      responseVariableName,
      predictorNames,
      dataY,
      dataX,
      significanceLevel,
      selectedPredictors,
    });
  };

  const addPredictor = () => {
    const newName = `X${predictorNames.length + 1}`;
    setPredictorNames([...predictorNames, newName]);
    setDataX([...dataX, Array(dataY.length).fill(NaN)]);
    setSelectedPredictors([...selectedPredictors, predictorNames.length]);
  };

  const removePredictor = (idx: number) => {
    if (predictorNames.length <= 1) {
      toast({ title: "Need at least 1 predictor", variant: "destructive" });
      return;
    }
    setPredictorNames(predictorNames.filter((_, i) => i !== idx));
    setDataX(dataX.filter((_, i) => i !== idx));
    setSelectedPredictors(selectedPredictors.filter(i => i !== idx).map(i => i > idx ? i - 1 : i));
  };

  const addRow = () => {
    setDataY([...dataY, 0]);
    setDataX(dataX.map(col => [...col, NaN]));
  };

  const removeRow = (rowIdx: number) => {
    if (dataY.length <= 1) {
      toast({ title: "Need at least 1 observation", variant: "destructive" });
      return;
    }
    setDataY(dataY.filter((_, i) => i !== rowIdx));
    setDataX(dataX.map(col => col.filter((_, i) => i !== rowIdx)));
  };

  // Logistic regression calculation
  const calculateLogisticRegression = () => {
    const n = dataY.length;
    const p = selectedPredictors.length + 1; // +1 for intercept

    // Build X matrix with intercept and selected predictors
    const X: number[][] = [];
    for (let i = 0; i < n; i++) {
      const row = [1]; // intercept
      for (const predIdx of selectedPredictors) {
        row.push(dataX[predIdx][i] || 0);
      }
      X.push(row);
    }

    // Newton-Raphson for logistic regression
    let beta = Array(p).fill(0);
    for (let iter = 0; iter < 10; iter++) {
      // Calculate predictions: p_i = 1 / (1 + exp(-X_i * beta))
      const predictions = X.map(row => {
        const logit = row.reduce((sum, val, j) => sum + val * beta[j], 0);
        return 1 / (1 + Math.exp(-logit));
      });

      // Calculate gradient and Hessian
      let grad = Array(p).fill(0);
      let hess: number[][] = Array(p).fill(null).map(() => Array(p).fill(0));

      for (let i = 0; i < n; i++) {
        const err = dataY[i] - predictions[i];
        for (let j = 0; j < p; j++) {
          grad[j] += X[i][j] * err;
          for (let k = 0; k < p; k++) {
            hess[j][k] += X[i][j] * X[i][k] * predictions[i] * (1 - predictions[i]);
          }
        }
      }

      // Simple Hessian inversion for 2x2 or 3x3
      let hesInv: number[][] = [];
      if (p === 2) {
        const det = hess[0][0] * hess[1][1] - hess[0][1] * hess[1][0];
        hesInv = [[hess[1][1] / det, -hess[0][1] / det], [-hess[1][0] / det, hess[0][0] / det]];
      } else if (p === 3) {
        const det = hess[0][0] * (hess[1][1] * hess[2][2] - hess[1][2] * hess[2][1]) -
                    hess[0][1] * (hess[1][0] * hess[2][2] - hess[1][2] * hess[2][0]) +
                    hess[0][2] * (hess[1][0] * hess[2][1] - hess[1][1] * hess[2][0]);
        hesInv = [
          [(hess[1][1] * hess[2][2] - hess[1][2] * hess[2][1]) / det,
           (hess[0][2] * hess[2][1] - hess[0][1] * hess[2][2]) / det,
           (hess[0][1] * hess[1][2] - hess[0][2] * hess[1][1]) / det],
          [(hess[1][2] * hess[2][0] - hess[1][0] * hess[2][2]) / det,
           (hess[0][0] * hess[2][2] - hess[0][2] * hess[2][0]) / det,
           (hess[0][2] * hess[1][0] - hess[0][0] * hess[1][2]) / det],
          [(hess[1][0] * hess[2][1] - hess[1][1] * hess[2][0]) / det,
           (hess[0][1] * hess[2][0] - hess[0][0] * hess[2][1]) / det,
           (hess[0][0] * hess[1][1] - hess[0][1] * hess[1][0]) / det],
        ];
      }

      // Update beta
      const newBeta = Array(p).fill(0);
      for (let i = 0; i < p; i++) {
        for (let j = 0; j < p; j++) {
          newBeta[i] += hesInv[i][j] * grad[j];
        }
        newBeta[i] += beta[i];
      }

      beta = newBeta;
    }

    // Calculate predictions for accuracy
    const predictions = X.map(row => {
      const logit = row.reduce((sum, val, j) => sum + val * beta[j], 0);
      return 1 / (1 + Math.exp(-logit));
    });

    const predicted = predictions.map(p => p > 0.5 ? 1 : 0);
    const accuracy = predicted.filter((p, i) => p === dataY[i]).length / n;

    // Calculate odds ratios
    const oddRatios = beta.slice(1).map(b => Math.exp(b));

    return { beta, oddRatios, predictions, accuracy };
  };

  const result = calculateLogisticRegression();

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        {/* Setup Tab */}
        <TabsContent value="setup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Variable Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Binary Response Variable Name</Label>
                <Input
                  value={responseVariableName}
                  onChange={(e) => setResponseVariableName(e.target.value)}
                  data-testid="input-response-name"
                />
              </div>

              <div>
                <Label>Predictor Variables</Label>
                <div className="space-y-2">
                  {predictorNames.map((name, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={name}
                        onChange={(e) => {
                          const newNames = [...predictorNames];
                          newNames[idx] = e.target.value;
                          setPredictorNames(newNames);
                        }}
                        data-testid={`input-predictor-${idx}`}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removePredictor(idx)}
                        data-testid={`button-remove-predictor-${idx}`}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  onClick={addPredictor}
                  className="mt-2"
                  data-testid="button-add-predictor"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Predictor
                </Button>
              </div>

              <div>
                <Label>Significance Level (α)</Label>
                <Input
                  type="number"
                  value={significanceLevel}
                  onChange={(e) => setSignificanceLevel(parseFloat(e.target.value) || 0.05)}
                  step="0.01"
                  min="0.01"
                  max="0.99"
                  data-testid="input-significance-level"
                />
              </div>

              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                data-testid="button-save-setup"
              >
                {saveMutation.isPending ? "Saving..." : "Save Configuration"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Tab */}
        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Input Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Obs</TableHead>
                      {predictorNames.map((name, i) => (
                        <TableHead key={i} className="text-right">{name}</TableHead>
                      ))}
                      <TableHead className="text-right">{responseVariableName} (0/1)</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dataY.map((_, rowIdx) => (
                      <TableRow key={rowIdx}>
                        <TableCell>{rowIdx + 1}</TableCell>
                        {predictorNames.map((_, predIdx) => (
                          <TableCell key={predIdx}>
                            <Input
                              type="number"
                              value={isNaN(dataX[predIdx][rowIdx]) ? "" : dataX[predIdx][rowIdx]}
                              onChange={(e) => {
                                const newX = dataX.map(col => [...col]);
                                newX[predIdx][rowIdx] = parseFloat(e.target.value) || NaN;
                                setDataX(newX);
                              }}
                              className="w-20"
                              data-testid={`input-x-${predIdx}-${rowIdx}`}
                            />
                          </TableCell>
                        ))}
                        <TableCell>
                          <Select value={String(dataY[rowIdx])} onValueChange={(v) => {
                            const newY = [...dataY];
                            newY[rowIdx] = parseInt(v);
                            setDataY(newY);
                          }}>
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0</SelectItem>
                              <SelectItem value="1">1</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeRow(rowIdx)}
                            data-testid={`button-remove-row-${rowIdx}`}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Button onClick={addRow} variant="outline" data-testid="button-add-row">
                <Plus className="w-4 h-4 mr-2" />
                Add Observation
              </Button>

              <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-data">
                {saveMutation.isPending ? "Saving..." : "Save Data"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-4">
          {dataY.length < 2 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <p>Enter data to view analysis</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Model Coefficients */}
              <Card>
                <CardHeader>
                  <CardTitle>Model Coefficients & Odds Ratios</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Term</TableHead>
                          <TableHead className="text-right">Coefficient</TableHead>
                          <TableHead className="text-right">Odds Ratio</TableHead>
                          <TableHead className="text-right">% Change</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">Intercept</TableCell>
                          <TableCell className="text-right">{result.beta[0].toFixed(6)}</TableCell>
                          <TableCell className="text-right">{Math.exp(result.beta[0]).toFixed(4)}</TableCell>
                          <TableCell className="text-right">-</TableCell>
                        </TableRow>
                        {selectedPredictors.map((predIdx, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{predictorNames[predIdx]}</TableCell>
                            <TableCell className="text-right">{result.beta[idx + 1].toFixed(6)}</TableCell>
                            <TableCell className="text-right">{result.oddRatios[idx].toFixed(4)}</TableCell>
                            <TableCell className="text-right">
                              {((result.oddRatios[idx] - 1) * 100).toFixed(2)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Model Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Model Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Classification Accuracy</p>
                      <p className="text-2xl font-bold">{(result.accuracy * 100).toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Observations</p>
                      <p className="text-2xl font-bold">{dataY.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Predictions */}
              <Card>
                <CardHeader>
                  <CardTitle>Predictions (Sample)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Obs</TableHead>
                          <TableHead className="text-right">Actual</TableHead>
                          <TableHead className="text-right">Predicted Prob</TableHead>
                          <TableHead className="text-right">Classification</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dataY.slice(0, 5).map((actual, i) => (
                          <TableRow key={i}>
                            <TableCell>{i + 1}</TableCell>
                            <TableCell className="text-right">{actual}</TableCell>
                            <TableCell className="text-right">{result.predictions[i].toFixed(4)}</TableCell>
                            <TableCell className="text-right">{result.predictions[i] > 0.5 ? 1 : 0}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
