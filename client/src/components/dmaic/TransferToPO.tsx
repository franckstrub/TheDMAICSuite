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


interface TransferToPOProps {
  projectId: number;
  projectType: string;
}

export default function TransferToPO({ projectId, projectType }: TransferToPOProps) {
  const { toast } = useToast();
     // Transfer to Process Owner or to Responsible
    const [transferToPO, setTransferToPO] = useState([
      {
        element: "PROCESS MAP",
        owner: "Operations Manager",
        date: "2023-07-10",
        status: "Completed"
      },
      {
        element: "PROCESS MAP",
        owner: "Operations Manager",
        date: "2023-07-10",
        status: "Scheduled"
      },
      {
        element: "",
        owner: "",
        date: "",
        status: "Completed"
      }
    ]);
  
      // Update transfer to PO document
    const updateTransferToPO = (index: number, field: string, value: string) => {
      const newTransferToPO = [...transferToPO];
      newTransferToPO[index] = { ...newTransferToPO[index], [field]: value };
      setTransferToPO(newTransferToPO);
    };
  
    // Add standard document
    const addTransferToPO = () => {
      if (transferToPO[transferToPO.length - 1].element.trim() !== "") {
        setTransferToPO([
          ...transferToPO,
          {
            element: "",
            owner: "",
            date: "",
            status: "Completed"
          }
        ]);
      }
    };

    // Remove transfer to PO document
    const removeTransferToPO = (index: number) => {
      const newTransferToPO = [...transferToPO];
      newTransferToPO.splice(index, 1);
      setTransferToPO(newTransferToPO );
    };
  
    const handleSaveTransferToPO = () => {
      toast({
        title: "Success",
        description: "Transfer to Process Owner/Responsible elements have been saved successfully",
      });
    };

{/* Transfer to Process Owner */}
return (
    <>
    {(projectType === 'Black Belt' || projectType === 'Green Belt') && (      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Transfer to Process Owner</CardTitle>
          
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            The Transfer to Process Owner document outlines the handover of the improved process to the process owner. It ensures that all stakeholders understand their roles and responsibilities in maintaining the process.
          </p>
                    <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Element transferred</TableHead>
                  <TableHead>Process owner/Responsible</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transferToPO.map((doc, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        type="text"
                        value={doc.element}
                        onChange={(e) => updateTransferToPO(index, "element", e.target.value)}
                        placeholder={index === transferToPO.length - 1 ? "Add new element..." : ""}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={doc.owner}
                        onChange={(e) => updateTransferToPO(index, "owner", e.target.value)}
                        placeholder="Process owner/responsible"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={doc.date}
                        onChange={(e) => updateTransferToPO(index, "date", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={doc.status}
                        onValueChange={(value) => updateTransferToPO(index, "status", value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Scheduled">Scheduled</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                          
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {index === transferToPO.length - 1 && doc.element ? (
                        <Button variant="ghost" size="sm" onClick={addTransferToPO}>
                          <i className="fas fa-plus"></i>
                        </Button>
                      ) : index === transferToPO.length - 1 ? (
                        <Button variant="ghost" size="sm" disabled className="text-gray-400">
                          <i className="fas fa-plus"></i>
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => removeTransferToPO(index)} className="text-red-500 hover:text-red-700">
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
            <Button onClick={handleSaveTransferToPO}>
              Save Transfer to Process Owner/Responsible
            </Button>
          </div>     
        </CardContent>
      </Card>
    )}
  </>
  );
}
