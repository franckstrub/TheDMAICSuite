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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import MilestoneTimeline from "./MilestoneTimeline";
import { ProgressCursor } from "./ProgressCursor";

export default function ImprovePhase() {
  const { user, currentProject } = useAppContext();
  const { toast } = useToast();
  const params = useParams<{ projectId?: string }>();
  const urlProjectId = params.projectId;
  
  // Use URL project ID if available, otherwise fall back to current project
  const projectId = urlProjectId ? parseInt(urlProjectId) : (currentProject?.id || 1);
  
  // State for milestone dates
  const [milestoneDates, setMilestoneDates] = useState({
    analyzePhaseDate: null as string | null,
    improvePhaseDate: null as string | null,
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
        analyzePhaseDate: charter.charter.analyze_phase_date || null,
        improvePhaseDate: charter.charter.improve_phase_date || null,
      });
    }
  }, [charter]);

  // Solution Generation state
  const [solutions, setSolutions] = useState([
    {
      solution: "Implement automated data validation",
      benefits: "Reduces documentation errors by 60%",
      effort: "Medium",
      cost: "$15,000",
      impact: "High"
    },
    {
      solution: "Redesign approval workflow",
      benefits: "Reduces approval time by 70%",
      effort: "Low",
      cost: "$5,000",
      impact: "High"
    },
    {
      solution: "Upgrade server infrastructure",
      benefits: "Reduces system downtime by 90%",
      effort: "High",
      cost: "$30,000",
      impact: "Medium"
    },
    {
      solution: "",
      benefits: "",
      effort: "Medium",
      cost: "",
      impact: "Medium"
    }
  ]);

  // Implementation Plan state
  const [implementationTasks, setImplementationTasks] = useState([
    {
      task: "Develop automated validation rules",
      responsible: "John Smith",
      startDate: "2023-05-15",
      endDate: "2023-06-15",
      status: "Completed",
      progress: 100
    },
    {
      task: "Map new approval workflow",
      responsible: "Jane Doe",
      startDate: "2023-06-01",
      endDate: "2023-06-15",
      status: "In Progress",
      progress: 75
    },
    {
      task: "Test new workflow with stakeholders",
      responsible: "Team Lead",
      startDate: "2023-06-16",
      endDate: "2023-06-30",
      status: "Not Started",
      progress: 0
    },
    {
      task: "",
      responsible: "",
      startDate: "",
      endDate: "",
      status: "Not Started",
      progress: 0
    }
  ]);

  // Pilot Test Results state
  const [pilotTestResults, setPilotTestResults] = useState({
    testDate: "2023-06-10",
    testScope: "Automated validation on 100 orders",
    metrics: [
      { metric: "Documentation Error Rate", before: "15%", after: "3%", improvement: "80%" },
      { metric: "Processing Time", before: "45 min", after: "12 min", improvement: "73%" },
      { metric: "Customer Satisfaction", before: "3.2/5", after: "4.5/5", improvement: "41%" }
    ],
    observations: "Significant improvement in processing speed. Some edge cases still need handling. Customer feedback highly positive.",
    recommendations: "Proceed with full implementation. Add additional validation rules for identified edge cases before rollout."
  });

  // Update solution
  const updateSolution = (index: number, field: string, value: string) => {
    const newSolutions = [...solutions];
    newSolutions[index] = { ...newSolutions[index], [field]: value };
    setSolutions(newSolutions);
  };

  // Add solution
  const addSolution = () => {
    if (solutions[solutions.length - 1].solution.trim() !== "") {
      setSolutions([
        ...solutions,
        {
          solution: "",
          benefits: "",
          effort: "Medium",
          cost: "",
          impact: "Medium"
        }
      ]);
    }
  };

  // Remove solution
  const removeSolution = (index: number) => {
    const newSolutions = [...solutions];
    newSolutions.splice(index, 1);
    setSolutions(newSolutions);
  };

  // Update implementation task
  const updateTask = (index: number, field: string, value: any) => {
    const newTasks = [...implementationTasks];
    newTasks[index] = { ...newTasks[index], [field]: value };
    setImplementationTasks(newTasks);
  };

  // Add implementation task
  const addTask = () => {
    if (implementationTasks[implementationTasks.length - 1].task.trim() !== "") {
      setImplementationTasks([
        ...implementationTasks,
        {
          task: "",
          responsible: "",
          startDate: "",
          endDate: "",
          status: "Not Started",
          progress: 0
        }
      ]);
    }
  };

  // Remove implementation task
  const removeTask = (index: number) => {
    const newTasks = [...implementationTasks];
    newTasks.splice(index, 1);
    setImplementationTasks(newTasks);
  };

  // Handle save actions
  const handleSaveSolutions = () => {
    toast({
      title: "Success",
      description: "Solutions have been saved successfully",
    });
  };

  const handleSaveImplementation = () => {
    toast({
      title: "Success",
      description: "Implementation plan has been saved successfully",
    });
  };

  const handleSavePilotResults = () => {
    toast({
      title: "Success",
      description: "Pilot test results have been saved successfully",
    });
  };

  return (
    <div className="space-y-6">
      {/* Phase Title with Progress Cursor */}
      <div className="flex items-center mb-2">
        <h2 className="text-2xl font-bold">Improve Phase</h2>
        <ProgressCursor status={currentProject?.phases?.improve?.status || 'not-started'} />
      </div>
      
      {/* Phase Milestone Timeline */}
      <div className="mb-4 flex flex-row gap-4">
        <Card className="w-1/2">
          <CardContent className="pt-6">
            <MilestoneTimeline 
              startDate={milestoneDates.analyzePhaseDate}
              endDate={milestoneDates.improvePhaseDate}
              label="Improve Phase Timeline"
            />
          </CardContent>
        </Card>
        
        {/* Space for milestone progress card */}
        <div className="w-1/2"></div>
      </div>
      
      {/* Solution Generation */}
      <Card>
        <CardHeader>
          <CardTitle>Solution Generation & Prioritization</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Generate and prioritize potential solutions based on impact, effort, and cost.
          </p>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Solution</TableHead>
                  <TableHead>Benefits</TableHead>
                  <TableHead>Implementation Effort</TableHead>
                  <TableHead>Estimated Cost</TableHead>
                  <TableHead>Impact</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {solutions.map((solution, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        type="text"
                        value={solution.solution}
                        onChange={(e) => updateSolution(index, "solution", e.target.value)}
                        placeholder={index === solutions.length - 1 ? "Add new solution..." : ""}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={solution.benefits}
                        onChange={(e) => updateSolution(index, "benefits", e.target.value)}
                        placeholder="List benefits..."
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={solution.effort}
                        onValueChange={(value) => updateSolution(index, "effort", value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select effort" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={solution.cost}
                        onChange={(e) => updateSolution(index, "cost", e.target.value)}
                        placeholder="Estimated cost"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={solution.impact}
                        onValueChange={(value) => updateSolution(index, "impact", value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select impact" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {index === solutions.length - 1 && solution.solution ? (
                        <Button variant="ghost" size="sm" onClick={addSolution}>
                          <i className="fas fa-plus"></i>
                        </Button>
                      ) : index === solutions.length - 1 ? (
                        <Button variant="ghost" size="sm" disabled className="text-gray-400">
                          <i className="fas fa-plus"></i>
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => removeSolution(index)} className="text-red-500 hover:text-red-700">
                          <i className="fas fa-trash"></i>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-4">
            <Button onClick={handleSaveSolutions}>
              Save Solutions
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Implementation Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Develop a detailed plan for implementing the selected solutions.
          </p>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Responsible</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {implementationTasks.map((task, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        type="text"
                        value={task.task}
                        onChange={(e) => updateTask(index, "task", e.target.value)}
                        placeholder={index === implementationTasks.length - 1 ? "Add new task..." : ""}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={task.responsible}
                        onChange={(e) => updateTask(index, "responsible", e.target.value)}
                        placeholder="Assign to..."
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={task.startDate}
                        onChange={(e) => updateTask(index, "startDate", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={task.endDate}
                        onChange={(e) => updateTask(index, "endDate", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={task.status}
                        onValueChange={(value) => updateTask(index, "status", value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Not Started">Not Started</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={task.progress}
                        onChange={(e) => updateTask(index, "progress", parseInt(e.target.value))}
                      />
                      <div className="w-full h-2 bg-gray-200 rounded-full mt-1">
                        <div 
                          className="h-2 bg-primary rounded-full" 
                          style={{ width: `${task.progress}%` }}
                        ></div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {index === implementationTasks.length - 1 && task.task ? (
                        <Button variant="ghost" size="sm" onClick={addTask}>
                          <i className="fas fa-plus"></i>
                        </Button>
                      ) : index === implementationTasks.length - 1 ? (
                        <Button variant="ghost" size="sm" disabled className="text-gray-400">
                          <i className="fas fa-plus"></i>
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => removeTask(index)} className="text-red-500 hover:text-red-700">
                          <i className="fas fa-trash"></i>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-4">
            <Button onClick={handleSaveImplementation}>
              Save Implementation Plan
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Pilot Test Results */}
      <Card>
        <CardHeader>
          <CardTitle>Pilot Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Document and analyze the results of pilot testing the solutions.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <Label htmlFor="test-date">Test Date</Label>
              <Input
                id="test-date"
                type="date"
                value={pilotTestResults.testDate}
                onChange={(e) => setPilotTestResults({ ...pilotTestResults, testDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="test-scope">Test Scope</Label>
              <Input
                id="test-scope"
                value={pilotTestResults.testScope}
                onChange={(e) => setPilotTestResults({ ...pilotTestResults, testScope: e.target.value })}
                placeholder="Describe the scope of the pilot test..."
              />
            </div>
          </div>
          
          <Label>Key Metrics Comparison</Label>
          <div className="overflow-x-auto mt-2 mb-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead>Before</TableHead>
                  <TableHead>After</TableHead>
                  <TableHead>Improvement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pilotTestResults.metrics.map((metric, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        value={metric.metric}
                        onChange={(e) => {
                          const newMetrics = [...pilotTestResults.metrics];
                          newMetrics[index].metric = e.target.value;
                          setPilotTestResults({ ...pilotTestResults, metrics: newMetrics });
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={metric.before}
                        onChange={(e) => {
                          const newMetrics = [...pilotTestResults.metrics];
                          newMetrics[index].before = e.target.value;
                          setPilotTestResults({ ...pilotTestResults, metrics: newMetrics });
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={metric.after}
                        onChange={(e) => {
                          const newMetrics = [...pilotTestResults.metrics];
                          newMetrics[index].after = e.target.value;
                          setPilotTestResults({ ...pilotTestResults, metrics: newMetrics });
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={metric.improvement}
                        onChange={(e) => {
                          const newMetrics = [...pilotTestResults.metrics];
                          newMetrics[index].improvement = e.target.value;
                          setPilotTestResults({ ...pilotTestResults, metrics: newMetrics });
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <Label htmlFor="observations">Observations</Label>
              <Textarea
                id="observations"
                rows={4}
                value={pilotTestResults.observations}
                onChange={(e) => setPilotTestResults({ ...pilotTestResults, observations: e.target.value })}
                placeholder="Document observations from the pilot test..."
              />
            </div>
            <div>
              <Label htmlFor="recommendations">Recommendations</Label>
              <Textarea
                id="recommendations"
                rows={4}
                value={pilotTestResults.recommendations}
                onChange={(e) => setPilotTestResults({ ...pilotTestResults, recommendations: e.target.value })}
                placeholder="Provide recommendations based on pilot results..."
              />
            </div>
          </div>
          
          <Button onClick={handleSavePilotResults}>
            Save Pilot Test Results
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
