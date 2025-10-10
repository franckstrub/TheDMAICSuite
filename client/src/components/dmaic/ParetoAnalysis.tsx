import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Plot from "react-plotly.js";

interface ParetoAnalysisProps {
  projectId: number;
  ctqId: number;
  ctqName: string;
  activeTab?: string;
  onSave?: (data: string) => void;
}

interface ParetoDataPoint {
  category: string;
  frequency: number;
  variable?: string;
}

interface ParetoAnalysisData {
  id?: number;
  projectId: number;
  ctqId: number;
  ctq: string;
  categoryType: string;
  categoryTypeCustom?: string;
  frequencyType: string;
  frequencyTypeCustom?: string;
  selectedVariable?: string;
  paretoData: ParetoDataPoint[];
}

export function ParetoAnalysis({ projectId, ctqId, ctqName, activeTab }: ParetoAnalysisProps) {
  const { toast } = useToast();
  
  // Persistent tab state
  const [currentPane, setCurrentPane] = useState<string>(() => {
    const saved = localStorage.getItem(`paretoPane_${projectId}_${ctqId}`);
    return saved || "setup";
  });
  
  // State for category and frequency types
  const [categoryType, setCategoryType] = useState<string>("Defects");
  const [categoryTypeCustom, setCategoryTypeCustom] = useState<string>("");
  const [frequencyType, setFrequencyType] = useState<string>("Count");
  const [frequencyTypeCustom, setFrequencyTypeCustom] = useState<string>("");
  const [selectedVariable, setSelectedVariable] = useState<string>("");
  
  // State for pareto data
  const [paretoData, setParetoData] = useState<ParetoDataPoint[]>([
    { category: "", frequency: 0 }
  ]);

  // Save current pane to localStorage when it changes
  const handlePaneChange = (value: string) => {
    setCurrentPane(value);
    localStorage.setItem(`paretoPane_${projectId}_${ctqId}`, value);
  };

  // Load pareto analysis from database
  const { data: analysisData } = useQuery<ParetoAnalysisData>({
    queryKey: [`/api/projects/${projectId}/ctq/${ctqId}/pareto-analysis`],
    enabled: activeTab === ctqName,
  });

  // Save pareto analysis mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<ParetoAnalysisData>) => {
      return apiRequest('POST', `/api/projects/${projectId}/ctq/${ctqId}/pareto-analysis`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/ctq/${ctqId}/pareto-analysis`] });
      toast({
        title: "Saved Successfully",
        description: "Pareto analysis has been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error?.message || "Failed to save analysis. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Load saved data when available
  useEffect(() => {
    if (analysisData) {
      setCategoryType(analysisData.categoryType || "Defects");
      setCategoryTypeCustom(analysisData.categoryTypeCustom || "");
      setFrequencyType(analysisData.frequencyType || "Count");
      setFrequencyTypeCustom(analysisData.frequencyTypeCustom || "");
      setSelectedVariable(analysisData.selectedVariable || "");
      setParetoData(analysisData.paretoData && analysisData.paretoData.length > 0 
        ? analysisData.paretoData 
        : [{ category: "", frequency: 0 }]
      );
    }
  }, [analysisData]);

  // Add new data point
  const addDataPoint = () => {
    setParetoData([...paretoData, { category: "", frequency: 0 }]);
  };

  // Remove data point
  const removeDataPoint = (index: number) => {
    const updated = paretoData.filter((_, i) => i !== index);
    setParetoData(updated.length > 0 ? updated : [{ category: "", frequency: 0 }]);
  };

  // Update data point
  const updateDataPoint = (index: number, field: 'category' | 'frequency' | 'variable', value: string | number) => {
    const updated = [...paretoData];
    updated[index] = { ...updated[index], [field]: value };
    setParetoData(updated);
  };

  // Save configuration
  const handleSave = () => {
    saveMutation.mutate({
      projectId,
      ctqId,
      ctq: ctqName,
      categoryType,
      categoryTypeCustom: categoryType === "Others" ? categoryTypeCustom : undefined,
      frequencyType,
      frequencyTypeCustom: frequencyType === "Others" ? frequencyTypeCustom : undefined,
      selectedVariable: selectedVariable || undefined,
      paretoData: paretoData.filter(d => d.category.trim() !== "" && d.frequency > 0),
    });
  };

  // Calculate Pareto chart data - groups by variable if specified
  const calculateParetoData = () => {
    // Filter out empty or zero frequency items
    const validData = paretoData.filter(d => d.category.trim() !== "" && d.frequency > 0);
    
    if (validData.length === 0) return null;

    // If variable is specified and data has variable values, group by variable
    if (selectedVariable && validData.some(d => d.variable && d.variable.trim() !== "")) {
      // Group data by variable value
      const groupedByVariable: { [key: string]: typeof validData } = {};
      
      validData.forEach(item => {
        const varValue = item.variable?.trim() || "Unspecified";
        if (!groupedByVariable[varValue]) {
          groupedByVariable[varValue] = [];
        }
        groupedByVariable[varValue].push(item);
      });

      // Create chart data for each variable value
      const chartsByVariable = Object.entries(groupedByVariable).map(([variableValue, items]) => {
        // Sort by frequency descending
        const sorted = [...items].sort((a, b) => b.frequency - a.frequency);
        
        // Calculate total for this variable
        const total = sorted.reduce((sum, item) => sum + item.frequency, 0);
        
        // Calculate percentages and cumulative percentages
        let cumulative = 0;
        const data = sorted.map(item => {
          const percentage = (item.frequency / total) * 100;
          cumulative += percentage;
          return {
            category: item.category,
            variable: item.variable,
            frequency: item.frequency,
            percentage: percentage,
            cumulativePercentage: cumulative
          };
        });

        return {
          variableValue,
          data,
          total
        };
      });

      // Create global chart - aggregate all data by category
      const globalByCategory: { [category: string]: number } = {};
      validData.forEach(item => {
        if (!globalByCategory[item.category]) {
          globalByCategory[item.category] = 0;
        }
        globalByCategory[item.category] += item.frequency;
      });

      // Convert to array and sort
      const globalSorted = Object.entries(globalByCategory)
        .map(([category, frequency]) => ({ category, frequency }))
        .sort((a, b) => b.frequency - a.frequency);

      const globalTotal = globalSorted.reduce((sum, item) => sum + item.frequency, 0);
      
      let globalCumulative = 0;
      const globalData = globalSorted.map(item => {
        const percentage = (item.frequency / globalTotal) * 100;
        globalCumulative += percentage;
        return {
          category: item.category,
          variable: undefined,
          frequency: item.frequency,
          percentage: percentage,
          cumulativePercentage: globalCumulative
        };
      });

      // Return individual charts followed by global chart
      return [
        ...chartsByVariable,
        {
          variableValue: "Global",
          data: globalData,
          total: globalTotal
        }
      ];
    }

    // No variable specified - create single chart
    const sorted = [...validData].sort((a, b) => b.frequency - a.frequency);
    
    // Calculate total
    const total = sorted.reduce((sum, item) => sum + item.frequency, 0);
    
    // Calculate percentages and cumulative percentages
    let cumulative = 0;
    const chartData = sorted.map(item => {
      const percentage = (item.frequency / total) * 100;
      cumulative += percentage;
      return {
        category: item.category,
        variable: item.variable,
        frequency: item.frequency,
        percentage: percentage,
        cumulativePercentage: cumulative
      };
    });

    return [{
      variableValue: null,
      data: chartData,
      total
    }];
  };

  const chartDataGroups = calculateParetoData();

  // Get display names for category and frequency types
  const getCategoryLabel = () => {
    if (categoryType === "Others" && categoryTypeCustom) return categoryTypeCustom;
    return categoryType;
  };

  const getFrequencyLabel = () => {
    if (frequencyType === "Others" && frequencyTypeCustom) return frequencyTypeCustom;
    return frequencyType;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Pareto Analysis</CardTitle>
            <p className="text-sm text-gray-500 mt-2">
              CTQ: {ctqName}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Identify the vital few causes that account for the majority of problems.
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            data-testid="button-save"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={currentPane} onValueChange={handlePaneChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="setup">Setup</TabsTrigger>
            <TabsTrigger value="data">Data Input</TabsTrigger>
            <TabsTrigger value="chart">Chart</TabsTrigger>
          </TabsList>

          {/* Setup Tab */}
          <TabsContent value="setup" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            {/* Category Type */}
            <div className="space-y-2">
              <Label htmlFor="category-type">Category Type</Label>
              <Select value={categoryType} onValueChange={setCategoryType}>
                <SelectTrigger id="category-type" data-testid="select-category-type">
                  <SelectValue placeholder="Select category type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Defects">Defects</SelectItem>
                  <SelectItem value="Complaints">Complaints</SelectItem>
                  <SelectItem value="Causes">Causes</SelectItem>
                  <SelectItem value="Others">Others (specify)</SelectItem>
                </SelectContent>
              </Select>
              {categoryType === "Others" && (
                <Input
                  placeholder="Specify category type"
                  value={categoryTypeCustom}
                  onChange={(e) => setCategoryTypeCustom(e.target.value)}
                  data-testid="input-category-custom"
                />
              )}
            </div>

            {/* Frequency Type */}
            <div className="space-y-2">
              <Label htmlFor="frequency-type">Frequency Type</Label>
              <Select value={frequencyType} onValueChange={setFrequencyType}>
                <SelectTrigger id="frequency-type" data-testid="select-frequency-type">
                  <SelectValue placeholder="Select frequency type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Count">Count</SelectItem>
                  <SelectItem value="Costs">Costs</SelectItem>
                  <SelectItem value="Others">Others (specify)</SelectItem>
                </SelectContent>
              </Select>
              {frequencyType === "Others" && (
                <Input
                  placeholder="Specify frequency type"
                  value={frequencyTypeCustom}
                  onChange={(e) => setFrequencyTypeCustom(e.target.value)}
                  data-testid="input-frequency-custom"
                />
              )}
            </div>

              {/* Variable Selection */}
              <div className="space-y-2">
                <Label htmlFor="variable">By Variable (Optional)</Label>
                <Input
                  id="variable"
                  placeholder="e.g., Product Line, Shift"
                  value={selectedVariable}
                  onChange={(e) => setSelectedVariable(e.target.value)}
                  data-testid="input-variable"
                />
              </div>
            </div>
          </TabsContent>

          {/* Data Input Tab */}
          <TabsContent value="data" className="space-y-4">
            <div>
            <div className="flex justify-between items-center mb-3">
              <Label className="text-base font-semibold">Data Entry</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addDataPoint}
                data-testid="button-add-data"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            
            <div className="space-y-2">
              <div className={`grid ${selectedVariable ? 'grid-cols-4' : 'grid-cols-3'} gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                <div>{getCategoryLabel()}</div>
                {selectedVariable && <div>{selectedVariable}</div>}
                <div>{getFrequencyLabel()}</div>
                <div className="text-center">Action</div>
              </div>
              
              {paretoData.map((item, index) => (
                <div key={index} className={`grid ${selectedVariable ? 'grid-cols-4' : 'grid-cols-3'} gap-2 items-center`}>
                  <Input
                    placeholder={`e.g., ${categoryType === "Defects" ? "Documentation Errors" : "Category"}`}
                    value={item.category}
                    onChange={(e) => updateDataPoint(index, 'category', e.target.value)}
                    data-testid={`input-category-${index}`}
                  />
                  {selectedVariable && (
                    <Input
                      placeholder={`e.g., ${selectedVariable === 'Shift' ? 'Morning' : 'Value'}`}
                      value={item.variable || ""}
                      onChange={(e) => updateDataPoint(index, 'variable', e.target.value)}
                      data-testid={`input-variable-${index}`}
                    />
                  )}
                  <Input
                    type="number"
                    min="0"
                    step={frequencyType === "Costs" ? "0.01" : "1"}
                    placeholder="0"
                    value={item.frequency || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Handle French decimal format
                      let processedValue = value;
                      if (value.includes(',') && !value.includes('.')) {
                        processedValue = value.replace(',', '.');
                      }
                      const numValue = parseFloat(processedValue);
                      updateDataPoint(index, 'frequency', isNaN(numValue) ? 0 : numValue);
                    }}
                    data-testid={`input-frequency-${index}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDataPoint(index)}
                    disabled={paretoData.length === 1}
                    data-testid={`button-remove-${index}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            </div>
          </TabsContent>

          {/* Chart Tab */}
          <TabsContent value="chart" className="space-y-4">
          {/* Pareto Charts - One per variable value */}
          {chartDataGroups && chartDataGroups.length > 0 && (
            <div className="space-y-8">
              {chartDataGroups.map((group, groupIndex) => (
                <div key={groupIndex} className="space-y-4">
                  {/* Chart */}
                  <div className={`border rounded-md p-4 ${group.variableValue === "Global" ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-gray-200'}`}>
                    <h3 className="text-lg font-semibold text-center mb-4">
                      {group.variableValue === "Global" ? (
                        <span className="text-green-700 dark:text-green-400">
                          GLOBAL PARETO CHART - {getCategoryLabel().toUpperCase()} (All {selectedVariable} Combined)
                        </span>
                      ) : (
                        <>
                          PARETO CHART - {getCategoryLabel().toUpperCase()}
                          {group.variableValue && ` (${selectedVariable}: ${group.variableValue})`}
                        </>
                      )}
                    </h3>
                    <Plot
                      data={[
                        {
                          x: group.data.map(d => d.category),
                          y: group.data.map(d => d.frequency),
                          type: 'bar',
                          name: getFrequencyLabel(),
                          marker: { color: '#3b82f6' },
                          yaxis: 'y1',
                        },
                        {
                          x: group.data.map(d => d.category),
                          y: group.data.map(d => d.cumulativePercentage),
                          type: 'scatter',
                          mode: 'lines+markers',
                          name: 'Cumulative %',
                          line: { color: '#f97316', width: 3 },
                          marker: { size: 8 },
                          yaxis: 'y2',
                        },
                      ]}
                      layout={{
                        autosize: true,
                        height: 400,
                        xaxis: {
                          title: { text: getCategoryLabel() },
                          tickangle: -30,
                        },
                        yaxis: {
                          title: { text: getFrequencyLabel() },
                          side: 'left',
                        },
                        yaxis2: {
                          title: { text: 'Cumulative %' },
                          side: 'right',
                          overlaying: 'y',
                          range: [0, 100],
                        },
                        legend: {
                          x: 0.5,
                          y: -0.3,
                          xanchor: 'center',
                          orientation: 'h',
                        },
                        margin: { l: 60, r: 60, t: 40, b: 100 },
                      }}
                      config={{
                        responsive: true,
                        displayModeBar: true,
                        displaylogo: false,
                      }}
                      style={{ width: '100%' }}
                    />
                  </div>

                  {/* Results Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                            {getCategoryLabel()}
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                            {getFrequencyLabel()}
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Percentage
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Cumulative %
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200">
                        {group.data.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                              {item.category}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                              {frequencyType === "Costs" ? item.frequency.toFixed(2) : item.frequency}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                              {item.percentage.toFixed(1)}%
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                              {item.cumulativePercentage.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Key Insights */}
                  <div className={`p-4 border rounded-lg ${group.variableValue === "Global" ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'}`}>
                    <h4 className={`font-medium mb-2 ${group.variableValue === "Global" ? 'text-green-900 dark:text-green-100' : 'text-blue-900 dark:text-blue-100'}`}>
                      {group.variableValue === "Global" ? (
                        `Global Key Insights (All ${selectedVariable} Combined)`
                      ) : (
                        `Key Insights${group.variableValue && ` - ${selectedVariable}: ${group.variableValue}`}`
                      )}
                    </h4>
                    <ul className={`text-sm space-y-1 ${group.variableValue === "Global" ? 'text-green-800 dark:text-green-200' : 'text-blue-800 dark:text-blue-200'}`}>
                      <li>• Total {getFrequencyLabel()}: {group.total.toFixed(frequencyType === "Costs" ? 2 : 0)}</li>
                      <li>• Top Category: {group.data[0]?.category} ({group.data[0]?.percentage.toFixed(1)}%)</li>
                      <li>• 80% Rule: First {group.data.findIndex(item => item.cumulativePercentage >= 80) + 1} {group.data.findIndex(item => item.cumulativePercentage >= 80) + 1 === 1 ? 'category accounts' : 'categories account'} for 80%+ of {getCategoryLabel().toLowerCase()}</li>
                      <li title="Categories that contribute the most to overall rate">
                        • Vital Few: {group.data.filter(d => d.cumulativePercentage <= 80).map(d => d.category).join(', ')}
                      </li>
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
