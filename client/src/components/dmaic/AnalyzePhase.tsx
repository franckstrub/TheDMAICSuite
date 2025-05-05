import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useAppContext } from "@/store/AppContext";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getParetoData } from "@/lib/statisticsUtils";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line, LineChart, ScatterPlot, ScatterChart, Scatter, ZAxis } from "recharts";
import MilestoneTimeline from "./MilestoneTimeline";

export default function AnalyzePhase() {
  const { user, currentProject } = useAppContext();
  const { toast } = useToast();
  const params = useParams<{ projectId?: string }>();
  const urlProjectId = params.projectId;
  
  // Use URL project ID if available, otherwise fall back to current project
  const projectId = urlProjectId ? parseInt(urlProjectId) : (currentProject?.id || 1);
  
  // State for milestone dates
  const [milestoneDates, setMilestoneDates] = useState({
    measurePhaseDate: null as string | null,
    analyzePhaseDate: null as string | null,
  });

  // Fetch project charter to get milestone dates
  const { data: charter } = useQuery({
    queryKey: [`/api/projects/${projectId}/charter`],
    enabled: !!user?.id && !!projectId,
    refetchOnWindowFocus: false
  });
  
  // Set milestone dates when charter data is fetched
  useEffect(() => {
    if (charter?.charter) {
      setMilestoneDates({
        measurePhaseDate: charter.charter.measure_phase_date || null,
        analyzePhaseDate: charter.charter.analyze_phase_date || null,
      });
    }
  }, [charter]);

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

  // Cause & Effect Analysis state
  const [problemStatement, setProblemStatement] = useState("High processing time for customer orders");
  const [peopleFactors, setPeopleFactors] = useState("Insufficient training\nLack of motivation\nHigh turnover rate");
  const [methodsFactors, setMethodsFactors] = useState("Complex procedures\nManual data entry\nRedundant approvals");
  const [materialsFactors, setMaterialsFactors] = useState("Poor quality forms\nMissing information\nIncorrect documentation");
  const [machinesFactors, setMachinesFactors] = useState("System outages\nSlow computer performance\nSoftware bugs");

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

  const handleGenerateFishbone = () => {
    toast({
      title: "Fishbone Diagram Generated",
      description: "The cause and effect diagram has been created.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Phase Milestone Timeline */}
      <div className="mb-4 flex flex-row gap-4">
        <Card className="w-1/2">
          <CardContent className="pt-6">
            <MilestoneTimeline 
              startDate={milestoneDates.measurePhaseDate}
              endDate={milestoneDates.analyzePhaseDate}
              label="Analyze Phase Milestone"
            />
          </CardContent>
        </Card>
        
        {/* Space for milestone progress card */}
        <div className="w-1/2"></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pareto Analysis */}
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
        
        {/* Hypothesis Testing */}
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
      </div>
      
      {/* Cause & Effect Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Cause & Effect Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Identify potential causes of a problem using a fishbone diagram.
          </p>
          
          <div className="mb-4">
            <Label htmlFor="problem-statement">Problem Statement</Label>
            <Input
              id="problem-statement"
              value={problemStatement}
              onChange={(e) => setProblemStatement(e.target.value)}
              placeholder="High processing time for customer orders"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="people-factors">People</Label>
              <Textarea
                id="people-factors"
                rows={3}
                value={peopleFactors}
                onChange={(e) => setPeopleFactors(e.target.value)}
                placeholder="Insufficient training&#10;Lack of motivation&#10;High turnover rate"
              />
            </div>
            <div>
              <Label htmlFor="methods-factors">Methods</Label>
              <Textarea
                id="methods-factors"
                rows={3}
                value={methodsFactors}
                onChange={(e) => setMethodsFactors(e.target.value)}
                placeholder="Complex procedures&#10;Manual data entry&#10;Redundant approvals"
              />
            </div>
            <div>
              <Label htmlFor="materials-factors">Materials</Label>
              <Textarea
                id="materials-factors"
                rows={3}
                value={materialsFactors}
                onChange={(e) => setMaterialsFactors(e.target.value)}
                placeholder="Poor quality forms&#10;Missing information&#10;Incorrect documentation"
              />
            </div>
            <div>
              <Label htmlFor="machines-factors">Machines</Label>
              <Textarea
                id="machines-factors"
                rows={3}
                value={machinesFactors}
                onChange={(e) => setMachinesFactors(e.target.value)}
                placeholder="System outages&#10;Slow computer performance&#10;Software bugs"
              />
            </div>
          </div>
          
          <div className="border border-gray-200 rounded-md bg-gray-50 h-64 flex items-center justify-center mb-4">
            <div className="text-center">
              <i className="fas fa-sitemap text-4xl text-gray-300 mb-4"></i>
              <p className="text-gray-500">Fishbone Diagram</p>
            </div>
          </div>
          
          <div>
            <Button onClick={handleGenerateFishbone}>
              Generate Fishbone Diagram
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Correlation Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Correlation Analysis</CardTitle>
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
    </div>
  );
}
