import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Calculator, BarChart3, PieChart, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { CtsCharacteristics, ProcessCapability, CtqAnalysisType, DataSetTerm, AttributeCalculationType } from '@shared/schema';
import { ContinuousCapabilityDisplay } from './ContinuousCapabilityDisplay';
import { AttributeCapabilityDisplay } from './AttributeCapabilityDisplay';

interface ProcessCapabilityAnalysisProps {
  projectId: string | number;
}

export default function ProcessCapabilityAnalysis({ projectId }: ProcessCapabilityAnalysisProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedCtq, setSelectedCtq] = useState<string>('');
  const [ctqType, setCtqType] = useState<CtqAnalysisType>('Continuous');
  const [zShift, setZShift] = useState<number>(1.5);
  const [dataSetTerm, setDataSetTerm] = useState<DataSetTerm>('Long Term');
  const [attributeCalculationType, setAttributeCalculationType] = useState<AttributeCalculationType>('DPMO');

  // Fetch CTQs from CTS characteristics
  const { data: ctsData } = useQuery({
    queryKey: ['/api/projects', projectId, 'cts-characteristics'],
    enabled: !!projectId,
  });

  // Fetch existing process capability data
  const { data: capabilityData, isLoading } = useQuery({
    queryKey: ['/api/projects', projectId, 'process-capability'],
    enabled: !!projectId,
  });

  // Get current CTQ characteristics
  const currentCtqData = ctsData?.characteristics?.find((char: CtsCharacteristics) => char.ctq === selectedCtq);
  
  // Set CTQ type based on selected CTQ
  useEffect(() => {
    if (currentCtqData) {
      setCtqType(currentCtqData.ctqType as CtqAnalysisType);
    }
  }, [currentCtqData]);

  // Get existing analysis for current CTQ
  const existingAnalysis = capabilityData?.processCapability?.find((analysis: ProcessCapability) => analysis.ctq === selectedCtq);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = existingAnalysis 
        ? `/api/projects/${projectId}/process-capability/${existingAnalysis.id}`
        : `/api/projects/${projectId}/process-capability`;
      
      return apiRequest(endpoint, {
        method: existingAnalysis ? 'PUT' : 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'process-capability'] });
      toast({
        title: "Success",
        description: "Process capability analysis saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save process capability analysis",
        variant: "destructive",
      });
      console.error('Save error:', error);
    }
  });

  const handleSave = () => {
    if (!selectedCtq) {
      toast({
        title: "Error",
        description: "Please select a CTQ first",
        variant: "destructive",
      });
      return;
    }

    const baseData = {
      projectId: Number(projectId),
      ctq: selectedCtq,
      ctqType,
      zShift,
      dataSetTerm,
      ...(ctqType === 'Attribute' && { attributeCalculationType })
    };

    saveMutation.mutate(baseData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const availableCtqs = ctsData?.characteristics || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6 text-blue-600" />
        <h2 className="text-2xl font-bold">Process Capability Analysis</h2>
      </div>

      {/* CTQ Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Analysis Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CTQ Selection */}
            <div className="space-y-2">
              <Label htmlFor="ctq-select">Select CTQ</Label>
              <Select value={selectedCtq} onValueChange={setSelectedCtq}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a CTQ" />
                </SelectTrigger>
                <SelectContent>
                  {availableCtqs.map((ctq: CtsCharacteristics) => (
                    <SelectItem key={ctq.id} value={ctq.ctq}>
                      <div className="flex items-center gap-2">
                        <span>{ctq.ctq}</span>
                        <Badge variant={ctq.ctqType === 'Continuous' ? 'default' : 'secondary'}>
                          {ctq.ctqType}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Z-Shift */}
            <div className="space-y-2">
              <Label htmlFor="z-shift">Z-Shift Value</Label>
              <Input
                id="z-shift"
                type="number"
                step="0.1"
                value={zShift}
                onChange={(e) => setZShift(Number(e.target.value))}
                placeholder="1.5"
              />
            </div>

            {/* Data Set Term */}
            <div className="space-y-2">
              <Label htmlFor="data-set-term">Data Set Term</Label>
              <Select value={dataSetTerm} onValueChange={(value: DataSetTerm) => setDataSetTerm(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Long Term">Long Term</SelectItem>
                  <SelectItem value="Short Term">Short Term</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Attribute Calculation Type (only for Attribute CTQs) */}
            {ctqType === 'Attribute' && (
              <div className="space-y-2">
                <Label htmlFor="calc-type">Calculation Type</Label>
                <Select value={attributeCalculationType} onValueChange={(value: AttributeCalculationType) => setAttributeCalculationType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DPMO">DPMO</SelectItem>
                    <SelectItem value="DPU">DPU</SelectItem>
                    <SelectItem value="YRT">YRT (Rolled Throughput Yield)</SelectItem>
                    <SelectItem value="OEE">OEE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* CTQ Information */}
          {currentCtqData && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">CTQ Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Type:</span> {currentCtqData.ctqType}
                </div>
                {currentCtqData.ctqType === 'Continuous' && (
                  <>
                    <div>
                      <span className="font-medium">LSL:</span> {currentCtqData.lsl || 'Not set'}
                    </div>
                    <div>
                      <span className="font-medium">USL:</span> {currentCtqData.usl || 'Not set'}
                    </div>
                    <div>
                      <span className="font-medium">Target:</span> {currentCtqData.target || 'Not set'}
                    </div>
                    <div>
                      <span className="font-medium">Unit:</span> {currentCtqData.unit || 'Not specified'}
                    </div>
                  </>
                )}
                {currentCtqData.operationalDefinition && (
                  <div className="md:col-span-3">
                    <span className="font-medium">Definition:</span> {currentCtqData.operationalDefinition}
                  </div>
                )}
              </div>
            </div>
          )}

          <Button onClick={handleSave} disabled={!selectedCtq || saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving...' : 'Save Configuration'}
          </Button>
        </CardContent>
      </Card>

      {/* Analysis Content */}
      {selectedCtq && currentCtqData && (
        <div className="space-y-6">
          {ctqType === 'Continuous' ? (
            <ContinuousCapabilityDisplay
              projectId={projectId}
              ctq={selectedCtq}
              ctqData={currentCtqData}
              zShift={zShift}
              dataSetTerm={dataSetTerm}
              existingAnalysis={existingAnalysis}
            />
          ) : (
            <AttributeCapabilityDisplay
              projectId={projectId}
              ctq={selectedCtq}
              ctqData={currentCtqData}
              zShift={zShift}
              dataSetTerm={dataSetTerm}
              calculationType={attributeCalculationType}
              existingAnalysis={existingAnalysis}
            />
          )}
        </div>
      )}

      {/* No CTQ Selected */}
      {!selectedCtq && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No CTQ Selected</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Select a CTQ from the configuration above to begin process capability analysis. 
              Make sure you have defined CTQs in the CTS Characteristics section first.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}