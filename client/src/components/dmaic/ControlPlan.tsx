import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ControlPlanProps {
  projectId: number;
  projectType: string;
}

export default function ControlPlan({ projectId, projectType }: ControlPlanProps) {
  const { toast } = useToast();
  
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

  return (
    <>
    {(projectType === 'Black Belt' || projectType === 'Green Belt') && (
    <div className="space-y-6">
       {/* Control Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Control Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Document how the process will be monitored and controlled to sustain the improvements.
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
    </div>
    )}
    </>
  );
}
