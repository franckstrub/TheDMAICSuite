import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save, Plus, Trash2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FMEAAnalysisProps {
  projectId: number;
}

interface FMEARow {
  id: string;
  processStep: string;
  failureMode: string;
  effects: string;
  severity: number;
  causes: string;
  occurrence: number;
  currentControls: string;
  detection: number;
  rpn: number;
  recommendedActions: string;
  responsibility: string;
  targetDate: string;
  actionsTaken: string;
  newSeverity: number | null;
  newOccurrence: number | null;
  newDetection: number | null;
  newRpn: number | null;
}

interface FMEAData {
  id?: number;
  projectId: number;
  fmeaRows: FMEARow[];
}

export default function FMEAAnalysis({ projectId }: FMEAAnalysisProps) {
  const { toast } = useToast();
  const [fmeaRows, setFmeaRows] = useState<FMEARow[]>([]);

  // Load data from database
  const { data: fmeaData } = useQuery<FMEAData>({
    queryKey: [`/api/projects/${projectId}/fmea-analysis`],
    enabled: !!projectId,
    retry: false,
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<FMEAData>) => {
      return apiRequest('POST', `/api/projects/${projectId}/fmea-analysis`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/fmea-analysis`] });
      toast({
        title: "Saved Successfully",
        description: "FMEA analysis has been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error?.message || "Failed to save FMEA analysis. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Load saved data
  useEffect(() => {
    if (fmeaData?.fmeaRows) {
      setFmeaRows(fmeaData.fmeaRows);
    } else {
      // Initialize with one empty row
      setFmeaRows([createEmptyRow()]);
    }
  }, [fmeaData]);

  // Create empty row
  function createEmptyRow(): FMEARow {
    return {
      id: Math.random().toString(36).substr(2, 9),
      processStep: "",
      failureMode: "",
      effects: "",
      severity: 1,
      causes: "",
      occurrence: 1,
      currentControls: "",
      detection: 1,
      rpn: 1,
      recommendedActions: "",
      responsibility: "",
      targetDate: "",
      actionsTaken: "",
      newSeverity: null,
      newOccurrence: null,
      newDetection: null,
      newRpn: null,
    };
  }

  // Add new row
  const addRow = () => {
    setFmeaRows([...fmeaRows, createEmptyRow()]);
  };

  // Remove row
  const removeRow = (rowId: string) => {
    if (fmeaRows.length > 1) {
      setFmeaRows(fmeaRows.filter(row => row.id !== rowId));
    }
  };

  // Update row field
  const updateRow = (rowId: string, field: keyof FMEARow, value: string | number) => {
    setFmeaRows(prevRows => 
      prevRows.map(row => {
        if (row.id !== rowId) return row;
        
        const updatedRow = { ...row, [field]: value };
        
        // Auto-calculate RPN when severity, occurrence, or detection changes
        if (field === 'severity' || field === 'occurrence' || field === 'detection') {
          const sev = field === 'severity' ? Number(value) : row.severity;
          const occ = field === 'occurrence' ? Number(value) : row.occurrence;
          const det = field === 'detection' ? Number(value) : row.detection;
          updatedRow.rpn = sev * occ * det;
        }
        
        // Auto-calculate new RPN when new ratings change
        if (field === 'newSeverity' || field === 'newOccurrence' || field === 'newDetection') {
          const newSev = field === 'newSeverity' ? Number(value) : (row.newSeverity || 0);
          const newOcc = field === 'newOccurrence' ? Number(value) : (row.newOccurrence || 0);
          const newDet = field === 'newDetection' ? Number(value) : (row.newDetection || 0);
          
          if (newSev > 0 && newOcc > 0 && newDet > 0) {
            updatedRow.newRpn = newSev * newOcc * newDet;
          } else {
            updatedRow.newRpn = null;
          }
        }
        
        return updatedRow;
      })
    );
  };

  // Handle save
  const handleSave = () => {
    saveMutation.mutate({ fmeaRows });
  };

  // Get RPN color based on value
  const getRpnColor = (rpn: number) => {
    if (rpn >= 200) return "bg-red-100 text-red-800 font-bold";
    if (rpn >= 100) return "bg-orange-100 text-orange-800 font-semibold";
    if (rpn >= 50) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>FMEA (Failure Mode and Effect Analysis)</span>
          <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-fmea">
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save FMEA"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>FMEA Rating Scale (1-10):</strong><br />
            <strong>Severity:</strong> 1=No effect, 10=Critical safety hazard<br />
            <strong>Occurrence:</strong> 1=Almost never, 10=Almost certain<br />
            <strong>Detection:</strong> 1=Almost certain to detect, 10=Cannot detect<br />
            <strong>RPN (Risk Priority Number):</strong> Severity × Occurrence × Detection
          </AlertDescription>
        </Alert>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">Process Step / Function</TableHead>
                <TableHead className="min-w-[150px]">Potential Failure Mode</TableHead>
                <TableHead className="min-w-[150px]">Effects of Failure</TableHead>
                <TableHead className="w-[80px]">Severity (S)</TableHead>
                <TableHead className="min-w-[150px]">Causes of Failure</TableHead>
                <TableHead className="w-[80px]">Occurrence (O)</TableHead>
                <TableHead className="min-w-[150px]">Current Controls</TableHead>
                <TableHead className="w-[80px]">Detection (D)</TableHead>
                <TableHead className="w-[80px]">RPN</TableHead>
                <TableHead className="min-w-[150px]">Recommended Actions</TableHead>
                <TableHead className="min-w-[120px]">Responsibility</TableHead>
                <TableHead className="w-[120px]">Target Date</TableHead>
                <TableHead className="min-w-[150px]">Actions Taken</TableHead>
                <TableHead className="w-[80px]">New S</TableHead>
                <TableHead className="w-[80px]">New O</TableHead>
                <TableHead className="w-[80px]">New D</TableHead>
                <TableHead className="w-[80px]">New RPN</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fmeaRows.map((row, index) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Textarea
                      value={row.processStep}
                      onChange={(e) => updateRow(row.id, 'processStep', e.target.value)}
                      placeholder="Enter process step"
                      className="min-h-[60px]"
                      data-testid={`textarea-process-step-${index}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Textarea
                      value={row.failureMode}
                      onChange={(e) => updateRow(row.id, 'failureMode', e.target.value)}
                      placeholder="What could go wrong?"
                      className="min-h-[60px]"
                      data-testid={`textarea-failure-mode-${index}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Textarea
                      value={row.effects}
                      onChange={(e) => updateRow(row.id, 'effects', e.target.value)}
                      placeholder="Impact if it fails"
                      className="min-h-[60px]"
                      data-testid={`textarea-effects-${index}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={row.severity}
                      onChange={(e) => updateRow(row.id, 'severity', Math.max(1, Math.min(10, Number(e.target.value))))}
                      className="w-[70px]"
                      data-testid={`input-severity-${index}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Textarea
                      value={row.causes}
                      onChange={(e) => updateRow(row.id, 'causes', e.target.value)}
                      placeholder="Why it might fail"
                      className="min-h-[60px]"
                      data-testid={`textarea-causes-${index}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={row.occurrence}
                      onChange={(e) => updateRow(row.id, 'occurrence', Math.max(1, Math.min(10, Number(e.target.value))))}
                      className="w-[70px]"
                      data-testid={`input-occurrence-${index}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Textarea
                      value={row.currentControls}
                      onChange={(e) => updateRow(row.id, 'currentControls', e.target.value)}
                      placeholder="Current prevention/detection methods"
                      className="min-h-[60px]"
                      data-testid={`textarea-controls-${index}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={row.detection}
                      onChange={(e) => updateRow(row.id, 'detection', Math.max(1, Math.min(10, Number(e.target.value))))}
                      className="w-[70px]"
                      data-testid={`input-detection-${index}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className={`px-3 py-2 rounded text-center ${getRpnColor(row.rpn)}`} data-testid={`text-rpn-${index}`}>
                      {row.rpn}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Textarea
                      value={row.recommendedActions}
                      onChange={(e) => updateRow(row.id, 'recommendedActions', e.target.value)}
                      placeholder="Actions to reduce RPN"
                      className="min-h-[60px]"
                      data-testid={`textarea-actions-${index}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={row.responsibility}
                      onChange={(e) => updateRow(row.id, 'responsibility', e.target.value)}
                      placeholder="Who is responsible"
                      data-testid={`input-responsibility-${index}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={row.targetDate}
                      onChange={(e) => updateRow(row.id, 'targetDate', e.target.value)}
                      data-testid={`input-target-date-${index}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Textarea
                      value={row.actionsTaken}
                      onChange={(e) => updateRow(row.id, 'actionsTaken', e.target.value)}
                      placeholder="Actions completed"
                      className="min-h-[60px]"
                      data-testid={`textarea-actions-taken-${index}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      value={row.newSeverity || ""}
                      onChange={(e) => updateRow(row.id, 'newSeverity', e.target.value ? Math.max(1, Math.min(10, Number(e.target.value))) : 0)}
                      placeholder="-"
                      className="w-[70px]"
                      data-testid={`input-new-severity-${index}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      value={row.newOccurrence || ""}
                      onChange={(e) => updateRow(row.id, 'newOccurrence', e.target.value ? Math.max(1, Math.min(10, Number(e.target.value))) : 0)}
                      placeholder="-"
                      className="w-[70px]"
                      data-testid={`input-new-occurrence-${index}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      value={row.newDetection || ""}
                      onChange={(e) => updateRow(row.id, 'newDetection', e.target.value ? Math.max(1, Math.min(10, Number(e.target.value))) : 0)}
                      placeholder="-"
                      className="w-[70px]"
                      data-testid={`input-new-detection-${index}`}
                    />
                  </TableCell>
                  <TableCell>
                    {row.newRpn !== null && (
                      <div className={`px-3 py-2 rounded text-center ${getRpnColor(row.newRpn)}`} data-testid={`text-new-rpn-${index}`}>
                        {row.newRpn}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => removeRow(row.id)}
                      disabled={fmeaRows.length === 1}
                      data-testid={`button-remove-row-${index}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Button onClick={addRow} variant="outline" data-testid="button-add-row">
          <Plus className="h-4 w-4 mr-2" />
          Add FMEA Row
        </Button>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold mb-2">FMEA Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Failures Analyzed</p>
              <p className="text-2xl font-bold">{fmeaRows.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">High Risk (RPN ≥ 200)</p>
              <p className="text-2xl font-bold text-red-600">
                {fmeaRows.filter(r => r.rpn >= 200).length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Medium Risk (RPN 100-199)</p>
              <p className="text-2xl font-bold text-orange-600">
                {fmeaRows.filter(r => r.rpn >= 100 && r.rpn < 200).length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Actions with Improvements</p>
              <p className="text-2xl font-bold text-green-600">
                {fmeaRows.filter(r => r.newRpn !== null && r.newRpn < r.rpn).length}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
