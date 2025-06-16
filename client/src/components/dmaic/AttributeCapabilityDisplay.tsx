import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calculator, PieChart, Target, AlertCircle, BarChart3, Gauge } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { CtsCharacteristics, ProcessCapability, DataSetTerm, AttributeCalculationType } from '@shared/schema';
import { calculateAttributeCapability, type AttributeCapabilityData, type AttributeCapabilityResults } from '@/utils/processCapabilityStats';

interface AttributeCapabilityDisplayProps {
  projectId: string | number;
  ctq: string;
  ctqData: CtsCharacteristics;
  zShift: number;
  dataSetTerm: DataSetTerm;
  calculationType: AttributeCalculationType;
  existingAnalysis?: ProcessCapability;
}

export function AttributeCapabilityDisplay({
  projectId,
  ctq,
  ctqData,
  zShift,
  dataSetTerm,
  calculationType,
  existingAnalysis
}: AttributeCapabilityDisplayProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // DPMO/DPU fields
  const [totalUnits, setTotalUnits] = useState<number>(0);
  const [defectiveUnits, setDefectiveUnits] = useState<number>(0);
  const [totalDefects, setTotalDefects] = useState<number>(0);
  const [opportunities, setOpportunities] = useState<number>(1);
  
  // OEE fields
  const [availability, setAvailability] = useState<number>(0);
  const [performance, setPerformance] = useState<number>(0);
  const [quality, setQuality] = useState<number>(0);
  
  // YRT fields
  const [stepYields, setStepYields] = useState<number[]>([100, 100, 100, 100, 100]);
  
  const [results, setResults] = useState<AttributeCapabilityResults | null>(null);
  const [error, setError] = useState<string>('');

  // Load existing data
  useEffect(() => {
    if (existingAnalysis) {
      setTotalUnits(existingAnalysis.totalUnits || 0);
      setDefectiveUnits(existingAnalysis.defectiveUnits || 0);
      setTotalDefects(existingAnalysis.totalDefects || 0);
      setOpportunities(existingAnalysis.opportunities || 1);
      setAvailability(existingAnalysis.availability || 0);
      setPerformance(existingAnalysis.performance || 0);
      setQuality(existingAnalysis.quality || 0);
      
      if (existingAnalysis.yieldStep1) {
        setStepYields([
          existingAnalysis.yieldStep1,
          existingAnalysis.yieldStep2 || 100,
          existingAnalysis.yieldStep3 || 100,
          existingAnalysis.yieldStep4 || 100,
          existingAnalysis.yieldStep5 || 100
        ]);
      }
    }
  }, [existingAnalysis]);

  const calculateResults = () => {
    try {
      setError('');
      
      let capabilityData: AttributeCapabilityData;

      switch (calculationType) {
        case 'DPMO':
          if (totalUnits <= 0 || opportunities <= 0) {
            setError('Total units and opportunities must be greater than 0');
            return;
          }
          capabilityData = {
            calculationType: 'DPMO',
            zShift,
            dataSetTerm,
            totalUnits,
            totalDefects,
            opportunities
          };
          break;

        case 'DPU':
          if (totalUnits <= 0) {
            setError('Total units must be greater than 0');
            return;
          }
          capabilityData = {
            calculationType: 'DPU',
            zShift,
            dataSetTerm,
            totalUnits,
            totalDefects
          };
          break;

        case 'YRT':
          if (stepYields.some(y => y < 0 || y > 100)) {
            setError('All step yields must be between 0 and 100');
            return;
          }
          capabilityData = {
            calculationType: 'YRT',
            zShift,
            dataSetTerm,
            stepYields: stepYields.filter(y => y > 0)
          };
          break;

        case 'OEE':
          if (availability < 0 || availability > 100 || 
              performance < 0 || performance > 100 || 
              quality < 0 || quality > 100) {
            setError('All OEE components must be between 0 and 100');
            return;
          }
          capabilityData = {
            calculationType: 'OEE',
            zShift,
            dataSetTerm,
            availability,
            performance,
            quality
          };
          break;

        default:
          setError('Unknown calculation type');
          return;
      }

      const calculatedResults = calculateAttributeCapability(capabilityData);
      setResults(calculatedResults);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation error');
      setResults(null);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!results) throw new Error('No results to save');

      const data = {
        projectId: Number(projectId),
        ctq,
        ctqType: 'Attribute' as const,
        zShift,
        dataSetTerm,
        attributeCalculationType: calculationType,
        totalUnits: calculationType === 'DPMO' || calculationType === 'DPU' ? totalUnits : null,
        defectiveUnits: calculationType === 'DPMO' ? defectiveUnits : null,
        totalDefects: calculationType === 'DPMO' || calculationType === 'DPU' ? totalDefects : null,
        opportunities: calculationType === 'DPMO' ? opportunities : null,
        availability: calculationType === 'OEE' ? availability : null,
        performance: calculationType === 'OEE' ? performance : null,
        quality: calculationType === 'OEE' ? quality : null,
        oeeValue: results.oeeValue || null,
        yieldStep1: calculationType === 'YRT' ? stepYields[0] : null,
        yieldStep2: calculationType === 'YRT' ? stepYields[1] : null,
        yieldStep3: calculationType === 'YRT' ? stepYields[2] : null,
        yieldStep4: calculationType === 'YRT' ? stepYields[3] : null,
        yieldStep5: calculationType === 'YRT' ? stepYields[4] : null,
        rolledThroughputYield: results.rolledThroughputYield || null,
        dpmo: results.dpmo || null,
        processYield: results.processYield || null,
        sigma: results.sigma || null
      };

      const endpoint = existingAnalysis 
        ? `/api/projects/${projectId}/process-capability/${existingAnalysis.id}`
        : `/api/projects/${projectId}/process-capability`;
      
      if (existingAnalysis) {
        return apiRequest(endpoint, 'PUT', data);
      } else {
        return apiRequest(endpoint, 'POST', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'process-capability'] });
      toast({
        title: "Success",
        description: "Attribute capability analysis saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save analysis",
        variant: "destructive",
      });
      console.error('Save error:', error);
    }
  });

  const getSigmaRating = (sigma: number) => {
    if (sigma >= 6) return { rating: 'World Class', color: 'bg-green-500' };
    if (sigma >= 4) return { rating: 'Industry Average', color: 'bg-yellow-500' };
    return { rating: 'Below Average', color: 'bg-red-500' };
  };

  const getYieldRating = (yieldValue: number) => {
    if (yieldValue >= 99.9) return { rating: 'Excellent', color: 'bg-green-500' };
    if (yieldValue >= 95) return { rating: 'Good', color: 'bg-yellow-500' };
    return { rating: 'Poor', color: 'bg-red-500' };
  };

  const renderInputFields = () => {
    switch (calculationType) {
      case 'DPMO':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total-units">Total Units Inspected</Label>
              <Input
                id="total-units"
                type="number"
                value={totalUnits}
                onChange={(e) => setTotalUnits(Number(e.target.value))}
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="total-defects">Total Defects Found</Label>
              <Input
                id="total-defects"
                type="number"
                value={totalDefects}
                onChange={(e) => setTotalDefects(Number(e.target.value))}
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="opportunities">Opportunities per Unit</Label>
              <Input
                id="opportunities"
                type="number"
                value={opportunities}
                onChange={(e) => setOpportunities(Number(e.target.value))}
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label>Calculated DPMO</Label>
              <Input
                value={totalUnits > 0 && opportunities > 0 ? 
                  Math.round((totalDefects / (totalUnits * opportunities)) * 1000000).toLocaleString() : '0'}
                disabled
                className="bg-muted"
              />
            </div>
          </div>
        );

      case 'DPU':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total-units-dpu">Total Units Inspected</Label>
              <Input
                id="total-units-dpu"
                type="number"
                value={totalUnits}
                onChange={(e) => setTotalUnits(Number(e.target.value))}
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="total-defects-dpu">Total Defects Found</Label>
              <Input
                id="total-defects-dpu"
                type="number"
                value={totalDefects}
                onChange={(e) => setTotalDefects(Number(e.target.value))}
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Calculated DPU</Label>
              <Input
                value={totalUnits > 0 ? (totalDefects / totalUnits).toFixed(4) : '0'}
                disabled
                className="bg-muted"
              />
            </div>
          </div>
        );

      case 'YRT':
        return (
          <div className="space-y-4">
            <h4 className="font-medium">Process Step Yields (%)</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {stepYields.map((yieldValue, index) => (
                <div key={index} className="space-y-2">
                  <Label htmlFor={`step-${index}`}>Step {index + 1}</Label>
                  <Input
                    id={`step-${index}`}
                    type="number"
                    value={yieldValue}
                    onChange={(e) => {
                      const newYields = [...stepYields];
                      newYields[index] = Number(e.target.value);
                      setStepYields(newYields);
                    }}
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
              ))}
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <p className="text-sm">
                <span className="font-medium">Calculated RTY:</span> {
                  stepYields.filter(y => y > 0).reduce((acc, y) => acc * (y / 100), 1) * 100
                }%
              </p>
            </div>
          </div>
        );

      case 'OEE':
        return (
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="availability">Availability (%)</Label>
              <Input
                id="availability"
                type="number"
                value={availability}
                onChange={(e) => setAvailability(Number(e.target.value))}
                min="0"
                max="100"
                step="0.1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="performance">Performance (%)</Label>
              <Input
                id="performance"
                type="number"
                value={performance}
                onChange={(e) => setPerformance(Number(e.target.value))}
                min="0"
                max="100"
                step="0.1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quality">Quality (%)</Label>
              <Input
                id="quality"
                type="number"
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                min="0"
                max="100"
                step="0.1"
              />
            </div>
            <div className="col-span-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <p className="text-sm">
                <span className="font-medium">Calculated OEE:</span> {
                  ((availability / 100) * (performance / 100) * (quality / 100) * 100).toFixed(2)
                }%
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderResults = () => {
    if (!results) return null;

    switch (calculationType) {
      case 'DPMO':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  DPMO Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">DPMO</p>
                  <p className="text-3xl font-bold text-red-600">{results.dpmo?.toLocaleString()}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Process Yield</p>
                  <p className="text-2xl font-bold text-green-600">{results.processYield?.toFixed(2)}%</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Sigma Level</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">{results.sigma?.toFixed(2)}σ</p>
                    <Badge className={getSigmaRating(results.sigma || 0).color}>
                      {getSigmaRating(results.sigma || 0).rating}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'DPU':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  DPU Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">DPU</p>
                  <p className="text-3xl font-bold text-red-600">{results.dpu?.toFixed(4)}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Process Yield</p>
                  <p className="text-2xl font-bold text-green-600">{results.processYield?.toFixed(2)}%</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Sigma Level</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">{results.sigma?.toFixed(2)}σ</p>
                    <Badge className={getSigmaRating(results.sigma || 0).color}>
                      {getSigmaRating(results.sigma || 0).rating}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'YRT':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Rolled Throughput Yield
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">RTY</p>
                  <div className="flex items-center gap-2">
                    <p className="text-3xl font-bold text-green-600">{results.rolledThroughputYield?.toFixed(2)}%</p>
                    <Badge className={getYieldRating(results.rolledThroughputYield || 0).color}>
                      {getYieldRating(results.rolledThroughputYield || 0).rating}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Sigma Level</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">{results.sigma?.toFixed(2)}σ</p>
                    <Badge className={getSigmaRating(results.sigma || 0).color}>
                      {getSigmaRating(results.sigma || 0).rating}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'OEE':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5" />
                  OEE Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Overall Equipment Effectiveness</p>
                  <div className="flex items-center gap-2">
                    <p className="text-3xl font-bold text-blue-600">{results.oeeValue?.toFixed(2)}%</p>
                    <Badge className={getYieldRating(results.oeeValue || 0).color}>
                      {getYieldRating(results.oeeValue || 0).rating}
                    </Badge>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Availability</p>
                    <p className="text-lg font-bold">{results.availability?.toFixed(1)}%</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Performance</p>
                    <p className="text-lg font-bold">{results.performance?.toFixed(1)}%</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Quality</p>
                    <p className="text-lg font-bold">{results.quality?.toFixed(1)}%</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Sigma Level</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">{results.sigma?.toFixed(2)}σ</p>
                    <Badge className={getSigmaRating(results.sigma || 0).color}>
                      {getSigmaRating(results.sigma || 0).rating}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Data Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            {calculationType} Data Input
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderInputFields()}

          <div className="flex gap-2">
            <Button onClick={calculateResults} className="flex-1">
              Calculate {calculationType}
            </Button>
            {results && (
              <Button 
                onClick={() => saveMutation.mutate()} 
                disabled={saveMutation.isPending}
                variant="outline"
              >
                {saveMutation.isPending ? 'Saving...' : 'Save Results'}
              </Button>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Results Display */}
      {results && renderResults()}
    </div>
  );
}