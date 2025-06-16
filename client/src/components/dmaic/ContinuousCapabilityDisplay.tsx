import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calculator, TrendingUp, Target, AlertCircle, PieChart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { CtsCharacteristics, ProcessCapability, DataSetTerm } from '@shared/schema';
import { calculateContinuousCapability, type ContinuousCapabilityData, type ContinuousCapabilityResults } from '@/utils/processCapabilityStats';

interface ContinuousCapabilityDisplayProps {
  projectId: string | number;
  ctq: string;
  ctqData: CtsCharacteristics;
  zShift: number;
  dataSetTerm: DataSetTerm;
  existingAnalysis?: ProcessCapability;
}

export function ContinuousCapabilityDisplay({
  projectId,
  ctq,
  ctqData,
  zShift,
  dataSetTerm,
  existingAnalysis
}: ContinuousCapabilityDisplayProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [dataPoints, setDataPoints] = useState<string>('');
  const [target, setTarget] = useState<number>(ctqData.target || 0);
  const [results, setResults] = useState<ContinuousCapabilityResults | null>(null);
  const [error, setError] = useState<string>('');

  // Load existing data
  useEffect(() => {
    if (existingAnalysis) {
      setDataPoints(existingAnalysis.dataPoints || '');
      setTarget(existingAnalysis.target || ctqData.target || 0);
    }
  }, [existingAnalysis, ctqData.target]);

  const calculateResults = () => {
    try {
      setError('');
      
      if (!dataPoints.trim()) {
        setError('Please enter data points');
        return;
      }

      if (!ctqData.lsl || !ctqData.usl) {
        setError('LSL and USL must be defined in CTS Characteristics');
        return;
      }

      // Parse data points (comma or newline separated)
      const values = dataPoints
        .split(/[,\n\r\t]+/)
        .map(val => val.trim())
        .filter(val => val !== '')
        .map(val => {
          const num = parseFloat(val);
          if (isNaN(num)) {
            throw new Error(`Invalid number: ${val}`);
          }
          return num;
        });

      if (values.length < 2) {
        setError('At least 2 data points are required');
        return;
      }

      const capabilityData: ContinuousCapabilityData = {
        dataPoints: values,
        lsl: ctqData.lsl,
        usl: ctqData.usl,
        target,
        zShift,
        dataSetTerm
      };

      const calculatedResults = calculateContinuousCapability(capabilityData);
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
        ctqType: 'Continuous' as const,
        zShift,
        dataSetTerm,
        sampleSize: results.sampleSize,
        mean: results.mean,
        standardDeviation: results.standardDeviation,
        target,
        cp: results.cp,
        cpk: results.cpk,
        pp: results.pp,
        ppk: results.ppk,
        sigma: results.sigma,
        dpmo: results.dpmo,
        processYield: results.processYield,
        dataPoints: dataPoints
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
        description: "Process capability analysis saved successfully",
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

  const getCapabilityRating = (cpk: number) => {
    if (cpk >= 1.33) return { rating: 'Excellent', color: 'bg-green-500' };
    if (cpk >= 1.0) return { rating: 'Adequate', color: 'bg-yellow-500' };
    return { rating: 'Poor', color: 'bg-red-500' };
  };

  const getSigmaRating = (sigma: number) => {
    if (sigma >= 6) return { rating: 'World Class', color: 'bg-green-500' };
    if (sigma >= 4) return { rating: 'Industry Average', color: 'bg-yellow-500' };
    return { rating: 'Below Average', color: 'bg-red-500' };
  };

  return (
    <div className="space-y-6">
      {/* Data Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Continuous Data Input
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Data Points */}
            <div className="space-y-2">
              <Label htmlFor="data-points">Data Points (comma or line separated)</Label>
              <Textarea
                id="data-points"
                value={dataPoints}
                onChange={(e) => setDataPoints(e.target.value)}
                placeholder="Enter your measurements, e.g.:&#10;12.5, 13.2, 11.8, 12.9&#10;or one value per line"
                rows={8}
                className="font-mono"
              />
              <p className="text-sm text-muted-foreground">
                Enter numerical data points separated by commas or new lines
              </p>
            </div>

            {/* Configuration */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="target">Target Value</Label>
                  <Input
                    id="target"
                    type="number"
                    step="any"
                    value={target}
                    onChange={(e) => setTarget(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sample Size</Label>
                  <Input
                    value={dataPoints ? dataPoints.split(/[,\n\r\t]+/).filter(v => v.trim()).length : 0}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              {/* Specification Limits */}
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Specification Limits</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">LSL:</span> {ctqData.lsl || 'Not set'}
                  </div>
                  <div>
                    <span className="font-medium">USL:</span> {ctqData.usl || 'Not set'}
                  </div>
                  <div>
                    <span className="font-medium">Unit:</span> {ctqData.unit || 'Not specified'}
                  </div>
                  <div>
                    <span className="font-medium">Range:</span> {ctqData.lsl && ctqData.usl ? (ctqData.usl - ctqData.lsl).toFixed(3) : 'N/A'}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={calculateResults} className="flex-1">
                  Calculate Capability
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
            </div>
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
      {results && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Process Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Process Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Sample Size</p>
                  <p className="text-2xl font-bold">{results.sampleSize}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Process Mean</p>
                  <p className="text-2xl font-bold">{results.mean.toFixed(4)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Std Deviation</p>
                  <p className="text-2xl font-bold">{results.standardDeviation.toFixed(4)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Process Yield</p>
                  <p className="text-2xl font-bold text-green-600">{results.processYield.toFixed(2)}%</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-green-600">Within Tolerance</p>
                  <p className="text-xl font-bold">{results.withinTolerance}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-red-600">Below LSL</p>
                  <p className="text-xl font-bold">{results.belowTolerance}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-red-600">Above USL</p>
                  <p className="text-xl font-bold">{results.aboveTolerance}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Capability Indices */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Capability Indices
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Cp (Potential)</p>
                  <p className="text-2xl font-bold">{results.cp.toFixed(3)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Cpk (Actual)</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">{results.cpk.toFixed(3)}</p>
                    <Badge className={getCapabilityRating(results.cpk).color}>
                      {getCapabilityRating(results.cpk).rating}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Pp (Performance)</p>
                  <p className="text-2xl font-bold">{results.pp.toFixed(3)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Ppk (Performance)</p>
                  <p className="text-2xl font-bold">{results.ppk.toFixed(3)}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Sigma Level</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">{results.sigma.toFixed(2)}σ</p>
                    <Badge className={getSigmaRating(results.sigma).color}>
                      {getSigmaRating(results.sigma).rating}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">DPMO</p>
                  <p className="text-2xl font-bold text-red-600">{results.dpmo.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}