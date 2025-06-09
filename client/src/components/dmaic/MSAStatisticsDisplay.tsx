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
  
  if (data.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            MSA Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No data available for statistical analysis. Please enter measurement data first.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (percentage: number, threshold: number = 90) => {
    if (percentage >= 95) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (percentage >= threshold) return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
  const formatKappa = (value: number | undefined) => value ? value.toFixed(3) : "N/A";

  return (
    <div className="space-y-6">
      {/* Overall Agreement Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Overall Agreement Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Agreement</span>
                {getStatusIcon(statistics.overallAgreement.percentAgreement)}
              </div>
              <div className="flex items-center gap-2">
                <Progress 
                  value={statistics.overallAgreement.percentAgreement} 
                  className="flex-1"
                />
                <span className={`text-sm font-medium ${getAgreementColor(statistics.overallAgreement.percentAgreement)}`}>
                  {formatPercentage(statistics.overallAgreement.percentAgreement)}
                </span>
              </div>
            </div>
            
            {statistics.overallAgreement.fleissKappa && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Fleiss' Kappa</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {formatKappa(statistics.overallAgreement.fleissKappa)}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {interpretKappa(statistics.overallAgreement.fleissKappa)}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <Alert className={statistics.summary.acceptableAgreement ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            {statistics.summary.acceptableAgreement ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription>
              <strong>
                {statistics.summary.acceptableAgreement ? "Acceptable" : "Unacceptable"} 
                Measurement System
              </strong>
              {statistics.summary.recommendations.map((rec, idx) => (
                <div key={idx} className="mt-1">• {rec}</div>
              ))}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Appraiser vs Standard */}
      {data.some(row => row.reference !== "") && (
        <Card>
          <CardHeader>
            <CardTitle>Appraiser vs Standard Agreement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { name: appraiser1Name, agreement: statistics.appraiserVsStandard.app1Agreement, kappa: statistics.appraiserVsStandard.app1Kappa },
                { name: appraiser2Name, agreement: statistics.appraiserVsStandard.app2Agreement, kappa: statistics.appraiserVsStandard.app2Kappa },
                { name: appraiser3Name, agreement: statistics.appraiserVsStandard.app3Agreement, kappa: statistics.appraiserVsStandard.app3Kappa }
              ].map((appraiser, idx) => (
                <div key={idx} className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{appraiser.name}</span>
                    {getStatusIcon(appraiser.agreement)}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Progress value={appraiser.agreement} className="flex-1" />
                      <span className={`text-sm font-medium ${getAgreementColor(appraiser.agreement)}`}>
                        {formatPercentage(appraiser.agreement)}
                      </span>
                    </div>
                    {appraiser.kappa && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          κ = {formatKappa(appraiser.kappa)}
                        </Badge>
                        <span className="text-xs text-gray-600">
                          {interpretKappa(appraiser.kappa)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: appraiser1Name, repeatability: statistics.withinAppraiser.app1Repeatability },
              { name: appraiser2Name, repeatability: statistics.withinAppraiser.app2Repeatability },
              { name: appraiser3Name, repeatability: statistics.withinAppraiser.app3Repeatability }
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { pair: `${appraiser1Name} vs ${appraiser2Name}`, agreement: statistics.betweenAppraiser.app1VsApp2 },
              { pair: `${appraiser1Name} vs ${appraiser3Name}`, agreement: statistics.betweenAppraiser.app1VsApp3 },
              { pair: `${appraiser2Name} vs ${appraiser3Name}`, agreement: statistics.betweenAppraiser.app2VsApp3 }
            ].map((comparison, idx) => (
              <div key={idx} className="space-y-3 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{comparison.pair}</span>
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
                  <span>≥95%: Excellent agreement</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  <span>90-94%: Acceptable agreement</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span>&lt;90%: Unacceptable agreement</span>
                </div>
              </div>
            </div>
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}