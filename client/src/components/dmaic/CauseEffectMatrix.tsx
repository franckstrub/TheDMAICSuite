import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface CauseEffectMatrix {
  id?: number;
  enabled: boolean;
  matrix: string[][];
}

interface CauseEffectMatrixProps {
  projectId: number;
  ctqlist: any;
  onSave?: (matrix: CauseEffectMatrix) => void;
}

export default function CauseEffectMatrix({ projectId, ctqlist, onSave }: CauseEffectMatrixProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to load existing matrix data
  const { data: existingMatrix, isLoading } = useQuery({
    queryKey: ['/api/projects', projectId, 'cause-effect-matrix'],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/cause-effect-matrix`);
        if (response.status === 404) {
          return null; // No existing matrix
        }
        if (!response.ok) {
          throw new Error('Failed to load matrix');
        }
        return await response.json();
      } catch (error) {
        console.error('Error loading matrix:', error);
        return null;
      }
    },
  });

  // Mutation to save matrix data
  const saveMatrixMutation = useMutation({
    mutationFn: async (matrixData: any) => {
      const response = await apiRequest(
        'POST',
        `/api/projects/${projectId}/cause-effect-matrix`,
        matrixData
      );
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Cause & Effect Matrix saved successfully",
      });
      // Don't invalidate the query to prevent resetting local state
      // queryClient.invalidateQueries({ 
      //   queryKey: ['/api/projects', projectId, 'cause-effect-matrix'] 
      // });
      if (onSave) {
        onSave(data);
      }
    },
    onError: (error) => {
      console.error('Error saving matrix:', error);
      toast({
        title: "Error",
        description: "Failed to save Cause & Effect Matrix",
        variant: "destructive",
      });
    },
  });

  // Get CTQs from the ctqlist prop with debugging
  //console.log('CTQ List received:', ctqlist);
  let ctqs = [];
  if (Array.isArray(ctqlist)) {
    ctqs = ctqlist;
  } else if (ctqlist && typeof ctqlist === 'object') {
    // Handle case where ctqlist might be an object with array property
    ctqs = ctqlist.data || ctqlist.items || ctqlist.ctqs || [];
  } else {
    ctqs = [];
  }
  // Add state for editable CTQ headers
  const [editableCtqs, setEditableCtqs] = useState<Array<{ctq: string, ctqType: string, ctqId: number}>>(() => {
    // Initialize with data from props or create empty CTQs
    const initialCtqs = [];
    
    if (Array.isArray(ctqlist) && ctqlist.length > 0) {
      initialCtqs.push(...ctqlist);
    } else if (ctqlist && typeof ctqlist === 'object') {
      const extractedCtqs = ctqlist.data || ctqlist.items || ctqlist.ctqs || [];
      initialCtqs.push(...extractedCtqs);
    }
    const maxinitCTQs=initialCtqs.length+2;
    // Ensure we have at least 2 additional CTQs to initial CTQs
    while (initialCtqs.length < maxinitCTQs) {
      initialCtqs.push({
        ctq: `CTQ ${initialCtqs.length + 1}`,
        ctqType: 'Custom',
        ctqId: Date.now() + initialCtqs.length // Generate unique ID
      });
    }
    
    return initialCtqs;
  });

  //console.log('Processed CTQs:', ctqs);
  const maxCTQs = Math.max(editableCtqs.length+2, 2);

  const updateCtqHeader = (index: number, field: 'ctq' | 'ctqType', value: string) => {
    const newCtqs = [...editableCtqs];
    newCtqs[index] = {
      ...newCtqs[index],
      [field]: value
    };
    setEditableCtqs(newCtqs);
  };

  // Function to add a new CTQ column
  const addCtqColumn = () => {
    const newCtq = {
      ctq: `CTQ ${editableCtqs.length + 1}`,
      ctqType: 'Custom',
      ctqId: Date.now()
    };
    
    setEditableCtqs(prev => [...prev, newCtq]);
    
    // Note: importance scores will be synced automatically by useEffect
    
    // Add new column to matrix - ensure all rows exist and have proper length
    setMatrixData(prev => ({
      ...prev,
      matrix: prev.matrix.map((row, index) => {
        const currentRow = Array.isArray(row) ? [...row] : [];
        // Ensure row has enough columns before adding new one
        while (currentRow.length < editableCtqs.length) {
          currentRow.push("");
        }
        currentRow.push(""); // Add the new column
        return currentRow;
      })
    }));
  };
  
  // Function to remove the last CTQ column
  const removeCtqColumn = () => {
    // Don't remove if we're down to the minimum columns
    if (checkMinimumColumns()) return;

    // Remove the last CTQ
    setEditableCtqs(prev => prev.slice(0, -1));
    
    // Note: importance scores will be synced automatically by useEffect
    
    // Remove the last column from the matrix
    setMatrixData(prev => ({
      ...prev,
      matrix: prev.matrix.map(row => {
        const currentRow = Array.isArray(row) ? [...row] : [];
        return currentRow.length > 0 ? currentRow.slice(0, -1) : [];
      })
    }));
  };
  
  const [rootCauses, setRootCauses] = useState<string[]>(Array(5).fill(""));
  const [numRootCauses, setNumRootCauses] = useState<number>(5); // Track number of root causes
  

  
  const [matrixData, setMatrixData] = useState<CauseEffectMatrix>({
    enabled: false,
    matrix: Array(numRootCauses).fill("").map(() => Array(editableCtqs.length).fill("")) // No header row in data
  });

  const toggleMatrix = (enabled: boolean) => {
    setMatrixData(prev => ({
      ...prev,
      enabled,
      matrix: enabled ? prev.matrix : Array(numRootCauses).fill("").map(() => Array(editableCtqs.length).fill(""))
    }));
  };

  const updateCellValue = (rowIndex: number, colIndex: number, value: string) => {
    const newMatrix = [...matrixData.matrix];
    
    // Ensure the row exists
    if (!newMatrix[rowIndex]) {
      newMatrix[rowIndex] = [];
    }
    
    // Ensure the row has enough columns
    while (newMatrix[rowIndex].length <= colIndex) {
      newMatrix[rowIndex].push("");
    }
    
    newMatrix[rowIndex][colIndex] = value;
    setMatrixData(prev => ({ ...prev, matrix: newMatrix }));
  };

  const updateRootCause = (rowIndex: number, value: string) => {
    const newRootCauses = [...rootCauses];
    newRootCauses[rowIndex] = value;
    setRootCauses(newRootCauses);
  };

  const handleSaveMatrix = () => {
    // Ensure matrix is 5x4 (5 rows, 4 columns) before saving
    const correctedMatrix = matrixData.matrix.map(row => 
      Array.isArray(row) ? row.slice(0, editableCtqs.length) : Array(editableCtqs.length).fill("")
    );
    
    const matrixToSave = {
      ...matrixData,
      matrix: correctedMatrix,
      rootCauses: rootCauses,
      ctqs: editableCtqs,
      importanceScores: importanceScores
    };
    //console.log('Matrix dimensions before save:', matrixData.matrix.length, 'x', matrixData.matrix[0]?.length);
    //console.log('Corrected matrix dimensions:', correctedMatrix.length, 'x', correctedMatrix[0]?.length);
    //console.log('Expected dimensions: 5 x', editableCtqs.length);
    saveMatrixMutation.mutate(matrixToSave);
  };

  // Add this new state for importance scores - initialize to match editableCtqs length
  const [importanceScores, setImportanceScores] = useState<number[]>(() => 
    Array(editableCtqs.length).fill(5)
  );

  // Initialize data from existing matrix - only on first load
  const [hasInitialized, setHasInitialized] = useState(false);
  
  useEffect(() => {
    if (existingMatrix && !hasInitialized) {
      //console.log('Initializing with existing matrix:', existingMatrix);
      //console.log('Existing root causes:', existingMatrix.rootCauses);
      //console.log('Existing importance scores:', existingMatrix.importanceScores);
      //console.log('Existing CTQs:', existingMatrix.ctqs);
      //console.log('Current editableCtqs before update:', editableCtqs);
      
      // Ensure root causes are properly set from the existing matrix
      if (existingMatrix.rootCauses && Array.isArray(existingMatrix.rootCauses)) {
        //console.log('Setting root causes from existing matrix:', existingMatrix.rootCauses);
        setRootCauses(existingMatrix.rootCauses);
        setNumRootCauses(existingMatrix.rootCauses.length);
      } else {
        //console.log('No existing root causes, using empty array');
        setRootCauses(Array(5).fill(""));
        setNumRootCauses(5);
      }
      
      // Properly initialize importance scores - ensure they match the CTQ count
      if (existingMatrix.importanceScores && Array.isArray(existingMatrix.importanceScores)) {
        setImportanceScores(existingMatrix.importanceScores);
      } else {
        // If no existing scores, create default scores based on CTQ count
        const ctqCount = existingMatrix.ctqs ? existingMatrix.ctqs.length : maxCTQs;
        setImportanceScores(Array(ctqCount).fill(5));
      }
      
      setMatrixData(prev => ({
        ...prev,
        enabled: existingMatrix.enabled || false,
        matrix: existingMatrix.matrix || Array(numRootCauses).fill(null).map(() => Array(editableCtqs.length).fill(""))
      }));
      
      // Update editable CTQs if they exist in the matrix
      if (existingMatrix.ctqs && Array.isArray(existingMatrix.ctqs)) {
        setEditableCtqs(existingMatrix.ctqs);
      }
      setHasInitialized(true);
    }
  }, [existingMatrix, maxCTQs, hasInitialized]);

  // Keep importance scores in sync with editableCtqs length
  useEffect(() => {
    if (hasInitialized) {
      const currentLength = importanceScores.length;
      const targetLength = editableCtqs.length;
      
      if (currentLength !== targetLength) {
        //console.log(`Syncing importance scores: ${currentLength} -> ${targetLength}`);
        if (targetLength > currentLength) {
          // Add new scores with default value 5
          const newScores = [...importanceScores, ...Array(targetLength - currentLength).fill(5)];
          setImportanceScores(newScores);
        } else {
          // Remove excess scores
          setImportanceScores(importanceScores.slice(0, targetLength));
        }
      }
    }
  }, [editableCtqs.length, hasInitialized]);

  // Keep matrix dimensions in sync with actual CTQ and root cause counts
  useEffect(() => {
    if (hasInitialized) {
      const targetRows = numRootCauses; // No header row in data
      const targetCols = editableCtqs.length; // No +1 needed - root causes stored separately
      
      //console.log(`Syncing matrix dimensions: ${matrixData.matrix.length}x${matrixData.matrix[0]?.length} -> ${targetRows}x${targetCols}`);
      
      setMatrixData(prev => {
        const newMatrix = [];
        
        // Create rows with correct dimensions
        for (let i = 0; i < targetRows; i++) {
          const newRow = [];
          for (let j = 0; j < targetCols; j++) {
            // Preserve existing values if they exist
            newRow[j] = prev.matrix[i]?.[j] || "";
          }
          newMatrix.push(newRow);
        }
        
        return {
          ...prev,
          matrix: newMatrix
        };
      });
    }
  }, [editableCtqs.length, numRootCauses, hasInitialized]);

  // Update the importance score function
  const updateImportanceScore = (colIndex: number, value: string) => {
    const newImportanceScores = [...importanceScores];
    const numValue = parseInt(value) || 0;
    newImportanceScores[colIndex] = Math.max(0, Math.min(10, numValue)); // Clamp between 0-10
    setImportanceScores(newImportanceScores);
  };

  // Update the calculateRowTotal function to include importance weighting
  const calculateRowTotal = (rowIndex: number) => {
    // rowIndex is already the correct index since we removed the header row
    return matrixData.matrix[rowIndex]?.slice(1, editableCtqs.length + 1).reduce((sum, cell, colIndex) => {
      const cellValue = parseInt(cell) || 0;
      const importance = importanceScores[colIndex] || 0;
      return sum + (cellValue * importance);
    }, 0) || 0;
  };

  // Add function to add a new root cause row
  const addRootCause = () => {
    const newNumRootCauses = numRootCauses + 1;
    setNumRootCauses(newNumRootCauses);
    
    // Add new empty root cause
    setRootCauses(prev => [...prev, ""]);
    
    // Add new row to matrix with correct number of columns (CTQs only)
    setMatrixData(prev => ({
      ...prev,
      matrix: [...prev.matrix, Array(editableCtqs.length).fill("")]
    }));
  };

  // Update the clearRow function to handle importance scores
  const clearRow = (rowIndex: number) => {
    // Clear the root cause
    const newRootCauses = [...rootCauses];
    newRootCauses[rowIndex] = "";
    setRootCauses(newRootCauses);
    
    // Clear all matrix values for this row
    const newMatrix = [...matrixData.matrix];
    newMatrix[rowIndex] = Array(editableCtqs.length).fill("");
    setMatrixData(prev => ({ ...prev, matrix: newMatrix }));
  };

  // Function to completely delete a row
  const deleteRow = (rowIndex: number) => {
    // Don't delete if we're down to the minimum rows
    if (checkMinimumRows()) return;

    // Remove the root cause
    setRootCauses(prev => prev.filter((_, i) => i !== rowIndex));

    // Remove the row from the matrix
    setMatrixData(prev => ({
      ...prev,
      matrix: prev.matrix.filter((_, i) => i !== rowIndex)
    }));

    // Update the row count
    setNumRootCauses(prev => prev - 1);
  };

  const checkMinimumRows = () => {
  if (numRootCauses <= 1) {
    toast({
      title: "Minimum Rows Reached",
      description: "You must keep at least one root cause row",
      variant: "destructive",
    });
    return true;
  }
  return false;
};

const checkMinimumColumns = () => {
  if (editableCtqs.length <= 2) {
    toast({
      title: "Minimum Columns Reached",
      description: "You must keep at least two CTQ columns",
      variant: "destructive",
    });
    return true;
  }
  return false;
};

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cause & Effect Matrix</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <Label className="block mb-4">
            Prioritize all root causes versus all CTQs with a Cause & Effect Matrix?
          </Label>

          <RadioGroup
            value={matrixData.enabled ? "true" : "false"}
            onValueChange={(v) => toggleMatrix(v === "true")}
            className="flex flex-row space-x-4 mt-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="true" id={`${projectId}-matrix-yes`} />
              <Label htmlFor={`${projectId}-matrix-yes`}>Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="false" id={`${projectId}-matrix-no`} />
              <Label htmlFor={`${projectId}-matrix-no`}>No</Label>
            </div>
          </RadioGroup>

          {matrixData.enabled && (
            <div className="mt-6">
              {/* Scroll indicator */}
              {editableCtqs.length >4 &&(
                <div className="relative"> {/* Parent container must be relative */}
                  <p className="absolute right-0 bottom-0 mb-1 max-w-[180px] bg-blue-100 text-blue-600 px-2 py-1 text-xs rounded-bl z-10">
                    ← Scroll horizontally →
                  </p>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="border-collapse w-full border border-gray-300">
                <thead className="bg-gray-50">
                  
                  <tr>
                    <th className="border border-gray-300 px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Root Causes
                    </th>
                    {editableCtqs.map((ctq, index) => (
                      <th key={`ctq-${ctq.ctqId}`} className="border border-gray-300 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="min-w-[120px] space-y-1">
                          <Input
                            type="text"
                            value={ctq.ctq}
                            onChange={(e) => updateCtqHeader(index, 'ctq', e.target.value)}
                            className="w-full text-[10px] font-medium text-gray-500 border-gray-300 bg-white p-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            placeholder={`CTQ ${index + 1}`}
                          />
                        </div>
                      </th>
                    ))}
                    <th className="border border-gray-300 px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="border border-gray-300 px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                  {/* Importance row - update to use editableCtqs length */}
                  <tr className="bg-blue-50">
                    <td className="border border-gray-300 px-4 py-2 text-xs font-medium text-blue-700">
                      Importance (0-10)
                    </td>
                    {editableCtqs.map((_, colIndex) => (
                      <td key={`importance-${colIndex}`} className="border border-gray-300 p-2">
                        <Input
                          type="number"
                          min="0"
                          max="10"
                          value={importanceScores[colIndex] !== undefined ? importanceScores[colIndex] : 5}
                          onChange={(e) => updateImportanceScore(colIndex, e.target.value)}
                          className="w-16 text-center"
                          placeholder="5"
                        />
                      </td>
                    ))}
                    <td className="border border-gray-300 px-4 py-2 text-xs font-medium text-blue-700">
                      Weight
                    </td>
                    <td className="border border-gray-300 p-2">
                      {/* Add CTQ Column Button */}
                      <div className="inline-flex rounded-md shadow-sm border border-gray-200">
                        <Button
                        variant="ghost"
                        size="sm"
                        onClick={addCtqColumn}
                        className="px-3 py-1 rounded-l-md bg-blue-50 hover:bg-blue-100"
                        title="Add CTQ Column"
                      >
                        <i className="fas fa-plus text-blue-600"></i>
                      </Button>
                      <div className="border-l border-gray-200"></div> {/* Divider */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={removeCtqColumn}
                        className="px-3 py-1 rounded-r-md bg-red-50 hover:bg-red-100"
                        title="Remove CTQ Column"
                      >
                        <i className="fas fa-minus text-red-600"></i>
                      </Button>
                    </div>
                    </td>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {Array.from({ length: numRootCauses }, (_, rowIndex) => (
                    <tr key={`row-${rowIndex}`}>
                      <td className="border border-gray-300 p-2">
                        <Input
                          type="text"
                          value={rootCauses[rowIndex] || ""}
                          onChange={(e) => updateRootCause(rowIndex, e.target.value)}
                          className="w-full min-w-[200px]"
                          placeholder={`Enter root cause ${rowIndex + 1}`}
                        />
                      </td>
                      {editableCtqs.map((_, colIndex) => (
                        <td key={`cell-${rowIndex}-${colIndex}`} className="border border-gray-300 p-2">
                          <Select
                            value={matrixData.matrix[rowIndex]?.[colIndex] || ""}
                            onValueChange={(value) => updateCellValue(rowIndex, colIndex, value)}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue placeholder="0" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0 (None)</SelectItem>
                              <SelectItem value="1">1 (Low)</SelectItem>
                              <SelectItem value="3">3 (Medium)</SelectItem>
                              <SelectItem value="9">9 (High)</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      ))}
                      <td className="border border-gray-300 p-2 bg-gray-50 font-medium text-center">
                        {calculateRowTotal(rowIndex)}
                      </td>
                      <td className="border border-gray-300 p-2 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRow(rowIndex)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          title="Clear this row"
                        >
                          <i className="fas fa-trash"></i>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              {/* Add Root Cause Button */}
              <div className="mt-4 flex justify-between">
                <Button
                  variant="outline"
                  onClick={addRootCause}
                  className="flex items-center space-x-2"
                >
                  <i className="fas fa-plus"></i>
                  <span>Add a Root Cause</span>
                </Button>
                <Button 
                  onClick={handleSaveMatrix} 
                  className="mt-4"
                  disabled={saveMatrixMutation.isPending}
                >
                  {saveMatrixMutation.isPending ? "Saving..." : "Save Matrix"}
                </Button>
              </div>
              <div className="mt-4 space-y-2">
                <div className="text-sm text-gray-500">
                  <p><strong>Scoring Guide:</strong></p>
                  <ul className="mt-1 ml-4 space-y-1">
                    <li>• <strong>0 (None):</strong> No relationship/impact</li>
                    <li>• <strong>1 (Low):</strong> Weak relationship</li>
                    <li>• <strong>3 (Medium):</strong> Moderate relationship</li>
                    <li>• <strong>9 (High):</strong> Strong relationship</li>
                  </ul>
                  <p className="mt-2"><strong>Importance Score (0-10):</strong> Weight each CTQ by its relative importance</p>
                </div>
                <div className="text-sm text-blue-600">
                  <p><strong>Tip:</strong> Total scores are calculated as: (Relationship Score × Importance Score) summed across all CTQs</p>
                  <p><strong>Tip:</strong> Higher total scores indicate root causes that have the greatest impact across all CTQs.</p>
                  {/*{ctqs.length > 0 && (
                    <div className="mt-2 text-xs">
                      <p><strong>CTQs:</strong> {ctqs.map((ctq, i) => 
                        `${ctq?.ctq || `CTQ ${i + 1}`} (${ctq?.ctqType || 'Unknown'})`
                      ).join(', ')}</p>
                    </div>
                  )} */}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}