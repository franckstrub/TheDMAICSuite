import { useState } from "react";
import { useAppContext } from "@/store/AppContext";
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

export default function ControlPhase() {
  const { user, currentProject } = useAppContext();
  const { toast } = useToast();
  const params = new URLSearchParams(window.location.search);
  const urlProjectId = params.get('projectId');
  
  // Use URL project ID if available, otherwise fall back to current project
  const projectId = urlProjectId ? parseInt(urlProjectId) : (currentProject?.id || 1);

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

  // Training Plan state
  const [trainingPlan, setTrainingPlan] = useState([
    {
      topic: "New Validation Process",
      audience: "Data Entry Team",
      trainer: "Quality Manager",
      date: "2023-07-15",
      duration: "4 hours",
      status: "Completed",
      effectiveness: 4
    },
    {
      topic: "SPC Chart Interpretation",
      audience: "Process Supervisors",
      trainer: "Six Sigma Black Belt",
      date: "2023-07-22",
      duration: "2 hours",
      status: "Scheduled",
      effectiveness: null
    },
    {
      topic: "",
      audience: "",
      trainer: "",
      date: "",
      duration: "",
      status: "Not Started",
      effectiveness: null
    }
  ]);

  // Standardization Documents state
  const [standardDocs, setStandardDocs] = useState([
    {
      document: "Order Processing SOP",
      version: "2.0",
      date: "2023-07-10",
      owner: "Operations Manager",
      location: "Company Intranet",
      approver: "COO",
      status: "Active"
    },
    {
      document: "Data Validation Procedure",
      version: "1.5",
      date: "2023-07-12",
      owner: "Quality Assurance Lead",
      location: "Quality Management System",
      approver: "Quality Director",
      status: "Pending Approval"
    },
    {
      document: "",
      version: "",
      date: "",
      owner: "",
      location: "",
      approver: "",
      status: "Draft"
    }
  ]);

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

  // Update training plan
  const updateTrainingPlan = (index: number, field: string, value: any) => {
    const newPlan = [...trainingPlan];
    newPlan[index] = { ...newPlan[index], [field]: value };
    setTrainingPlan(newPlan);
  };

  // Add training plan item
  const addTrainingPlanItem = () => {
    if (trainingPlan[trainingPlan.length - 1].topic.trim() !== "") {
      setTrainingPlan([
        ...trainingPlan,
        {
          topic: "",
          audience: "",
          trainer: "",
          date: "",
          duration: "",
          status: "Not Started",
          effectiveness: null
        }
      ]);
    }
  };

  // Remove training plan item
  const removeTrainingPlanItem = (index: number) => {
    const newPlan = [...trainingPlan];
    newPlan.splice(index, 1);
    setTrainingPlan(newPlan);
  };

  // Update standard document
  const updateStandardDoc = (index: number, field: string, value: string) => {
    const newDocs = [...standardDocs];
    newDocs[index] = { ...newDocs[index], [field]: value };
    setStandardDocs(newDocs);
  };

  // Add standard document
  const addStandardDoc = () => {
    if (standardDocs[standardDocs.length - 1].document.trim() !== "") {
      setStandardDocs([
        ...standardDocs,
        {
          document: "",
          version: "",
          date: "",
          owner: "",
          location: "",
          approver: "",
          status: "Draft"
        }
      ]);
    }
  };

  // Remove standard document
  const removeStandardDoc = (index: number) => {
    const newDocs = [...standardDocs];
    newDocs.splice(index, 1);
    setStandardDocs(newDocs);
  };

  // Handle save actions
  const handleSaveControlPlan = () => {
    toast({
      title: "Success",
      description: "Control plan has been saved successfully",
    });
  };

  const handleSaveTrainingPlan = () => {
    toast({
      title: "Success",
      description: "Training plan has been saved successfully",
    });
  };

  const handleSaveDocs = () => {
    toast({
      title: "Success",
      description: "Standardization documents have been saved successfully",
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
      
      {/* Training Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Training Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Document training requirements to ensure staff can maintain the improved process.
          </p>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Training Topic</TableHead>
                  <TableHead>Target Audience</TableHead>
                  <TableHead>Trainer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Effectiveness (1-5)</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trainingPlan.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        type="text"
                        value={item.topic}
                        onChange={(e) => updateTrainingPlan(index, "topic", e.target.value)}
                        placeholder={index === trainingPlan.length - 1 ? "Add new training..." : ""}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={item.audience}
                        onChange={(e) => updateTrainingPlan(index, "audience", e.target.value)}
                        placeholder="Who needs training"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={item.trainer}
                        onChange={(e) => updateTrainingPlan(index, "trainer", e.target.value)}
                        placeholder="Who will conduct"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={item.date}
                        onChange={(e) => updateTrainingPlan(index, "date", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={item.duration}
                        onChange={(e) => updateTrainingPlan(index, "duration", e.target.value)}
                        placeholder="Length of training"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={item.status}
                        onValueChange={(value) => updateTrainingPlan(index, "status", value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Not Started">Not Started</SelectItem>
                          <SelectItem value="Scheduled">Scheduled</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={item.effectiveness !== null ? item.effectiveness.toString() : ""}
                        onValueChange={(value) => updateTrainingPlan(index, "effectiveness", parseInt(value))}
                        disabled={item.status !== "Completed"}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Rate" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 - Poor</SelectItem>
                          <SelectItem value="2">2 - Fair</SelectItem>
                          <SelectItem value="3">3 - Good</SelectItem>
                          <SelectItem value="4">4 - Very Good</SelectItem>
                          <SelectItem value="5">5 - Excellent</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {index === trainingPlan.length - 1 && item.topic ? (
                        <Button variant="ghost" size="sm" onClick={addTrainingPlanItem}>
                          <i className="fas fa-plus"></i>
                        </Button>
                      ) : index === trainingPlan.length - 1 ? (
                        <Button variant="ghost" size="sm" disabled className="text-gray-400">
                          <i className="fas fa-plus"></i>
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => removeTrainingPlanItem(index)} className="text-red-500 hover:text-red-700">
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
            <Button onClick={handleSaveTrainingPlan}>
              Save Training Plan
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Standardization Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Standardization Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Track documentation used to standardize the improved process.
          </p>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document Name</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Document Owner</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Approver</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standardDocs.map((doc, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        type="text"
                        value={doc.document}
                        onChange={(e) => updateStandardDoc(index, "document", e.target.value)}
                        placeholder={index === standardDocs.length - 1 ? "Add new document..." : ""}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={doc.version}
                        onChange={(e) => updateStandardDoc(index, "version", e.target.value)}
                        placeholder="Version number"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={doc.date}
                        onChange={(e) => updateStandardDoc(index, "date", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={doc.owner}
                        onChange={(e) => updateStandardDoc(index, "owner", e.target.value)}
                        placeholder="Who maintains it"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={doc.location}
                        onChange={(e) => updateStandardDoc(index, "location", e.target.value)}
                        placeholder="Where it's stored"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={doc.approver}
                        onChange={(e) => updateStandardDoc(index, "approver", e.target.value)}
                        placeholder="Who approves it"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={doc.status}
                        onValueChange={(value) => updateStandardDoc(index, "status", value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Draft">Draft</SelectItem>
                          <SelectItem value="Pending Approval">Pending Approval</SelectItem>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Obsolete">Obsolete</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {index === standardDocs.length - 1 && doc.document ? (
                        <Button variant="ghost" size="sm" onClick={addStandardDoc}>
                          <i className="fas fa-plus"></i>
                        </Button>
                      ) : index === standardDocs.length - 1 ? (
                        <Button variant="ghost" size="sm" disabled className="text-gray-400">
                          <i className="fas fa-plus"></i>
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => removeStandardDoc(index)} className="text-red-500 hover:text-red-700">
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
            <Button onClick={handleSaveDocs}>
              Save Documentation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
