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
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from "recharts";
import { BarChart3, Save, Plus, Trash2, Calculator, Undo2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TrainingPlan from '@/components/dmaic/TrainingPlan';
import WorkInstructions from '@/components/dmaic/WorkInstructions';
{/*import LessonsLearned from '@/components/dmaic/LessonsLearned';
import ControlPlan from '@/components/dmaic/ControlPlan';      
import SPC from '@/components/dmaic/SPC';
import AuditPlan from '@/components/dmaic/AuditPlan';      
import TransferToPO from '@/components/dmaic/TransferToPO';
import FinancialBenefitsValidation from '@/components/dmaic/FinancialBenefitsValidation';*/}
import ControlGateReviewValidation from '@/components/dmaic/ControlGateReviewValidation';

interface CtqWithType {
  ctq: string;
  ctqType: "Attribute" | "Continuous";
}

interface Charter {
  id: number;
  projectId: number;
  projectTitle?: string;
  projectType?: string;
  projectLeader?: string;
  sponsor?: string;
  financialController?: string;
  projectCoach?: string;
  analyze_phase_date?: string | null;
  improve_phase_date?: string | null;
}

interface CharterResponse {
  charter: Charter;
}

export default function ControlPhase() {
  const { user, currentProject } = useAppContext();
  const { toast } = useToast();
  const params = useParams<{ projectId?: string }>();
  const urlProjectId = params.projectId;
  
  // Use URL project ID if available, otherwise fall back to current project
  const projectId = urlProjectId ? parseInt(urlProjectId) : (currentProject?.id || 1);
  
  // State for milestone dates
  const [milestoneDates, setMilestoneDates] = useState({
    improvePhaseDate: null as string | null,
    controlPhaseDate: null as string | null,
  });

  // Fetch project charter to get milestone dates
  const { data: charter } = useQuery({
    queryKey: [`/api/projects/${projectId}/charter`],
    enabled: !!user?.id && !!projectId,
    refetchOnWindowFocus: false
  });

   // Get project type from charter
  const projectType = charter?.charter?.projectType || 'Green Belt';
  
  // Set milestone dates when charter data is fetched
  useEffect(() => {
    if (charter?.charter) {
      setMilestoneDates({
        improvePhaseDate: charter.charter.improve_phase_date || null,
        controlPhaseDate: charter.charter.control_phase_date || null,
      });
    }
  }, [charter]);

  // Control Plan state
  const [controlPlan, setControlPlan] = useState([
    {
      process: "Order Processing",
      metric: "Processing Time",
      specification: "< 30 minutes",
      measurement: "System log timestamp",
      frequency: "Every order",
      responsible: "Process Team",
      reaction: "Alert supervisor if > 45 minutes"
    },
    {
      process: "Document Validation",
      metric: "Error Rate",
      specification: "< 5%",
      measurement: "Manual audit",
      frequency: "Daily sample (20 orders)",
      responsible: "Quality Team",
      reaction: "Retrain staff if > 8%"
    },
    {
      process: "",
      metric: "",
      specification: "",
      measurement: "",
      frequency: "",
      responsible: "",
      reaction: ""
    }
  ]);

  // SPC Data state
  const [selectedMetric, setSelectedMetric] = useState("Processing Time");
  
  // Sample SPC data
  const spcData = [
    { date: "Week 1", value: 42, ucl: 60, lcl: 20, centerLine: 40 },
    { date: "Week 2", value: 38, ucl: 60, lcl: 20, centerLine: 40 },
    { date: "Week 3", value: 45, ucl: 60, lcl: 20, centerLine: 40 },
    { date: "Week 4", value: 37, ucl: 60, lcl: 20, centerLine: 40 },
    { date: "Week 5", value: 41, ucl: 60, lcl: 20, centerLine: 40 },
    { date: "Week 6", value: 52, ucl: 60, lcl: 20, centerLine: 40 },
    { date: "Week 7", value: 35, ucl: 60, lcl: 20, centerLine: 40 },
    { date: "Week 8", value: 39, ucl: 60, lcl: 20, centerLine: 40 },
  ];

  // Update control plan
  const updateControlPlan = (index: number, field: string, value: string) => {
    const newPlan = [...controlPlan];
    newPlan[index] = { ...newPlan[index], [field]: value };
    setControlPlan(newPlan);
  };

  // Add control plan item
  const addControlPlanItem = () => {
    if (controlPlan[controlPlan.length - 1].process.trim() !== "") {
      setControlPlan([
        ...controlPlan,
        {
          process: "",
          metric: "",
          specification: "",
          measurement: "",
          frequency: "",
          responsible: "",
          reaction: ""
        }
      ]);
    }
  };

  // Remove control plan item
  const removeControlPlanItem = (index: number) => {
    const newPlan = [...controlPlan];
    newPlan.splice(index, 1);
    setControlPlan(newPlan);
  };

  // Handle save actions
  const handleSaveControlPlan = () => {
    toast({
      title: "Success",
      description: "Control plan has been saved successfully",
    });
  };

  const handleDownloadSPC = () => {
    toast({
      title: "Success",
      description: "SPC chart data has been downloaded",
    });
  };

  return (
    <div className="space-y-6">
      {/* Phase Milestone Timeline */}
      <div className="mb-4 flex flex-row gap-4">
        <Card className="w-1/2">
          <CardContent className="pt-6">
            <MilestoneTimeline 
              startDate={milestoneDates.improvePhaseDate}
              endDate={milestoneDates.controlPhaseDate}
              label="Control Phase Timeline"
            />
          </CardContent>
        </Card>
        
        {/* Space for milestone progress card */}
        <div className="w-1/2"></div>
      </div>

      {/* Training Plan */}
      <TrainingPlan projectId={projectId} projectType={projectType} />

      {/* Work Instructions */}
      <WorkInstructions projectId={projectId} projectType={projectType} />

      {/* Lessons Learned */}
      {/*<LessonsLearned projectId={projectId} projectType={projectType} />*/}

      {/* Control Plan */}
      {/*<ControlPlan projectId={projectId} projectType={projectType} />*/}
      
      {/* Improvement Solution Design */}
      {/*<SPC projectId={projectId} />*/}
      
      {/* Audit Plan */}
      {/*<AuditPlan projectId={projectId} />*/}
      
      {/* Transfer to Process Owner */}
      {/*<TransferToPO projectId={projectId} />*/}

      {/* Financial Benfits Validation */}
      {/*<FinancialBenefitsValidation projectId={projectId} />*/}
      
      {/* Control Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Control Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Document how the process will be monitored and controlled to maintain the improvements.
          </p>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Process Step</TableHead>
                  <TableHead>Metric</TableHead>
                  <TableHead>Specification</TableHead>
                  <TableHead>Measurement Method</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Responsible</TableHead>
                  <TableHead>Reaction Plan</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {controlPlan.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        type="text"
                        value={item.process}
                        onChange={(e) => updateControlPlan(index, "process", e.target.value)}
                        placeholder={index === controlPlan.length - 1 ? "Add new process step..." : ""}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={item.metric}
                        onChange={(e) => updateControlPlan(index, "metric", e.target.value)}
                        placeholder="Metric to monitor"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={item.specification}
                        onChange={(e) => updateControlPlan(index, "specification", e.target.value)}
                        placeholder="Target specification"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={item.measurement}
                        onChange={(e) => updateControlPlan(index, "measurement", e.target.value)}
                        placeholder="How it's measured"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={item.frequency}
                        onChange={(e) => updateControlPlan(index, "frequency", e.target.value)}
                        placeholder="How often"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={item.responsible}
                        onChange={(e) => updateControlPlan(index, "responsible", e.target.value)}
                        placeholder="Who is responsible"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={item.reaction}
                        onChange={(e) => updateControlPlan(index, "reaction", e.target.value)}
                        placeholder="Action if out of spec"
                      />
                    </TableCell>
                    <TableCell>
                      {index === controlPlan.length - 1 && item.process ? (
                        <Button variant="ghost" size="sm" onClick={addControlPlanItem}>
                          <i className="fas fa-plus"></i>
                        </Button>
                      ) : index === controlPlan.length - 1 ? (
                        <Button variant="ghost" size="sm" disabled className="text-gray-400">
                          <i className="fas fa-plus"></i>
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => removeControlPlanItem(index)} className="text-red-500 hover:text-red-700">
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
            <Button onClick={handleSaveControlPlan}>
              Save Control Plan
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Statistical Process Control */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Statistical Process Control</CardTitle>
          <div className="flex gap-2">
            <Select defaultValue={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select metric" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Processing Time">Processing Time</SelectItem>
                <SelectItem value="Error Rate">Error Rate</SelectItem>
                <SelectItem value="Customer Satisfaction">Customer Satisfaction</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleDownloadSPC}>
              <i className="fas fa-download mr-1"></i> Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Monitor process performance using statistical process control charts.
          </p>
          
          <div className="h-80 border border-gray-200 rounded-md">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={spcData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#2563eb" 
                  strokeWidth={2}
                  name={selectedMetric}
                  activeDot={{ r: 8 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="ucl" 
                  stroke="#ef4444" 
                  strokeDasharray="5 5" 
                  name="Upper Control Limit"
                />
                <Line 
                  type="monotone" 
                  dataKey="lcl" 
                  stroke="#ef4444" 
                  strokeDasharray="5 5" 
                  name="Lower Control Limit"
                />
                <Line 
                  type="monotone" 
                  dataKey="centerLine" 
                  stroke="#10b981" 
                  strokeDasharray="3 3" 
                  name="Center Line"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            <div className="p-3 bg-gray-50 rounded-md text-center">
              <p className="text-xs text-gray-500">Current Value</p>
              <p className="text-lg font-semibold">39</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-md text-center">
              <p className="text-xs text-gray-500">Mean</p>
              <p className="text-lg font-semibold">40</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-md text-center">
              <p className="text-xs text-gray-500">Standard Deviation</p>
              <p className="text-lg font-semibold">6.67</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-md text-center">
              <p className="text-xs text-gray-500">Status</p>
              <p className="text-lg font-semibold text-green-600">In Control</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Control Gate Review and Validation */}
      <ControlGateReviewValidation projectId={projectId} />
    </div>
  );
}