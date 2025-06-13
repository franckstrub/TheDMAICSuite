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
            Overall Agreement Analysis
            <Badge variant="outline" className="ml-auto bg-green-50 text-green-700 border-green-200">
             No data for Precision & Accuracy Analysis
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
  const minExcellentAgreement = 90; // 90% threshold for excellent agreement
  const minAcceptableAgreement = 80; // 80% threshold for acceptable agreement but needs improvement
  const maxExcellentDisAgreement = 5; // 5% threshold for low disagreement
  const maxAcceptableDisAgreement = 10; // 10% threshold for moderate disagreement but needs improvement

  const getStatusIcon = (percentage: number, threshold: number = minAcceptableAgreement) => {
    if (percentage >= minExcellentAgreement) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (percentage >= threshold) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
  const formatKappa = (value: number | undefined) => 
    value !== undefined && value !== null ? value.toFixed(3) : "N/A";

  function getAgreementColor(percentage: number): string {
  if (percentage >= minExcellentAgreement) return "text-green-600";
  if (percentage >= minAcceptableAgreement) return "text-yellow-500";
  return "text-red-600";
  };

  const getDisStatusIcon = (percentage: number, threshold: number = maxAcceptableDisAgreement) => {
    if (percentage <= maxExcellentDisAgreement) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (percentage <= threshold) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  function getDisAgreementColor(percentage: number): string {

  if (percentage <= maxExcellentDisAgreement) return "text-green-600";
  if (percentage <= maxAcceptableDisAgreement) return "text-yellow-500";
  return "text-red-600";
  };

  function getDisTitle(percentage: number): string {
    if (percentage <= maxExcellentDisAgreement) return "Low disagreement";
    if (percentage <= maxAcceptableDisAgreement) return "Moderate disagreement but needs improvement";
    return "Unacceptable disagreement";
  }
  function getTitle(percentage: number): string {
    if (percentage >= minExcellentAgreement) return "Excellent agreement";
    if (percentage >= minAcceptableAgreement) return "Acceptable agreement but needs improvement";
    return "Unacceptable agreement";
  }

  return (
    <div className="space-y-6">
      {/* Overall Agreement Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Overall Agreement Analysis
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
        </Card>
      {/* Overall Concordant Agreement Analysis vs standard */}
      {/* Check if there are reference values to show the full content */}
       {data.some(row => row.reference !== "") && (
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Overall Concordant Agreement vs Standard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
                    <span className={`text-sm font-medium hover:bg-gray-200 ${getAgreementColor(statistics.overallAgreement.percentAgreementVsStandard)}`}
                    title={`${getTitle(statistics.overallAgreement.percentAgreementVsStandard)}: ${statistics.overallAgreement.NbTotalUserAgrees} / ${statistics.overallAgreement.NbAgreeVsStd}`}>
                      {formatPercentage(statistics.overallAgreement.percentAgreementVsStandard)}
                    </span>
                  </div>
                  {/* Fleiss Kappa
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
        </CardContent>
      </Card>
       )}

      {/* Appraiser Agreement Analysis */}

      {/* Appraiser vs Standard */}
      {data.some(row => row.reference !== "") && (
        <Card>
          <CardHeader>
            <CardTitle>Appraiser vs Standard Agreement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`grid grid-cols-1 ${hasApp3Data ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'} gap-2`}>
              {[
                { name: `${appraiser1Name} vs standard`, agreement: statistics.appraiserVsStandard.app1VsStd.Percent, NbUserAgreesVsStd: statistics.appraiserVsStandard.app1VsStd.NbAgrees, NbStd: statistics.appraiserVsStandard.app1VsStd.NbStd, kappa: statistics.appraiserVsStandard.app1Kappa },
                { name: `${appraiser2Name} vs standard`, agreement: statistics.appraiserVsStandard.app2VsStd.Percent, NbUserAgreesVsStd: statistics.appraiserVsStandard.app2VsStd.NbAgrees, NbStd: statistics.appraiserVsStandard.app2VsStd.NbStd, kappa: statistics.appraiserVsStandard.app2Kappa },
                ...(hasApp3Data ? [{ name: `${appraiser3Name} vs  standard`, agreement: statistics.appraiserVsStandard.app3VsStd.Percent, NbUserAgreesVsStd: statistics.appraiserVsStandard.app3VsStd.NbAgrees, NbStd: statistics.appraiserVsStandard.app3VsStd.NbStd,kappa: statistics.appraiserVsStandard.app3Kappa }] : []),
                { name: "All appraisers vs standard", agreement: statistics.appraiserVsStandard.allAppraisersVsStandard.allAppraisersVsStandardPercent, NbUserAgreesVsStd: statistics.appraiserVsStandard.allAppraisersVsStandard.allAppraisersAgreesVsStd, NbStd: statistics.appraiserVsStandard.allAppraisersVsStandard.allAppraisersNbStd, kappa: statistics.overallAgreement.fleissKappaVsStandard, isOverall: true }
              ].map((appraiser, idx) => (
                <div key={idx} className={`space-y-3 p-4 border rounded-lg ${appraiser.isOverall ? 'bg-green-50 border-green-200' : ''}`}>
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${appraiser.isOverall ? 'text-green-800' : ''}`}>{appraiser.name}</span>
                    {getStatusIcon(appraiser.agreement)}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Progress value={appraiser.agreement} className="flex-1" />
                      <span className={`text-sm font-medium hover:bg-gray-200 ${getAgreementColor(appraiser.agreement)}`}
                      title={`${getTitle(appraiser.agreement)}: ${appraiser.NbUserAgreesVsStd} / ${appraiser.NbStd}`}>
                        {formatPercentage(appraiser.agreement)}
                      </span>
                    </div>
                    {/* Fliess' Kappa
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
            <CardTitle>Overall Disagreement vs Standard Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3 p-4 border rounded-lg bg-red-50 border-red-200">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-red-800">Standard "OK" Appraised "KO"</span>
                  {getDisStatusIcon(statistics.disagreementAnalysis.standardOkAppraisedKo)}
                  <span className="text-sm text-red-600 font-medium hover:bg-gray-200 ${getDisAgreementColor(statistics.disagreementAnalysis.standardOkAppraisedKo)}"
                  title={`${getDisTitle(statistics.disagreementAnalysis.standardOkAppraisedKo)}: ${statistics.disagreementAnalysis.standardOkAppraisedKoCount} / ${statistics.disagreementAnalysis.totalValues} `}>
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
                  {getDisStatusIcon(statistics.disagreementAnalysis.standardKoAppraisedOk)}
                  <span className="text-sm text-orange-600 font-medium hover:bg-gray-200 ${getDisAgreementColor(statistics.disagreementAnalysis.standardKoAppraisedOk)}"
                  title={`${getDisTitle(statistics.disagreementAnalysis.standardKoAppraisedOk)}: ${statistics.disagreementAnalysis.standardKoAppraisedOkCount} / ${statistics.disagreementAnalysis.totalValues} `}>
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
          <CardTitle>Within-Appraiser Repeatability Agreement</CardTitle>
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
                  {getStatusIcon(appraiser.repeatability.Percent)}
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={appraiser.repeatability} className="flex-1" />
                  <span className={`text-sm font-medium hover:bg-gray-200 ${getAgreementColor(appraiser.repeatability.Percent)}`}
                  title={`${getTitle(appraiser.repeatability.Percent)}: ${appraiser.repeatability.NbFullRowAgrees} / ${appraiser.repeatability.NbRows}`}>
                    {formatPercentage(appraiser.repeatability.Percent)}
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
          <CardTitle>Between-Appraiser Reproducibility Agreement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`grid grid-cols-1 ${hasApp3Data ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-1'} gap-4`}>
            {[
              { pair: `${appraiser1Name} vs ${appraiser2Name}`, agreement: statistics.betweenAppraiser.app1VsApp2.Percent, NbFullRowAgrees: statistics.betweenAppraiser.app1VsApp2.NbFullRowAgrees, NbRows: statistics.betweenAppraiser.app1VsApp2.NbRows },
              ...(hasApp3Data ? [
                { pair: `${appraiser1Name} vs ${appraiser3Name}`, agreement: statistics.betweenAppraiser.app1VsApp3.Percent, NbFullRowAgrees: statistics.betweenAppraiser.app1VsApp3.NbFullRowAgrees, NbRows: statistics.betweenAppraiser.app1VsApp3.NbRows },
                { pair: `${appraiser2Name} vs ${appraiser3Name}`, agreement: statistics.betweenAppraiser.app2VsApp3.Percent, NbFullRowAgrees: statistics.betweenAppraiser.app2VsApp3.NbFullRowAgrees, NbRows: statistics.betweenAppraiser.app2VsApp3.NbRows },
                { pair: "Between all Appraisers", agreement: statistics.betweenAppraiser.betweenAllAppraisers.Percent || 0, NbFullRowAgrees: statistics.betweenAppraiser.betweenAllAppraisers.NbFullRowAgrees, NbRows: statistics.betweenAppraiser.betweenAllAppraisers.NbRows, isOverall: true },
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
                  <span className={`text-sm font-medium hover:bg-gray-200 ${getAgreementColor(comparison.agreement)}`}
                    title={`${getTitle(comparison.agreement)}: ${comparison.NbFullRowAgrees} / ${comparison.NbRows}`}>
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
                  <span>90%-100%: Excellent agreement</span>
                  {getStatusIcon(minExcellentAgreement)}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-400 rounded"></div>
                  <span>80%-90%: Acceptable agreement but needs improvement</span>
                  {getStatusIcon(minAcceptableAgreement)}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span>&lt;80%: Unacceptable agreement</span>
                  {getStatusIcon(minAcceptableAgreement-1)}
                </div>
              </div>
            </div>
            {/* Fleiss' Kappa interpretation guide
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
            {/* Disagreement percentages interpretation guide */}
            {data.some(row => row.reference !== "") && (
            <div>
              <h4 className="font-medium mb-3">Disagreement Thresholds</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>0%-5%: Low disgreement</span>
                  {getDisStatusIcon(maxExcellentDisAgreement)}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-400 rounded"></div>
                  <span>5%-10%: Moderate disagreement but needs improvement</span>
                  {getDisStatusIcon(maxAcceptableDisAgreement)}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span>&gt;10%: Unacceptable disagreement</span>
                  {getDisStatusIcon(maxAcceptableDisAgreement+1)}
                </div>
              </div>
            </div>
            )}
          </div>
        </CardContent>
      </Card>
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
              <Alert className={
                statistics.summary.allAgreements === "Excellent precise and accurate" || statistics.summary.allAgreements === "Excellent precise" ? "border-green-200 bg-green-50" :
                statistics.summary.allAgreements === "Acceptable and precise but needs improvement vs standard" || statistics.summary.allAgreements === "Acceptable but needs improvement" ? "border-yellow-200 bg-yellow-50" :
                "border-red-200 bg-red-50"
              }>
                {statistics.summary.allAgreements === "Excellent precise and accurate" || statistics.summary.allAgreements === "Excellent precise" ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : statistics.summary.allAgreements === "Acceptable and precise but needs improvement vs standard" || statistics.summary.allAgreements === "Acceptable but needs improvement" ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription>
                  <strong>
                    {/*}
                    {statistics.summary.allAgreements == "excellent" ? "Excellent" :
                     statistics.summary.allAgreements == "acceptable but needs improvement" ? "Acceptable but Needs Improvement" :
                     "Unacceptable"} 
                     */}
                    {statistics.summary.allAgreements}{" "}Measurement System
                  </strong>
                  {statistics.summary.recommendations.map((rec, idx) => (
                    <div key={idx} className="mt-1">• {rec}</div>
                  ))}
                </AlertDescription>
              </Alert>
        </CardContent>
      </Card>

    </div>
  );
}