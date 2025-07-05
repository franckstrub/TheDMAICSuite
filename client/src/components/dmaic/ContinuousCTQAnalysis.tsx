import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Table2, AlertTriangle, BarChart3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line, LineChart, ScatterChart, Scatter, ZAxis } from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getParetoData } from "@/lib/statisticsUtils";

interface CTQAnalysisData {
  id?: number;
  ctq: string;
  ctqId?: number; // Foreign key to CTS characteristics
  // Boolean enablers for each analysis type
  enableContYHypothesisTest?: boolean;
  enableContYSimpleRegression?: boolean;
  enableContYANOVA2way?: boolean;
  enableContYMultipleRegression?: boolean;
  enableContYDOE?: boolean;
  enablePareto?: boolean;
}

interface ContinuousCTQAnalysisProps {
  projectId: number;
  ctqId: number;
  ctqName: string;
  onSave?: (data: string) => void;
}

export default function ContinuousCTQAnalysis({ projectId, ctqId, ctqName, onSave }: ContinuousCTQAnalysisProps) {
  const { toast } = useToast();
  // Pareto Analysis state
  const [selectedData, setSelectedData] = useState("Delay Causes");
  
  // Sample Pareto data
  const rawParetoData = [
    { category: "Documentation Errors", count: 42 },
    { category: "System Downtime", count: 27 },
    { category: "Approval Delays", count: 25 },
    { category: "Others", count: 26 },
  ];
  
  const paretoData = getParetoData(
    rawParetoData.map(d => d.category),
    rawParetoData.map(d => d.count)
  );

  // Hypothesis Testing state
  const [testType, setTestType] = useState("Paired t-Test");
  const [variable1, setVariable1] = useState("Processing Time (Before)");
  const [variable2, setVariable2] = useState("Processing Time (After)");
  const [significanceLevel, setSignificanceLevel] = useState("0.05");
  const [alternative, setAlternative] = useState("Less than");
  const [testResult, setTestResult] = useState({
    tStatistic: -3.45,
    pValue: 0.002,
    conclusion: "Reject null hypothesis",
    explanation: "There is a statistically significant difference between the before and after measurements."
  });

  // Correlation Analysis state
  const [correlationVar1, setCorrelationVar1] = useState("Processing Time");
  const [correlationVar2, setCorrelationVar2] = useState("Order Volume");
  const [correlationValue, setCorrelationValue] = useState(0.78);

  // Sample scatter plot data
  const scatterData = Array.from({ length: 30 }, (_, i) => ({
    x: 5 + Math.random() * 15,
    y: 10 + 0.78 * i + Math.random() * 10 - 5,
  }));

  const handleRunTest = () => {
    toast({
      title: "Test Run Successfully",
      description: "The hypothesis test has been executed.",
    });
  };

  {/*const handleGenerateFishbone = () => {
    toast({
      title: "Fishbone Diagram Generated",
      description: "The cause and effect diagram has been created.",
    });
  }; */}
  const [ctqAnalysisData, setCTQAnalysisData] = useState<{ [ctqId: number]: CTQAnalysisData }>({});
  
  const updateCTQAnalysisField = (ctqId: number, field: keyof CTQAnalysisData, value: any) => {
    setCTQAnalysisData(prev => {
      const updated = {
        ...prev,
        [ctqId]: {
          ...prev[ctqId],
          [field]: value,
        },
      };
      return updated;
    });
  };

  const handleSaveAnalysis = () => {
    if (onSave) {
      onSave(JSON.stringify(ctqAnalysisData));
    }
  };

  return (
    <div className="w-full mt-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Continuous CTQ Graphical & Statistical Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            CTQ: {ctqName}
          </p>
          <div>
            <label className="block text-sm font-medium mb-3">
              Continuous CTQ Analysis Types (Select Multiple)
            </label>
            <div className="max-w-4xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`${ctqId}-ContYHypothesisTest`}
                    checked={ctqAnalysisData[ctqId]?.enableContYHypothesisTest || false}
                    onCheckedChange={(checked) => updateCTQAnalysisField(ctqId, "enableContYHypothesisTest", checked)}
                  />
                  <Label htmlFor={`${ctqId}-ContYHypothesisTest`} className="text-sm font-medium text-gray-700">
                    Continuous Y Hypothesis Testing
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`${ctqId}-ContYSimpleRegression`}
                    checked={ctqAnalysisData[ctqId]?.enableContYSimpleRegression || false}
                    onCheckedChange={(checked) => updateCTQAnalysisField(ctqId, "enableContYSimpleRegression", checked)}
                  />
                  <Label htmlFor={`${ctqId}-ContYSimpleRegression`} className="text-sm font-medium text-gray-700">
                    Continuous Y Simple Regression
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`${ctqId}-ContYANOVA2way`}
                    checked={ctqAnalysisData[ctqId]?.enableContYANOVA2way || false}
                    onCheckedChange={(checked) => updateCTQAnalysisField(ctqId, "enableContYANOVA2way", checked)}
                  />
                  <Label htmlFor={`${ctqId}-ContYANOVA2way`} className="text-sm font-medium text-gray-700">
                    Continuous Y ANOVA Two-way
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`${ctqId}-ContYMultipleRegression`}
                    checked={ctqAnalysisData[ctqId]?.enableContYMultipleRegression || false}
                    onCheckedChange={(checked) => updateCTQAnalysisField(ctqId, "enableContYMultipleRegression", checked)}
                  />
                  <Label htmlFor={`${ctqId}-ContYMultipleRegression`} className="text-sm font-medium text-gray-700">
                    Continuous Y Multiple Regression
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`${ctqId}-ContYDOE`}
                    checked={ctqAnalysisData[ctqId]?.enableContYDOE || false}
                    onCheckedChange={(checked) => updateCTQAnalysisField(ctqId, "enableContYDOE", checked)}
                  />
                  <Label htmlFor={`${ctqId}-ContYDOE`} className="text-sm font-medium text-gray-700">
                    Continuous Y DOE (Design of Experiment)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`${ctqId}-pareto`}
                    checked={ctqAnalysisData[ctqId]?.enablePareto || false}
                    onCheckedChange={(checked) => updateCTQAnalysisField(ctqId, "enablePareto", checked)}
                  />
                  <Label htmlFor={`${ctqId}-pareto`} className="text-sm font-medium text-gray-700">
                    Pareto Analysis
                  </Label>
                </div>
              </div>
            </div>
          </div>
          
          {/* Show selected analysis types */}
          
          {(ctqAnalysisData[ctqId]?.enableContYHypothesisTest || 
            ctqAnalysisData[ctqId]?.enableContYSimpleRegression || 
            ctqAnalysisData[ctqId]?.enableContYANOVA2way || 
            ctqAnalysisData[ctqId]?.enableContYMultipleRegression || 
            ctqAnalysisData[ctqId]?.enableContYDOE || 
            ctqAnalysisData[ctqId]?.enablePareto) && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Selected Analysis Types:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {ctqAnalysisData[ctqId]?.enableContYHypothesisTest && (
                  <li>• Continuous Y Hypothesis Testing Analysis</li>
                )}
                {ctqAnalysisData[ctqId]?.enableContYSimpleRegression && (
                  <li>• Continuous Y Simple Regression Analysis</li>
                )}
                {ctqAnalysisData[ctqId]?.enableContYANOVA2way && (
                  <li>• Continuous Y ANOVA Two-way Analysis</li>
                )}
                {ctqAnalysisData[ctqId]?.enableContYMultipleRegression && (
                  <li>• Continuous Y Multiple Regression Analysis</li>
                )}
                {ctqAnalysisData[ctqId]?.enableContYDOE && (
                  <li>• Continuous Y DOE (Design of Experiment) Analysis</li>
                )}
                {ctqAnalysisData[ctqId]?.enablePareto && (
                  <li>• Pareto Analysis</li>
                )}
              </ul>
            </div>
          )}
          
          <div className="mt-6 flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setCTQAnalysisData({})}
            >
              Clear All
            </Button>
            <Button 
              onClick={handleSaveAnalysis}
              disabled={!ctqAnalysisData[ctqId] || Object.keys(ctqAnalysisData[ctqId]).length === 0}
            >
              Save Analysis Configuration
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        {/* Hypothesis Testing */}
         {ctqAnalysisData[ctqId]?.enableContYHypothesisTest && (
          <Card>
          <CardHeader>
            <CardTitle>Hypothesis Testing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Validate assumptions and determine if differences are statistically significant.
            </p>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="test-type">Test Type</Label>
                <Select defaultValue={testType} onValueChange={setTestType}>
                  <SelectTrigger id="test-type">
                    <SelectValue placeholder="Select test type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="One Sample t-Test">One Sample t-Test</SelectItem>
                    <SelectItem value="Two Sample t-Test">Two Sample t-Test</SelectItem>
                    <SelectItem value="Paired t-Test">Paired t-Test</SelectItem>
                    <SelectItem value="ANOVA">ANOVA</SelectItem>
                    <SelectItem value="Chi-Square">Chi-Square</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="variables">Select Variables</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Select defaultValue={variable1} onValueChange={setVariable1}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select first variable" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Processing Time (Before)">Processing Time (Before)</SelectItem>
                      <SelectItem value="Defect Rate (Before)">Defect Rate (Before)</SelectItem>
                      <SelectItem value="Cycle Time (Before)">Cycle Time (Before)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select defaultValue={variable2} onValueChange={setVariable2}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select second variable" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Processing Time (After)">Processing Time (After)</SelectItem>
                      <SelectItem value="Defect Rate (After)">Defect Rate (After)</SelectItem>
                      <SelectItem value="Cycle Time (After)">Cycle Time (After)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="significance">Significance Level (α)</Label>
                  <Select defaultValue={significanceLevel} onValueChange={setSignificanceLevel}>
                    <SelectTrigger id="significance">
                      <SelectValue placeholder="Select significance level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.01">0.01</SelectItem>
                      <SelectItem value="0.05">0.05</SelectItem>
                      <SelectItem value="0.10">0.10</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="alternative">Alternative Hypothesis</Label>
                  <Select defaultValue={alternative} onValueChange={setAlternative}>
                    <SelectTrigger id="alternative">
                      <SelectValue placeholder="Select alternative" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Two-sided">Two-sided</SelectItem>
                      <SelectItem value="Less than">Less than</SelectItem>
                      <SelectItem value="Greater than">Greater than</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Button className="w-full" onClick={handleRunTest}>
                  Run Test
                </Button>
              </div>
              <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
                <h4 className="font-medium text-sm mb-2">Results</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-600">t-statistic:</div>
                  <div className="font-medium">{testResult.tStatistic}</div>
                  <div className="text-gray-600">p-value:</div>
                  <div className="font-medium text-green-600">{testResult.pValue}</div>
                  <div className="text-gray-600">Conclusion:</div>
                  <div className="font-medium text-green-600">{testResult.conclusion}</div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {testResult.explanation}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        )}
      
        {/* Simple Rewgression Analysis */}
        {ctqAnalysisData[ctqId]?.enableContYSimpleRegression && (
        <Card className="mt-4">
        <CardHeader>
          <CardTitle>Simple Regression Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Identify relationships between variables.
          </p>
          
          <div className="mb-4">
            <Label htmlFor="correlation-variables">Select Variables</Label>
            <div className="grid grid-cols-2 gap-4">
              <Select defaultValue={correlationVar1} onValueChange={setCorrelationVar1}>
                <SelectTrigger>
                  <SelectValue placeholder="Select first variable" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Processing Time">Processing Time</SelectItem>
                  <SelectItem value="Order Volume">Order Volume</SelectItem>
                  <SelectItem value="Staff Count">Staff Count</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue={correlationVar2} onValueChange={setCorrelationVar2}>
                <SelectTrigger>
                  <SelectValue placeholder="Select second variable" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Processing Time">Processing Time</SelectItem>
                  <SelectItem value="Order Volume">Order Volume</SelectItem>
                  <SelectItem value="Staff Count">Staff Count</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="h-64 border border-gray-200 rounded-md mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
              >
                <CartesianGrid />
                <XAxis type="number" dataKey="x" name={correlationVar1} />
                <YAxis type="number" dataKey="y" name={correlationVar2} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter name="Data Points" data={scatterData} fill="#8884d8" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-700">Correlation Coefficient</p>
              <p className="text-xl font-semibold">{correlationValue}</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-700">Relationship</p>
              <p className="text-xl font-semibold text-blue-600">Strong Positive</p>
            </div>
          </div>
        </CardContent>
        </Card>
        )}

        {/* ANOVA 2-Way Analysis */}
        {ctqAnalysisData[ctqId]?.enableContYANOVA2way && (
          <Card>
          <CardHeader>
            <CardTitle>ANOVA 2-Way Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Validate assumptions of strong relationship and determine if correlation are statistically significant. Calulate the simple Regression Models - linear - quadratic - cubic.
            </p>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="test-type">Test Type</Label>
                <Select defaultValue={testType} onValueChange={setTestType}>
                  <SelectTrigger id="test-type">
                    <SelectValue placeholder="Select test type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="One Sample t-Test">One Sample t-Test</SelectItem>
                    <SelectItem value="Two Sample t-Test">Two Sample t-Test</SelectItem>
                    <SelectItem value="Paired t-Test">Paired t-Test</SelectItem>
                    <SelectItem value="ANOVA">ANOVA</SelectItem>
                    <SelectItem value="Chi-Square">Chi-Square</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="variables">Select Variables</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Select defaultValue={variable1} onValueChange={setVariable1}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select first variable" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Processing Time (Before)">Processing Time (Before)</SelectItem>
                      <SelectItem value="Defect Rate (Before)">Defect Rate (Before)</SelectItem>
                      <SelectItem value="Cycle Time (Before)">Cycle Time (Before)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select defaultValue={variable2} onValueChange={setVariable2}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select second variable" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Processing Time (After)">Processing Time (After)</SelectItem>
                      <SelectItem value="Defect Rate (After)">Defect Rate (After)</SelectItem>
                      <SelectItem value="Cycle Time (After)">Cycle Time (After)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="significance">Significance Level (α)</Label>
                  <Select defaultValue={significanceLevel} onValueChange={setSignificanceLevel}>
                    <SelectTrigger id="significance">
                      <SelectValue placeholder="Select significance level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.01">0.01</SelectItem>
                      <SelectItem value="0.05">0.05</SelectItem>
                      <SelectItem value="0.10">0.10</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="alternative">Alternative Hypothesis</Label>
                  <Select defaultValue={alternative} onValueChange={setAlternative}>
                    <SelectTrigger id="alternative">
                      <SelectValue placeholder="Select alternative" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Two-sided">Two-sided</SelectItem>
                      <SelectItem value="Less than">Less than</SelectItem>
                      <SelectItem value="Greater than">Greater than</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Button className="w-full" onClick={handleRunTest}>
                  Run Test
                </Button>
              </div>
              <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
                <h4 className="font-medium text-sm mb-2">Results</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-600">t-statistic:</div>
                  <div className="font-medium">{testResult.tStatistic}</div>
                  <div className="text-gray-600">p-value:</div>
                  <div className="font-medium text-green-600">{testResult.pValue}</div>
                  <div className="text-gray-600">Conclusion:</div>
                  <div className="font-medium text-green-600">{testResult.conclusion}</div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {testResult.explanation}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Multiple Regression Analysis */}
        {ctqAnalysisData[ctqId]?.enableContYMultipleRegression && (
          <Card>
          <CardHeader>
            <CardTitle>Multiple Regression Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Validate assumptions of strong relationship and determine if correlation are statistically significant. Calulate the simple Regression Models - linear - quadratic - cubic.
            </p>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="test-type">Test Type</Label>
                <Select defaultValue={testType} onValueChange={setTestType}>
                  <SelectTrigger id="test-type">
                    <SelectValue placeholder="Select test type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="One Sample t-Test">One Sample t-Test</SelectItem>
                    <SelectItem value="Two Sample t-Test">Two Sample t-Test</SelectItem>
                    <SelectItem value="Paired t-Test">Paired t-Test</SelectItem>
                    <SelectItem value="ANOVA">ANOVA</SelectItem>
                    <SelectItem value="Chi-Square">Chi-Square</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="variables">Select Variables</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Select defaultValue={variable1} onValueChange={setVariable1}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select first variable" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Processing Time (Before)">Processing Time (Before)</SelectItem>
                      <SelectItem value="Defect Rate (Before)">Defect Rate (Before)</SelectItem>
                      <SelectItem value="Cycle Time (Before)">Cycle Time (Before)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select defaultValue={variable2} onValueChange={setVariable2}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select second variable" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Processing Time (After)">Processing Time (After)</SelectItem>
                      <SelectItem value="Defect Rate (After)">Defect Rate (After)</SelectItem>
                      <SelectItem value="Cycle Time (After)">Cycle Time (After)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="significance">Significance Level (α)</Label>
                  <Select defaultValue={significanceLevel} onValueChange={setSignificanceLevel}>
                    <SelectTrigger id="significance">
                      <SelectValue placeholder="Select significance level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.01">0.01</SelectItem>
                      <SelectItem value="0.05">0.05</SelectItem>
                      <SelectItem value="0.10">0.10</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="alternative">Alternative Hypothesis</Label>
                  <Select defaultValue={alternative} onValueChange={setAlternative}>
                    <SelectTrigger id="alternative">
                      <SelectValue placeholder="Select alternative" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Two-sided">Two-sided</SelectItem>
                      <SelectItem value="Less than">Less than</SelectItem>
                      <SelectItem value="Greater than">Greater than</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Button className="w-full" onClick={handleRunTest}>
                  Run Test
                </Button>
              </div>
              <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
                <h4 className="font-medium text-sm mb-2">Results</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-600">t-statistic:</div>
                  <div className="font-medium">{testResult.tStatistic}</div>
                  <div className="text-gray-600">p-value:</div>
                  <div className="font-medium text-green-600">{testResult.pValue}</div>
                  <div className="text-gray-600">Conclusion:</div>
                  <div className="font-medium text-green-600">{testResult.conclusion}</div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {testResult.explanation}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {/* DOE Analysis */}
        {ctqAnalysisData[ctqId]?.enableContYDOE && (
          <Card>
          <CardHeader>
            <CardTitle>DOE (Design of Experiment) Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Validate assumptions of strong relationship and determine if correlation are statistically significant. Calulate the simple Regression Models - linear - quadratic - cubic.
            </p>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="test-type">Test Type</Label>
                <Select defaultValue={testType} onValueChange={setTestType}>
                  <SelectTrigger id="test-type">
                    <SelectValue placeholder="Select test type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="One Sample t-Test">One Sample t-Test</SelectItem>
                    <SelectItem value="Two Sample t-Test">Two Sample t-Test</SelectItem>
                    <SelectItem value="Paired t-Test">Paired t-Test</SelectItem>
                    <SelectItem value="ANOVA">ANOVA</SelectItem>
                    <SelectItem value="Chi-Square">Chi-Square</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="variables">Select Variables</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Select defaultValue={variable1} onValueChange={setVariable1}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select first variable" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Processing Time (Before)">Processing Time (Before)</SelectItem>
                      <SelectItem value="Defect Rate (Before)">Defect Rate (Before)</SelectItem>
                      <SelectItem value="Cycle Time (Before)">Cycle Time (Before)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select defaultValue={variable2} onValueChange={setVariable2}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select second variable" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Processing Time (After)">Processing Time (After)</SelectItem>
                      <SelectItem value="Defect Rate (After)">Defect Rate (After)</SelectItem>
                      <SelectItem value="Cycle Time (After)">Cycle Time (After)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="significance">Significance Level (α)</Label>
                  <Select defaultValue={significanceLevel} onValueChange={setSignificanceLevel}>
                    <SelectTrigger id="significance">
                      <SelectValue placeholder="Select significance level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.01">0.01</SelectItem>
                      <SelectItem value="0.05">0.05</SelectItem>
                      <SelectItem value="0.10">0.10</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="alternative">Alternative Hypothesis</Label>
                  <Select defaultValue={alternative} onValueChange={setAlternative}>
                    <SelectTrigger id="alternative">
                      <SelectValue placeholder="Select alternative" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Two-sided">Two-sided</SelectItem>
                      <SelectItem value="Less than">Less than</SelectItem>
                      <SelectItem value="Greater than">Greater than</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Button className="w-full" onClick={handleRunTest}>
                  Run Test
                </Button>
              </div>
              <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
                <h4 className="font-medium text-sm mb-2">Results</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-600">t-statistic:</div>
                  <div className="font-medium">{testResult.tStatistic}</div>
                  <div className="text-gray-600">p-value:</div>
                  <div className="font-medium text-green-600">{testResult.pValue}</div>
                  <div className="text-gray-600">Conclusion:</div>
                  <div className="font-medium text-green-600">{testResult.conclusion}</div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {testResult.explanation}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        )}
       
      {/* Pareto Analysis */}
      {ctqAnalysisData[ctqId]?.enablePareto && (
        <Card>
        <CardHeader>
          <CardTitle>Pareto Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Identify the vital few causes that account for the majority of problems.
          </p>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="data-select">Select Data</Label>
              <Select defaultValue={selectedData} onValueChange={setSelectedData}>
                <SelectTrigger id="data-select">
                  <SelectValue placeholder="Select data" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Process Defects">Process Defects</SelectItem>
                  <SelectItem value="Customer Complaints">Customer Complaints</SelectItem>
                  <SelectItem value="Delay Causes">Delay Causes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="h-64 border border-gray-200 rounded-md">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rawParetoData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis yAxisId="left" orientation="left" />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="count" fill="#8884d8" name="Count" />
                  <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke="#ff7300" name="Cumulative %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cumulative %</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rawParetoData.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 text-sm">{item.category}</td>
                      <td className="px-4 py-2 text-sm">{item.count}</td>
                      <td className="px-4 py-2 text-sm">
                        {(item.count / rawParetoData.reduce((sum, i) => sum + i.count, 0) * 100).toFixed(1)}%
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {paretoData.cumulativePercentages[index] ? paretoData.cumulativePercentages[index].toFixed(1) + "%" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
      )}
      </div>        
    </div>
  );
}