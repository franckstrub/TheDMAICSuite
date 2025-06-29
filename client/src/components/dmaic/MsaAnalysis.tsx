import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Save, Plus, Trash2, Calculator, Undo2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import MSAAttributeStatisticsDisplay from "./MSAAttributeStatisticsDisplay";
import MSAContinuousStatisticsDisplay from "./MSAContinuousStatisticsDisplay";

// Interface for Attribute Agreement Analysis data (OK/KO values)
interface AttributeAnalysisRow {
  unitNumber: number;
  reference: "OK" | "KO" | "";
  app1_rep1: "OK" | "KO";
  app1_rep2: "OK" | "KO";
  app1_rep3: "OK" | "KO" | "";
  app2_rep1: "OK" | "KO";
  app2_rep2: "OK" | "KO";
  app2_rep3: "OK" | "KO" | "";
  app3_rep1: "OK" | "KO" | "";
  app3_rep2: "OK" | "KO" | "";
  app3_rep3: "OK" | "KO" | "";
}

// Interface for Continuous Gage R&R data (real numbers or null)
interface ContinuousAnalysisRow {
  unitNumber: number;
  app1_rep1: number | null;
  app1_rep2: number | null;
  app1_rep3: number | null;
  app2_rep1: number | null;
  app2_rep2: number | null;
  app2_rep3: number | null;
  app3_rep1: number | null;
  app3_rep2: number | null;
  app3_rep3: number | null;
}

interface AttributeMsaData {
  id?: number;
  ctq: string;
  unitAppraisedType: string;
  unitAppraisedTypeOther: string;
  appraiser1Name: string;
  appraiser2Name: string;
  appraiser3Name: string;
  agreementAnalysisData: AttributeAnalysisRow[];
  studyDateTime: string;
  justification?: string;
}

interface ContinuousMsaData {
  id?: number;
  ctq: string;
  appraiser1Name: string;
  appraiser2Name: string;
  appraiser3Name: string;
  gageRRData: ContinuousAnalysisRow[];
  sigmaMultiplier: number;
  tolerance?: number;
  repetitions: number; // 2 or 3 repetitions
  numberOfAppraisers: number; // 2 or 3 appraisers
  studyDateTime: string;
  justification?: string;
}

interface CtqWithType {
  ctq: string;
  ctqType: "Attribute" | "Continuous";
}

interface MsaAnalysisProps {
  projectId: number;
}

