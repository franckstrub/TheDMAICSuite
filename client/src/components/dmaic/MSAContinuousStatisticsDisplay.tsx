/**
 * MSA Continuous Statistics Display Component for ANOVA Gage R&R Analysis
 * 
 * Displays comprehensive ANOVA-based Gage R&R statistics including:
 * - Study variation (σ dev)
 * - 6*study var and %study var
 * - %tolerance calculations
 * - Number of distinct categories
 * - Measurement system assessment
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertTriangle, XCircle, BarChart3 } from "lucide-react";
import { calculateGageRRStatistics } from "@/utils/gageRRStatistics";
// Types for ANOVA Gage R&R
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

interface VariationComponent {
  studyVariation: number;
  studyVar: number;
  percentStudyVar: number;
  percentTolerance: number;
}

interface GageRRStatistics {
  totalGageRR: VariationComponent;
  repeatability: VariationComponent;
  reproducibility: VariationComponent;
  operator: VariationComponent;
  partOperator: VariationComponent;
  partToPart: VariationComponent;
  total: VariationComponent;
  numberDistinctCategories: number;
  isValid: boolean;
}



interface MSAContinuousStatisticsDisplayProps {
  data: ContinuousAnalysisRow[];
  appraiser1Name: string;
  appraiser2Name: string;
  appraiser3Name: string;
  sigmaMultiplier: number;
  tolerance?: number;
  repetitions: number;
  numberOfAppraisers: number;
}

export default function MSAContinuousStatisticsDisplay({ 
  data, 
  appraiser1Name, 
  appraiser2Name, 
  appraiser3Name,
  sigmaMultiplier,
  tolerance,
  repetitions,
  numberOfAppraisers
}: MSAContinuousStatisticsDisplayProps) {
  const statistics = calculateGageRRStatistics(data, sigmaMultiplier, tolerance);
  
  // Check if there's meaningful data for analysis
  const hasRealData = data.length > 0 && data.some(row => 
    row.app1_rep1 !== 0 || row.app1_rep2 !== 0 || row.app1_rep3 !== 0 ||
    row.app2_rep1 !== 0 || row.app2_rep2 !== 0 || row.app2_rep3 !== 0 ||
    row.app3_rep1 !== 0 || row.app3_rep2 !== 0 || row.app3_rep3 !== 0
  );

  // Validate AIAG standards compliance
  const validData = data.filter(row => 
    row.app1_rep1 !== 0 || row.app1_rep2 !== 0 || row.app1_rep3 !== 0 ||
    row.app2_rep1 !== 0 || row.app2_rep2 !== 0 || row.app2_rep3 !== 0 ||
    row.app3_rep1 !== 0 || row.app3_rep2 !== 0 || row.app3_rep3 !== 0
  );

  // Count active operators with balanced data (at least 2 repetitions per part)
  let activeOperators = 0;
  const op1HasBalancedData = validData.every(row => 
    (row.app1_rep1 !== 0 && row.app1_rep2 !== 0) || 
    (row.app1_rep1 === 0 && row.app1_rep2 === 0 && row.app1_rep3 === 0)
  ) && validData.some(row => row.app1_rep1 !== 0 || row.app1_rep2 !== 0);

  const op2HasBalancedData = validData.every(row => 
    (row.app2_rep1 !== 0 && row.app2_rep2 !== 0) || 
    (row.app2_rep1 === 0 && row.app2_rep2 === 0 && row.app2_rep3 === 0)
  ) && validData.some(row => row.app2_rep1 !== 0 || row.app2_rep2 !== 0);

  const op3HasBalancedData = validData.every(row => 
    (row.app3_rep1 !== 0 && row.app3_rep2 !== 0) || 
    (row.app3_rep1 === 0 && row.app3_rep2 === 0 && row.app3_rep3 === 0)
  ) && validData.some(row => row.app3_rep1 !== 0 || row.app3_rep2 !== 0);

  if (op1HasBalancedData) activeOperators++;
  if (op2HasBalancedData) activeOperators++;
  if (op3HasBalancedData) activeOperators++;

  // Check AIAG compliance
  if (!hasRealData) {
    return (
      <Alert className="border-amber-200 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          No measurement data available. Please enter measurement values to calculate ANOVA Gage R&R statistics.
        </AlertDescription>
      </Alert>
    );
  }

  if (validData.length < 10) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <XCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <strong>AIAG Standard Not Met:</strong> Minimum 10 parts required for valid Gage R&R analysis. 
          Current: {validData.length}/10 parts. Please add more measurement data.
        </AlertDescription>
      </Alert>
    );
  }

  if (activeOperators < 2) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <XCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <strong>AIAG Standard Not Met:</strong> Minimum 2 operators with balanced data required (at least 2 repetitions per part). 
          Current: {activeOperators}/2 operators. Please ensure each operator has at least 2 measurements per part.
        </AlertDescription>
      </Alert>
    );
  }

  const getVariationAssessment = (percentage: number) => {
    if (percentage < 10) {
      return { label: "Excellent", color: "bg-green-600", icon: CheckCircle };
    } else if (percentage < 30) {
      return { label: "Acceptable", color: "bg-yellow-500", icon: AlertTriangle };
    } else {
      return { label: "Unacceptable", color: "bg-red-600", icon: XCircle };
    }
  };

  const totalGageRRAssessment = getVariationAssessment(statistics.totalGageRR.percentStudyVar);
  const Icon = totalGageRRAssessment.icon;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            ANOVA Gage R&R Statistics
          </CardTitle>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Appraisers: <strong>{numberOfAppraisers}</strong></span>
            <span>Repetitions: <strong>{repetitions}</strong></span>
            <span>Nb of sigma used: <strong>{sigmaMultiplier}</strong></span>
            {tolerance && <span>Tolerance: <strong>{tolerance}</strong></span>}
            <span>Nbr of distinct categories: <strong>{statistics.numberDistinctCategories.toFixed(1)}</strong></span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* ANOVA Method Results Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-blue-100">
                  <th className="border border-gray-300 px-3 py-2 text-left font-medium">ANOVA Method</th>
                  <th className="border border-gray-300 px-3 py-2 text-center font-medium">study variation<br/>(σ dev)</th>
                  <th className="border border-gray-300 px-3 py-2 text-center font-medium">{sigmaMultiplier}*study var</th>
                  <th className="border border-gray-300 px-3 py-2 text-center font-medium">%study var</th>
                  {tolerance && (
                    <th className="border border-gray-300 px-3 py-2 text-center font-medium">%tolerance</th>
                  )}
                </tr>
              </thead>
              <tbody>
                <tr className="bg-blue-50">
                  <td className="border border-gray-300 px-3 py-2 font-medium">Total Gage R&R</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">{statistics.totalGageRR.studyVariation.toFixed(2)}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">{statistics.totalGageRR.studyVar.toFixed(2)}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">{statistics.totalGageRR.percentStudyVar.toFixed(2)}%</td>
                  {tolerance && (
                    <td className="border border-gray-300 px-3 py-2 text-center">{statistics.totalGageRR.percentTolerance.toFixed(2)}%</td>
                  )}
                </tr>
                <tr>
                  <td className="border border-gray-300 px-3 py-2 pl-6">Repeatability</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">{statistics.repeatability.studyVariation.toFixed(2)}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">{statistics.repeatability.studyVar.toFixed(2)}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">{statistics.repeatability.percentStudyVar.toFixed(2)}%</td>
                  {tolerance && (
                    <td className="border border-gray-300 px-3 py-2 text-center">{statistics.repeatability.percentTolerance.toFixed(2)}%</td>
                  )}
                </tr>
                <tr>
                  <td className="border border-gray-300 px-3 py-2 pl-6">Reproducibility</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">{statistics.reproducibility.studyVariation.toFixed(2)}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">{statistics.reproducibility.studyVar.toFixed(2)}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">{statistics.reproducibility.percentStudyVar.toFixed(2)}%</td>
                  {tolerance && (
                    <td className="border border-gray-300 px-3 py-2 text-center">{statistics.reproducibility.percentTolerance.toFixed(2)}%</td>
                  )}
                </tr>
                <tr>
                  <td className="border border-gray-300 px-3 py-2 pl-8">Operator</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">{statistics.operator.studyVariation.toFixed(2)}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">{statistics.operator.studyVar.toFixed(2)}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">{statistics.operator.percentStudyVar.toFixed(2)}%</td>
                  {tolerance && (
                    <td className="border border-gray-300 px-3 py-2 text-center">{statistics.operator.percentTolerance.toFixed(2)}%</td>
                  )}
                </tr>
                <tr>
                  <td className="border border-gray-300 px-3 py-2 pl-8">Part*Operator</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">{statistics.partOperator.studyVariation.toFixed(2)}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">{statistics.partOperator.studyVar.toFixed(2)}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">{statistics.partOperator.percentStudyVar.toFixed(2)}%</td>
                  {tolerance && (
                    <td className="border border-gray-300 px-3 py-2 text-center">{statistics.partOperator.percentTolerance.toFixed(2)}%</td>
                  )}
                </tr>
                <tr className="bg-green-50">
                  <td className="border border-gray-300 px-3 py-2 font-medium">Part to Part</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">{statistics.partToPart.studyVariation.toFixed(2)}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">{statistics.partToPart.studyVar.toFixed(2)}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">{statistics.partToPart.percentStudyVar.toFixed(2)}%</td>
                  {tolerance && (
                    <td className="border border-gray-300 px-3 py-2 text-center">{statistics.partToPart.percentTolerance.toFixed(2)}%</td>
                  )}
                </tr>
                <tr className="bg-gray-50 font-medium">
                  <td className="border border-gray-300 px-3 py-2">Total</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">{statistics.total.studyVariation.toFixed(2)}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">{statistics.total.studyVar.toFixed(2)}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">{statistics.total.percentStudyVar.toFixed(2)}%</td>
                  {tolerance && (
                    <td className="border border-gray-300 px-3 py-2 text-center">{statistics.total.percentTolerance.toFixed(2)}%</td>
                  )}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Overall Assessment */}
          <Alert className={`border-2 ${totalGageRRAssessment.color === 'bg-green-600' ? 'border-green-200 bg-green-50' : 
            totalGageRRAssessment.color === 'bg-yellow-500' ? 'border-yellow-200 bg-yellow-50' : 'border-red-200 bg-red-50'}`}>
            <Icon className={`h-5 w-5 ${totalGageRRAssessment.color === 'bg-green-600' ? 'text-green-600' : 
              totalGageRRAssessment.color === 'bg-yellow-500' ? 'text-yellow-600' : 'text-red-600'}`} />
            <AlertDescription className={`font-medium ${totalGageRRAssessment.color === 'bg-green-600' ? 'text-green-800' : 
              totalGageRRAssessment.color === 'bg-yellow-500' ? 'text-yellow-800' : 'text-red-800'}`}>
              <div className="flex items-center justify-between">
                <span>Measurement System is {totalGageRRAssessment.label.toLowerCase()} and {statistics.isValid ? 'valid' : 'invalid'}!</span>
                <Badge className={`${totalGageRRAssessment.color} text-white`}>
                  {totalGageRRAssessment.label}
                </Badge>
              </div>
            </AlertDescription>
          </Alert>

          {/* Interpretation Guidelines */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">ANOVA Gage R&R Guidelines:</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span><strong>Excellent (&lt;10%):</strong> Measurement system is excellent for this application</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span><strong>Acceptable (10-30%):</strong> May be acceptable depending on application, cost of improvement, etc.</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span><strong>Unacceptable (&gt;30%):</strong> Measurement system needs improvement</span>
              </div>
            </div>
          </div>

          {/* Appraiser Information */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Study Summary:</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Appraiser 1:</span> {appraiser1Name || "Not specified"}
              </div>
              <div>
                <span className="font-medium">Appraiser 2:</span> {appraiser2Name || "Not specified"}
              </div>
              
             {numberOfAppraisers > 2 && (
                <div>
                <span className="font-medium">Appraiser 3:</span> {appraiser3Name}
                </div>
              )}
              
            </div>
            <div className="mt-2 text-sm text-gray-600">
              <span className="font-medium">Analysis Method:</span> ANOVA with {sigmaMultiplier} sigma multiplier
              {tolerance && <span> • Tolerance: {tolerance}</span>} • Number of Repetitions: {repetitions}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}