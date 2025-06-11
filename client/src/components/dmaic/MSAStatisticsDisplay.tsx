/**
 * MSA Statistics Display Component
 * 
 * Displays comprehensive attribute agreement analysis statistics including
 * Cohen's Kappa, Fleiss' Kappa, percent agreement, and recommendations.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertTriangle, XCircle, BarChart3 } from "lucide-react";
import { 
  calculateMSAStatistics, 
  interpretKappa, 
  getAgreementColor,
  type AttributeAnalysisRow,
  type MSAStatistics 
} from "@/utils/msaStatistics";

interface MSAStatisticsDisplayProps {
  data: AttributeAnalysisRow[];
  appraiser1Name: string;
  appraiser2Name: string;
  appraiser3Name: string;
}

export default function MSAStatisticsDisplay({ 
  data, 
  appraiser1Name, 
  appraiser2Name, 
  appraiser3Name 
}: MSAStatisticsDisplayProps) {
  const statistics = calculateMSAStatistics(data);
  
  // Check if there's meaningful data for analysis
  const hasRealData = data.length > 0 && data.some(row => 
    row.app1_rep1 !== "" || row.app1_rep2 !== "" || 
    row.app2_rep1 !== "" || row.app2_rep2 !== "" ||
    row.app3_rep1 !== "" || row.app3_rep2 !== ""
  );

  // Check if appraiser 3 has any data
  const hasApp3Data = data.some(row => 
    row.app3_rep1 !== "" || row.app3_rep2 !== "" || row.app3_rep3 !== ""
  );

  if (data.length === 0 || !hasRealData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            MSA Attribute Agreement Statistics
            <Badge variant="outline" className="ml-auto bg-green-50 text-green-700 border-green-200">
              Real Data Analysis
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {data.length === 0 
                ? "No data available for Attribute Agreement statistical analysis. Please enter measurement data first."
                : "Please enter actual OK/KO values in the agreement analysis table above to calculate meaningful statistics. Empty cells are not included in calculations."
              }
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (percentage: number, threshold: number = 80) => {
    if (percentage >= 90) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (percentage >= threshold) return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
  const formatKappa = (value: number | undefined) => 
    value !== undefined && value !== null ? value.toFixed(3) : "N/A";

  return (
    <div className="space-y-6">
      {/* Overall Agreement Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Overall Agreement Analysis Summary
            <Badge variant="outline" className="ml-auto bg-green-50 text-green-700 border-green-200">
              {data.some(row => row.reference !== "") ? (
                <div>
                Precision & Accuracy Analysis
                </div>
              ) : (
                <div>
                Precision Analysis
                </div>
              )}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Check if there are reference values to show the full content */}
          {data.some(row => row.reference !== "") ? (
            <>
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Overall Concordant Agreement vs Standard</span>
                    {getStatusIcon(statistics.overallAgreement.percentAgreementVsStandard)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={statistics.overallAgreement.percentAgreementVsStandard} 
                      className="flex-1"
                    />
                    <span className={`text-sm font-medium ${getAgreementColor(statistics.overallAgreement.percentAgreementVsStandard)}`}>
                      {formatPercentage(statistics.overallAgreement.percentAgreementVsStandard)}
                    </span>
                  </div>
                  {/*
                  {statistics.overallAgreement.fleissKappaVsStandard && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs text-gray-500">Fleiss' Kappa:</span>
                      <Badge variant="outline" className="text-xs">
                        {formatKappa(statistics.overallAgreement.fleissKappaVsStandard)}
                      </Badge>
                      <span className="text-xs text-gray-600">
                        {interpretKappa(statistics.overallAgreement.fleissKappaVsStandard)}
                      </span>
                    </div>
                  )}
                    */}
                </div>
              </div>
              
              <Alert className={
                statistics.summary.acceptableAgreement === "excellent" ? "border-green-200 bg-green-50" :
                statistics.summary.acceptableAgreement === "acceptable but needs improvement" ? "border-yellow-200 bg-yellow-50" :
                "border-red-200 bg-red-50"
              }>
                {statistics.summary.acceptableAgreement === "excellent" ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : statistics.summary.acceptableAgreement === "acceptable but needs improvement" ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription>
                  <strong>
                    {statistics.summary.acceptableAgreement === "excellent" ? "Excellent" :
                     statistics.summary.acceptableAgreement === "acceptable but needs improvement" ? "Acceptable but Needs Improvement" :
                     "Unacceptable"} 
                    {" "}Measurement System
                  </strong>
                  {statistics.summary.recommendations.map((rec, idx) => (
                    <div key={idx} className="mt-1">• {rec}</div>
                  ))}
                </AlertDescription>
              </Alert>
            </>
          ) : (
            /* Show only title when no reference values */
            <div className="text-sm text-gray-500">
              No standard reference values available for agreement analysis.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Appraiser vs Standard */}
      {data.some(row => row.reference !== "") && (
        <Card>
          <CardHeader>
            <CardTitle>Appraiser vs Standard Agreement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`grid grid-cols-1 ${hasApp3Data ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'} gap-2`}>
              {[
                { name: `${appraiser1Name} vs standard`, agreement: statistics.appraiserVsStandard.app1Agreement, kappa: statistics.appraiserVsStandard.app1Kappa },
                { name: `${appraiser2Name} vs standard`, agreement: statistics.appraiserVsStandard.app2Agreement, kappa: statistics.appraiserVsStandard.app2Kappa },
                ...(hasApp3Data ? [{ name: `${appraiser3Name} vs  standard`, agreement: statistics.appraiserVsStandard.app3Agreement, kappa: statistics.appraiserVsStandard.app3Kappa }] : []),
                { name: "All appraisers vs standard", agreement: statistics.appraiserVsStandard.allAppraisersVsStandard, kappa: statistics.overallAgreement.fleissKappaVsStandard, isOverall: true }
              ].map((appraiser, idx) => (
                <div key={idx} className={`space-y-3 p-4 border rounded-lg ${appraiser.isOverall ? 'bg-green-50 border-green-200' : ''}`}>
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${appraiser.isOverall ? 'text-green-800' : ''}`}>{appraiser.name}</span>
                    {getStatusIcon(appraiser.agreement)}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Progress value={appraiser.agreement} className="flex-1" />
                      <span className={`text-sm font-medium ${getAgreementColor(appraiser.agreement)}`}>
                        {formatPercentage(appraiser.agreement)}
                      </span>
                    </div>
                    {/*
                    {appraiser.kappa !== undefined && appraiser.kappa !== null && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          κ = {formatKappa(appraiser.kappa)}
                        </Badge>
                        <span className="text-xs text-gray-600">
                          {interpretKappa(appraiser.kappa)}
                        </span>
                      </div>
                    )}
                    */}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disagreement Analysis */}
      {data.some(row => row.reference !== "") && (
        <Card>
          <CardHeader>
            <CardTitle>Disagreement vs Standard Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3 p-4 border rounded-lg bg-red-50 border-red-200">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-red-800">Standard "OK" Appraised "KO"</span>
                  <span className="text-sm text-red-600 font-medium">
                    {formatPercentage(statistics.disagreementAnalysis.standardOkAppraisedKo)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={statistics.disagreementAnalysis.standardOkAppraisedKo} 
                    className="flex-1"
                  />
                </div>
                <div className="text-xs text-red-700">
                  Proportion where standard says "OK" but appraisers say "KO"
                </div>
              </div>
              
              <div className="space-y-3 p-4 border rounded-lg bg-orange-50 border-orange-200">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-orange-800">Standard "KO" Appraised "OK"</span>
                  <span className="text-sm text-orange-600 font-medium">
                    {formatPercentage(statistics.disagreementAnalysis.standardKoAppraisedOk)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={statistics.disagreementAnalysis.standardKoAppraisedOk} 
                    className="flex-1"
                  />
                </div>
                <div className="text-xs text-orange-700">
                  Proportion where standard says "KO" but appraisers say "OK"
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Within-Appraiser Repeatability */}
      <Card>
        <CardHeader>
          <CardTitle>Within-Appraiser Repeatability</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`grid grid-cols-1 ${hasApp3Data ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
            {[
              { name: appraiser1Name, repeatability: statistics.withinAppraiser.app1Repeatability },
              { name: appraiser2Name, repeatability: statistics.withinAppraiser.app2Repeatability },
              ...(hasApp3Data ? [{ name: appraiser3Name, repeatability: statistics.withinAppraiser.app3Repeatability }] : [])
            ].map((appraiser, idx) => (
              <div key={idx} className="space-y-3 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{appraiser.name}</span>
                  {getStatusIcon(appraiser.repeatability)}
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={appraiser.repeatability} className="flex-1" />
                  <span className={`text-sm font-medium ${getAgreementColor(appraiser.repeatability)}`}>
                    {formatPercentage(appraiser.repeatability)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Between-Appraiser Agreement */}
      <Card>
        <CardHeader>
          <CardTitle>Between-Appraiser Agreement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`grid grid-cols-1 ${hasApp3Data ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-1'} gap-4`}>
            {[
              { pair: `${appraiser1Name} vs ${appraiser2Name}`, agreement: statistics.betweenAppraiser.app1VsApp2 },
              ...(hasApp3Data ? [
                { pair: `${appraiser1Name} vs ${appraiser3Name}`, agreement: statistics.betweenAppraiser.app1VsApp3 },
                { pair: `${appraiser2Name} vs ${appraiser3Name}`, agreement: statistics.betweenAppraiser.app2VsApp3 },
                { pair: "Between all Appraisers", agreement: statistics.betweenAppraiser.betweenAllAppraisers || 0, isOverall: true }
              ] : [])
            ].map((comparison, idx) => (
              <div key={idx} className={`space-y-3 p-4 border rounded-lg ${comparison.isOverall ? 'bg-blue-50 border-blue-200' : ''}`}>
                <div className="flex items-center justify-between">
                  <span className={`font-medium text-sm ${comparison.isOverall ? 'text-blue-800' : ''}`}>
                    {comparison.pair}
                  </span>
                  {getStatusIcon(comparison.agreement)}
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={comparison.agreement} className="flex-1" />
                  <span className={`text-sm font-medium ${getAgreementColor(comparison.agreement)}`}>
                    {formatPercentage(comparison.agreement)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Statistical Interpretation Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Interpretation Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Agreement Thresholds</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>90%-95%: Excellent agreement</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  <span>80%-90%: Acceptable agreement but needs improvement</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span>&lt;80%: Unacceptable agreement</span>
                </div>
              </div>
            </div>
            {/*}
            <div>
              <h4 className="font-medium mb-3">Kappa Interpretation</h4>
              <div className="space-y-1 text-sm">
                <div>0.81-1.00: Almost perfect</div>
                <div>0.61-0.80: Substantial</div>
                <div>0.41-0.60: Moderate</div>
                <div>0.21-0.40: Fair</div>
                <div>0.00-0.20: Slight</div>
                <div>&lt;0.00: Poor</div>
              </div>
            </div>
            */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}