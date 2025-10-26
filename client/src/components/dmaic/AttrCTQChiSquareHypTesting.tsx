import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from "@/components/ui/badge";
import { chiSquareTestOfIndependence } from "@/lib/statisticsUtils";
import { HypothesisTestingTabs } from "./common/HypothesisTestingTabs";
import Plot from 'react-plotly.js';
import { Plus, X } from 'lucide-react';

interface AttrCTQChiSquareHypTestingProps {
  projectId: number;
  ctqId: number;
  ctqName: string;
  activeTab?: string;
  onSave?: (data: string) => void;
  apiEndpoint?: string;
}

interface ChiSquareConfig {
  significanceLevel: string;
  variable1Name: string;
  variable1Categories: string[];
  variable2Name: string;
  variable2Categories: string[];
  observedFrequencies: string;
}

export function AttrCTQChiSquareHypTesting({ projectId, ctqId, ctqName, activeTab, onSave, apiEndpoint }: AttrCTQChiSquareHypTestingProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Use provided apiEndpoint or default to the Analyze phase endpoint
  const effectiveApiEndpoint = apiEndpoint || `/api/projects/${projectId}/ctq/${ctqId}/chi-square-independence-config`;
  
  const [significanceLevel, setSignificanceLevel] = useState("0.05");
  const [variable1Name, setVariable1Name] = useState("Variable 1");
  const [variable1Categories, setVariable1Categories] = useState<string[]>(["Category 1", "Category 2"]);
  const [variable2Name, setVariable2Name] = useState("Variable 2");
  const [variable2Categories, setVariable2Categories] = useState<string[]>(["Category 1", "Category 2"]);
  const [observedFrequencies, setObservedFrequencies] = useState<{ [key: string]: number }>({});
  const [testResults, setTestResults] = useState<any>(null);
  const [percentageType, setPercentageType] = useState<"row" | "column" | "total">("row");

  // TanStack Query for loading data from database
  const { data: configData, isLoading } = useQuery({
    queryKey: [effectiveApiEndpoint],
    enabled: !!projectId && !!ctqId,
    retry: false,
  });

  // Mutation for saving data to database
  const saveConfigMutation = useMutation({
    mutationFn: async (configData: any) => {
      const response = await fetch(effectiveApiEndpoint, {
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
        description: "Chi-square test configuration has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [effectiveApiEndpoint] });
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
      if (config.variable1Name) setVariable1Name(config.variable1Name);
      if (config.variable1Categories && Array.isArray(config.variable1Categories)) {
        setVariable1Categories(config.variable1Categories);
      }
      if (config.variable2Name) setVariable2Name(config.variable2Name);
      if (config.variable2Categories && Array.isArray(config.variable2Categories)) {
        setVariable2Categories(config.variable2Categories);
      }
      if (config.observedFrequencies) {
        try {
          const parsed = JSON.parse(config.observedFrequencies);
          setObservedFrequencies(parsed);
        } catch (e) {
          console.error("Error parsing observed frequencies:", e);
        }
      }
    }
  }, [configData, isLoading]);

  // Auto-calculate test results when data changes
  useEffect(() => {
    if (variable1Categories.length >= 2 && variable2Categories.length >= 2) {
      const hasData = Object.keys(observedFrequencies).some(key => observedFrequencies[key] > 0);
      if (hasData) {
        runTest();
      }
    }
  }, [observedFrequencies, variable1Categories, variable2Categories, significanceLevel]);

  const addVariable1Category = () => {
    if (variable1Categories.length < 13) {
      setVariable1Categories([...variable1Categories, `Category ${variable1Categories.length + 1}`]);
    }
  };

  const removeVariable1Category = (index: number) => {
    if (variable1Categories.length > 2) {
      const newCategories = variable1Categories.filter((_, i) => i !== index);
      setVariable1Categories(newCategories);
      
      // Clean up frequencies for removed row
      const newFreqs = { ...observedFrequencies };
      variable2Categories.forEach((_, colIdx) => {
        delete newFreqs[`${index}_${colIdx}`];
      });
      setObservedFrequencies(newFreqs);
    }
  };

  const addVariable2Category = () => {
    if (variable2Categories.length < 13) {
      setVariable2Categories([...variable2Categories, `Category ${variable2Categories.length + 1}`]);
    }
  };

  const removeVariable2Category = (index: number) => {
    if (variable2Categories.length > 2) {
      const newCategories = variable2Categories.filter((_, i) => i !== index);
      setVariable2Categories(newCategories);
      
      // Clean up frequencies for removed column
      const newFreqs = { ...observedFrequencies };
      variable1Categories.forEach((_, rowIdx) => {
        delete newFreqs[`${rowIdx}_${index}`];
      });
      setObservedFrequencies(newFreqs);
    }
  };

  const updateVariable1Category = (index: number, value: string) => {
    const newCategories = [...variable1Categories];
    newCategories[index] = value;
    setVariable1Categories(newCategories);
  };

  const updateVariable2Category = (index: number, value: string) => {
    const newCategories = [...variable2Categories];
    newCategories[index] = value;
    setVariable2Categories(newCategories);
  };

  const updateFrequency = (row: number, col: number, value: string) => {
    const key = `${row}_${col}`;
    const numValue = value === '' ? 0 : parseFloat(value.replace(',', '.'));
    
    if (!isNaN(numValue) && numValue >= 0) {
      setObservedFrequencies(prev => ({
        ...prev,
        [key]: numValue
      }));
    }
  };

  const getFrequency = (row: number, col: number): number => {
    const key = `${row}_${col}`;
    return observedFrequencies[key] || 0;
  };

  const calculateRowTotal = (rowIndex: number): number => {
    return variable2Categories.reduce((sum, _, colIndex) => {
      return sum + getFrequency(rowIndex, colIndex);
    }, 0);
  };

  const calculateColumnTotal = (colIndex: number): number => {
    return variable1Categories.reduce((sum, _, rowIndex) => {
      return sum + getFrequency(rowIndex, colIndex);
    }, 0);
  };

  const calculateGrandTotal = (): number => {
    return variable1Categories.reduce((sum, _, rowIndex) => {
      return sum + calculateRowTotal(rowIndex);
    }, 0);
  };

  const runTest = () => {
    try {
      // Build 2D array from observedFrequencies object
      const obsArray: number[][] = [];
      for (let row = 0; row < variable1Categories.length; row++) {
        obsArray[row] = [];
        for (let col = 0; col < variable2Categories.length; col++) {
          obsArray[row][col] = getFrequency(row, col);
        }
      }

      const results = chiSquareTestOfIndependence(obsArray, parseFloat(significanceLevel));
      setTestResults(results);
    } catch (error: any) {
      console.error("Chi-square test error:", error);
      setTestResults(null);
    }
  };

  const saveConfiguration = () => {
    const configToSave = {
      testType: "Chi-Square Independence Test",
      significanceLevel,
      variable1Name,
      variable1Categories,
      variable2Name,
      variable2Categories,
      observedFrequencies: JSON.stringify(observedFrequencies),
    };
    
    saveConfigMutation.mutate(configToSave);
  };

  const saveData = () => {
    const configToSave = {
      testType: "Chi-Square Independence Test",
      significanceLevel,
      variable1Name,
      variable1Categories,
      variable2Name,
      variable2Categories,
      observedFrequencies: JSON.stringify(observedFrequencies),
    };
    
    saveConfigMutation.mutate(configToSave);
  };

  const getEffectSizeInterpretation = (cramersV: number): string => {
    if (cramersV < 0.1) return "Negligible";
    if (cramersV < 0.3) return "Small";
    if (cramersV < 0.5) return "Medium";
    return "Large";
  };

  // Setup tab content
  const setupContent = (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 mb-4">
        Test whether two categorical variables are independent. Configure the variables and their categories (13 categories maximum).
      </p>

      <div className="space-y-2">
        <div className="border border-gray-300 rounded-sm p-1 shadow-sm bg-white">
          H₀: categorical variables are independent (no association, no difference in observations)
        </div>
        <div className="border border-gray-300 rounded-sm p-1 shadow-sm bg-white">
          Hₐ: categorical variables are dependent (association & difference in observations)
        </div>
      </div>

      <div>
        <Label htmlFor="significanceLevel">Significance Level (α)</Label>
        <Select value={significanceLevel} onValueChange={setSignificanceLevel}>
          <SelectTrigger id="significanceLevel" data-testid="select-significance-level">
            <SelectValue placeholder="Select significance level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0.01">1%</SelectItem>
            <SelectItem value="0.05">5%</SelectItem>
            <SelectItem value="0.10">10%</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4 border rounded-lg p-4">
        <div>
          <Label htmlFor="variable1Name">Variable 1 Name</Label>
          <Input
            id="variable1Name"
            data-testid="input-variable1-name"
            value={variable1Name}
            onChange={(e) => setVariable1Name(e.target.value)}
            placeholder="Enter variable 1 name"
          />
        </div>

        <div>
          <Label>Variable 1 Categories (Row Labels)</Label>
          <div className="space-y-2">
            {variable1Categories.map((cat, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  data-testid={`input-variable1-category-${index}`}
                  value={cat}
                  onChange={(e) => updateVariable1Category(index, e.target.value)}
                  placeholder={`Category ${index + 1}`}
                />
                {variable1Categories.length > 2 && (
                  <Button
                    variant="outline"
                    size="icon"
                    data-testid={`button-remove-variable1-category-${index}`}
                    onClick={() => removeVariable1Category(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {variable1Categories.length < 13 && (
              <Button
                variant="outline"
                className="w-full"
                data-testid="button-add-variable1-category"
                onClick={addVariable1Category}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4 border rounded-lg p-4">
        <div>
          <Label htmlFor="variable2Name">Variable 2 Name</Label>
          <Input
            id="variable2Name"
            data-testid="input-variable2-name"
            value={variable2Name}
            onChange={(e) => setVariable2Name(e.target.value)}
            placeholder="Enter variable 2 name"
          />
        </div>

        <div>
          <Label>Variable 2 Categories (Column Labels)</Label>
          <div className="space-y-2">
            {variable2Categories.map((cat, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  data-testid={`input-variable2-category-${index}`}
                  value={cat}
                  onChange={(e) => updateVariable2Category(index, e.target.value)}
                  placeholder={`Category ${index + 1}`}
                />
                {variable2Categories.length > 2 && (
                  <Button
                    variant="outline"
                    size="icon"
                    data-testid={`button-remove-variable2-category-${index}`}
                    onClick={() => removeVariable2Category(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {variable2Categories.length < 13 && (
              <Button
                variant="outline"
                className="w-full"
                data-testid="button-add-variable2-category"
                onClick={addVariable2Category}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <Button 
          className="w-full" 
          data-testid="button-save-configuration"
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
    <div className="space-y-4">
      <p className="text-sm text-gray-500 mb-4">
        Enter the observed frequencies for each combination of categories.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-gray-300 bg-gray-100 p-2 text-sm font-semibold">
                {variable1Name} / {variable2Name}
              </th>
              {variable2Categories.map((cat, index) => (
                <th key={index} className="border border-gray-300 bg-gray-100 p-2 text-sm font-semibold">
                  {cat}
                </th>
              ))}
              <th className="border border-gray-300 bg-blue-100 p-2 text-sm font-semibold">Row Total</th>
            </tr>
          </thead>
          <tbody>
            {variable1Categories.map((rowCat, rowIndex) => (
              <tr key={rowIndex}>
                <td className="border border-gray-300 bg-gray-100 p-2 text-sm font-semibold">
                  {rowCat}
                </td>
                {variable2Categories.map((colCat, colIndex) => (
                  <td key={colIndex} className="border border-gray-300 p-2">
                    <Input
                      data-testid={`input-frequency-${rowIndex}-${colIndex}`}
                      type="number"
                      min="0"
                      step="1"
                      value={getFrequency(rowIndex, colIndex) || ''}
                      onChange={(e) => updateFrequency(rowIndex, colIndex, e.target.value)}
                      className="w-full text-center"
                      placeholder="0"
                    />
                  </td>
                ))}
                <td className="border border-gray-300 bg-blue-50 p-2 text-center font-semibold">
                  {calculateRowTotal(rowIndex)}
                </td>
              </tr>
            ))}
            <tr>
              <td className="border border-gray-300 bg-blue-100 p-2 text-sm font-semibold">
                Column Total
              </td>
              {variable2Categories.map((_, colIndex) => (
                <td key={colIndex} className="border border-gray-300 bg-blue-50 p-2 text-center font-semibold">
                  {calculateColumnTotal(colIndex)}
                </td>
              ))}
              <td className="border border-gray-300 bg-blue-200 p-2 text-center font-bold">
                {calculateGrandTotal()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <Button 
          className="w-full" 
          data-testid="button-save-data"
          onClick={saveData}
          disabled={saveConfigMutation.isPending}
        >
          {saveConfigMutation.isPending ? "Saving..." : "Save Data"}
        </Button>
      </div>
    </div>
  );

  // Chart tab content (Heatmap)
  const chartContent = (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 mb-4">
        Visualize the observed frequencies as a heatmap.
      </p>

      {variable1Categories.length >= 2 && variable2Categories.length >= 2 && (
        <div className="w-full">
          <Plot
            data={[
              {
                z: variable1Categories.map((_, rowIndex) =>
                  variable2Categories.map((_, colIndex) => getFrequency(rowIndex, colIndex))
                ),
                x: variable2Categories,
                y: variable1Categories,
                type: 'heatmap',
                colorscale: 'Blues',
                hoverongaps: false,
                hovertemplate: '%{x}<br>%{y}<br>Frequency: %{z}<extra></extra>',
              },
            ]}
            layout={{
              title: {
                text: 'Observed Frequencies Heatmap'
              },
              xaxis: {
                title: { text: variable2Name },
                side: 'bottom'
              },
              yaxis: {
                title: { text: variable1Name }
              },
              autosize: true,
              margin: { l: 100, r: 50, t: 80, b: 100 },
            }}
            useResizeHandler
            style={{ width: '100%', height: '500px' }}
            config={{ responsive: true }}
          />
        </div>
      )}
    </div>
  );

  // Analysis tab content
  const analysisContent = (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 mb-4">
        Chi-square test results and interpretation.
      </p>

      {testResults ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Chi Square (χ²) Test Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-600">Variable 1: </Label>
                  <p className="text-lg font-semibold" data-testid="text-chi-square-variable1">
                    {variable1Name} <span className='text-sm'>({variable1Categories.length} categories)</span>
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Variable 2: </Label>
                  <p className="text-lg font-semibold" data-testid="text-chi-square-variable2">
                    {variable2Name} <span className='text-sm'>({variable2Categories.length} categories)</span>
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Chi-Square Statistic (χ²)</Label>
                  <p className="text-lg font-semibold" data-testid="text-chi-square-statistic">
                    {testResults.chiSquareStatistic.toFixed(4)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Degrees of Freedom</Label>
                  <p className="text-lg font-semibold" data-testid="text-degrees-of-freedom">
                    {testResults.degreesOfFreedom}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">p-value</Label>
                  <p className="text-lg font-semibold" data-testid="text-p-value">
                    {testResults.pValue.toFixed(6)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Chi Square Critical Value (χ²<sub>critical</sub>) (α = {significanceLevel})</Label>
                  <p className="text-lg font-semibold" data-testid="text-critical-value">
                    {testResults.criticalValue.toFixed(4)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Decision</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge
                variant="default"
                className={`mt-4 mb-4 p-2 font-medium text-sm text-center justify-center ${testResults.pValue < parseFloat(significanceLevel) ? "text-white bg-blue-500 " : "text-white bg-blue-500"}`}
                data-testid="badge-decision"
                title={
                  testResults.pValue < parseFloat(significanceLevel)
                    ? `Reject H₀. Accept Ha (P-Value ${testResults.pValue.toFixed(6)} < ${significanceLevel}). Categorical variables are dependent (association). At least one cell is significantly ≠ the other cells!`
                    : `Accept H₀. Reject Ha (P-Value ${testResults.pValue.toFixed(6)} ≥ ${significanceLevel}). Categorical variables are independent (no association). There are no significant differences between cells!`
                }
                >
                H₀: Categorical variables are independent (no association). There are no differences between cells<br></br>
                Ha: Categorical variables are dependent (association). At least one cell is ≠ the other cells<br></br>
                {testResults.pValue < parseFloat(significanceLevel)
                  ? `Result => Reject H₀. Accept Ha (P-Value ${testResults.pValue.toFixed(6)} < ${significanceLevel}). Categorical variables are dependent (association). At least one cell is significantly ≠ the other cells!`
                  : `Result => Accept H₀. Reject Ha (P-Value ${testResults.pValue.toFixed(6)} ≥ ${significanceLevel}). Categorical variables are independent (no association). There are no significant differences between cells!`}
                
              </Badge>
              <p className="text-sm text-gray-600 mt-2">
                {testResults.isSignificant
                  ? `The chi-square statistic (${testResults.chiSquareStatistic.toFixed(4)}) exceeds the critical value (${testResults.criticalValue.toFixed(4)}), indicating a statistically significant relationship between the variables.`
                  : `The chi-square statistic (${testResults.chiSquareStatistic.toFixed(4)}) does not exceed the critical value (${testResults.criticalValue.toFixed(4)}), suggesting no statistically significant relationship between the variables.`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Effect Size (Cramér's V)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <p className="text-lg font-semibold" data-testid="text-effect-size">
                  {testResults.effectSize.toFixed(4)}
                </p>
                <Badge variant="outline" data-testid="badge-effect-size-interpretation">
                  {getEffectSizeInterpretation(testResults.effectSize)}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Cramér's V measures the strength of association: 0.1 = Small, 0.3 = Medium, 0.5 = Large
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cell Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-600">
                  For each cell: Observed frequency, Expected frequency, Chi-square contribution, and Percentage. 
                  <span className="inline-flex items-center gap-1 ml-2">
                    <span className="inline-block w-3 h-3 bg-amber-200 border border-amber-400"></span>
                    <span className="text-xs">Top 3 contributors highlighted</span>
                  </span>
                </p>
                <div className="flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap">Percentage Type:</Label>
                  <Select value={percentageType} onValueChange={(value: any) => setPercentageType(value)}>
                    <SelectTrigger className="w-[180px]" data-testid="select-percentage-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="row">Row %</SelectItem>
                      <SelectItem value="column">Column %</SelectItem>
                      <SelectItem value="total">Total %</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border border-gray-300 bg-gray-100 p-2 text-sm font-semibold">
                        {variable1Name} / {variable2Name}
                      </th>
                      {variable2Categories.map((cat, index) => (
                        <th key={index} className="border border-gray-300 bg-gray-100 p-2 text-sm font-semibold">
                          {cat}
                        </th>
                      ))}
                      <th className="border border-gray-300 bg-blue-100 p-2 text-sm font-semibold">Row Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Calculate all contributions and find top 3
                      const allContributions: { row: number; col: number; value: number }[] = [];
                      variable1Categories.forEach((_, rowIndex) => {
                        variable2Categories.forEach((_, colIndex) => {
                          const observed = getFrequency(rowIndex, colIndex);
                          const expected = testResults.expectedFrequencies?.[rowIndex]?.[colIndex] ?? 0;
                          const contribution = expected > 0 ? Math.pow(observed - expected, 2) / expected : 0;
                          allContributions.push({ row: rowIndex, col: colIndex, value: contribution });
                        });
                      });
                      
                      // Sort and get top 3
                      const top3 = allContributions
                        .sort((a, b) => b.value - a.value)
                        .slice(0, 3)
                        .map(item => `${item.row}_${item.col}`);
                      
                      return variable1Categories.map((rowCat, rowIndex) => (
                        <tr key={rowIndex}>
                          <td className="border border-gray-300 bg-gray-100 p-2 text-sm font-semibold">
                            {rowCat}
                          </td>
                          {variable2Categories.map((colCat, colIndex) => {
                            const observed = getFrequency(rowIndex, colIndex);
                            const expected = testResults.expectedFrequencies?.[rowIndex]?.[colIndex] ?? 0;
                            const contribution = expected > 0 ? Math.pow(observed - expected, 2) / expected : 0;
                            const isTopContributor = top3.includes(`${rowIndex}_${colIndex}`);
                            const rank = top3.indexOf(`${rowIndex}_${colIndex}`) + 1;
                            
                            // Calculate percentage based on selected type
                            let percentage = 0;
                            if (percentageType === "row") {
                              const rowTotal = testResults.rowTotals?.[rowIndex] ?? 0;
                              percentage = rowTotal > 0 ? (observed / rowTotal) * 100 : 0;
                            } else if (percentageType === "column") {
                              const colTotal = testResults.columnTotals?.[colIndex] ?? 0;
                              percentage = colTotal > 0 ? (observed / colTotal) * 100 : 0;
                            } else {
                              const grandTotal = testResults.grandTotal ?? 0;
                              percentage = grandTotal > 0 ? (observed / grandTotal) * 100 : 0;
                            }
                            
                            return (
                              <td 
                                key={colIndex} 
                                className={`border border-gray-300 p-2 text-xs ${
                                  isTopContributor ? 'bg-amber-50 border-amber-400' : ''
                                }`}
                              >
                                <div className="flex flex-col gap-0.5">
                                  <div className="text-gray-700">
                                    <span className="font-semibold">O:</span> {observed}
                                  </div>
                                  <div className="text-gray-600">
                                    <span className="font-semibold">E:</span> {expected.toFixed(2)}
                                  </div>
                                  <div className={isTopContributor ? "text-amber-700 font-bold" : "text-blue-600"}>
                                    <span className="font-semibold">χ²:</span> {contribution.toFixed(3)}
                                    {isTopContributor && (
                                      <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0 bg-amber-200 text-amber-900">
                                        #{rank}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-green-700">
                                    <span className="font-semibold">%:</span> {percentage.toFixed(1)}%
                                  </div>
                                </div>
                              </td>
                            );
                          })}
                          <td className="border border-gray-300 bg-blue-50 p-2 text-center font-semibold">
                            {(testResults.rowTotals?.[rowIndex] ?? 0).toFixed(2)}
                          </td>
                        </tr>
                      ));
                    })()}
                    <tr>
                      <td className="border border-gray-300 bg-blue-100 p-2 text-sm font-semibold">
                        Column Total
                      </td>
                      {variable2Categories.map((_, colIndex) => (
                        <td key={colIndex} className="border border-gray-300 bg-blue-50 p-2 text-center font-semibold">
                          {(testResults.columnTotals?.[colIndex] ?? 0).toFixed(2)}
                        </td>
                      ))}
                      <td className="border border-gray-300 bg-blue-200 p-2 text-center font-bold">
                        {(testResults.grandTotal ?? 0).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-gray-500">
              Enter observed frequencies in the Data tab to see test results.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <Card data-component="chi-square-hypothesis-testing">
      <CardHeader>
        <CardTitle>Chi Square (test of independence) Hypothesis Testing</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">
          CTQ: {ctqName}
        </p>

        <HypothesisTestingTabs
          projectId={projectId}
          ctqId={ctqId}
          testType="chi-square"
          setupContent={setupContent}
          dataContent={dataContent}
          chartContent={chartContent}
          analysisContent={analysisContent}
        />
      </CardContent>
    </Card>
  );
}
