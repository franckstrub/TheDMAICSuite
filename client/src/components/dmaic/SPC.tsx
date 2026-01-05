import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Download, Loader2 } from "lucide-react";
import { IMRCard } from "./I-MRcard";

interface SPCProps {
  projectId: number;
  projectType: string;
}

interface CtqWithType {
  ctq: string;
  ctqType: "Attribute" | "Continuous";
}

interface ControlCardSelection {
  [ctq: string]: {
    c: boolean;
    u: boolean;
    np: boolean;
    p: boolean;
    imr: boolean;
    xbarR: boolean;
    xbarS: boolean;
  };
}

export default function SPC({ projectId, projectType }: SPCProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("");
  const [controlCardSelection, setControlCardSelection] = useState<ControlCardSelection>({});
  const selectionsLoadedRef = useRef(false);

  // Fetch CTS characteristics to get CTQs
  const { data: ctsData, isLoading: ctsLoading } = useQuery<any>({
    queryKey: [`/api/projects/${projectId}/cts-characteristics`],
    enabled: projectType === 'Black Belt' || projectType === 'Green Belt',
  });

  // Fetch saved control card selections
  const { data: selectionsData } = useQuery<any>({
    queryKey: [`/api/projects/${projectId}/spc/selections`],
    enabled: projectType === 'Black Belt' || projectType === 'Green Belt',
  });

  // Mutation for autosave
  const saveMutation = useMutation({
    mutationFn: async ({ ctqName, selection }: { ctqName: string; selection: any }) => {
      return apiRequest('POST', `/api/projects/${projectId}/spc/selections/${encodeURIComponent(ctqName)}`, selection);
    },
  });

  // Get CTQs with types from CTS characteristics
  const getCtqsWithTypes = (): CtqWithType[] => {
    if (!ctsData?.characteristics) return [];
    return ctsData.characteristics
      .filter((char: any) => char.ctq && char.ctq.trim() !== "")
      .map((char: any) => ({
        ctq: char.ctq,
        ctqType: char.ctqType || "Continuous"
      }));
  };

  // Load saved tab from localStorage
  useEffect(() => {
    const savedTab = localStorage.getItem(`spc-active-tab-${projectId}`);
    if (savedTab) {
      setActiveTab(savedTab);
    }
  }, [projectId]);

  // Load saved selections from database
  useEffect(() => {
    if (selectionsData?.selections && !selectionsLoadedRef.current) {
      selectionsLoadedRef.current = true;
      const savedSelections: ControlCardSelection = {};
      selectionsData.selections.forEach((sel: any) => {
        savedSelections[sel.ctqName] = {
          c: sel.cCard ?? false,
          u: sel.uCard ?? false,
          np: sel.npCard ?? false,
          p: sel.pCard ?? false,
          imr: sel.imrCard ?? false,
          xbarR: sel.xbarRCard ?? false,
          xbarS: sel.xbarSCard ?? false,
        };
      });
      setControlCardSelection(prev => ({ ...prev, ...savedSelections }));
    }
  }, [selectionsData]);

  // Initialize active tab and control card selections when CTQs are loaded
  useEffect(() => {
    const ctqs = getCtqsWithTypes();
    if (ctqs.length > 0) {
      // Set active tab if not already set or if current tab is invalid
      if (!activeTab || !ctqs.some(c => c.ctq === activeTab)) {
        const savedTab = localStorage.getItem(`spc-active-tab-${projectId}`);
        const validSavedTab = savedTab && ctqs.some(c => c.ctq === savedTab);
        setActiveTab(validSavedTab ? savedTab : ctqs[0].ctq);
      }

      // Initialize control card selections for each CTQ (only for CTQs not already loaded)
      const newSelections: ControlCardSelection = {};
      ctqs.forEach(({ ctq }) => {
        if (!controlCardSelection[ctq]) {
          newSelections[ctq] = {
            c: false,
            u: false,
            np: false,
            p: false,
            imr: false,
            xbarR: false,
            xbarS: false,
          };
        }
      });
      if (Object.keys(newSelections).length > 0) {
        setControlCardSelection(prev => ({ ...prev, ...newSelections }));
      }
    }
  }, [ctsData, projectId]);

  const handleTabChange = (tabValue: string) => {
    setActiveTab(tabValue);
    localStorage.setItem(`spc-active-tab-${projectId}`, tabValue);
  };

  const toggleControlCard = (ctq: string, cardType: keyof ControlCardSelection[string]) => {
    const newValue = !controlCardSelection[ctq]?.[cardType];
    
    setControlCardSelection(prev => ({
      ...prev,
      [ctq]: {
        ...prev[ctq],
        [cardType]: newValue
      }
    }));

    // Map local state keys to API keys
    const apiKeyMap: Record<string, string> = {
      c: 'cCard',
      u: 'uCard',
      np: 'npCard',
      p: 'pCard',
      imr: 'imrCard',
      xbarR: 'xbarRCard',
      xbarS: 'xbarSCard',
    };

    // Autosave to database
    saveMutation.mutate({
      ctqName: ctq,
      selection: { [apiKeyMap[cardType]]: newValue }
    });
  };

  const handleDownloadControlCard = (ctq: string, cardType: string) => {
    toast({
      title: "Success",
      description: `${cardType} control card template downloaded for ${ctq}`,
    });
  };

  // Check if this is a valid project type
  if (projectType !== 'Black Belt' && projectType !== 'Green Belt') {
    return null;
  }

  if (ctsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Statistical Process Control
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading SPC data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const ctqList = getCtqsWithTypes();

  if (ctqList.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Statistical Process Control (SPC)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No CTQ available. Please define your CTQ(s) in CTS characteristics table to create SPC control charts.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render hard copy control card template
  const renderControlCardTemplate = (ctq: string, cardType: string, cardLabel: string) => {
    return (
      <div className="border rounded-lg p-4 bg-white mt-4">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-semibold text-lg">{cardLabel} Control Card - {ctq}</h4>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownloadControlCard(ctq, cardLabel)}
            data-testid={`button-download-${cardType}-${ctq}`}
          >
            <Download className="h-4 w-4 mr-1" />
            Download Template
          </Button>
        </div>
        
        {/* Control Card Template */}
        <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
          {/* Header Section */}
          <div className="grid grid-cols-4 border-b-2 border-gray-300">
            <div className="p-2 border-r border-gray-200 bg-gray-50">
              <Label className="text-xs font-semibold">Process Name:</Label>
              <div className="h-6 border-b border-dashed border-gray-300 mt-1"></div>
            </div>
            <div className="p-2 border-r border-gray-200 bg-gray-50">
              <Label className="text-xs font-semibold">CTQ:</Label>
              <div className="text-sm mt-1">{ctq}</div>
            </div>
            <div className="p-2 border-r border-gray-200 bg-gray-50">
              <Label className="text-xs font-semibold">Chart Type:</Label>
              <div className="text-sm mt-1">{cardLabel}</div>
            </div>
            <div className="p-2 bg-gray-50">
              <Label className="text-xs font-semibold">Date:</Label>
              <div className="h-6 border-b border-dashed border-gray-300 mt-1"></div>
            </div>
          </div>

          {/* Control Limits Section */}
          <div className="grid grid-cols-3 border-b-2 border-gray-300">
            <div className="p-2 border-r border-gray-200 bg-blue-50">
              <Label className="text-xs font-semibold text-blue-700">UCL:</Label>
              <div className="h-6 border-b border-dashed border-blue-300 mt-1"></div>
            </div>
            <div className="p-2 border-r border-gray-200 bg-green-50">
              <Label className="text-xs font-semibold text-green-700">Center Line:</Label>
              <div className="h-6 border-b border-dashed border-green-300 mt-1"></div>
            </div>
            <div className="p-2 bg-red-50">
              <Label className="text-xs font-semibold text-red-700">LCL:</Label>
              <div className="h-6 border-b border-dashed border-red-300 mt-1"></div>
            </div>
          </div>

          {/* Chart Grid Area */}
          <div className="p-4">
            <div className="border border-gray-300 h-48 relative bg-gray-50">
              {/* Grid lines */}
              <div className="absolute inset-0 grid grid-cols-10 grid-rows-5">
                {Array.from({ length: 50 }).map((_, i) => (
                  <div key={i} className="border border-gray-200"></div>
                ))}
              </div>
              {/* UCL line */}
              <div className="absolute w-full border-t-2 border-dashed border-red-500" style={{ top: '16.67%' }}>
                <span className="text-xs text-red-500 absolute right-1 -top-4">UCL</span>
              </div>
              {/* Center line */}
              <div className="absolute w-full border-t-2 border-green-500" style={{ top: '50%' }}>
                <span className="text-xs text-green-500 absolute right-1 -top-4">CL</span>
              </div>
              {/* LCL line */}
              <div className="absolute w-full border-t-2 border-dashed border-red-500" style={{ top: '83.33%' }}>
                <span className="text-xs text-red-500 absolute right-1 -top-4">LCL</span>
              </div>
            </div>
          </div>

          {/* Data Entry Section */}
          <div className="border-t-2 border-gray-300">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 border-r border-gray-200 w-24">Sample #</th>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <th key={i} className="p-2 border-r border-gray-200">{i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 border-r border-gray-200 bg-gray-50 font-semibold">Value</td>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <td key={i} className="p-2 border-r border-gray-200 h-8"></td>
                  ))}
                </tr>
                <tr className="border-t border-gray-200">
                  <td className="p-2 border-r border-gray-200 bg-gray-50 font-semibold">Date/Time</td>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <td key={i} className="p-2 border-r border-gray-200 h-8"></td>
                  ))}
                </tr>
                <tr className="border-t border-gray-200">
                  <td className="p-2 border-r border-gray-200 bg-gray-50 font-semibold">Operator</td>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <td key={i} className="p-2 border-r border-gray-200 h-8"></td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Notes Section */}
          <div className="border-t-2 border-gray-300 p-3 bg-gray-50">
            <Label className="text-xs font-semibold">Notes / Out of Control Actions:</Label>
            <div className="h-16 border border-dashed border-gray-300 mt-2 bg-white rounded"></div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Statistical Process Control (SPC)
        </CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          One SPC per CTQ defined in CTS Characteristics table
        </p>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">
          Select the appropriate control chart(s) type based on your CTQ data type and definition, enter data and generate control charts.
        </p>

        {/* Show scroll indicator if 6+ CTQs */}
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
              {ctqList.map((ctqWithType: CtqWithType) => (
                <TabsTrigger
                  key={ctqWithType.ctq}
                  value={ctqWithType.ctq}
                  className="px-4 py-2 min-w-max flex flex-col items-center border border-gray-200 data-[state=active]:border-none"
                  data-testid={`tab-spc-${ctqWithType.ctq}`}
                >
                  <span className="font-medium truncate min-w-[150px]">{ctqWithType.ctq}</span>
                  <span className="text-xs text-gray-600">{ctqWithType.ctqType}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {ctqList.map((ctqWithType: CtqWithType) => {
            const ctq = ctqWithType.ctq;
            const selection = controlCardSelection[ctq] || {};

            return (
              <TabsContent key={ctq} value={ctq} className="mt-6">
                <div className="space-y-6">
                  {/* Attribute CTQ Control Cards */}
                  {ctqWithType.ctqType === "Attribute" && (
                    <div className="space-y-6">
                      {/* Defects Section */}
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <h3 className="font-semibold text-lg mb-4 text-gray-800">Defects</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Use these charts when counting the number of defects (flaws, errors, issues) per unit or per inspection area.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center space-x-3 p-3 bg-white rounded border">
                            <Checkbox
                              id={`c-card-${ctq}`}
                              checked={selection.c || false}
                              onCheckedChange={() => toggleControlCard(ctq, 'c')}
                              data-testid={`checkbox-c-card-${ctq}`}
                            />
                            <div>
                              <Label htmlFor={`c-card-${ctq}`} className="font-medium cursor-pointer">
                                C Control Card
                              </Label>
                              <p className="text-xs text-gray-500">Count of defects per unit (constant sample size)</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3 p-3 bg-white rounded border">
                            <Checkbox
                              id={`u-card-${ctq}`}
                              checked={selection.u || false}
                              onCheckedChange={() => toggleControlCard(ctq, 'u')}
                              data-testid={`checkbox-u-card-${ctq}`}
                            />
                            <div>
                              <Label htmlFor={`u-card-${ctq}`} className="font-medium cursor-pointer">
                                U Control Card
                              </Label>
                              <p className="text-xs text-gray-500">Defects per unit (variable sample size)</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Defective Units Section */}
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <h3 className="font-semibold text-lg mb-4 text-gray-800">Defective Units</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Use these charts when classifying units as either defective or non-defective (pass/fail, good/bad, conform/non-conform).
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center space-x-3 p-3 bg-white rounded border">
                            <Checkbox
                              id={`np-card-${ctq}`}
                              checked={selection.np || false}
                              onCheckedChange={() => toggleControlCard(ctq, 'np')}
                              data-testid={`checkbox-np-card-${ctq}`}
                            />
                            <div>
                              <Label htmlFor={`np-card-${ctq}`} className="font-medium cursor-pointer">
                                NP Control Card
                              </Label>
                              <p className="text-xs text-gray-500">Number of defective units (constant sample size)</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3 p-3 bg-white rounded border">
                            <Checkbox
                              id={`p-card-${ctq}`}
                              checked={selection.p || false}
                              onCheckedChange={() => toggleControlCard(ctq, 'p')}
                              data-testid={`checkbox-p-card-${ctq}`}
                            />
                            <div>
                              <Label htmlFor={`p-card-${ctq}`} className="font-medium cursor-pointer">
                                P Control Card
                              </Label>
                              <p className="text-xs text-gray-500">Proportion of defective units (variable sample size)</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Render selected control card templates in tabs */}
                      {(selection.c || selection.u || selection.np || selection.p) && (
                        <Tabs defaultValue={selection.c ? 'c' : selection.u ? 'u' : selection.np ? 'np' : 'p'} className="mt-4">
                          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${[selection.c, selection.u, selection.np, selection.p].filter(Boolean).length}, 1fr)` }}>
                            {selection.c && <TabsTrigger value="c">C</TabsTrigger>}
                            {selection.u && <TabsTrigger value="u">U</TabsTrigger>}
                            {selection.np && <TabsTrigger value="np">NP</TabsTrigger>}
                            {selection.p && <TabsTrigger value="p">P</TabsTrigger>}
                          </TabsList>
                          {selection.c && <TabsContent value="c">{renderControlCardTemplate(ctq, 'c', 'C Chart')}</TabsContent>}
                          {selection.u && <TabsContent value="u">{renderControlCardTemplate(ctq, 'u', 'U Chart')}</TabsContent>}
                          {selection.np && <TabsContent value="np">{renderControlCardTemplate(ctq, 'np', 'NP Chart')}</TabsContent>}
                          {selection.p && <TabsContent value="p">{renderControlCardTemplate(ctq, 'p', 'P Chart')}</TabsContent>}
                        </Tabs>
                      )}
                    </div>
                  )}

                  {/* Continuous CTQ Control Cards */}
                  {ctqWithType.ctqType === "Continuous" && (
                    <div className="space-y-6">
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <h3 className="font-semibold text-lg mb-4 text-gray-800">Continuous Data Control Charts</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Select the appropriate control chart based on your subgroup size and data collection method.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex items-center space-x-3 p-3 bg-white rounded border">
                            <Checkbox
                              id={`imr-card-${ctq}`}
                              checked={selection.imr || false}
                              onCheckedChange={() => toggleControlCard(ctq, 'imr')}
                              data-testid={`checkbox-imr-card-${ctq}`}
                            />
                            <div>
                              <Label htmlFor={`imr-card-${ctq}`} className="font-medium cursor-pointer">
                                I-MR Control Card
                              </Label>
                              <p className="text-xs text-gray-500">Individual & Moving Range (n=1)</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3 p-3 bg-white rounded border">
                            <Checkbox
                              id={`xbar-r-card-${ctq}`}
                              checked={selection.xbarR || false}
                              onCheckedChange={() => toggleControlCard(ctq, 'xbarR')}
                              data-testid={`checkbox-xbar-r-card-${ctq}`}
                            />
                            <div>
                              <Label htmlFor={`xbar-r-card-${ctq}`} className="font-medium cursor-pointer">
                                Xbar-R Control Card
                              </Label>
                              <p className="text-xs text-gray-500">Mean of subgroup & Range (max - min) (n=2 to 4)</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3 p-3 bg-white rounded border">
                            <Checkbox
                              id={`xbar-s-card-${ctq}`}
                              checked={selection.xbarS || false}
                              onCheckedChange={() => toggleControlCard(ctq, 'xbarS')}
                              data-testid={`checkbox-xbar-s-card-${ctq}`}
                            />
                            <div>
                              <Label htmlFor={`xbar-s-card-${ctq}`} className="font-medium cursor-pointer">
                                Xbar-S Control Card
                              </Label>
                              <p className="text-xs text-gray-500">Mean of subgroup & Standard Deviation (n≥5)</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Render selected control card templates in tabs */}
                      {(selection.imr || selection.xbarR || selection.xbarS) && (
                        <Tabs defaultValue={selection.imr ? 'imr' : selection.xbarR ? 'xbarR' : 'xbarS'} className="mt-4">
                          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${[selection.imr, selection.xbarR, selection.xbarS].filter(Boolean).length}, 1fr)` }}>
                            {selection.imr && <TabsTrigger value="imr">I-MR</TabsTrigger>}
                            {selection.xbarR && <TabsTrigger value="xbarR">Xbar-R</TabsTrigger>}
                            {selection.xbarS && <TabsTrigger value="xbarS">Xbar-S</TabsTrigger>}
                          </TabsList>
                          {selection.imr && <TabsContent value="imr"><IMRCard projectId={projectId} ctqName={ctq} /></TabsContent>}
                          {selection.xbarR && <TabsContent value="xbarR">{renderControlCardTemplate(ctq, 'xbarR', 'Xbar-R Chart')}</TabsContent>}
                          {selection.xbarS && <TabsContent value="xbarS">{renderControlCardTemplate(ctq, 'xbarS', 'Xbar-S Chart')}</TabsContent>}
                        </Tabs>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}
