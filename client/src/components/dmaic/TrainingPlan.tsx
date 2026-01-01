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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


export default function TrainingPlan() {
  const { user, currentProject } = useAppContext();
  const { toast } = useToast();
  const params = useParams<{ projectId?: string }>();
  const urlProjectId = params.projectId;
  
  // Use URL project ID if available, otherwise fall back to current project
  const projectId = urlProjectId ? parseInt(urlProjectId) : (currentProject?.id || 1);
  
  
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

  const handleSaveTrainingPlan = () => {
    toast({
      title: "Success",
      description: "Training plan has been saved successfully",
    });
  };

  return (
    <div className="space-y-6">
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
    </div>
  );
}
