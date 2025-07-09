import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";

interface DataPoint {
  indexNumber: number;
  dataValue: number;
}

interface ContCTQHypTestData {
  id?: number;
  ctq: string;
  ctqId?: number;
  testType: string;
  enableMeanTest?: boolean;
  enableVarianceTest?: boolean;
  enableMedianTest?: boolean;
  targetMean?: number;
  targetVariance?: number;
  targetMedian?: number;
  dataPoints?: DataPoint[];
}

interface ContCTQHypTestingProps {
  projectId: number;
  ctqId: number;
  ctqName: string;
  activeTab?: string;
  onSave?: (data: string) => void;
}

export function ContCTQHypTesting({ projectId, ctqId, ctqName, activeTab, onSave }: ContCTQHypTestingProps) {
  const { toast } = useToast();
  const [variable1, setVariable1] = useState("Processing Time (Before)");
  const [variable2, setVariable2] = useState("Processing Time (After)");
  const [significanceLevel, setSignificanceLevel] = useState("0.05");
  const [alternative, setAlternative] = useState("Less than");
  const [testResult, setTestResult] = useState({
    tStatistic: -3.45,
    pValue: 0.002,
    conclusion: "Reject null hypothesis",
    explanation: "There is a statistically significant difference between the before and after measurements."
  });

  // Data input state for One Sample test
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [pasteInput, setPasteInput] = useState("");
  const [focusedCell, setFocusedCell] = useState<number>(-1);
  const [editingCell, setEditingCell] = useState<number>(-1);
  const [editValue, setEditValue] = useState<string>("");
  const [undoStack, setUndoStack] = useState<DataPoint[][]>([]);
  const [canUndo, setCanUndo] = useState(false);

  // Initialize ContCTQHypTestData with default values
  const [ContCTQHypTestData, setContCTQHypTestData] = useState<{ [ctqId: number]: ContCTQHypTestData }>(() => ({
    [ctqId]: {
      ctq: ctqName,
      testType: "One Sample Hyp-Test",
      enableMeanTest: false,
      enableVarianceTest: false,
      enableMedianTest: false,
      targetMean: 0,
      targetVariance: 0,
      targetMedian: 0
    }
  }));

  const currentTestType = ContCTQHypTestData[ctqId]?.testType || "One Sample Hyp-Test";

  const updateContCTQHypTestDataField = (
    ctqId: number, 
    field: keyof ContCTQHypTestData, 
    value: any
  ) => {
    setContCTQHypTestData(prev => ({
      ...prev,
      [ctqId]: {
        ...prev[ctqId],
        [field]: value,
      }
    }));
  };

  const handleRunTest = () => {
    toast({
      title: "Test Run Successfully",
      description: "The hypothesis test has been executed.",
    });
  };

  // Helper function to save state to undo stack
  const saveToUndoStack = (currentState: DataPoint[]) => {
    setUndoStack(prev => {
      const newStack = [...prev, currentState];
      // Keep only last 20 states to prevent memory issues
      if (newStack.length > 20) {
        newStack.shift();
      }
      return newStack;
    });
    setCanUndo(true);
  };

  // Undo function
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    
    const lastState = undoStack[undoStack.length - 1];
    setDataPoints(lastState);
    setUndoStack(prev => prev.slice(0, -1));
    setCanUndo(undoStack.length > 1);
    
    toast({
      title: "Undo Complete",
      description: "Data has been restored to previous state.",
    });
  };

  // Functions for data input
  const addDataPoint = (value: string) => {
    if (!value.trim()) return;
    
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return;
    
    // Save current state to undo stack before making changes
    saveToUndoStack(dataPoints);
    
    setDataPoints(prev => [
      ...prev,
      { indexNumber: prev.length + 1, dataValue: numericValue }
    ]);
    
    setInputValue("");
  };

  const handleDeleteDataPoint = (index: number) => {
    // Save current state to undo stack before making changes
    saveToUndoStack(dataPoints);
    
    setDataPoints(prev => {
      const updatedPoints = prev.filter((_, i) => i !== index);
      // Re-index the remaining points
      const reindexedPoints = updatedPoints.map((point, i) => ({
        ...point,
        indexNumber: i + 1
      }));
      return reindexedPoints;
    });
    
    toast({
      title: "Data Point Deleted",
      description: "The data point has been removed and the list has been re-indexed.",
    });
  };

  // Handle paste from Excel functionality
  const handlePasteData = (event: React.ClipboardEvent) => {
    event.preventDefault();
    const pastedData = event.clipboardData.getData('text/plain');
    
    if (pastedData.trim()) {
      const lines = pastedData.trim().split('\n');
      const newDataPoints: DataPoint[] = [];
      
      lines.forEach((line, index) => {
        const value = line.trim();
        const numericValue = parseFloat(value);
        if (!isNaN(numericValue)) {
          newDataPoints.push({
            indexNumber: dataPoints.length + index + 1,
            dataValue: numericValue
          });
        }
      });
      
      if (newDataPoints.length > 0) {
        // Save current state to undo stack before making changes
        saveToUndoStack(dataPoints);
        
        setDataPoints(prev => [...prev, ...newDataPoints]);
        setPasteInput("");
        toast({
          title: "Data Imported",
          description: `Successfully imported ${newDataPoints.length} data points from Excel.`,
        });
      }
    }
  };

  // Handle paste specifically for editing cells - handles multiple values starting from clicked cell
  const handleCellPaste = (event: React.ClipboardEvent, index: number) => {
    event.preventDefault();
    const pastedData = event.clipboardData.getData('text/plain');
    
    if (pastedData.trim()) {
      const lines = pastedData.trim().split('\n');
      const newValues: number[] = [];
      
      lines.forEach((line) => {
        const value = line.trim();
        const numericValue = parseFloat(value);
        if (!isNaN(numericValue)) {
          newValues.push(numericValue);
        }
      });
      
      if (newValues.length > 0) {
        // Save current state to undo stack before making changes
        saveToUndoStack(dataPoints);
        
        setDataPoints(prev => {
          const updatedPoints = [...prev];
          
          // Update existing cells starting from the clicked index
          newValues.forEach((value, i) => {
            const targetIndex = index + i;
            if (targetIndex < updatedPoints.length) {
              // Update existing cell
              updatedPoints[targetIndex] = {
                ...updatedPoints[targetIndex],
                dataValue: value
              };
            } else {
              // Create new data point
              updatedPoints.push({
                indexNumber: updatedPoints.length + 1,
                dataValue: value
              });
            }
          });
          
          return updatedPoints;
        });
        
        toast({
          title: "Data Pasted",
          description: `Successfully pasted ${newValues.length} values starting from row ${index + 1}.`,
        });
      }
    }
  };

  // Add keyboard shortcut support for paste and undo functionality
  useEffect(() => {
    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInInputField = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');

      // Handle Ctrl+V/Cmd+V for paste - only when not in input field and this CTQ is active
      if ((event.ctrlKey || event.metaKey) && event.key === 'v' && !isInInputField && activeTab === ctqName) {
        event.preventDefault();
        
        // Get clipboard data
        navigator.clipboard.readText().then(clipboardData => {
          if (clipboardData.trim()) {
            // Create a synthetic paste event
            const syntheticEvent = {
              preventDefault: () => {},
              clipboardData: {
                getData: () => clipboardData
              }
            } as unknown as React.ClipboardEvent;
            
            handlePasteData(syntheticEvent);
          }
        }).catch(() => {
          toast({
            title: "Clipboard Access",
            description: "Please use the 'Paste data from Excel' button or paste directly into the table.",
            variant: "default",
          });
        });
      }

      // Handle Ctrl+Z/Cmd+Z for undo - works both in and outside input fields and this CTQ is active
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && canUndo && activeTab === ctqName) {
        event.preventDefault();
        handleUndo();
      }
    };

    document.addEventListener('keydown', handleKeyboardShortcut);
    return () => document.removeEventListener('keydown', handleKeyboardShortcut);
  }, [canUndo, activeTab, ctqName]);

  // Handle cell editing
  const startEditing = (index: number, currentValue: number) => {
    setEditingCell(index);
    setEditValue(currentValue.toString());
  };

  const saveEdit = (index: number) => {
    const numericValue = parseFloat(editValue);
    if (!isNaN(numericValue)) {
      // Save current state to undo stack before making changes
      saveToUndoStack(dataPoints);
      
      setDataPoints(prev => 
        prev.map((point, i) => 
          i === index ? { ...point, dataValue: numericValue } : point
        )
      );
    }
    setEditingCell(-1);
    setEditValue("");
  };

  const cancelEdit = () => {
    setEditingCell(-1);
    setEditValue("");
  };



  return (
    <Card>
      <CardHeader>
        <CardTitle>Hypothesis Testing</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">
          Validate or invalidate assumptions and determine if differences are statistically significant or insignificant.
        </p>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="test-type">Select Number of Samples in Hypothesis Test</Label>
            <Select 
              value={currentTestType}
              onValueChange={(value) => updateContCTQHypTestDataField(ctqId, "testType", value)}
            >
              <SelectTrigger id="test-type">
                <SelectValue placeholder="Select test type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="One Sample Hyp-Test">One Sample Hypothesis Test</SelectItem>
                <SelectItem value="Two Sample Hyp-Test">Two Sample Hypothesis Test</SelectItem>
                <SelectItem value="Paired Hyp-Test">Paired Sample Hypothesis Test</SelectItem>
                <SelectItem value="N sample Hyp-Test">Multiple Sample Hypothesis Test</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <label className="block text-sm font-medium mb-3">
            Statistical parameter to test (Select Multiple)
          </label>
          <div className="max-w-4xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`${ctqId}-MeanTest`}
                  checked={ContCTQHypTestData[ctqId]?.enableMeanTest || false}
                  onCheckedChange={(checked) => updateContCTQHypTestDataField(ctqId, "enableMeanTest", checked)}
                />
                <Label htmlFor={`${ctqId}-enableMeanTest`} className="text-sm font-medium text-gray-700">
                  Mean
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`${ctqId}-VarianceTest`}
                  checked={ContCTQHypTestData[ctqId]?.enableVarianceTest || false}
                  onCheckedChange={(checked) => updateContCTQHypTestDataField(ctqId, "enableVarianceTest", checked)}
                />
                <Label htmlFor={`${ctqId}-VarianceTest`} className="text-sm font-medium text-gray-700">
                  Variance
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`${ctqId}-MedianTest`}
                  checked={ContCTQHypTestData[ctqId]?.enableMedianTest || false}
                  onCheckedChange={(checked) => updateContCTQHypTestDataField(ctqId, "enableMedianTest", checked)}
                />
                <Label htmlFor={`${ctqId}-MedianTest`} className="text-sm font-medium text-gray-700">
                  Median
                </Label>
              </div>
            </div>
          </div>

          {currentTestType === "One Sample Hyp-Test" && (  
            <div className="flex flex-wrap gap-4 items-end"> {/* Changed from space-y-3 to flexbox */}
                {ContCTQHypTestData[ctqId]?.enableMeanTest && (
                    <div className="flex-1 min-w-[100px]"> {/* Added flex-1 and min-width for responsiveness */}
                        <Label>Target value for mean:</Label>
                        <Input
                            type="number"
                            value={ContCTQHypTestData[ctqId]?.targetMean || 0}
                            onChange={(e) => updateContCTQHypTestDataField(
                                ctqId, 
                                "targetMean", 
                                parseFloat(e.target.value) || 0
                            )}
                            placeholder="Enter target mean"
                            className="mt-1"
                        />
                    </div>
                )}
                {ContCTQHypTestData[ctqId]?.enableVarianceTest && (
                    <div className="flex-1 min-w-[100px]"> {/* Added flex-1 and min-width */}
                        <Label>Target value for variance:</Label>
                        <Input
                            type="number"
                            min="-1"
                            value={ContCTQHypTestData[ctqId]?.targetVariance || 0}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              if (isNaN(value)) {
                                  // If input is empty or invalid number, update to 0 or undefined based on your state logic
                                  updateContCTQHypTestDataField(ctqId, "targetVariance", 0); 
                              } else if (value < 0) {
                                  // Display toast message for negative input
                                  toast({
                                    title: "Target Variance",
                                    description: `Variance cannot be negative. Please enter a non-negative value.`
                                  });
                                  // Optionally, keep the previous valid value or set to 0
                                  updateContCTQHypTestDataField(ctqId, "targetVariance", 0); // Reset to 0
                              } else {
                                  // Valid non-negative number
                                  updateContCTQHypTestDataField(ctqId, "targetVariance", value);
                              }
                            }}
                            placeholder="Enter target variance"
                            className="mt-1"
                        />
                    </div>
                )}
                {ContCTQHypTestData[ctqId]?.enableMedianTest && (
                    <div className="flex-1 min-w-[100px]"> {/* Added flex-1 and min-width */}
                        <Label>Target value for median:</Label>
                        <Input
                            type="number"
                            value={ContCTQHypTestData[ctqId]?.targetMedian || 0}
                            onChange={(e) => updateContCTQHypTestDataField(
                                ctqId, 
                                "targetMedian", 
                                parseFloat(e.target.value) || 0
                            )}
                            placeholder="Enter target median"
                            className="mt-1"
                        />
                    </div>
                )}
            </div>
          )}    

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="significance">Significance Level (α)</Label>
              <Select value={significanceLevel} onValueChange={setSignificanceLevel}>
                <SelectTrigger id="significance">
                  <SelectValue placeholder="Select significance level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.01">1%</SelectItem>
                  <SelectItem value="0.05">5%</SelectItem>
                  <SelectItem value="0.10">10%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="alternative">Alternative Hypothesis</Label>
              <Select value={alternative} onValueChange={setAlternative}>
                <SelectTrigger id="alternative">
                  <SelectValue placeholder="Select alternative" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Different">Different</SelectItem>
                  <SelectItem value="Less than">Less than</SelectItem>
                  <SelectItem value="Greater than">Greater than</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="variables">Select Variables</Label>
            <div className="grid grid-cols-2 gap-4">
              <Select value={variable1} onValueChange={setVariable1}>
                <SelectTrigger>
                  <SelectValue placeholder="Select first variable" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Processing Time (Before)">Processing Time (Before)</SelectItem>
                  <SelectItem value="Defect Rate (Before)">Defect Rate (Before)</SelectItem>
                  <SelectItem value="Cycle Time (Before)">Cycle Time (Before)</SelectItem>
                </SelectContent>
              </Select>
              {currentTestType !== "One Sample Hyp-Test" && (
                <Select value={variable2} onValueChange={setVariable2}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select second variable" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Processing Time (After)">Processing Time (After)</SelectItem>
                    <SelectItem value="Defect Rate (After)">Defect Rate (After)</SelectItem>
                    <SelectItem value="Cycle Time (After)">Cycle Time (After)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Data Input Section for One Sample Hypothesis Test */}
          {currentTestType === "One Sample Hyp-Test" && (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-medium mb-2">Data Input</label>
                  {/* Paste from Excel Section */}
                  <div className="flex gap-2 mt-2">
                    <Button
                      onClick={async () => {
                        try {
                          const clipboardData = await navigator.clipboard.readText();
                          if (clipboardData.trim()) {
                            // Create a synthetic paste event
                            const syntheticEvent = {
                              preventDefault: () => {},
                              clipboardData: {
                                getData: (format: string) => clipboardData
                              }
                            };
                            handlePasteData(syntheticEvent as any);
                          }
                        } catch (error) {
                          toast({
                            title: "Clipboard Access",
                            description: "Please use Ctrl+V to paste data or manually enter values.",
                          });
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="border-gray-400 text-gray-700 hover:bg-gray-100"
                    >
                      📋 Paste data from Excel
                    </Button>
                  </div>
                </div>
                
                <div className="bg-blue-50 p-3 rounded-md border border-blue-200 text-sm mb-4">
                  <div className="text-blue-800 font-medium mb-1">Excel Import Format:</div>
                  <div className="text-blue-700">Copy single column of numeric values from Excel</div>
                  <div className="text-blue-600 text-xs mt-1">
                    Ctrl+V (Cmd+V on Mac) to paste | Ctrl+Z (Cmd+Z on Mac) to undo | Click table cell to paste
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-3">
                  Enter data values and click Add, then Save Data to persist to database
                </p>
                
                {/* Data Table */}
                <div className="border rounded-md">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Index
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data Value
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {dataPoints.length === 0 ? (
                        
                            <div 
                              className="cursor-pointer hover:bg-blue-50 rounded"
                              onClick={() => document.getElementById('add-data-input')?.focus()}
                              onPaste={(e) => handlePasteData(e)}
                              tabIndex={0}
                              title="Click to focus input or paste data here"
                            >
                            
                            </div>
                          
                      ) : (
                        dataPoints.map((point, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {point.indexNumber}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {editingCell === index ? (
                                <Input
                                  type="number"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      saveEdit(index);
                                    } else if (e.key === 'Escape') {
                                      cancelEdit();
                                    }
                                  }}
                                  onBlur={() => saveEdit(index)}
                                  className="w-20 h-7 text-xs"
                                  step="any"
                                  autoFocus
                                />
                              ) : (
                                <div 
                                  className="cursor-pointer hover:bg-blue-50 p-1 rounded"
                                  onClick={() => startEditing(index, point.dataValue)}
                                  onPaste={(e) => handleCellPaste(e, index)}
                                  tabIndex={0}
                                  title="Click to edit this value"
                                >
                                  {point.dataValue}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteDataPoint(index)}
                                className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                title="Delete this data point"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                      
                      {/* Add Data Row - Integrated within the main table */}
                      <tr className="bg-blue-50 border-t-2 border-blue-200">
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {dataPoints.length + 1}
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            id="add-data-input"
                            type="number"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                addDataPoint(inputValue);
                              }
                            }}
                            onPaste={(e) => {
                              e.preventDefault();
                              const pastedData = e.clipboardData.getData('text/plain');
                              const lines = pastedData.trim().split('\n');
                              
                              if (lines.length > 1) {
                                // Multiple values - use the general paste handler
                                handlePasteData(e);
                              } else {
                                // Single value - set it in the input field
                                const value = lines[0]?.trim();
                                if (value) {
                                  setInputValue(value);
                                }
                              }
                            }}
                            placeholder="Enter numeric value"
                            className="w-full"
                            step="any"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Button 
                            onClick={() => addDataPoint(inputValue)}
                            disabled={!inputValue.trim()}
                            size="sm"
                          >
                            Add
                          </Button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Excel Import Instructions */}
                <div className="text-xs text-blue-600 mt-2 space-y-1">
                  <div><strong>Excel Import Instructions:</strong></div>
                  <div>• <strong>Focus a cell</strong> by clicking on any measurement input field</div>
                  <div>• <strong>Paste data</strong> using Ctrl+V (or Cmd+V on Mac) - data will start from the focused cell</div>
                  <div>• <strong>Undo changes</strong> using Ctrl+Z (or Cmd+Z on Mac) after pasting</div>
                  <div>• <strong>Data will automatically create new rows</strong> if needed</div>
                </div>
                
                {dataPoints.length > 0 && (
                  <div className="text-sm text-gray-600 mt-2">
                    <strong>Sample size:</strong> {dataPoints.length} data points
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <Button className="w-full" onClick={handleRunTest}>
              Run Test
            </Button>
          </div>

          <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
            <h4 className="font-medium text-sm mb-2">Results</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-600">t-statistic:</div>
              <div className="font-medium">{testResult.tStatistic}</div>
              <div className="text-gray-600">p-value:</div>
              <div className="font-medium text-green-600">{testResult.pValue}</div>
              <div className="text-gray-600">Conclusion:</div>
              <div className="font-medium text-green-600">{testResult.conclusion}</div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {testResult.explanation}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}