export default function MsaAnalysis({ projectId }: MsaAnalysisProps) {
  const { toast } = useToast();
  const [attributeMsaData, setAttributeMsaData] = useState<{ [ctq: string]: AttributeMsaData }>({});
  const [continuousMsaData, setContinuousMsaData] = useState<{ [ctq: string]: ContinuousMsaData }>({});
  const [undoStates, setUndoStates] = useState<{ [ctq: string]: ContinuousMsaData }>({});
  const [redoStates, setRedoStates] = useState<{ [ctq: string]: ContinuousMsaData }>({});
  const [showUndoButton, setShowUndoButton] = useState<{ [ctq: string]: boolean }>({});
  const [showRedoButton, setShowRedoButton] = useState<{ [ctq: string]: boolean }>({});
  const [activeTab, setActiveTab] = useState<string>("");
  const [showStatistics, setShowStatistics] = useState<{ [ctq: string]: boolean }>({});
  const [showContinuousStatistics, setShowContinuousStatistics] = useState<{ [ctq: string]: boolean }>({});
  const [hasCalculatedStatistics, setHasCalculatedStatistics] = useState<{ [ctq: string]: boolean }>({});
  const [attributeAnalysisType, setAttributeAnalysisType] = useState<{ [ctq: string]: 'simple' | 'agreement' }>({});
  const [continuousAnalysisType, setContinuousAnalysisType] = useState<{ [ctq: string]: 'simple' | 'gage_rr' }>({});
  const [showMsaContent, setShowMsaContent] = useState<{ [ctq: string]: boolean }>({});

  // Load last active tab and statistics state from localStorage on component mount
  useEffect(() => {
    const savedTab = localStorage.getItem(`msa-active-tab-${projectId}`);
    if (savedTab) {
      setActiveTab(savedTab);
    }

    // Load saved statistics calculation state
    const savedStatsState = localStorage.getItem(`msa-calculated-stats-${projectId}`);
    if (savedStatsState) {
      try {
        const parsedState = JSON.parse(savedStatsState);
        setHasCalculatedStatistics(parsedState);
        // Show statistics for CTQs that have been calculated before
        setShowStatistics(parsedState);
      } catch (error) {
        console.warn("Failed to parse saved statistics state:", error);
      }
    }

    // Load saved attribute statistics show/hide state
    const savedAttributeShowState = localStorage.getItem(`msa-show-attribute-stats-${projectId}`);
    if (savedAttributeShowState) {
      try {
        const parsedState = JSON.parse(savedAttributeShowState);
        setShowStatistics(prev => ({ ...prev, ...parsedState }));
      } catch (error) {
        console.warn("Failed to parse saved attribute statistics show state:", error);
      }
    }

    // Load saved continuous statistics show/hide state
    const savedContinuousShowState = localStorage.getItem(`msa-show-continuous-stats-${projectId}`);
    if (savedContinuousShowState) {
      try {
        const parsedState = JSON.parse(savedContinuousShowState);
        setShowContinuousStatistics(parsedState);
      } catch (error) {
        console.warn("Failed to parse saved continuous statistics show state:", error);
      }
    }

    // Load saved attribute analysis type choices
    const savedAnalysisTypes = localStorage.getItem(`msa-analysis-types-${projectId}`);
    if (savedAnalysisTypes) {
      try {
        const parsedTypes = JSON.parse(savedAnalysisTypes);
        setAttributeAnalysisType(parsedTypes);
      } catch (error) {
        console.warn("Failed to parse saved analysis types:", error);
      }
    }

    // Load saved continuous analysis type choices
    const savedContinuousTypes = localStorage.getItem(`msa-continuous-types-${projectId}`);
    if (savedContinuousTypes) {
      try {
        const parsedTypes = JSON.parse(savedContinuousTypes);
        setContinuousAnalysisType(parsedTypes);
      } catch (error) {
        console.warn("Failed to parse saved continuous analysis types:", error);
      }
    }

    // Load saved MSA show/hide state for White Belt and Yellow Belt projects
    const savedMsaShowState = localStorage.getItem(`msa-show-content-${projectId}`);
    if (savedMsaShowState) {
      try {
        const parsedState = JSON.parse(savedMsaShowState);
        setShowMsaContent(parsedState);
      } catch (error) {
        console.warn("Failed to parse saved MSA show content state:", error);
      }
    }
  }, [projectId]);

  // Save attribute statistics show/hide state to localStorage whenever it changes
  useEffect(() => {
    if (Object.keys(showStatistics).length > 0) {
      localStorage.setItem(`msa-show-attribute-stats-${projectId}`, JSON.stringify(showStatistics));
    }
  }, [showStatistics, projectId]);

  // Save continuous statistics show/hide state to localStorage whenever it changes
  useEffect(() => {
    if (Object.keys(showContinuousStatistics).length > 0) {
      localStorage.setItem(`msa-show-continuous-stats-${projectId}`, JSON.stringify(showContinuousStatistics));
    }
  }, [showContinuousStatistics, projectId]);

  // Save MSA show/hide state to localStorage whenever it changes
  useEffect(() => {
    if (Object.keys(showMsaContent).length > 0) {
      localStorage.setItem(`msa-show-content-${projectId}`, JSON.stringify(showMsaContent));
    }
  }, [showMsaContent, projectId]);

  // Add keyboard shortcut support for paste and undo functionality
  useEffect(() => {
    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInInputField = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');

      // Handle Ctrl+V for paste - only when not in input field
      if ((event.ctrlKey || event.metaKey) && event.key === 'v' && activeTab && !isInInputField) {
        // Trigger paste for the active CTQ
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
            
            handlePasteData(activeTab, syntheticEvent);
          }
        }).catch(() => {
          toast({
            title: "Clipboard Access",
            description: "Please use the 'Paste from Excel' button or paste directly into the table.",
            variant: "default",
          });
        });
      }

      // Handle Ctrl+Z for undo - works both in and outside input fields
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && activeTab) {
        if (undoStates[activeTab] && showUndoButton[activeTab]) {
          event.preventDefault();
          handleUndo(activeTab);
        }
      }
    };

    document.addEventListener('keydown', handleKeyboardShortcut);
    return () => document.removeEventListener('keydown', handleKeyboardShortcut);
  }, [activeTab, undoStates, showUndoButton]);



  // Save active tab to localStorage whenever it changes
  const handleTabChange = (tabValue: string) => {
    setActiveTab(tabValue);
    localStorage.setItem(`msa-active-tab-${projectId}`, tabValue);
  };

  // Function to toggle statistics visibility and mark as calculated
  const toggleStatistics = async (ctq: string) => {
    const newShowState = !showStatistics[ctq];
    
    setShowStatistics(prev => ({
      ...prev,
      [ctq]: newShowState
    }));

    // If showing statistics, mark as calculated and persist
    if (newShowState) {
      const newCalculatedState = {
        ...hasCalculatedStatistics,
        [ctq]: true
      };
      setHasCalculatedStatistics(newCalculatedState);
      localStorage.setItem(`msa-calculated-stats-${projectId}`, JSON.stringify(newCalculatedState));
    }

    try {
      await apiRequest('PATCH', `/api/projects/${projectId}/msa-analysis/${ctq}/statistics`, {
        showStatistics: newShowState
      });
    } catch (error) {
      console.error('Failed to save MSA statistics toggle state:', error);
      // Revert the state on error
      setShowStatistics(prev => ({
        ...prev,
        [ctq]: !newShowState
      }));
    }
  }

  const toggleContinuousStatistics = async (ctq: string) => {
    const newState = !showContinuousStatistics[ctq];
    
    setShowContinuousStatistics(prev => ({
      ...prev,
      [ctq]: newState
    }));

    try {
      await apiRequest('PATCH', `/api/projects/${projectId}/msa-analysis/${ctq}/statistics`, {
        showStatistics: newState
      });
    } catch (error) {
      console.error('Failed to save MSA continuous statistics toggle state:', error);
      // Revert the state on error
      setShowContinuousStatistics(prev => ({
        ...prev,
        [ctq]: !newState
      }));
    }
  };

  // Generate default attribute analysis data with 20 rows (all empty for real data entry)
  const generateDefaultAttributeData = (): AttributeAnalysisRow[] => {
    return Array.from({ length: 20 }, (_, index) => ({
      unitNumber: index + 1,
      reference: "" as const,
      app1_rep1: "OK" as "OK" | "KO",
      app1_rep2: "OK" as "OK" | "KO", 
      app1_rep3: "" as const,
      app2_rep1: "OK" as "OK" | "KO",
      app2_rep2: "OK" as "OK" | "KO",
      app2_rep3: "" as const,
      app3_rep1: "" as const,
      app3_rep2: "" as const,
      app3_rep3: "" as const,
    }));
  };

  // Generate default continuous analysis data with 10 rows (all null values for empty cells)
  const generateDefaultContinuousData = (): ContinuousAnalysisRow[] => {
    return Array.from({ length: 10 }, (_, index) => ({
      unitNumber: index + 1,
      app1_rep1: null,
      app1_rep2: null,
      app1_rep3: null,
      app2_rep1: null,
      app2_rep2: null,
      app2_rep3: null,
      app3_rep1: null,
      app3_rep2: null,
      app3_rep3: null,
    }));
  };

  // Load CTQs with types from CTS characteristics
  const { data: ctsData, isLoading: ctsLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/cts-characteristics`],
    enabled: !!projectId,
  });

  // Load project data to get project type
  const { data: projectData, isLoading: projectLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  // Load existing MSA data (both attribute and continuous)
  const { data: msaDataResponse, isLoading: msaLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/msa-analysis`],
    enabled: !!projectId,
  });

  // Set default active tab when CTQ list changes and no tab is selected
  useEffect(() => {
    const ctqList = getCtqsWithTypes();
    if (ctqList.length > 0) {
      // Always ensure we have an active tab when CTQs are available
      if (!activeTab || !ctqList.some(ctq => ctq.ctq === activeTab)) {
        // Set to saved tab if valid, otherwise first CTQ
        const savedTab = localStorage.getItem(`msa-active-tab-${projectId}`);
        const ctqNames = ctqList.map(c => c.ctq);
        if (savedTab && ctqNames.includes(savedTab)) {
          setActiveTab(savedTab);
        } else {
          const firstCtq = ctqList[0].ctq;
          setActiveTab(firstCtq);
          localStorage.setItem(`msa-active-tab-${projectId}`, firstCtq);
        }
      }
    }
  }, [ctsData, msaDataResponse, projectId, activeTab]);

  // Save attribute MSA mutation
  const saveAttributeMsaMutation = useMutation({
    mutationFn: async (data: AttributeMsaData) => {
      const payload = {
        projectId,
        ...data,
        agreementAnalysisData: JSON.stringify(data.agreementAnalysisData),
        studyDateTime: data.studyDateTime || new Date().toISOString(),
      };
      
      if (data.id) {
        return apiRequest("PUT", `/api/projects/${projectId}/attribute-msa/${data.id}`, payload);
      } else {
        return apiRequest("POST", `/api/projects/${projectId}/attribute-msa`, payload);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Attribute MSA analysis saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/msa-analysis`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save attribute MSA analysis: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Save continuous MSA mutation
  const saveContinuousMsaMutation = useMutation({
    mutationFn: async (data: ContinuousMsaData) => {
      const payload = {
        projectId,
        ...data,
        gageRRData: JSON.stringify(data.gageRRData),
        studyDateTime: data.studyDateTime || new Date().toISOString(),
      };
      
      if (data.id) {
        return apiRequest("PUT", `/api/projects/${projectId}/continuous-msa/${data.id}`, payload);
      } else {
        return apiRequest("POST", `/api/projects/${projectId}/continuous-msa`, payload);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Continuous MSA analysis saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/msa-analysis`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save continuous MSA analysis: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Get CTQs with types from CTS characteristics
  const getCtqsWithTypes = (): CtqWithType[] => {
    if (ctsData && typeof ctsData === 'object' && 'characteristics' in ctsData) {
      return (ctsData as any).characteristics.map((item: any) => ({
        ctq: item.ctq,
        ctqType: item.ctqType || "Continuous"
      }));
    }
    return [];
  };

  // Initialize MSA data when CTQs and MSA data are loaded
  useEffect(() => {
    const ctqsWithTypes = getCtqsWithTypes();
    if (ctqsWithTypes.length > 0) {
      const initialAttributeData: { [ctq: string]: AttributeMsaData } = {};
      const initialContinuousData: { [ctq: string]: ContinuousMsaData } = {};
      
      ctqsWithTypes.forEach((ctqItem: CtqWithType) => {
        const { ctq, ctqType } = ctqItem;
        
        if (ctqType === "Attribute") {
          const existingMsa = msaDataResponse && (msaDataResponse as any)?.attributeMsa?.find((msa: any) => msa.ctq === ctq);
          
          initialAttributeData[ctq] = existingMsa ? {
            ...existingMsa,
            agreementAnalysisData: existingMsa.agreementAnalysisData ? 
              JSON.parse(existingMsa.agreementAnalysisData) : 
              generateDefaultAttributeData(),
          } : {
            ctq: ctq,
            unitAppraisedType: "Part",
            unitAppraisedTypeOther: "",
            appraiser1Name: "",
            appraiser2Name: "",
            appraiser3Name: "",
            agreementAnalysisData: generateDefaultAttributeData(),
            studyDateTime: new Date().toISOString(),
          };
        } else {
          const existingMsa = msaDataResponse && (msaDataResponse as any)?.continuousMsa?.find((msa: any) => msa.ctq === ctq);
          
          initialContinuousData[ctq] = existingMsa ? {
            ...existingMsa,
            gageRRData: existingMsa.gageRRData ? 
              (typeof existingMsa.gageRRData === 'string' ? 
                JSON.parse(existingMsa.gageRRData) : 
                existingMsa.gageRRData) : 
              generateDefaultContinuousData(),
            sigmaMultiplier: existingMsa.sigmaMultiplier || 6,
            tolerance: existingMsa.tolerance,
            repetitions: existingMsa.repetitions || 2,
            numberOfAppraisers: existingMsa.numberOfAppraisers || 2,
          } : {
            ctq: ctq,
            appraiser1Name: "",
            appraiser2Name: "",
            appraiser3Name: "",
            gageRRData: generateDefaultContinuousData(),
            sigmaMultiplier: 6,
            tolerance: undefined,
            repetitions: 2,
            numberOfAppraisers: 2,
            studyDateTime: new Date().toISOString(),
          };
        }
      });
      
      setAttributeMsaData(initialAttributeData);
      setContinuousMsaData(initialContinuousData);
      
      // Ensure we have an active tab when CTQs are available
      if (ctqsWithTypes.length > 0 && !activeTab) {
        setActiveTab(ctqsWithTypes[0].ctq);
      }
    }
  }, [ctsData, msaDataResponse]);

  // Helper functions for attribute MSA
  const updateAttributeMsaField = (ctq: string, field: keyof AttributeMsaData, value: any) => {
    setAttributeMsaData(prev => ({
      ...prev,
      [ctq]: {
        ...prev[ctq],
        [field]: value,
      }
    }));
  };

  const updateAttributeAnalysisRow = (ctq: string, rowIndex: number, field: keyof AttributeAnalysisRow, value: "OK" | "KO" | "") => {
    setAttributeMsaData(prev => {
      const updatedData = [...(prev[ctq]?.agreementAnalysisData || [])];
      if (updatedData[rowIndex]) {
        updatedData[rowIndex] = {
          ...updatedData[rowIndex],
          [field]: value,
        };
      }
      return {
        ...prev,
        [ctq]: {
          ...prev[ctq],
          agreementAnalysisData: updatedData,
        }
      };
    });
  };

  const addAttributeAnalysisRow = (ctq: string) => {
    setAttributeMsaData(prev => {
      const currentData = prev[ctq]?.agreementAnalysisData || [];
      const newRow: AttributeAnalysisRow = {
        unitNumber: currentData.length + 1,
        reference: "",
        app1_rep1: "OK",
        app1_rep2: "OK",
        app1_rep3: "",
        app2_rep1: "OK",
        app2_rep2: "OK",
        app2_rep3: "",
        app3_rep1: "",
        app3_rep2: "",
        app3_rep3: "",
      };
      
      return {
        ...prev,
        [ctq]: {
          ...prev[ctq],
          agreementAnalysisData: [...currentData, newRow],
        }
      };
    });
  };

  const removeAttributeAnalysisRow = (ctq: string, rowIndex: number) => {
    setAttributeMsaData(prev => {
      const updatedData = [...(prev[ctq]?.agreementAnalysisData || [])];
      updatedData.splice(rowIndex, 1);
      
      // Renumber the remaining rows
      updatedData.forEach((row, index) => {
        row.unitNumber = index + 1;
      });
      
      return {
        ...prev,
        [ctq]: {
          ...prev[ctq],
          agreementAnalysisData: updatedData,
        }
      };
    });
  };

  // Helper functions for continuous MSA
  const updateContinuousMsaField = (ctq: string, field: keyof ContinuousMsaData, value: any) => {
    setContinuousMsaData(prev => ({
      ...prev,
      [ctq]: {
        ...prev[ctq],
        [field]: value,
      }
    }));
  };

  const updateContinuousAnalysisRow = (ctq: string, rowIndex: number, field: keyof ContinuousAnalysisRow, value: string | number) => {
    setContinuousMsaData(prev => {
      const updatedData = [...(prev[ctq]?.gageRRData || [])];
      if (updatedData[rowIndex]) {
        // Validate numeric input - if not a valid number, set to null
        let numericValue: number | null = null;
        if (value !== '' && value !== null && value !== undefined) {
          const parsed = typeof value === 'string' ? parseFloat(value) : value;
          if (!isNaN(parsed) && isFinite(parsed)) {
            numericValue = parsed;
          }
        }
        
        updatedData[rowIndex] = {
          ...updatedData[rowIndex],
          [field]: numericValue,
        };
      }
      return {
        ...prev,
        [ctq]: {
          ...prev[ctq],
          gageRRData: updatedData,
        }
      };
    });
  };

  // Handle focused cell paste for continuous MSA
  const handleFocusedCellPaste = (ctq: string, rowIndex: number, field: keyof ContinuousAnalysisRow, pasteData: string) => {
    try {
      // Save current state for undo (only if data exists)
      if (continuousMsaData[ctq]) {
        setUndoStates(prev => ({
          ...prev,
          [ctq]: JSON.parse(JSON.stringify(continuousMsaData[ctq]))
        }));
      }
      
      // Parse tab-separated or comma-separated values
      const rows = pasteData.trim().split('\n');
      const parsedData: (number | null)[][] = [];
      
      rows.forEach(row => {
        // Split by tabs first (Excel default), then by commas if no tabs
        const cells = row.includes('\t') ? row.split('\t') : row.split(',');
        const rowData: (number | null)[] = [];
        
        cells.forEach(cell => {
          const trimmedCell = cell.trim();
          if (trimmedCell === '' || trimmedCell === '-' || trimmedCell.toLowerCase() === 'null') {
            rowData.push(null);
          } else {
            const parsed = parseFloat(trimmedCell);
            rowData.push(!isNaN(parsed) && isFinite(parsed) ? parsed : null);
          }
        });
        
        if (rowData.length > 0) {
          parsedData.push(rowData);
        }
      });
      
      if (parsedData.length === 0) {
        toast({
          title: "No Data Found",
          description: "No valid data found in clipboard. Please copy measurement data from Excel first.",
          variant: "destructive",
        });
        return;
      }
      
      // Apply the pasted data starting from the focused cell
      setContinuousMsaData(prev => {
        const currentData = [...(prev[ctq]?.gageRRData || [])];
        const repetitions = prev[ctq]?.repetitions || 2;
        const numberOfAppraisers = prev[ctq]?.numberOfAppraisers || 2;
        
        // Define field order for mapping
        const fields = ['app1_rep1', 'app1_rep2'];
        if (repetitions === 3) fields.push('app1_rep3');
        fields.push('app2_rep1', 'app2_rep2');
        if (repetitions === 3) fields.push('app2_rep3');
        if (numberOfAppraisers === 3) {
          fields.push('app3_rep1', 'app3_rep2');
          if (repetitions === 3) fields.push('app3_rep3');
        }
        
        // Find starting column index
        const startColIndex = fields.indexOf(field as string);
        if (startColIndex === -1) return prev;
        
        // Apply pasted data starting from the focused cell position
        parsedData.forEach((rowData, pasteRowIndex) => {
          const targetRowIndex = rowIndex + pasteRowIndex;
          
          // Ensure we don't exceed existing rows, create new rows if needed
          while (currentData.length <= targetRowIndex) {
            const newRow: ContinuousAnalysisRow = {
              unitNumber: currentData.length + 1,
              app1_rep1: null,
              app1_rep2: null,
              app1_rep3: null,
              app2_rep1: null,
              app2_rep2: null,
              app2_rep3: null,
              app3_rep1: null,
              app3_rep2: null,
              app3_rep3: null,
            };
            currentData.push(newRow);
          }
          
          if (targetRowIndex < currentData.length) {
            const row = { ...currentData[targetRowIndex] };
            
            // For single column paste (most common case), only update the focused field
            if (rowData.length === 1) {
              const fieldName = field as keyof ContinuousAnalysisRow;
              (row as any)[fieldName] = rowData[0];
            } else {
              // For multi-column paste, apply data to consecutive cells starting from the focused position
              rowData.forEach((cellValue, pasteColIndex) => {
                const targetColIndex = startColIndex + pasteColIndex;
                if (targetColIndex < fields.length) {
                  const fieldName = fields[targetColIndex] as keyof ContinuousAnalysisRow;
                  (row as any)[fieldName] = cellValue;
                }
              });
            }
            
            currentData[targetRowIndex] = row;
          }
        });
        
        return {
          ...prev,
          [ctq]: {
            ...prev[ctq],
            gageRRData: currentData,
          }
        };
      });
      
      // Show undo button and clear any existing redo state
      setShowUndoButton(prev => ({
        ...prev,
        [ctq]: true
      }));
      
      setShowRedoButton(prev => ({
        ...prev,
        [ctq]: false
      }));
      
      setRedoStates(prev => {
        const newStates = { ...prev };
        delete newStates[ctq];
        return newStates;
      });
      
      toast({
        title: "Data Pasted Successfully",
        description: `Imported ${parsedData.length} rows starting from focused cell`,
      });
      
    } catch (error) {
      toast({
        title: "Paste Error",
        description: "Failed to parse pasted data. Please ensure data is in a valid format.",
        variant: "destructive",
      });
    }
  };

  // Handle Excel paste functionality
  const handlePasteData = (ctq: string, event: React.ClipboardEvent) => {
    event.preventDefault();
    
    const pasteData = event.clipboardData.getData('text');
    if (!pasteData.trim()) {
      toast({
        title: "No Data Found",
        description: "No data found in clipboard. Please copy data from Excel first.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Save current state for undo (only if data exists)
      if (continuousMsaData[ctq]) {
        setUndoStates(prev => ({
          ...prev,
          [ctq]: JSON.parse(JSON.stringify(continuousMsaData[ctq]))
        }));
      }
      
      // Parse tab-separated or comma-separated values
      const rows = pasteData.trim().split('\n');
      const parsedData: (number | null)[][] = [];
      
      rows.forEach(row => {
        // Split by tabs first (Excel default), then by commas if no tabs
        const cells = row.includes('\t') ? row.split('\t') : row.split(',');
        const rowData: (number | null)[] = [];
        
        cells.forEach(cell => {
          const trimmedCell = cell.trim();
          if (trimmedCell === '' || trimmedCell === '-' || trimmedCell.toLowerCase() === 'null') {
            rowData.push(null);
          } else {
            const parsed = parseFloat(trimmedCell);
            rowData.push(!isNaN(parsed) && isFinite(parsed) ? parsed : null);
          }
        });
        
        if (rowData.length > 0) {
          parsedData.push(rowData);
        }
      });
      
      if (parsedData.length === 0) {
        toast({
          title: "No Data Found",
          description: "No valid data found in clipboard. Please copy measurement data from Excel first.",
          variant: "destructive",
        });
        return;
      }
      
      // Apply the pasted data to the table
      setContinuousMsaData(prev => {
        const currentData = [...(prev[ctq]?.gageRRData || [])];
        const repetitions = prev[ctq]?.repetitions || 2;
        const numberOfAppraisers = prev[ctq]?.numberOfAppraisers || 2;
        
        // Determine expected columns based on current settings
        const expectedColumns = (repetitions * numberOfAppraisers);
        
        parsedData.forEach((rowData, rowIndex) => {
          if (rowIndex < currentData.length && rowData.length > 0) {
            const row = { ...currentData[rowIndex] };
            
            // Map data to the correct fields based on current appraiser/repetition settings
            let colIndex = 0;
            
            // Appraiser 1 data
            if (colIndex < rowData.length) row.app1_rep1 = rowData[colIndex++];
            if (colIndex < rowData.length) row.app1_rep2 = rowData[colIndex++];
            if (repetitions === 3 && colIndex < rowData.length) row.app1_rep3 = rowData[colIndex++];
            
            // Appraiser 2 data
            if (colIndex < rowData.length) row.app2_rep1 = rowData[colIndex++];
            if (colIndex < rowData.length) row.app2_rep2 = rowData[colIndex++];
            if (repetitions === 3 && colIndex < rowData.length) row.app2_rep3 = rowData[colIndex++];
            
            // Appraiser 3 data (if enabled)
            if (numberOfAppraisers === 3) {
              if (colIndex < rowData.length) row.app3_rep1 = rowData[colIndex++];
              if (colIndex < rowData.length) row.app3_rep2 = rowData[colIndex++];
              if (repetitions === 3 && colIndex < rowData.length) row.app3_rep3 = rowData[colIndex++];
            }
            
            currentData[rowIndex] = row;
          }
        });
        
        return {
          ...prev,
          [ctq]: {
            ...prev[ctq],
            gageRRData: currentData,
          }
        };
      });
      
      // Show undo button
      setShowUndoButton(prev => ({
        ...prev,
        [ctq]: true
      }));
      
      toast({
        title: "Data Pasted Successfully",
        description: `Imported ${parsedData.length} rows of measurement data`,
      });
      
    } catch (error) {
      toast({
        title: "Paste Error",
        description: "Failed to parse pasted data. Please ensure data is in a valid format.",
        variant: "destructive",
      });
    }
  };

  // Handle undo functionality
  const handleUndo = (ctq: string) => {
    if (undoStates[ctq]) {
      // Save current state for redo before undoing
      setRedoStates(prev => ({
        ...prev,
        [ctq]: JSON.parse(JSON.stringify(continuousMsaData[ctq]))
      }));
      
      setContinuousMsaData(prev => ({
        ...prev,
        [ctq]: undoStates[ctq]
      }));
      
      // Hide undo button and show redo button
      setShowUndoButton(prev => ({
        ...prev,
        [ctq]: false
      }));
      
      setShowRedoButton(prev => ({
        ...prev,
        [ctq]: true
      }));
      
      setUndoStates(prev => {
        const newStates = { ...prev };
        delete newStates[ctq];
        return newStates;
      });
      
      toast({
        title: "Undo Successful",
        description: "Restored previous table data",
      });
    }
  };

  // Handle redo functionality
  const handleRedo = (ctq: string) => {
    if (redoStates[ctq]) {
      // Save current state for undo before redoing
      setUndoStates(prev => ({
        ...prev,
        [ctq]: JSON.parse(JSON.stringify(continuousMsaData[ctq]))
      }));
      
      setContinuousMsaData(prev => ({
        ...prev,
        [ctq]: redoStates[ctq]
      }));
      
      // Show undo button and hide redo button
      setShowUndoButton(prev => ({
        ...prev,
        [ctq]: true
      }));
      
      setShowRedoButton(prev => ({
        ...prev,
        [ctq]: false
      }));
      
      setRedoStates(prev => {
        const newStates = { ...prev };
        delete newStates[ctq];
        return newStates;
      });
      
      toast({
        title: "Redo Successful",
        description: "Restored redone table data",
      });
    }
  };

  const addContinuousAnalysisRow = (ctq: string) => {
    setContinuousMsaData(prev => {
      const currentData = prev[ctq]?.gageRRData || [];
      const newRow: ContinuousAnalysisRow = {
        unitNumber: currentData.length + 1,
        app1_rep1: null as number | null,
        app1_rep2: null as number | null,
        app1_rep3: null as number | null,
        app2_rep1: null as number | null,
        app2_rep2: null as number | null,
        app2_rep3: null as number | null,
        app3_rep1: null as number | null,
        app3_rep2: null as number | null,
        app3_rep3: null as number | null,
      };
      
      return {
        ...prev,
        [ctq]: {
          ...prev[ctq],
          gageRRData: [...currentData, newRow],
        }
      };
    });
  };

  const removeContinuousAnalysisRow = (ctq: string, rowIndex: number) => {
    setContinuousMsaData(prev => {
      const updatedData = [...(prev[ctq]?.gageRRData || [])];
      updatedData.splice(rowIndex, 1);
      
      // Renumber the remaining rows
      updatedData.forEach((row, index) => {
        row.unitNumber = index + 1;
      });
      
      return {
        ...prev,
        [ctq]: {
          ...prev[ctq],
          gageRRData: updatedData,
        }
      };
    });
  };

  const handleSaveAttributeMsa = (ctq: string) => {
    const data = attributeMsaData[ctq];
    if (data) {
      saveAttributeMsaMutation.mutate(data);
    }
  };

  const handleSaveContinuousMsa = (ctq: string) => {
    const data = continuousMsaData[ctq];
    if (data) {
      saveContinuousMsaMutation.mutate(data);
    }
  };

  {/*
    const getMsaStatusBadge = (ctq: string, ctqType: "Attribute" | "Continuous") => {
    if (ctqType === "Attribute") {
      const data = attributeMsaData[ctq];
      if (!data) return <Badge variant="secondary">No Data</Badge>;
      
      const hasBasicData = data.appraiser1Name && data.appraiser2Name && data.appraiser3Name;
      const hasData = data.agreementAnalysisData && data.agreementAnalysisData.length > 0;
      
      if (hasBasicData && hasData) {
        return <Badge variant="default" className="bg-green-600">Complete</Badge>;
      } else if (hasBasicData) {
        return <Badge variant="outline">In Progress</Badge>;
      } else {
        return <Badge variant="secondary">Not Started</Badge>;
      }
    } else {
      const data = continuousMsaData[ctq];
      if (!data) return <Badge variant="secondary">No Data</Badge>;
      
      const hasBasicData = data.appraiser1Name && data.appraiser2Name && data.appraiser3Name;
      const hasData = data.gageRRData && data.gageRRData.length > 0;
      
      if (hasBasicData && hasData) {
        return <Badge variant="default" className="bg-green-600">Complete</Badge>;
      } else if (hasBasicData) {
        return <Badge variant="outline">In Progress</Badge>;
      } else {
        return <Badge variant="secondary">Not Started</Badge>;
      }
    }
  };
  */}

  if (ctsLoading || msaLoading || projectLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            MSA (Measurement System Analysis)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading MSA data...</div>
        </CardContent>
      </Card>
    );
  }

  const ctqList = getCtqsWithTypes();
  
  // Get project type from project data
  const projectType = (projectData as any)?.project?.projectType;
  const isSimplifiedView = projectType === "Yellow Belt" || projectType === "White Belt";

  if (ctqList.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            MSA (Measurement System Analysis)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No CTQ available. Please define your CTQ(s) in CTS characteristics table to create MSA study(ies).
          </div>
        </CardContent>
      </Card>
    );
  }

  // Ensure we have an active tab when CTQs are available
  if (!activeTab && ctqList.length > 0) {
    const firstCtq = ctqList[0].ctq;
    setActiveTab(firstCtq);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          MSA (Measurement System Analysis)
        </CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Automatic MSA type selection based on CTQ type: Attribute Agreement Analysis for Attribute CTQs, Gage R&R for Continuous CTQs
        </p>
      </CardHeader>
      <CardContent>
        {/* Only show scroll indicator if 5+ CTQs exist */}
        {ctqList.length >= 6 && (
         <div className="relative">
          <div className="absolute top-0 right-0 bg-blue-100 text-blue-600 px-2 py-1 text-xs rounded-bl z-10">
          ← Scroll horizontally →
          </div>
        </div>
        )}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full pt-[25px]">
          <div className="w-full overflow-x-auto">         
            <TabsList className="flex w-max min-w-full justify-start">
              {ctqList.map((ctqItem: CtqWithType) => (
                <TabsTrigger 
                  key={ctqItem.ctq} 
                  value={ctqItem.ctq}
                  className="px-4 py-2 min-w-max flex flex-col items-cente border border-gray-200 data-[state=active]:border-none"
                >
                  <span className="font-medium truncate min-w-[150px]">{ctqItem.ctq}</span>
                  <span className="text-xs text-gray-600">{ctqItem.ctqType}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {ctqList.map((ctqItem: CtqWithType) => (
            <TabsContent key={ctqItem.ctq} value={ctqItem.ctq} className="mt-0 border border-gray-200 rounded-lg p-4" >
              {/* Show/Hide MSA Button for White Belt and Yellow Belt projects */}
              {isSimplifiedView && !showMsaContent[ctqItem.ctq] && (
                <div className="text-center py-8">
                  <Button 
                    onClick={() => setShowMsaContent(prev => ({ ...prev, [ctqItem.ctq]: true }))}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Show MSA
                  </Button>
                </div>
              )}
              
              {/* MSA Content - Always show for Green/Black Belt, conditionally for White/Yellow Belt */}
              {(!isSimplifiedView || showMsaContent[ctqItem.ctq]) && (
                <div>
                  {/* Hide MSA Button for White Belt and Yellow Belt projects when content is shown */}
                  {isSimplifiedView && showMsaContent[ctqItem.ctq] && (
                    <div className="mb-4 text-right">
                      <Button 
                        onClick={() => setShowMsaContent(prev => ({ ...prev, [ctqItem.ctq]: false }))}
                        variant="outline"
                        className="border-gray-400 text-gray-700 hover:bg-gray-100"
                      >
                        Hide MSA
                      </Button>
                    </div>
                  )}
                  
                  {ctqItem.ctqType === "Attribute" ? (
                // Attribute MSA Analysis Interface with Choice Selector
                <div className="space-y-4">
                  {/* Analysis Type Selector - Available for all project types when MSA is shown */}
                  {(
                    <div className="mb-6">
                      <label className="block text-sm font-medium mb-3">Select Analysis Type:</label>
                      <div className="flex gap-4">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name={`analysis-type-${ctqItem.ctq}`}
                            value="simple"
                            checked={attributeAnalysisType[ctqItem.ctq] === 'simple' || !attributeAnalysisType[ctqItem.ctq]}
                            onChange={() => {
                              const newTypes = { ...attributeAnalysisType, [ctqItem.ctq]: 'simple' as const };
                              setAttributeAnalysisType(newTypes);
                              localStorage.setItem(`msa-analysis-types-${projectId}`, JSON.stringify(newTypes));
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm font-medium">Measurement System Simplified Analysis</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name={`analysis-type-${ctqItem.ctq}`}
                            value="agreement"
                            checked={attributeAnalysisType[ctqItem.ctq] === 'agreement'}
                            onChange={() => {
                              const newTypes = { ...attributeAnalysisType, [ctqItem.ctq]: 'agreement' as const };
                              setAttributeAnalysisType(newTypes);
                              localStorage.setItem(`msa-analysis-types-${projectId}`, JSON.stringify(newTypes));
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm font-medium">Attribute Agreement Analysis</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Simplified Analysis Card - Always show for simplified view or when simple is selected */}
                  {(isSimplifiedView || attributeAnalysisType[ctqItem.ctq] === 'simple' || !attributeAnalysisType[ctqItem.ctq]) && (
                    <>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold mb-2">Measurement System Simplified Analysis</h3>
                        <p className="text-sm text-gray-600">
                          . Please justify the correctness of your Measurement System for the CTQ here.<br></br>
                          . Your Measurement System must be Precise and Accurate and your measurements Reliable.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Measurement System Precision & Accuracy justification</label>
                          <Textarea
                            value={attributeMsaData[ctqItem.ctq]?.justification || ""}
                            onChange={(e) => updateAttributeMsaField(ctqItem.ctq, "justification", e.target.value)}
                            className="w-full flex min-h-[150px]"
                            placeholder="Enter explanations to justify why the Measurement System is Precise and Accurate?

 . Precision: Explain why the measurement system is precise?
 . Accuracy: Explain why the measurement system is accurate?"
                            title="Are your data reliable? Can anyone measure the same thing and get the same result (Precision)? Does your data represents the true value or are they biased (Accuracy)? Please justify here."
                          />
                        </div>
                      </div>
                      {/* Save MSA Button */}
                      <div className="flex justify-end gap-2">
                      <Button 
                        onClick={() => handleSaveAttributeMsa(ctqItem.ctq)}
                        disabled={saveAttributeMsaMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                        >
                        {saveAttributeMsaMutation.isPending ? "Saving..." : "Save MSA"}
                      </Button>
                      </div>
                    </>
                  )}

                  {/* Attribute Agreement Analysis Content - Show when agreement analysis is selected */}
                  {attributeAnalysisType[ctqItem.ctq] === 'agreement' && (
                    <div className="space-y-4">
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold mb-2">Attribute Agreement Analysis</h3>
                        <p className="text-sm text-gray-600">
                          Complete statistical analysis of measurement system agreement between appraisers for attribute data.
                        </p>
                      </div>

                  {!isSimplifiedView && (
                    <>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold mb-2">Attribute Agreement Analysis</h3>
                        <p className="text-sm text-gray-600">
                          . For Attribute CTQs, we perform Agreement Analysis studying both Accuracy (Agreement vs a Standard) if a standard exists and Precision (Agreement R&R), using OK/KO evaluations.<br></br>
                          . It is still possible to perform an Agreement Analysis without a standard. In this case, it will be a Precision Agreement Analysis.<br></br>
                          . A minimum of two Appraisers with two repetitions each is mandatory to calculate the statistics.<br></br>
                          . It is recommended to have a minimum of 100 data in your study and a balanced table (equal number of appraisals for each unit) for a significant Analysis.<br></br>
                          .  We also recommend having the same number of OKs and KOs in your Reference if there is a Reference (Standard) in your study.
                        </p>
                      </div>

                      {/* Appraised unit type and Study Information */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                      <label className="block text-sm font-medium mb-2">Appraised unit type</label>
                      <Select
                        value={attributeMsaData[ctqItem.ctq]?.unitAppraisedType || "Part"}
                        onValueChange={(value) => updateAttributeMsaField(ctqItem.ctq, "unitAppraisedType", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Part">Part</SelectItem>
                          <SelectItem value="Unit">Unit</SelectItem>
                          <SelectItem value="File">File</SelectItem>
                          <SelectItem value="Document">Document</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {attributeMsaData[ctqItem.ctq]?.unitAppraisedType === "Other" && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Other - Please specify</label>
                        <Input
                          value={attributeMsaData[ctqItem.ctq]?.unitAppraisedTypeOther || ""}
                          onChange={(e) => updateAttributeMsaField(ctqItem.ctq, "unitAppraisedTypeOther", e.target.value)}
                          placeholder="Specify the type of unit being appraised"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium mb-2">Study Date & Time</label>
                      <Input
                        type="datetime-local"
                        value={attributeMsaData[ctqItem.ctq]?.studyDateTime?.slice(0, 16) || new Date().toISOString().slice(0, 16)}
                        onChange={(e) => updateAttributeMsaField(ctqItem.ctq, "studyDateTime", e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Appraiser Names */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Appraiser 1 Name</label>
                      <Input
                        value={attributeMsaData[ctqItem.ctq]?.appraiser1Name || ""}
                        onChange={(e) => updateAttributeMsaField(ctqItem.ctq, "appraiser1Name", e.target.value)}
                        placeholder="Enter appraiser 1 name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Appraiser 2 Name</label>
                      <Input
                        value={attributeMsaData[ctqItem.ctq]?.appraiser2Name || ""}
                        onChange={(e) => updateAttributeMsaField(ctqItem.ctq, "appraiser2Name", e.target.value)}
                        placeholder="Enter appraiser 2 name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Appraiser 3 Name</label>
                      <Input
                        value={attributeMsaData[ctqItem.ctq]?.appraiser3Name || ""}
                        onChange={(e) => updateAttributeMsaField(ctqItem.ctq, "appraiser3Name", e.target.value)}
                        placeholder="Enter appraiser 3 name"
                      />
                    </div>
                  </div>

                  {/* Agreement Analysis Data Table */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-md font-semibold">Agreement Analysis Data (OK/KO)</h4>
                    </div>
                    {/* Scroll indicator */}
                    <div className="relative">
                     <div className="absolute top-0 right-0 bg-blue-100 text-blue-600 px-2 py-1 text-xs rounded-bl z-10">
                     ← Scroll horizontally →
                     </div>
                    </div>

                    <div className="overflow-x-auto border rounded-lg pt-6">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-20">
                              {attributeMsaData[ctqItem.ctq]?.unitAppraisedType === "Other" 
                                ? (attributeMsaData[ctqItem.ctq]?.unitAppraisedTypeOther || "Unit") + " #"
                                : (attributeMsaData[ctqItem.ctq]?.unitAppraisedType || "Unit") + " #"}
                            </TableHead>
                            <TableHead className="w-24">Reference<br></br>(Standard)</TableHead>
                            <TableHead className="w-24">{attributeMsaData[ctqItem.ctq]?.appraiser1Name || "Appraiser 1"} <br></br>Repetition 1</TableHead>
                            <TableHead className="w-24">{attributeMsaData[ctqItem.ctq]?.appraiser1Name || "Appraiser 1"} <br></br>Repetition 2</TableHead>
                            <TableHead className="w-24">{attributeMsaData[ctqItem.ctq]?.appraiser1Name || "Appraiser 1"} <br></br>Repetition 3</TableHead>
                            <TableHead className="w-24">{attributeMsaData[ctqItem.ctq]?.appraiser2Name || "Appraiser 2"} <br></br>Repetition 1</TableHead>
                            <TableHead className="w-24">{attributeMsaData[ctqItem.ctq]?.appraiser2Name || "Appraiser 2"} <br></br>Repetition 2</TableHead>
                            <TableHead className="w-24">{attributeMsaData[ctqItem.ctq]?.appraiser2Name || "Appraiser 2"} <br></br>Repetition 3</TableHead>
                            <TableHead className="w-24">{attributeMsaData[ctqItem.ctq]?.appraiser3Name || "Appraiser 3"} <br></br>Repetition 1</TableHead>
                            <TableHead className="w-24">{attributeMsaData[ctqItem.ctq]?.appraiser3Name || "Appraiser 3"} <br></br>Repetition 2</TableHead>
                            <TableHead className="w-24">{attributeMsaData[ctqItem.ctq]?.appraiser3Name || "Appraiser 3"} <br></br>Repetition 3</TableHead>
                            <TableHead className="w-16">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(attributeMsaData[ctqItem.ctq]?.agreementAnalysisData || []).map((row, index) => {
                            // Check for disagreement in the row
                            const nonBlankValues = Object.keys(row)
                              .filter(key => key !== 'unitNumber' && row[key as keyof AttributeAnalysisRow] !== "")
                              .map(key => row[key as keyof AttributeAnalysisRow]);
                            
                            const hasDisagreement = nonBlankValues.length > 1 && 
                              !nonBlankValues.every(val => val === nonBlankValues[0]);
                            
                            const hasReference = row.reference !== "";
                            
                            return (
                              <TableRow 
                                key={index} 
                                className={hasDisagreement ? "bg-red-200" : ""}
                              >
                                <TableCell className="font-medium">{row.unitNumber}</TableCell>
                                {Object.keys(row).filter(key => key !== 'unitNumber').map((field) => {
                                const isBlankAllowed = field === 'reference' || field.includes('rep3') || field.includes('app3');
                                const fieldValue = row[field as keyof AttributeAnalysisRow] as string;
                                const selectValue = fieldValue === "" ? "blank" : fieldValue;
                                
                                // Determine styling based on disagreement conditions
                                let cellStyling = "";
                                let triggerStyling = "";
                                
                                if (hasDisagreement) {
                                  if (!hasReference) {
                                    // No reference available - bold and white text for all non-blank cells
                                    if (fieldValue !== "") {
                                      cellStyling = "font-bold";
                                      triggerStyling = "font-bold bg-transparent";
                                    }
                                  } else {
                                    // Reference available - white text for all cells, bold for disagreeing cells
                                    cellStyling = "";
                                    triggerStyling = "bg-transparent";
                                    
                                    if (fieldValue !== "" && fieldValue !== row.reference) {
                                      cellStyling += " font-bold";
                                      triggerStyling += " font-bold";
                                    }
                                  }
                                }
                                
                                return (
                                  <TableCell key={field} className={cellStyling}>
                                    <Select
                                      value={selectValue}
                                      onValueChange={(value: string) => {
                                        const actualValue = value === "blank" ? "" : value;
                                        updateAttributeAnalysisRow(ctqItem.ctq, index, field as keyof AttributeAnalysisRow, actualValue as "OK" | "KO" | "");
                                      }}
                                    >
                                      <SelectTrigger className={"w-20 " + triggerStyling}>
                                        <SelectValue placeholder="--" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {isBlankAllowed && <SelectItem value="blank">--</SelectItem>}
                                        <SelectItem value="OK">OK</SelectItem>
                                        <SelectItem value="KO">KO</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                );
                                })}
                                <TableCell>
                                  <Button
                                    onClick={() => removeAttributeAnalysisRow(ctqItem.ctq, index)}
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                  >
                                    {/* <Trash2 className="h-4 w-4" /> */}
                                    <i className="fas fa-trash h-4 w-4"></i>
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                      {/* Scroll indicator */}
                    <div className="relative">
                     <div className="absolute bottom-[-14px] right-0 bg-blue-100 text-blue-600 px-2 py-1 text-xs rounded-bl z-10">
                     ← Scroll horizontally →
                     </div>
                    </div>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <div className="flex gap-2">
                      <Button
                        onClick={() => addAttributeAnalysisRow(ctqItem.ctq)}
                        variant="outline"
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Row
                      </Button>
                      <Button
                        onClick={() => toggleStatistics(ctqItem.ctq)}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Calculator className="h-4 w-4" />
                        {showStatistics[ctqItem.ctq] ? "Hide Statistics" : "Calculate Statistics"}
                      </Button>
                    </div>
                    <Button
                      onClick={() => handleSaveAttributeMsa(ctqItem.ctq)}
                      disabled={saveAttributeMsaMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saveAttributeMsaMutation.isPending ? "Saving..." : "Save Attribute MSA Study"}
                    </Button>
                  </div>

                      {/* Statistics Display */}
                      {showStatistics[ctqItem.ctq] && attributeMsaData[ctqItem.ctq]?.agreementAnalysisData && (
                        <div>
                          <div className="mt-6">
                          <MSAAttributeStatisticsDisplay
                            data={attributeMsaData[ctqItem.ctq].agreementAnalysisData}
                            appraiser1Name={attributeMsaData[ctqItem.ctq]?.appraiser1Name || "Appraiser 1"}
                            appraiser2Name={attributeMsaData[ctqItem.ctq]?.appraiser2Name || "Appraiser 2"}
                            appraiser3Name={attributeMsaData[ctqItem.ctq]?.appraiser3Name || "Appraiser 3"}
                          />
                        </div>
                        <div className="flex justify-end mt-1">
                        <Button
                          onClick={() => handleSaveAttributeMsa(ctqItem.ctq)}
                          disabled={saveAttributeMsaMutation.isPending}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                        <Save className="h-4 w-4 mr-2" />
                       {saveAttributeMsaMutation.isPending ? "Saving..." : "Save Attribute MSA Study"}
                        </Button>
                        </div>
                      </div>
                      )}
                      
                    </>
                  )}
                    </div>
                  )}

                </div>
              ) : (
                // Continuous MSA Analysis Interface with Choice Selector
                <div className="space-y-4">
                  {/* Analysis Type Selector - Available for all project types when MSA is shown */}
                  {(
                    <div className="mb-6">
                      <label className="block text-sm font-medium mb-3">Select Analysis Type:</label>
                      <div className="flex gap-4">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name={`continuous-analysis-type-${ctqItem.ctq}`}
                            value="simple"
                            checked={continuousAnalysisType[ctqItem.ctq] === 'simple' || !continuousAnalysisType[ctqItem.ctq]}
                            onChange={() => {
                              const newTypes = { ...continuousAnalysisType, [ctqItem.ctq]: 'simple' as const };
                              setContinuousAnalysisType(newTypes);
                              localStorage.setItem(`msa-continuous-types-${projectId}`, JSON.stringify(newTypes));
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm font-medium">Measurement System Simplified Analysis</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name={`continuous-analysis-type-${ctqItem.ctq}`}
                            value="gage_rr"
                            checked={continuousAnalysisType[ctqItem.ctq] === 'gage_rr'}
                            onChange={() => {
                              const newTypes = { ...continuousAnalysisType, [ctqItem.ctq]: 'gage_rr' as const };
                              setContinuousAnalysisType(newTypes);
                              localStorage.setItem(`msa-continuous-types-${projectId}`, JSON.stringify(newTypes));
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm font-medium">Gage R&R MSA Analysis</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Simplified Analysis Card - Always show for simplified view or when simple is selected */}
                  {(isSimplifiedView || continuousAnalysisType[ctqItem.ctq] === 'simple' || !continuousAnalysisType[ctqItem.ctq]) && (
                    <>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold mb-2">Measurement System Simplified Analysis</h3>
                        <p className="text-sm text-gray-600">
                          . Please justify the correctness of your Measurement System for the CTQ here.<br></br>
                          . Your Measurement System must be Precise and Accurate and your measurements Reliable.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Measurement System Precision & Accuracy justification</label>
                          <Textarea
                            value={continuousMsaData[ctqItem.ctq]?.justification || ""}
                            onChange={(e) => updateContinuousMsaField(ctqItem.ctq, "justification", e.target.value)}
                            className="w-full flex min-h-[150px]"
                            placeholder="Enter explanations to justify why the Measurement System is Precise and Accurate?

 . Precision: Explain why the measurement system is precise?
 . Accuracy: Explain why the measurement system is accurate?"
                            title="Are your data reliable? Can anyone measure the same thing and get the same result (Precision)? Does your data represents the true value or are they biased (Accuracy)? Please justify here."
                          />
                        </div>
                      </div>
                      {/* Save MSA Button */}
                      <div className="flex justify-end gap-2">
                        <Button 
                          onClick={() => handleSaveContinuousMsa(ctqItem.ctq)}
                          disabled={saveContinuousMsaMutation.isPending}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                        {saveContinuousMsaMutation.isPending ? "Saving..." : "Save MSA"}
                        </Button>
                      </div>
                    </>
                  )}

                  {/* Gage R&R Analysis Content - Show when gage_rr analysis is selected */}
                  {continuousAnalysisType[ctqItem.ctq] === 'gage_rr' && (
                    <div className="space-y-4">
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold mb-2">Gage R&R MSA Analysis</h3>
                        <p className="text-sm text-gray-600">
                          Complete statistical analysis of measurement system repeatability and reproducibility for continuous data using ANOVA method.
                        </p>
                      </div>

                  {/* Study Parameters */}
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Number of appraisers</label>
                      <Select
                        value={continuousMsaData[ctqItem.ctq]?.numberOfAppraisers?.toString() || "2"}
                        onValueChange={(value) => {
                          const newAppraisers = parseInt(value);
                          updateContinuousMsaField(ctqItem.ctq, 'numberOfAppraisers', newAppraisers);
                          
                          // If changing to 2 appraisers, null all Appraiser 3 values
                          if (newAppraisers === 2) {
                            updateContinuousMsaField(ctqItem.ctq, 'appraiser3Name', '');
                            
                            const updatedData = continuousMsaData[ctqItem.ctq]?.gageRRData.map(row => ({
                              ...row,
                              app3_rep1: 0,
                              app3_rep2: 0,
                              app3_rep3: 0
                            })) || [];
                            
                            setContinuousMsaData(prev => ({
                              ...prev,
                              [ctqItem.ctq]: {
                                ...prev[ctqItem.ctq],
                                gageRRData: updatedData
                              }
                            }));
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select appraisers" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Number of repetitions</label>
                      <Select
                        value={continuousMsaData[ctqItem.ctq]?.repetitions?.toString() || "2"}
                        onValueChange={(value) => {
                          const newRepetitions = parseInt(value);
                          updateContinuousMsaField(ctqItem.ctq, 'repetitions', newRepetitions);
                          
                          // If changing to 2 repetitions, null all third repetitions
                          if (newRepetitions === 2) {
                            const updatedData = continuousMsaData[ctqItem.ctq]?.gageRRData.map(row => ({
                              ...row,
                              app1_rep3: 0,
                              app2_rep3: 0,
                              app3_rep3: 0
                            })) || [];
                            
                            setContinuousMsaData(prev => ({
                              ...prev,
                              [ctqItem.ctq]: {
                                ...prev[ctqItem.ctq],
                                gageRRData: updatedData
                              }
                            }));
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select repetitions" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Nb of sigma used</label>
                      <Select
                        value={continuousMsaData[ctqItem.ctq]?.sigmaMultiplier?.toString() || "6"}
                        onValueChange={(value) => updateContinuousMsaField(ctqItem.ctq, 'sigmaMultiplier', parseFloat(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select sigma" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="6">6</SelectItem>
                          <SelectItem value="5.15">5.15</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Tolerance (optional)</label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Enter tolerance"
                        value={continuousMsaData[ctqItem.ctq]?.tolerance || ""}
                        onChange={(e) => updateContinuousMsaField(ctqItem.ctq, 'tolerance', parseFloat(e.target.value) || undefined)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Study Date & Time</label>
                      <Input
                        type="datetime-local"
                        value={continuousMsaData[ctqItem.ctq]?.studyDateTime?.slice(0, 16) || new Date().toISOString().slice(0, 16)}
                        onChange={(e) => updateContinuousMsaField(ctqItem.ctq, "studyDateTime", e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Appraiser Names */}
                  <div className={`grid grid-cols-1 gap-4 ${(continuousMsaData[ctqItem.ctq]?.numberOfAppraisers || 2) === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                    <div>
                      <label className="block text-sm font-medium mb-2">Appraiser 1 Name</label>
                      <Input
                        value={continuousMsaData[ctqItem.ctq]?.appraiser1Name || ""}
                        onChange={(e) => updateContinuousMsaField(ctqItem.ctq, "appraiser1Name", e.target.value)}
                        placeholder="Enter appraiser 1 name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Appraiser 2 Name</label>
                      <Input
                        value={continuousMsaData[ctqItem.ctq]?.appraiser2Name || ""}
                        onChange={(e) => updateContinuousMsaField(ctqItem.ctq, "appraiser2Name", e.target.value)}
                        placeholder="Enter appraiser 2 name"
                      />
                    </div>
                    {(continuousMsaData[ctqItem.ctq]?.numberOfAppraisers || 2) === 3 && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Appraiser 3 Name</label>
                        <Input
                          value={continuousMsaData[ctqItem.ctq]?.appraiser3Name || ""}
                          onChange={(e) => updateContinuousMsaField(ctqItem.ctq, "appraiser3Name", e.target.value)}
                          placeholder="Enter appraiser 3 name"
                        />
                      </div>
                    )}
                  </div>

                  {/* Gage R&R Data Table */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-md font-semibold">Gage R&R Measurement Data</h4>
                      <div className="flex gap-2">
                      <Button
                        onClick={async () => {
                          try {
                            // Read directly from clipboard
                            const clipboardData = await navigator.clipboard.readText();
                            
                            if (!clipboardData.trim()) {
                              toast({
                                title: "No Data Found",
                                description: "No data found in clipboard. Please copy data from Excel first.",
                                variant: "destructive",
                              });
                              return;
                            }
                            
                            // Create a synthetic paste event
                            const syntheticEvent = {
                              preventDefault: () => {},
                              clipboardData: {
                                getData: () => clipboardData
                              }
                            } as unknown as React.ClipboardEvent;
                            
                            // Call the paste handler directly
                            handlePasteData(ctqItem.ctq, syntheticEvent);
                            
                          } catch (error) {
                            toast({
                              title: "Clipboard Permission Required",
                              description: "Please allow clipboard access in your browser settings, or use Ctrl+V to paste directly into the table.",
                              variant: "destructive",
                            });
                          }
                        }}
                        variant="outline"
                        size="sm"
                        className="text-green-700 border-green-300 hover:bg-green-50"
                      >
                        📋 Paste data from Excel
                      </Button>
                      
                      {showUndoButton[ctqItem.ctq] && (
                        <Button
                          onClick={() => handleUndo(ctqItem.ctq)}
                          variant="outline"
                          size="sm"
                          className="text-orange-700 border-orange-300 hover:bg-orange-50"
                        >
                          <Undo2 className="h-4 w-4 mr-2" />
                          Undo Paste
                        </Button>
                      )}
                      </div>
                      <div className="text-xs text-gray-500 bg-blue-50 px-3 py-2 rounded border border-blue-200">
                        <div className="font-medium text-blue-700 mb-1">Excel Import Format:</div>
                        <div>
                          {(() => {
                            const reps = continuousMsaData[ctqItem.ctq]?.repetitions || 2;
                            const appraisers = continuousMsaData[ctqItem.ctq]?.numberOfAppraisers || 2;
                            const totalCols = reps * appraisers;
                            return `Copy ${totalCols} columns (${reps} reps × ${appraisers} appraisers)`;
                          })()}
                        </div>
                        <div className="text-blue-600 mt-1">Ctrl+V to paste | Ctrl+Z to undo | Click table to paste</div>
                      </div>
                    </div>

                    <div 
                      className="overflow-x-auto border rounded-lg"
                      onPaste={(e) => handlePasteData(ctqItem.ctq, e)}
                      tabIndex={0}
                    >
                      {/* Only show scroll indicator if 3 repeats or 3 Appraisers */}
                      {(continuousMsaData[ctqItem.ctq]?.repetitions > 2 || continuousMsaData[ctqItem.ctq]?.numberOfAppraisers > 2) && (
                      <div className="relative">
                        <div className="absolute top-0 right-0 bg-blue-100 text-blue-600 px-2 py-1 text-xs rounded-bl z-10">
                        ← Scroll horizontally →
                        </div>
                      </div>
                      )}
                      <div className="pt-5 pb-6">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-20">Unit #</TableHead>
                            <TableHead className="w-24">{continuousMsaData[ctqItem.ctq]?.appraiser1Name || "Appraiser 1"} <br></br>Repetition 1</TableHead>
                            <TableHead className="w-24">{continuousMsaData[ctqItem.ctq]?.appraiser1Name || "Appraiser 1"} <br></br>Repetition 2</TableHead>
                            {(continuousMsaData[ctqItem.ctq]?.repetitions || 2) === 3 && (
                              <TableHead className="w-24">{continuousMsaData[ctqItem.ctq]?.appraiser1Name || "Appraiser 1"} <br></br>Repetition 3</TableHead>
                            )}
                            <TableHead className="w-24">{continuousMsaData[ctqItem.ctq]?.appraiser2Name || "Appraiser 2"} <br></br>Repetition 1</TableHead>
                            <TableHead className="w-24">{continuousMsaData[ctqItem.ctq]?.appraiser2Name || "Appraiser 2"} <br></br>Repetition 2</TableHead>
                            {(continuousMsaData[ctqItem.ctq]?.repetitions || 2) === 3 && (
                              <TableHead className="w-24">{continuousMsaData[ctqItem.ctq]?.appraiser2Name || "Appraiser 2"} <br></br>Repetition 3</TableHead>
                            )}
                            {(continuousMsaData[ctqItem.ctq]?.numberOfAppraisers || 2) === 3 && (
                              <>
                                <TableHead className="w-24">{continuousMsaData[ctqItem.ctq]?.appraiser3Name || "Appraiser 3"} <br></br>Repetition 1</TableHead>
                                <TableHead className="w-24">{continuousMsaData[ctqItem.ctq]?.appraiser3Name || "Appraiser 3"} <br></br>Repetition 2</TableHead>
                                {(continuousMsaData[ctqItem.ctq]?.repetitions || 2) === 3 && (
                                  <TableHead className="w-24">{continuousMsaData[ctqItem.ctq]?.appraiser3Name || "Appraiser 3"} <br></br>Repetition 3</TableHead>
                                )}
                              </>
                            )}
                            <TableHead className="w-16">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                        
                          {(continuousMsaData[ctqItem.ctq]?.gageRRData || []).map((row, index) => {
                            const repetitions = continuousMsaData[ctqItem.ctq]?.repetitions || 2;
                            const numberOfAppraisers = continuousMsaData[ctqItem.ctq]?.numberOfAppraisers || 2;
                            const fields = ['app1_rep1', 'app1_rep2'];
                            if (repetitions === 3) fields.push('app1_rep3');
                            fields.push('app2_rep1', 'app2_rep2');
                            if (repetitions === 3) fields.push('app2_rep3');
                            if (numberOfAppraisers === 3) {
                              fields.push('app3_rep1', 'app3_rep2');
                              if (repetitions === 3) fields.push('app3_rep3');
                            }
                            
                            return (
                              <TableRow key={index}>
                                <TableCell className="font-medium">{row.unitNumber}</TableCell>
                                {fields.map((field) => (
                                  <TableCell key={field}>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={row[field as keyof ContinuousAnalysisRow] as number | null ?? ''}
                                      onChange={(e) => updateContinuousAnalysisRow(ctqItem.ctq, index, field as keyof ContinuousAnalysisRow, e.target.value)}
                                      onPaste={(e) => {
                                        e.preventDefault();
                                        const pasteData = e.clipboardData.getData('text');
                                        handleFocusedCellPaste(ctqItem.ctq, index, field as keyof ContinuousAnalysisRow, pasteData);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
                                          e.preventDefault();
                                          handleUndo(ctqItem.ctq);
                                        } else if (e.ctrlKey && e.shiftKey && e.key === 'Z') {
                                          e.preventDefault();
                                          handleRedo(ctqItem.ctq);
                                        }
                                      }}
                                      className="w-20"
                                      disabled={(repetitions === 2 && field.includes('_rep3')) || (numberOfAppraisers === 2 && field.includes('app3_'))}
                                      title="Click to focus, then Ctrl+V to paste data starting from this cell"
                                    />
                                  </TableCell>
                                ))}
                                <TableCell>
                                  <Button
                                    onClick={() => removeContinuousAnalysisRow(ctqItem.ctq, index)}
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                  >
                                    {/* <Trash2 className="h-4 w-4" /> */}
                                    <i className="fas fa-trash h-4 w-4"></i>
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                      {/* Only show scroll indicator if 3 repeats or 3 Appraisers */}
                        {(continuousMsaData[ctqItem.ctq]?.repetitions > 2 || continuousMsaData[ctqItem.ctq]?.numberOfAppraisers > 2) && (
                        <div className="relative">
                          <div className="absolute bottom-[-18px] top-0 right-0 bg-blue-100 text-blue-600 px-2 py-1 text-xs rounded-bl z-10">
                          ← Scroll horizontally →
                          </div>
                        </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Paste Instructions */}
                  <div className="bg-green-50 p-3 rounded-lg mb-4">
                    <h4 className="text-sm font-medium text-green-800 mb-2">📋 Excel Copy-Paste Instructions</h4>
                    <div className="text-xs text-green-700 space-y-1">
                      <p>• <strong>Focus a cell</strong> by clicking on any measurement input field</p>
                      <p>• <strong>Paste data</strong> using Ctrl+V - data will start from the focused cell</p>
                      <p>• <strong>Undo changes</strong> using Ctrl+Z after pasting</p>
                      {/*<p>• <strong>Redo changes</strong> using Shift+Ctrl+Z after undoing</p> */}
                      <p>• Data will automatically create new rows if needed</p>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <div className="flex gap-2">
                      <Button
                        onClick={() => addContinuousAnalysisRow(ctqItem.ctq)}
                        variant="outline"
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Row
                      </Button>
                      
                      {showUndoButton[ctqItem.ctq] && (
                        <Button
                          onClick={() => handleUndo(ctqItem.ctq)}
                          variant="outline"
                          size="sm"
                          className="text-orange-700 border-orange-300 hover:bg-orange-50"
                        >
                          <Undo2 className="h-4 w-4 mr-2" />
                          Undo Paste
                        </Button>
                      )}
                      
                      {showRedoButton[ctqItem.ctq] && (
                        <Button
                          onClick={() => handleRedo(ctqItem.ctq)}
                          variant="outline"
                          size="sm"
                          className="text-blue-700 border-blue-300 hover:bg-blue-50"
                        >
                          <Undo2 className="h-4 w-4 mr-2 scale-x-[-1]" />
                          Redo Paste
                        </Button>
                      )}
                      
                        <Button
                          onClick={() => toggleContinuousStatistics(ctqItem.ctq)}
                          variant="secondary"
                          className="bg-blue-100 hover:bg-blue-200 text-blue-800 flex items-center"
                        >
                          <BarChart3 className="h-4 w-4 mr-2" />
                          {showContinuousStatistics[ctqItem.ctq] ? "Hide Statistics" : "Show Statistics"}
                        </Button>
                    </div>
                        <Button
                          onClick={() => handleSaveContinuousMsa(ctqItem.ctq)}
                          disabled={saveContinuousMsaMutation.isPending}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {saveContinuousMsaMutation.isPending ? "Saving..." : "Save Gage R&R MSA Study"}
                        </Button>
                   </div>

                  {/* Statistics Display for Continuous MSA */}
                  {showContinuousStatistics[ctqItem.ctq] && continuousMsaData[ctqItem.ctq] && continuousMsaData[ctqItem.ctq].gageRRData.length > 0 && (
                    <div className="mt-6">
                      <MSAContinuousStatisticsDisplay
                        data={continuousMsaData[ctqItem.ctq].gageRRData}
                        appraiser1Name={continuousMsaData[ctqItem.ctq]?.appraiser1Name || "Appraiser 1"}
                        appraiser2Name={continuousMsaData[ctqItem.ctq]?.appraiser2Name || "Appraiser 2"}
                        appraiser3Name={continuousMsaData[ctqItem.ctq]?.appraiser3Name || "Appraiser 3"}
                        sigmaMultiplier={continuousMsaData[ctqItem.ctq]?.sigmaMultiplier || 6}
                        tolerance={continuousMsaData[ctqItem.ctq]?.tolerance}
                        repetitions={continuousMsaData[ctqItem.ctq]?.repetitions || 2}
                        numberOfAppraisers={continuousMsaData[ctqItem.ctq]?.numberOfAppraisers || 2}
                      />
                    </div>
                  )}
                    </div>
                  )}
                </div>
              )}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}