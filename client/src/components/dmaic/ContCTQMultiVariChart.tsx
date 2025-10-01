import { useEffect, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ScatterChart, Scatter, ZAxis } from "recharts";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, Download, Upload, Trash2, Save, Plus, Minus } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { MultiVariChartConfig } from '@shared/schema';

interface ContCTQMultiVariChartProps {
  projectId: number;
  ctqId: number;
  ctqName: string;
  activeTab?: string;
  onSave?: (data: string) => void;
}

interface DataPoint {
  factor1: string;
  factor2: string;
  factor3: string | null;
  response: number;
}

export function ContCTQMultiVariChart({ projectId, ctqId, ctqName, activeTab }: ContCTQMultiVariChartProps) {
  const { toast } = useToast();
  
  // State management
  const [factor1Name, setFactor1Name] = useState("1st factor");
  const [factor2Name, setFactor2Name] = useState("2nd factor");
  const [factor3Name, setFactor3Name] = useState("3rd factor");
  const [data, setData] = useState<DataPoint[]>([]);
  const [chartType, setChartType] = useState<"line" | "scatter">("line");
  const [showMean, setShowMean] = useState(true);
  const [showRange, setShowRange] = useState(true);
  const [useFactor3, setUseFactor3] = useState(false);
  
  // Form inputs for adding data
  const [newFactor1, setNewFactor1] = useState("");
  const [newFactor2, setNewFactor2] = useState("");
  const [newFactor3, setNewFactor3] = useState("");
  const [newResponse, setNewResponse] = useState("");

  // Load configuration from database
  const { data: configData } = useQuery<MultiVariChartConfig>({
    queryKey: [`/api/projects/${projectId}/ctq/${ctqId}/multi-vari-config`],
    enabled: activeTab === ctqName,
  });

  // Save configuration mutation
  const saveMutation = useMutation({
    mutationFn: async (config: Partial<MultiVariChartConfig>) => {
      return apiRequest('POST', `/api/projects/${projectId}/ctq/${ctqId}/multi-vari-config`, config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/ctq/${ctqId}/multi-vari-config`] });
      toast({
        title: "Saved Successfully",
        description: "Multi-vari chart configuration has been saved.",
      });
    },
    onError: (error: any) => {
      console.error("Save error:", error);
      toast({
        title: "Save Failed",
        description: error?.message || "Failed to save configuration. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Load saved data
  useEffect(() => {
    if (configData) {
      setFactor1Name(configData.factor1Name || "Position");
      setFactor2Name(configData.factor2Name || "Time");
      setFactor3Name(configData.factor3Name || "Operator");
      setData(configData.data || []);
      setChartType((configData.chartType as "line" | "scatter") || "line");
      setShowMean(configData.showMean ?? true);
      setShowRange(configData.showRange ?? true);
      
      // Check if factor 3 is being used
      if (configData.data && configData.data.some(d => d.factor3 !== null && d.factor3 !== "")) {
        setUseFactor3(true);
      }
    }
  }, [configData]);

  // Add data point
  const addDataPoint = () => {
    if (!newFactor1 || !newFactor2 || !newResponse) {
      toast({
        title: "Missing Data",
        description: "Please fill in Factor 1, Factor 2, and Response values.",
        variant: "destructive",
      });
      return;
    }

    if (useFactor3 && !newFactor3) {
      toast({
        title: "Missing Data",
        description: "Please fill in Factor 3 value.",
        variant: "destructive",
      });
      return;
    }

    const responseNum = parseFloat(newResponse.replace(',', '.'));
    if (isNaN(responseNum)) {
      toast({
        title: "Invalid Response",
        description: "Response must be a valid number.",
        variant: "destructive",
      });
      return;
    }

    const newPoint: DataPoint = {
      factor1: newFactor1,
      factor2: newFactor2,
      factor3: useFactor3 ? newFactor3 : null,
      response: responseNum,
    };

    setData([...data, newPoint]);
    setNewFactor1("");
    setNewFactor2("");
    setNewFactor3("");
    setNewResponse("");
    
    toast({
      title: "Data Added",
      description: "New data point has been added to the chart.",
    });
  };

  // Handle paste from Excel
  const handlePaste = (event: React.ClipboardEvent) => {
    event.preventDefault();
    const pastedData = event.clipboardData.getData('text/plain');
    
    const lines = pastedData.trim().split('\n');
    const newPoints: DataPoint[] = [];
    
    lines.forEach(line => {
      const cells = line.split('\t').map(cell => cell.trim());
      
      if (useFactor3) {
        if (cells.length >= 4) {
          const responseValue = parseFloat(cells[3].replace(',', '.'));
          if (!isNaN(responseValue)) {
            newPoints.push({
              factor1: cells[0],
              factor2: cells[1],
              factor3: cells[2],
              response: responseValue,
            });
          }
        }
      } else {
        if (cells.length >= 3) {
          const responseValue = parseFloat(cells[2].replace(',', '.'));
          if (!isNaN(responseValue)) {
            newPoints.push({
              factor1: cells[0],
              factor2: cells[1],
              factor3: null,
              response: responseValue,
            });
          }
        }
      }
    });
    
    if (newPoints.length > 0) {
      setData([...data, ...newPoints]);
      toast({
        title: "Data Pasted",
        description: `${newPoints.length} data points have been added.`,
      });
    } else {
      toast({
        title: "Paste Failed",
        description: "No valid data found in clipboard.",
        variant: "destructive",
      });
    }
  };

  // Clear all data
  const clearData = () => {
    setData([]);
    toast({
      title: "Data Cleared",
      description: "All data points have been removed.",
    });
  };

  // Save configuration
  const handleSave = () => {
    saveMutation.mutate({
      projectId,
      ctqId,
      ctq: ctqName,
      factor1Name,
      factor2Name,
      factor3Name,
      data,
      chartType,
      showMean,
      showRange,
    });
  };

  // Prepare chart data
  const getChartData = () => {
    if (!data.length) return [];

    // Group by factor1 and factor2
    const grouped = data.reduce((acc, point) => {
      const key = `${point.factor1}_${point.factor2}`;
      if (!acc[key]) {
        acc[key] = {
          factor1: point.factor1,
          factor2: point.factor2,
          values: [],
        };
      }
      acc[key].values.push(point.response);
      return acc;
    }, {} as Record<string, { factor1: string; factor2: string; values: number[] }>);

    // Calculate statistics for each group
    return Object.values(grouped).map(group => {
      const mean = group.values.reduce((sum, val) => sum + val, 0) / group.values.length;
      const min = Math.min(...group.values);
      const max = Math.max(...group.values);
      const range = max - min;
      
      return {
        name: `${group.factor1} - ${group.factor2}`,
        factor1: group.factor1,
        factor2: group.factor2,
        mean: parseFloat(mean.toFixed(2)),
        min: parseFloat(min.toFixed(2)),
        max: parseFloat(max.toFixed(2)),
        range: parseFloat(range.toFixed(2)),
        values: group.values,
      };
    });
  };

  // Calculate variation components
  const calculateVariationAnalysis = () => {
    if (data.length < 2) return null;

    const chartData = getChartData();
    const allValues = data.map(d => d.response);
    const grandMean = allValues.reduce((sum, val) => sum + val, 0) / allValues.length;
    
    // Total variation
    const totalSS = allValues.reduce((sum, val) => sum + Math.pow(val - grandMean, 2), 0);
    
    // Between-group variation
    const betweenSS = chartData.reduce((sum, group) => {
      const groupMean = group.mean;
      const count = group.values.length;
      return sum + count * Math.pow(groupMean - grandMean, 2);
    }, 0);
    
    // Within-group variation
    const withinSS = totalSS - betweenSS;
    
    const totalPercent = 100;
    const betweenPercent = (betweenSS / totalSS) * 100;
    const withinPercent = (withinSS / totalSS) * 100;
    
    return {
      total: totalSS.toFixed(2),
      between: betweenSS.toFixed(2),
      within: withinSS.toFixed(2),
      betweenPercent: betweenPercent.toFixed(1),
      withinPercent: withinPercent.toFixed(1),
    };
  };

  const chartData = getChartData();
  const variationAnalysis = calculateVariationAnalysis();

  // Get unique factor levels for filter options
  const uniqueFactor1 = Array.from(new Set(data.map(d => d.factor1)));
  const uniqueFactor2 = Array.from(new Set(data.map(d => d.factor2)));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Multi-Vari Chart Analysis
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                CTQ: {ctqName}
              </p>
            </div>
            <Button 
              onClick={handleSave} 
              disabled={saveMutation.isPending}
              data-testid="button-save-multivari"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="setup" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="setup">Setup</TabsTrigger>
              <TabsTrigger value="data">Data Input</TabsTrigger>
              <TabsTrigger value="chart">Chart</TabsTrigger>
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
            </TabsList>

            {/* Setup Tab */}
            <TabsContent value="setup" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="factor1-name">Factor 1 Name (Primary Factor)</Label>
                  <Input
                    id="factor1-name"
                    value={factor1Name}
                    onChange={(e) => setFactor1Name(e.target.value)}
                    placeholder="e.g., Position, Machine, Shift"
                    data-testid="input-factor1-name"
                  />
                  <p className="text-xs text-muted-foreground">
                    Examples: Position (Top/Middle/Bottom), Shift (Day/Night), Machine (A/B/C)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="factor2-name">Factor 2 Name (Secondary Factor)</Label>
                  <Input
                    id="factor2-name"
                    value={factor2Name}
                    onChange={(e) => setFactor2Name(e.target.value)}
                    placeholder="e.g., Time, Operator, Batch"
                    data-testid="input-factor2-name"
                  />
                  <p className="text-xs text-muted-foreground">
                    Examples: Time (Morning/Evening), Operator (A/B/C), Batch (1/2/3)
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="use-factor3"
                      checked={useFactor3}
                      onChange={(e) => setUseFactor3(e.target.checked)}
                      className="rounded border-gray-300"
                      data-testid="checkbox-use-factor3"
                    />
                    <Label htmlFor="use-factor3" className="cursor-pointer">
                      Use Factor 3 (Optional)
                    </Label>
                  </div>
                  {useFactor3 && (
                    <Input
                      id="factor3-name"
                      value={factor3Name}
                      onChange={(e) => setFactor3Name(e.target.value)}
                      placeholder="e.g., Operator, Material, Tool"
                      data-testid="input-factor3-name"
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    Add a third factor for more detailed analysis
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chart-type">Chart Type</Label>
                  <Select value={chartType} onValueChange={(val) => setChartType(val as "line" | "scatter")}>
                    <SelectTrigger id="chart-type" data-testid="select-chart-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="line">Line Chart</SelectItem>
                      <SelectItem value="scatter">Scatter Plot</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="show-mean"
                    checked={showMean}
                    onChange={(e) => setShowMean(e.target.checked)}
                    className="rounded border-gray-300"
                    data-testid="checkbox-show-mean"
                  />
                  <Label htmlFor="show-mean" className="cursor-pointer">Show Mean</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="show-range"
                    checked={showRange}
                    onChange={(e) => setShowRange(e.target.checked)}
                    className="rounded border-gray-300"
                    data-testid="checkbox-show-range"
                  />
                  <Label htmlFor="show-range" className="cursor-pointer">Show Range</Label>
                </div>
              </div>
            </TabsContent>

            {/* Data Input Tab */}
            <TabsContent value="data" className="space-y-4">
              <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950">
                <h3 className="font-semibold mb-2">Quick Data Entry</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div>
                    <Label className="text-xs">{factor1Name}</Label>
                    <Input
                      value={newFactor1}
                      onChange={(e) => setNewFactor1(e.target.value)}
                      placeholder="e.g., Top"
                      data-testid="input-new-factor1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{factor2Name}</Label>
                    <Input
                      value={newFactor2}
                      onChange={(e) => setNewFactor2(e.target.value)}
                      placeholder="e.g., AM"
                      data-testid="input-new-factor2"
                    />
                  </div>
                  {useFactor3 && (
                    <div>
                      <Label className="text-xs">{factor3Name}</Label>
                      <Input
                        value={newFactor3}
                        onChange={(e) => setNewFactor3(e.target.value)}
                        placeholder="e.g., Operator A"
                        data-testid="input-new-factor3"
                      />
                    </div>
                  )}
                  <div>
                    <Label className="text-xs">Response</Label>
                    <Input
                      value={newResponse}
                      onChange={(e) => setNewResponse(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addDataPoint()}
                      placeholder="e.g., 7.5"
                      data-testid="input-new-response"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={addDataPoint} className="w-full" data-testid="button-add-datapoint">
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <div 
                  onPaste={handlePaste} 
                  className="flex-1 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                  tabIndex={0}
                  data-testid="paste-area"
                >
                  <Upload className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Click here and paste Excel data (Ctrl+V)
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Format: {factor1Name} | {factor2Name} {useFactor3 ? `| ${factor3Name}` : ''} | Response
                  </p>
                </div>
                <Button 
                  variant="destructive" 
                  onClick={clearData}
                  disabled={data.length === 0}
                  data-testid="button-clear-data"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>{factor1Name}</TableHead>
                      <TableHead>{factor2Name}</TableHead>
                      {useFactor3 && <TableHead>{factor3Name}</TableHead>}
                      <TableHead>Response</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={useFactor3 ? 6 : 5} className="text-center text-gray-500 py-8">
                          No data points added yet. Add data manually or paste from Excel.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.map((point, index) => (
                        <TableRow key={index} data-testid={`row-datapoint-${index}`}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{point.factor1}</TableCell>
                          <TableCell>{point.factor2}</TableCell>
                          {useFactor3 && <TableCell>{point.factor3 || '-'}</TableCell>}
                          <TableCell>{point.response}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setData(data.filter((_, i) => i !== index))}
                              data-testid={`button-delete-${index}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <p className="text-sm text-gray-600">
                Total data points: <span className="font-semibold">{data.length}</span>
              </p>
            </TabsContent>

            {/* Chart Tab */}
            <TabsContent value="chart" className="space-y-4">
              {chartData.length === 0 ? (
                <div className="border rounded-lg p-12 text-center text-gray-500">
                  <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p>No data available to display chart.</p>
                  <p className="text-sm mt-2">Add data in the Data Input tab to see the multi-vari chart.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="h-96 border rounded-lg p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === "line" ? (
                        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="name" 
                            angle={-45} 
                            textAnchor="end" 
                            height={80}
                            interval={0}
                          />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          {showMean && <Line type="monotone" dataKey="mean" stroke="#8884d8" strokeWidth={2} name="Mean" />}
                          {showRange && (
                            <>
                              <Line type="monotone" dataKey="max" stroke="#82ca9d" strokeDasharray="5 5" name="Max" />
                              <Line type="monotone" dataKey="min" stroke="#ffc658" strokeDasharray="5 5" name="Min" />
                            </>
                          )}
                        </LineChart>
                      ) : (
                        <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="category" dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} />
                          <YAxis type="number" dataKey="mean" name="Response" />
                          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                          <Legend />
                          <Scatter name="Mean" data={chartData} fill="#8884d8" />
                        </ScatterChart>
                      )}
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Unique Factor Levels</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div>
                          <p className="text-xs text-gray-600">{factor1Name}:</p>
                          <p className="font-semibold">{uniqueFactor1.join(', ')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">{factor2Name}:</p>
                          <p className="font-semibold">{uniqueFactor2.join(', ')}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Overall Statistics</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div>
                          <p className="text-xs text-gray-600">Grand Mean:</p>
                          <p className="font-semibold">
                            {(data.reduce((sum, d) => sum + d.response, 0) / data.length).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Range:</p>
                          <p className="font-semibold">
                            {(Math.max(...data.map(d => d.response)) - Math.min(...data.map(d => d.response))).toFixed(2)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Analysis Tab */}
            <TabsContent value="analysis" className="space-y-4">
              {!variationAnalysis ? (
                <div className="border rounded-lg p-12 text-center text-gray-500">
                  <p>No data available for variation analysis.</p>
                  <p className="text-sm mt-2">Add at least 2 data points to see the analysis.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Variation Components</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950">
                            <p className="text-sm text-gray-600">Total Variation</p>
                            <p className="text-2xl font-bold">{variationAnalysis.total}</p>
                            <p className="text-xs text-gray-500">Sum of Squares</p>
                          </div>
                          <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950">
                            <p className="text-sm text-gray-600">Between-Group Variation</p>
                            <p className="text-2xl font-bold">{variationAnalysis.between}</p>
                            <p className="text-xs text-gray-500">{variationAnalysis.betweenPercent}% of total</p>
                          </div>
                          <div className="border rounded-lg p-4 bg-orange-50 dark:bg-orange-950">
                            <p className="text-sm text-gray-600">Within-Group Variation</p>
                            <p className="text-2xl font-bold">{variationAnalysis.within}</p>
                            <p className="text-xs text-gray-500">{variationAnalysis.withinPercent}% of total</p>
                          </div>
                        </div>

                        <div className="border rounded-lg p-4">
                          <h4 className="font-semibold mb-2">Interpretation</h4>
                          <div className="space-y-2 text-sm">
                            {parseFloat(variationAnalysis.betweenPercent) > 70 ? (
                              <p className="text-green-700 dark:text-green-400">
                                ✓ <strong>Between-group variation is dominant ({variationAnalysis.betweenPercent}%)</strong> - 
                                The factors ({factor1Name}, {factor2Name}) have a significant effect on the response.
                                Focus on optimizing factor levels.
                              </p>
                            ) : parseFloat(variationAnalysis.withinPercent) > 70 ? (
                              <p className="text-orange-700 dark:text-orange-400">
                                ⚠ <strong>Within-group variation is dominant ({variationAnalysis.withinPercent}%)</strong> - 
                                Variation occurs within factor combinations. Consider investigating measurement system,
                                process stability, or additional hidden factors.
                              </p>
                            ) : (
                              <p className="text-blue-700 dark:text-blue-400">
                                ℹ <strong>Variation is mixed</strong> - Both between-group and within-group variations
                                contribute significantly. Investigate both factor effects and process consistency.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Group Statistics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{factor1Name}</TableHead>
                              <TableHead>{factor2Name}</TableHead>
                              <TableHead>Mean</TableHead>
                              <TableHead>Min</TableHead>
                              <TableHead>Max</TableHead>
                              <TableHead>Range</TableHead>
                              <TableHead>n</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {chartData.map((group, index) => (
                              <TableRow key={index}>
                                <TableCell>{group.factor1}</TableCell>
                                <TableCell>{group.factor2}</TableCell>
                                <TableCell className="font-semibold">{group.mean}</TableCell>
                                <TableCell>{group.min}</TableCell>
                                <TableCell>{group.max}</TableCell>
                                <TableCell>{group.range}</TableCell>
                                <TableCell>{group.values.length}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
