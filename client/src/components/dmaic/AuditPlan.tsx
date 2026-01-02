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


interface AuditPlanProps {
  projectId: number;
  projectType: string;
}

export default function AuditPlan({ projectId, projectType }: AuditPlanProps) {
  const { toast } = useToast();
    // Training Plan state
  const [auditPlan, setAuditPlan] = useState([
    {
      process: "Quality of final assembly",
      objective: "Check quality and scrap at the Final Assembly step",
      document: "Audit of Final Assembly",
      version: "2.1",
      responsible: "Quality Inspector",
      periodicity: "Quarterly",
      lastcompletion: "2026-03-31",
      findings: "0 non-conformity found",
      postauditactions: "none"
    },
    {
      process: "Quality of final assembly",
      objective: "Check quality and scrap at the Final Assembly step",
      document: "Audit of Final Assembly",
      version: "2.1",
      responsible: "Quality Inspector",
      periodicity: "Quarterly",
      lastcompletion: "2026-03-31",
      findings: "0 non-conformity found",
      postauditactions: "none"
    },
    {
      process: "",
      objective: "",
      document: "Audit plan of ...",
      version: "1.0",
      responsible: "",
      periodicity: "Yearly",
      lastcompletion: "yyyy-mm-dd",
      findings: "0 non-conformity found",
      postauditactions: "none"
    }
  ]);
  
  // Update training plan
  const updateAuditPlan = (index: number, field: string, value: any) => {
    const newPlan = [...auditPlan];
    newPlan[index] = { ...newPlan[index], [field]: value };
    setAuditPlan(newPlan);
  };

  // Add training plan item
  const addAuditPlanItem = () => {
    if (auditPlan[auditPlan.length - 1].process.trim() !== "") {
      setAuditPlan([
        ...auditPlan,
        {
          process: "",
          objective: "",
          document: "Audit plan of ...",
          version: "1.0",
          responsible: "",
          periodicity: "Yearly",
          lastcompletion: "yyyy-mm-dd",
          findings: "0 non-conformity found",
          postauditactions: "none"
        }
      ]);
    }
  };

  // Remove training plan item
  const removeAuditPlanItem = (index: number) => {
    const newPlan = [...auditPlan];
    newPlan.splice(index, 1);
    setAuditPlan(newPlan);
  };

  const handleSaveAuditPlan = () => {
    toast({
      title: "Success",
      description: "Audit plan has been saved successfully",
    });
  };


{/* Audit Plan */}
return (
    <>
    {(projectType === 'Black Belt' || projectType === 'Green Belt') && (      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Audit Plan</CardTitle>
          
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            The Audit Plan outlines the strategy for auditing the improvements made during the DMAIC project. It ensures that the changes are sustainable and that the process remains in control over time.
          </p>
                    
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Process</TableHead>
                  <TableHead>Objective</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Responsible</TableHead>
                  <TableHead>Periodicity</TableHead>
                  <TableHead>Last completion</TableHead>
                  <TableHead>Findings</TableHead>
                  <TableHead>Post Audit Actions</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditPlan.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        type="text"
                        value={item.process}
                        onChange={(e) => updateAuditPlan(index, "process", e.target.value)}
                        placeholder={index === auditPlan.length - 1 ? "Add new process to audit..." : ""}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={item.objective}
                        onChange={(e) => updateAuditPlan(index, "objective", e.target.value)}
                        placeholder="Objectives of audit"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={item.document}
                        onChange={(e) => updateAuditPlan(index, "document", e.target.value)}
                        placeholder="Audit document name"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={item.version}
                        onChange={(e) => updateAuditPlan(index, "version", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={item.responsible}
                        onChange={(e) => updateAuditPlan(index, "responsible", e.target.value)}
                        placeholder="Audit's Responsible"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={item.periodicity}
                        onValueChange={(value) => updateAuditPlan(index, "periodicity", value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Daily">Daily</SelectItem>
                          <SelectItem value="Weekly">Weekly</SelectItem>
                          <SelectItem value="Monthly">Monthly</SelectItem>
                          <SelectItem value="Quarterly">Quarterly</SelectItem>
                          <SelectItem value="Half-Yearly">Half-Yearly</SelectItem>
                          <SelectItem value="Yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={item.lastcompletion}
                        onChange={(e) => updateAuditPlan(index, "lastcompletion", e.target.value)}
                        placeholder="Date of last completed audit"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={item.findings}
                        onChange={(e) => updateAuditPlan(index, "findings", e.target.value)}
                        placeholder="Audit's findings (non-conformity, gap, observations)"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={item.postauditactions}
                        onChange={(e) => updateAuditPlan(index, "postauditactions", e.target.value)}
                        placeholder="Post-Audit Action"
                      />
                    </TableCell>
                    <TableCell>
                      {index === auditPlan.length - 1 && item.process ? (
                        <Button variant="ghost" size="sm" onClick={addAuditPlanItem}>
                          <i className="fas fa-plus"></i>
                        </Button>
                      ) : index === auditPlan.length - 1 ? (
                        <Button variant="ghost" size="sm" disabled className="text-gray-400">
                          <i className="fas fa-plus"></i>
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => removeAuditPlanItem(index)} className="text-red-500 hover:text-red-700">
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
            <Button onClick={handleSaveAuditPlan}>
              Save Audit Plan
            </Button>
          </div>
        </CardContent>
      </Card>
    )}
  </>
  );
}
