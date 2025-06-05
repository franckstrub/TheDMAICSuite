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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Trash2 } from "lucide-react";

interface CtsCharacteristic {
  id?: number;
  ctq: string;
  operationalDefinition: string;
  ctqType: "Attribute" | "Continuous";
  targetPercentDefects: string;
  target: string;
  lsl: string; // Lower Specification Limit
  usl: string; // Upper Specification Limit
  isAutoPopulated?: boolean; // Track if CTQ was auto-populated from Define phase
}

interface CtsCharacteristicsProps {
  projectId: number;
}

export default function CtsCharacteristics({ projectId }: CtsCharacteristicsProps) {
  const { toast } = useToast();
  const [characteristics, setCharacteristics] = useState<CtsCharacteristic[]>([]);
  const [availableCtqs, setAvailableCtqs] = useState<{ctq: string, source: string}[]>([]);

  // Load existing CTS characteristics
  const { data: ctsData, isLoading: ctsLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/cts-characteristics`],
    enabled: !!projectId,
  });

  // Load available CTQs from customer and business requirements
  const { data: ctqsData, isLoading: ctqsLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/ctqs`],
    enabled: !!projectId,
  });

  // Save CTS characteristics mutation
  const saveMutation = useMutation({
    mutationFn: async (data: CtsCharacteristic[]) => {
      const response = await fetch(`/api/projects/${projectId}/cts-characteristics`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ characteristics: data }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save CTS characteristics: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "CTS characteristics saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/cts-characteristics`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save CTS characteristics",
        variant: "destructive",
      });
    },
  });

  // Initialize characteristics when data loads
  useEffect(() => {
    if (ctsData?.characteristics && ctsData.characteristics.length > 0) {
      setCharacteristics(ctsData.characteristics);
    } else if (ctqsData?.ctqs && ctqsData.ctqs.length > 0) {
      // Auto-populate with CTQs from requirements if no saved data exists
      const autoPopulatedCharacteristics = ctqsData.ctqs.map((ctqItem: any) => ({
        ctq: ctqItem.ctq,
        operationalDefinition: "",
        ctqType: "Continuous" as "Continuous",
        targetPercentDefects: "",
        target: "",
        lsl: "",
        usl: "",
        isAutoPopulated: true,
      }));
      setCharacteristics(autoPopulatedCharacteristics);
    } else {
      // Initialize with empty characteristic if no data exists
      setCharacteristics([{
        ctq: "",
        operationalDefinition: "",
        ctqType: "Continuous",
        targetPercentDefects: "",
        target: "",
        lsl: "",
        usl: "",
        isAutoPopulated: false,
      }]);
    }
  }, [ctsData, ctqsData]);

  // Set available CTQs when data loads
  useEffect(() => {
    if (ctqsData?.ctqs) {
      setAvailableCtqs(ctqsData.ctqs);
    }
  }, [ctqsData]);

  const updateCharacteristic = (index: number, field: keyof CtsCharacteristic, value: string) => {
    const newCharacteristics = [...characteristics];
    newCharacteristics[index] = { 
      ...newCharacteristics[index], 
      [field]: value 
    };
    
    // If CTQ type changes to Attribute, clear continuous-specific fields
    if (field === 'ctqType' && value === 'Attribute') {
      newCharacteristics[index].target = "";
      newCharacteristics[index].lsl = "";
      newCharacteristics[index].usl = "";
    }
    
    setCharacteristics(newCharacteristics);
  };

  const addCharacteristic = () => {
    setCharacteristics([
      ...characteristics,
      {
        ctq: "",
        operationalDefinition: "",
        ctqType: "Continuous",
        targetPercentDefects: "",
        target: "",
        lsl: "",
        usl: "",
        isAutoPopulated: false,
      }
    ]);
  };

  const removeCharacteristic = (index: number) => {
    const newCharacteristics = characteristics.filter((_, i) => i !== index);
    
    // If we're removing the last characteristic, add an empty one for manual entry
    if (newCharacteristics.length === 0) {
      newCharacteristics.push({
        ctq: "",
        operationalDefinition: "",
        ctqType: "Continuous",
        targetPercentDefects: "",
        target: "",
        lsl: "",
        usl: "",
        isAutoPopulated: false,
      });
    }
    
    setCharacteristics(newCharacteristics);
  };

  const handleSave = () => {
    // Filter out empty characteristics
    const validCharacteristics = characteristics.filter(char => char.ctq.trim() !== "");
    saveMutation.mutate(validCharacteristics);
  };



  if (ctsLoading || ctqsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>CTS Characteristics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-sm text-gray-500">Loading CTS characteristics...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>CTS Characteristics</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">
          Define the Critical to Quality (CTQ) characteristics from your requirements analysis and specify their measurement parameters.
        </p>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CTQ</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operational Definition</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CTQ Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Targeted % of Defects</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LSL</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">USL</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {characteristics.map((characteristic, index) => (
                <tr key={index}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {characteristic.isAutoPopulated ? (
                      <div className="font-medium text-sm bg-gray-50 p-2 rounded border">
                        {characteristic.ctq || "No CTQ"}
                      </div>
                    ) : (
                      <Input
                        placeholder="Enter CTQ"
                        value={characteristic.ctq}
                        onChange={(e) => updateCharacteristic(index, 'ctq', e.target.value)}
                        className="w-full"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Textarea
                      placeholder="Operational definition"
                      value={characteristic.operationalDefinition}
                      onChange={(e) => updateCharacteristic(index, 'operationalDefinition', e.target.value)}
                      className="min-h-[60px]"
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Select
                      value={characteristic.ctqType}
                      onValueChange={(value: "Attribute" | "Continuous") => updateCharacteristic(index, 'ctqType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Continuous">Continuous</SelectItem>
                        <SelectItem value="Attribute">Attribute</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Input
                      placeholder="% defects"
                      value={characteristic.targetPercentDefects}
                      onChange={(e) => updateCharacteristic(index, 'targetPercentDefects', e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {characteristic.ctqType === "Continuous" ? (
                      <Input
                        placeholder="Target value"
                        value={characteristic.target}
                        onChange={(e) => updateCharacteristic(index, 'target', e.target.value)}
                      />
                    ) : (
                      <div className="text-gray-400 text-center">n/a</div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {characteristic.ctqType === "Continuous" ? (
                      <Input
                        placeholder="Lower limit"
                        value={characteristic.lsl}
                        onChange={(e) => updateCharacteristic(index, 'lsl', e.target.value)}
                      />
                    ) : (
                      <div className="text-gray-400 text-center">n/a</div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {characteristic.ctqType === "Continuous" ? (
                      <Input
                        placeholder="Upper limit"
                        value={characteristic.usl}
                        onChange={(e) => updateCharacteristic(index, 'usl', e.target.value)}
                      />
                    ) : (
                      <div className="text-gray-400 text-center">n/a</div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCharacteristic(index)}
                      disabled={characteristics.length === 1}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 flex justify-between">
          <Button
            variant="outline"
            onClick={addCharacteristic}
            className="flex items-center space-x-2"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add Characteristic</span>
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? "Saving..." : "Save CTS Characteristics"}
          </Button>
        </div>
        
        <div className="mt-4 text-xs text-gray-500">
          <p>• CTQs are automatically populated from customer requirements and business requirements</p>
          <p>• For Continuous CTQ types, specify Target, LSL (Lower Specification Limit), and USL (Upper Specification Limit)</p>
          <p>• For Attribute CTQ types, only Targeted % of Defects is applicable</p>
        </div>
      </CardContent>
    </Card>
  );
}