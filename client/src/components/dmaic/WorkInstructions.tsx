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


export default function WorkInstructions() {
  const { user, currentProject } = useAppContext();
  const { toast } = useToast();
  const params = useParams<{ projectId?: string }>();
  const urlProjectId = params.projectId;
  
  // Use URL project ID if available, otherwise fall back to current project
  const projectId = urlProjectId ? parseInt(urlProjectId) : (currentProject?.id || 1);
  
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

  const handleSaveDocs = () => {
    toast({
      title: "Success",
      description: "Standardization documents have been saved successfully",
    });
  };

  return (
    <div className="space-y-6">
            {/* Work Instructions and Standardization Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Work Instructions and Standardization Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Track documentation used to standardize the improved process.
          </p>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Work Instructions/Document Name</TableHead>
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
