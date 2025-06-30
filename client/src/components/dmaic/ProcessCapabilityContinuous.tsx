// Helper function to format percentage values
export const formatPercentage = (value: number, dpmo: number) => {
  if (isNaN(value) || value === null || value === undefined) {
    return "N/A";
  }
  const decimalPlaces =
    dpmo <= 1
      ? 6
      : dpmo <= 10
        ? 5
        : dpmo <= 100
          ? 4
          : dpmo <= 1000
            ? 3
            : dpmo <= 10000
              ? 2
              : 2;

  return `${value.toFixed(decimalPlaces)}%`;
};

// components/AIAnalysisSection

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw } from "lucide-react";

interface Props {
  ctq: string;
  dataPoints: { [ctq: string]: { indexNumber: number; dataValue: number }[] };
  capabilityData: { [ctq: string]: any };
  showStatistics: { [ctq: string]: boolean };
  isGeneratingAssessment: { [ctq: string]: boolean };
  generateAIAssessment: (ctq: string) => void;
  updateCapabilityField: (ctq: string, field: string, value: any) => void;
}

// note: default allows you to use it in a component without {} !!!!. You are allowed only 1 default function
export default function AIAnalysisSection({
  ctq,
  dataPoints,
  capabilityData,
  showStatistics,
  isGeneratingAssessment,
  generateAIAssessment,
  updateCapabilityField,
}: Props) {
  if (!showStatistics[ctq]) return null;

  const isDisabled =
    isGeneratingAssessment[ctq] || (dataPoints[ctq]?.length || 0) < 25;

  // Calculate dynamic rows based on content length
  const calculateRows = (text: string): number => {
    if (!text || text.trim() === "") return 6; // Default minimum rows

    const lineBreaks = (text.match(/\n/g) || []).length;
    const textLength = text.length;

    // Estimate characters per line (approximately 80-100 characters per line in a textarea)
    const estimatedCharsPerLine = 85;
    const estimatedLines = Math.ceil(textLength / estimatedCharsPerLine);

    // Use the greater of line breaks + 1 or estimated lines, with min 6 and max 20
    const calculatedRows = Math.max(lineBreaks + 1, estimatedLines);
    return Math.min(Math.max(calculatedRows, 6), 20);
  };

  const assessmentText = capabilityData[ctq]?.capabilityAssessment || "";
  const dynamicRows = calculateRows(assessmentText);

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg shadow-sm">
      <div className="p-4 pb-3 border-b border-purple-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            AI Capability Analysis
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              generateAIAssessment(ctq);
            }}
            disabled={isDisabled}
            className="flex items-center gap-2"
          >
            {isGeneratingAssessment[ctq] ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 text-purple-600" />
            )}
            {isGeneratingAssessment[ctq]
              ? "Generating..."
              : "Generate Assessment"}
          </Button>
        </div>
      </div>

      <div className="p-4 pt-3">
        <Textarea
          value={assessmentText}
          onChange={(e) =>
            updateCapabilityField(ctq, "capabilityAssessment", e.target.value)
          }
          placeholder="AI-powered capability analysis will appear here..."
          rows={dynamicRows}
          className="bg-white/80 border-purple-200 resize-y min-h-[150px] w-full"
          style={{
            height: "auto",
            minHeight: "150px",
            maxHeight: "860px",
          }}
        />

        {assessmentText && (
          <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
            ✓ AI analysis loaded ({assessmentText.length} characters,
            auto-adjusted to {dynamicRows} rows)
          </div>
        )}

        {(dataPoints[ctq]?.length || 0) < 25 && (
          <div className="mt-2 text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded p-2">
            At least 25 data points required for AI analysis (Current:{" "}
            {dataPoints[ctq]?.length || 0})
          </div>
        )}
      </div>
    </div>
  );
}
// components/LogicCapabilityAssessment

interface Props {
  stats: any;
  dataSetTerm: "Long Term" | "Short Term";
  capabilityIndex: "Z" | "Cp/Cpk";
}

export function LogicCapabilityAssessment({
  stats,
  dataSetTerm,
  capabilityIndex,
}: Props) {
  return (
    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h4 className="font-medium text-yellow-800 mb-2">
        Capability Assessment
      </h4>
      <div className="text-sm text-yellow-700">
        {capabilityIndex === "Cp/Cpk" ? (
          <>
            {dataSetTerm === "Short Term" ? (
              <div>
                {stats.cpk >= 2 && (
                  <p className="text-green-700 font-medium">
                    ✓ Process is world-class (Cpk ≥ 2)
                  </p>
                )}
                {stats.cpk >= 1.67 && stats.cpk < 2 && (
                  <p className="text-green-700 font-medium">
                    ✓ Process is excellent (1.67 ≤ Cpk {"<"} 2)
                  </p>
                )}
                {stats.cpk >= 1.33 && stats.cpk < 1.67 && (
                  <p className="text-green-700 font-medium">
                    ✓ Process is capable (1.33 ≤ Cpk {"<"} 1.67)
                  </p>
                )}
                {stats.cpk >= 1.0 && stats.cpk < 1.33 && (
                  <p className="text-yellow-700 font-medium">
                    ⚠ Process is marginally capable (1.0 ≤ Cpk {"<"} 1.33)
                  </p>
                )}
                {stats.cpk < 1.0 && (
                  <p className="text-red-700 font-medium">
                    ✗ Process is not capable (Cpk {"<"} 1.0)
                  </p>
                )}
              </div>
            ) : (
              <div>
                {stats.ppk >= 1.67 && (
                  <p className="text-green-700 font-medium">
                    ✓ Process is world-class (Ppk ≥ 1.67)
                  </p>
                )}
                {stats.ppk >= 1.33 && stats.ppk < 1.67 && (
                  <p className="text-green-700 font-medium">
                    ✓ Process is capable (1.33 ≤ Ppk {"<"} 1.67)
                  </p>
                )}
                {stats.ppk >= 1.0 && stats.ppk < 1.33 && (
                  <p className="text-yellow-700 font-medium">
                    ⚠ Process is marginally capable (1.0 ≤ Ppk {"<"} 1.33)
                  </p>
                )}
                {stats.ppk < 1.0 && (
                  <p className="text-red-700 font-medium">
                    ✗ Process is not capable (Ppk {"<"} 1.0)
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {stats.isNormal ? (
              <div>
                {stats.zShortTerm >= 6 && (
                  <p className="text-green-700 font-medium">
                    ✓ World class performance (Zₛₜ ≥ 6σ)
                  </p>
                )}
                {stats.zShortTerm >= 5 && stats.zShortTerm < 6 && (
                  <p className="text-blue-700 font-medium">
                    ○ Excellent performance (Zₛₜ in [5–6σ] range)
                  </p>
                )}
                {stats.zShortTerm >= 4 && stats.zShortTerm < 5 && (
                  <p className="text-blue-700 font-medium">
                    ○ Good performance (Zₛₜ in [4–5σ] range)
                  </p>
                )}
                {stats.zShortTerm >= 3 && stats.zShortTerm < 4 && (
                  <p className="text-yellow-700 font-medium">
                    ⚠ Average performance (Zₛₜ in 3–4σ range)
                  </p>
                )}
                {stats.zShortTerm < 3 && (
                  <p className="text-red-700 font-medium">
                    ✗ Poor performance (Zₛₜ {"<"} 3σ)
                  </p>
                )}
              </div>
            ) : (
              <div>
                {stats.ZequivST >= 6 && (
                  <p className="text-green-700 font-medium">
                    ✓ World class performance (Zₛₜ ≥ 6σ)
                  </p>
                )}
                {stats.ZequivST >= 5 && stats.ZequivST < 6 && (
                  <p className="text-blue-700 font-medium">
                    ○ Excellent performance (Zₛₜ in [5–6σ] range)
                  </p>
                )}
                {stats.ZequivST >= 4 && stats.ZequivST < 5 && (
                  <p className="text-blue-700 font-medium">
                    ○ Good performance (Zₛₜ in [4–5σ] range)
                  </p>
                )}
                {stats.ZequivST >= 3 && stats.ZequivST < 4 && (
                  <p className="text-yellow-700 font-medium">
                    ⚠ Average performance (Zₛₜ in 3–4σ range)
                  </p>
                )}
                {stats.ZequivST < 3 && (
                  <p className="text-red-700 font-medium">
                    ✗ Poor performance (Zₛₜ {"<"} 3σ)
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
// Process Variation Analysis

import { Badge } from "@/components/ui/badge";
import { assessProcessVariation } from "@/lib/statisticsUtils"; // adjust the path if needed

interface Props {
  datapoints: { indexNumber: number; dataValue: number }[];
}

export function ProcessVariationPanel({ datapoints }: Props) {
  const numericValues = datapoints.map((point) => point.dataValue);

  if (numericValues.length < 3) return null;

  const variationAnalysis = assessProcessVariation(numericValues);

  return (
    <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
      <h4 className="font-medium text-purple-800 mb-3">
        Process Variation Analysis
      </h4>

      <table className="w-full border-collapse border border-purple-200">
        <tbody>
          <tr>
            <td className="py-2 pl-2 pr-4 text-sm font-medium text-purple-700 w-2/9">
              Process Control Status:
            </td>
            <td className="py-2 px-2 w-1/9">
              <Badge
                variant={
                  variationAnalysis.isInControl ? "default" : "destructive"
                }
                className={
                  variationAnalysis.isInControl
                    ? "bg-green-600 text-white"
                    : "bg-red-600 text-white"
                }
              >
                {variationAnalysis.isInControl
                  ? "IN CONTROL"
                  : "OUT OF CONTROL"}
              </Badge>
            </td>
            <td
              className="py-2 pl-4 text-sm text-purple-700 w-2/3 border border-purple-200 rounded-lg"
              rowSpan={2}
            >
              <div>
                <p className="font-medium mb-1">Assessment:</p>
                <p>{variationAnalysis.assessment}</p>
              </div>
            </td>
          </tr>
          <tr>
            <td className="py-2 pl-2 pr-4 text-sm font-medium text-purple-700 w-2/9">
              Process Stability Status:
            </td>
            <td className="py-2 px-6 w-1/9">
              <Badge
                variant={variationAnalysis.isStable ? "default" : "destructive"}
                className={
                  variationAnalysis.isStable
                    ? "bg-green-600 text-white"
                    : "bg-red-600 text-white"
                }
              >
                {variationAnalysis.isStable ? "STABLE" : "UNSTABLE"}
              </Badge>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// src/components/ProcessCapabilityContinuous.tsx (or wherever you prefer to put it)
import React from "react";
//import { Button } from '@/components/ui/button';
//import { Badge } from '@/components/ui/badge'; // Assuming you use this
import { Calculator } from "lucide-react"; // Assuming you use this icon

// Define the interfaces for props, to ensure type safety
// These interfaces should ideally be defined in a shared types file
// or inferred from your existing ProcessCapability.tsx's state and functions.

// Placeholder interfaces - adjust based on your actual types

interface ProcessCapabilityStats {
  sampleSize: number;
  mean: number;
  standardDeviation: number;
  variance: number;
  isNormal: boolean;
  pValue: number | null;
  adStatistic: number;
  quartiles: {
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
  } | null;
  Mode: number | null;
  lsl: number | null;
  usl: number | null;
  pp: number | null;
  ppk: number | null;
  cp: number | null;
  cpk: number | null;
  zShift: number;
  zLongTerm: number | null;
  zLSL_LT: number;
  zUSL_LT: number;
  zShortTerm: number | null;
  zLSL_ST: number;
  zUSL_ST: number;
  ZequivLT: number | null;
  ZequivLSL_LT: number | null;
  ZequivUSL_LT: number | null;
  ZequivST: number | null;
  ZequivLSL_ST: number | null;
  ZequivUSL_ST: number | null;
  performanceMetrics: {
    longTerm: {
      yield: number;
      percentDefects: number;
      pdLSL_LT: number;
      pdUSL_LT: number;
      dpmo: number;
    };
    shortTerm: {
      yield: number;
      percentDefects: number;
      pdLSL_ST: number;
      pdUSL_ST: number;
      dpmo: number;
    };
  };
  obsYieldLT?: number;
  obsDPMOLT?: number;
  obspercentDefectsLT?: number;
  obspdLSL_LT?: number;
  obspdUSL_LT?: number;
  obsYieldST?: number;
  obsDPMOST?: number;
  obspercentDefectsST?: number;
  obspdLSL_ST?: number;
  obspdUSL_ST?: number;
}

interface CapabilityData {
  showPercentage: boolean;
  capabilityIndex: "Z" | "Cp/Cpk";
  dataSetTerm: "Long Term" | "Short Term";
}

interface DataPoint {
  id?: number;
  indexNumber: number;
  dataValue: number;
}
interface CtqWithType {
  ctq: string;
  ctqType: "Attribute" | "Continuous";
}

interface ProcessCapabilityContinuousCardsProps {
  ctq: string; // The ID or key for the current CTQ (usually ctq.id from the parent)
  ctqWithType: CtqWithType; // This should match the object structure from the parent
  // Adjusted dataPoints type to match the error message
  dataPoints: { [ctq: string]: DataPoint[] };
  showStatistics: { [ctq: string]: boolean };
  // Adjusted capabilityData type to match the error message
  capabilityData: { [ctq: string]: CapabilityData };
  // Adjusted toggleStatistics to expect a Promise<void> if that's what the parent returns
  toggleStatistics: (ctqId: string) => Promise<void>;
  calculateProcessCapabilityStats: (
    ctqId: string,
  ) => ProcessCapabilityStats | null;
  // Make sure formatPercentage is accepted as a prop if passed
  formatPercentage: (
    value: number | undefined,
    dpmoValue: number | undefined,
  ) => string;
}

export function ProcessCapabilityContinuousCards({
  ctq,
  ctqWithType,
  dataPoints,
  showStatistics,
  capabilityData,
  toggleStatistics,
  calculateProcessCapabilityStats,
  // formatPercentage, // Removed from props as it's now defined within the component
}: ProcessCapabilityContinuousCardsProps) {
  // Ensure the ctqType check is still relevant if this component is only for "Continuous"
  if (ctqWithType.ctqType !== "Continuous") {
    return null; // Or throw an error, or render nothing
  }

  const stats = calculateProcessCapabilityStats(ctq);
  const data = capabilityData[ctq];
  const showPercentage = data?.showPercentage || false;
  const capabilityIndex = data?.capabilityIndex || "Z";

  // Helper function to render capability details based on index and normality
  const renderCapabilityDetails = () => {
    if (!stats) return null; // No stats to display

    if (capabilityIndex === "Cp/Cpk") {
      return (
        <>
          <div
            className="flex justify-between"
            title="Pp: = (USL − LSL) / 6σLT"
          >
            <span>Pp:</span>
            <span className="font-medium">
              {stats.pp !== null ? stats.pp.toFixed(3) : "N/A"}
            </span>
          </div>
          <div
            className="flex justify-between"
            title="Ppk = min[(USL - μ) / 3σLT, (μ - LSL) / 3σLT]"
          >
            <span>Ppk:</span>
            <span className="font-medium">
              {stats.ppk !== null ? stats.ppk.toFixed(3) : "N/A"}
            </span>
          </div>
          <div
            className="flex justify-between"
            title="Cp: = (USL − LSL) / 6σST"
          >
            <span>Cp:</span>
            <span className="font-medium">
              {stats.cp !== null ? stats.cp.toFixed(3) : "N/A"}
            </span>
          </div>
          <div
            className="flex justify-between"
            title="Cpk = min[(USL - μ) / 3σST, (μ - LSL) / 3σST]"
          >
            <span>Cpk:</span>
            <span className="font-medium">
              {stats.cpk !== null ? stats.cpk.toFixed(3) : "N/A"}
            </span>
          </div>
        </>
      );
    } else {
      // Z or Z-Equivalent
      return (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Z-shift:</span>
            <span className="font-medium text-sm">
              {stats.zShift.toFixed(2)}σ
            </span>
          </div>

          {stats.isNormal ? ( // Normal Data (Z values)
            <>
              <h5 className="font-medium text-green-700 mb-2 text-sm">
                Long Term
              </h5>
              <div className="space-y-2 text-sm pl-2 border-l-2 border-green-200">
                <div
                  className="flex justify-between"
                  title={
                    capabilityData[ctq]?.dataSetTerm === "Long Term"
                      ? "ZLT with Z_USL LT = (USL − μ) / σLT & Z_LSL LT = (μ - LSL) / σLT"
                      : "ZLT = ZST - Zshift"
                  }
                >
                  <span>Z Long Term:</span>
                  <span className="font-medium text-sm">
                    {stats.zLongTerm ? stats.zLongTerm.toFixed(2) : "0.00"}σ
                  </span>
                </div>
                {capabilityData[ctq]?.dataSetTerm === "Long Term" && (
                  <>
                    <div
                      className="flex justify-between text-xs ml-2"
                      title="Z_LSL LT = (μ - LSL) / σLT"
                    >
                      <span>• Z_LSL LT:</span>
                      <span className="font-medium text-xs">
                        {!isNaN(stats.zLSL_LT)
                          ? stats.zLSL_LT.toFixed(2) + "σ"
                          : "N/A"}
                      </span>
                    </div>
                    <div
                      className="flex justify-between text-xs ml-2"
                      title="Z_USL LT = (USL - μ) / σLT"
                    >
                      <span>• Z_USL LT:</span>
                      <span className="font-medium text-xs">
                        {!isNaN(stats.zUSL_LT)
                          ? stats.zUSL_LT.toFixed(2) + "σ"
                          : "N/A"}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <h5 className="font-medium text-blue-700 mb-2 text-sm">
                Short Term
              </h5>
              <div className="space-y-2 text-sm pl-2 border-l-2 border-blue-200">
                <div
                  className="flex justify-between"
                  title={
                    capabilityData[ctq]?.dataSetTerm === "Short Term"
                      ? "ZST with ZUSL_ST = (USL − μ) / σST & ZLSL_ST = (μ - LSL) / σST"
                      : "ZST = ZLT + Zshift"
                  }
                >
                  <span>Z Short Term (Z-Benchmark):</span>
                  <span className="font-medium text-sm">
                    {stats.zShortTerm ? stats.zShortTerm.toFixed(2) : "0.00"}σ
                  </span>
                </div>
                {capabilityData[ctq]?.dataSetTerm === "Short Term" && (
                  <>
                    <div
                      className="flex justify-between text-xs ml-2"
                      title="Z_LSL ST = (μ - LSL) / σST"
                    >
                      <span>• Z_LSL ST:</span>
                      <span className="font-medium text-xs">
                        {!isNaN(stats.zLSL_ST)
                          ? stats.zLSL_ST.toFixed(2) + "σ"
                          : "N/A"}
                      </span>
                    </div>
                    <div
                      className="flex justify-between text-xs ml-2"
                      title="Z_USL ST = (USL - μ) / σST"
                    >
                      <span>• Z_USL ST:</span>
                      <span className="font-medium text-xs">
                        {!isNaN(stats.zUSL_ST)
                          ? stats.zUSL_ST.toFixed(2) + "σ"
                          : "N/A"}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            // Non-Normal Data (Z-Equivalent values)
            <>
              <h5 className="font-medium text-green-700 mb-2 text-sm">
                Long Term
              </h5>
              <div className="space-y-2 text-sm pl-2 border-l-2 border-green-200">
                <div
                  className="flex justify-between"
                  title={
                    capabilityData[ctq]?.dataSetTerm === "Long Term"
                      ? "ZequivLT with p(d)total_LT = p(d)LSL_LT + p(d)USL_LT"
                      : "ZLT = ZST - Zshift"
                  }
                >
                  <span>Z-Equivalent Long Term:</span>
                  <span className="font-medium text-sm">
                    {stats.ZequivLT ? stats.ZequivLT.toFixed(2) : "0.00"}σ
                  </span>
                </div>
                {capabilityData[ctq]?.dataSetTerm === "Long Term" && (
                  <>
                    <div
                      className="flex justify-between text-xs ml-2"
                      title="Z-Equivalent_LSL LT = (μ - LSL) / σLT"
                    >
                      <span>• Z-Equivalent_LSL LT:</span>
                      <span className="font-medium text-xs">
                        {stats.ZequivLSL_LT
                          ? stats.ZequivLSL_LT.toFixed(2) + "σ"
                          : "N/A"}
                      </span>
                    </div>
                    <div
                      className="flex justify-between text-xs ml-2"
                      title="Z-Equivalent_USL LT = (USL - μ) / σLT"
                    >
                      <span>• Z_Equivalent_USL LT:</span>
                      <span className="font-medium text-xs">
                        {stats.ZequivUSL_LT
                          ? stats.ZequivUSL_LT.toFixed(2) + "σ"
                          : "N/A"}
                      </span>
                    </div>
                  </>
                )}
              </div>
              <h5 className="font-medium text-blue-700 mb-2 text-sm">
                Short Term
              </h5>
              <div className="space-y-2 text-sm pl-2 border-l-2 border-blue-200">
                <div
                  className="flex justify-between"
                  title={
                    capabilityData[ctq]?.dataSetTerm === "Short Term"
                      ? "ZequivST with p(d)total_ST = p(d)LSL_ST + p(d)USL_ST"
                      : "ZST = ZLT + Zshift"
                  }
                >
                  <span>Z-Equivalent Short Term (Z-Benchmark):</span>
                  <span className="font-medium text-sm">
                    {stats.ZequivST ? stats.ZequivST.toFixed(2) : "0.00"}σ
                  </span>
                </div>
                {capabilityData[ctq]?.dataSetTerm === "Short Term" && (
                  <>
                    <div
                      className="flex justify-between text-xs ml-2"
                      title="Z-Equivalent_LSL ST = (μ - LSL) / σST"
                    >
                      <span>• Z-Equivalent_LSL ST:</span>
                      <span className="font-medium text-xs">
                        {stats.ZequivLSL_ST
                          ? stats.ZequivLSL_ST.toFixed(2) + "σ"
                          : "N/A"}
                      </span>
                    </div>
                    <div
                      className="flex justify-between text-xs ml-2"
                      title="Z-Equivalent_USL ST = (USL - μ) / σST"
                    >
                      <span>• Z_Equivalent_USL ST:</span>
                      <span className="font-medium text-xs">
                        {stats.ZequivUSL_ST
                          ? stats.ZequivUSL_ST.toFixed(2) + "σ"
                          : "N/A"}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      );
    }
  };

  return (
    <>
      {/* Statistics Control Buttons for Continuous CTQs */}
      <div className="mt-6 flex justify-left">
        <Button
          onClick={() => toggleStatistics(ctq)}
          variant={showStatistics[ctq] ? "outline" : "default"}
          className="flex items-center gap-2"
          disabled={!dataPoints[ctq] || dataPoints[ctq].length < 3}
        >
          <Calculator className="h-4 w-4" />
          {showStatistics[ctq]
            ? "Hide Statistics"
            : "Calculate Process Capability Statistics"}
        </Button>
        {(!dataPoints[ctq] || dataPoints[ctq].length < 3) && (
          <div className="ml-3 text-sm text-gray-500 flex items-center">
            <span className="mr-1">ℹ</span>
            Need at least 3 data points to calculate statistics
          </div>
        )}
        {dataPoints[ctq] &&
          dataPoints[ctq].length >= 3 &&
          dataPoints[ctq].length < 25 && (
            <div className="ml-3 text-sm text-amber-600 flex items-center">
              <span className="mr-1">⚠</span>
              Need {25 - dataPoints[ctq].length} more data points for full
              capability analysis
            </div>
          )}
      </div>

      {/* Process Capability Calculations Display */}
      {showStatistics[ctq] &&
        stats &&
        dataPoints[ctq] &&
        dataPoints[ctq].length >= 25 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold">
                Process Capability Analysis Results
              </h3>
            </div>
            <div
              className={`grid grid-cols-1 gap-6 ${showPercentage ? "md:grid-cols-4" : "md:grid-cols-3"}`}
            >
              {/* Basic Statistics */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-3">
                  Basic Statistics
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Sample Size:</span>
                    <span className="font-medium">{stats.sampleSize}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mean (μ):</span>
                    <span className="font-medium">{stats.mean.toFixed(4)}</span>
                  </div>
                  <div
                    className="flex justify-between"
                    title="SQRT( Σ(Xi-μ) / (n-1) )"
                  >
                    <span>Std Dev (σ):</span>
                    <span className="font-medium">
                      {stats.standardDeviation.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between" title="σ²=σ*σ">
                    <span>Variance (σ²):</span>
                    <span className="font-medium">
                      {stats.variance.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span title="Tests whether data follows normal distribution">
                      Normality Test (Anderson Darling):
                    </span>
                    <span
                      className={`font-medium text-sm ${stats.isNormal ? "text-green-600" : "text-red-600"}`}
                      title={
                        stats.isNormal
                          ? "Data follows normal distribution (P-Value ≥ 0.05)"
                          : "Data does not follow normal distribution (P-Value < 0.05)"
                      }
                    >
                      {stats.isNormal ? "Pass" : "Fail"}
                    </span>
                  </div>

                  {stats.pValue && (
                    <div className="space-y-2 text-sm">
                      <div
                        className="flex justify-between text-xs"
                        title={"Anderson-Darling test value"}
                      >
                        <span> &nbsp;• AD-Value:</span>
                        <span className="font-medium text-xs">
                          {stats.adStatistic.toFixed(5)}
                        </span>
                      </div>
                      <div
                        className="flex justify-between text-xs"
                        title={"Anderson-Darling test p-value"}
                      >
                        <span> &nbsp;• P-Value:</span>
                        <span className="font-medium text-xs">
                          {stats.pValue.toFixed(5)}
                        </span>
                      </div>
                    </div>
                  )}
                  <div>
                    <Badge
                      variant="default"
                      className={`font-medium text-xs text-center justify-center ${stats.isNormal ? "text-white bg-green-600 " : "text-white bg-red-600"}`}
                      title={
                        stats.isNormal
                          ? "Data follows normal distribution (P-Value ≥ 0.05)"
                          : "Data does not follow normal distribution (P-Value < 0.05)"
                      }
                    >
                      {stats.isNormal
                        ? "Data follows normal distribution"
                        : "Data does not follow normal distribution"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Percentiles */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-3">Percentiles</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Min:</span>
                    <span className="font-medium">
                      {stats.quartiles?.min?.toFixed(4) || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span title="Q1 = 1st quartile value = percentile(25%)">
                      Q1:
                    </span>
                    <span className="font-medium">
                      {stats.quartiles?.q1?.toFixed(4) || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span title="Q2 = 2nd quartile value = percentile(50%)">
                      Median:
                    </span>
                    <span className="font-medium">
                      {stats.quartiles?.median?.toFixed(4) || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span title="Q3 = 3rd quartile value = percentile(75%)">
                      Q3:
                    </span>
                    <span className="font-medium">
                      {stats.quartiles?.q3?.toFixed(4) || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Max:</span>
                    <span className="font-medium">
                      {stats.quartiles?.max?.toFixed(4) || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span title="IQR = [Q3 - Q1]">IQR:</span>
                    <span className="font-medium">
                      {stats.quartiles
                        ? (stats.quartiles.q3 - stats.quartiles.q1).toFixed(4)
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span title="Range = [Max - Min] of data">Range:</span>
                    <span className="font-medium">
                      {stats.quartiles
                        ? (stats.quartiles.max - stats.quartiles.min).toFixed(4)
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span title="Mode: most frequent value of the distribution">
                      Mode:
                    </span>
                    <span className="font-medium">
                      {stats.Mode?.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Capability Indices */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-3">
                  {capabilityIndex === "Cp/Cpk"
                    ? "Capability Indices (Pp/Ppk & Cp/Cpk)"
                    : stats.isNormal
                      ? "Z values"
                      : "Z-Equivalent values (from observed defects)"}
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span title="LSL = Lower Specification Limit">LSL:</span>
                    <span className="font-medium">{stats.lsl || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span title="USL = Upper Specification Limit">USL:</span>
                    <span className="font-medium">{stats.usl || "N/A"}</span>
                  </div>
                  {renderCapabilityDetails()}
                </div>
              </div>

              {/* Performance Metrics - Long Term and Short Term */}
              {showPercentage && stats.performanceMetrics && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-3">
                    {stats.isNormal && capabilityIndex === "Z"
                      ? "Performance Metrics (predicted)"
                      : "Performance Metrics (observed defects)"}
                  </h4>
                  <div className="space-y-4">
                    {/* Long Term Metrics */}
                    {(capabilityData[ctq]?.capabilityIndex === "Z" ||
                      (capabilityData[ctq]?.capabilityIndex === "Cp/Cpk" &&
                        capabilityData[ctq]?.dataSetTerm === "Long Term")) && (
                      <div>
                        <h5 className="font-medium text-green-700 mb-2 text-sm">
                          Long Term
                        </h5>
                        <div className="space-y-2 text-sm pl-2 border-l-2 border-green-200">
                          {/* Yield */}
                          <div
                            className="flex justify-between"
                            title="Yield LT = 100% - % defects LT"
                          >
                            <span>Yield (Long Term):</span>
                            {stats.isNormal && capabilityIndex === "Z" ? (
                              <span className="font-medium">
                                {formatPercentage(
                                  stats.performanceMetrics.longTerm.yield,
                                  stats.performanceMetrics.longTerm.dpmo,
                                )}
                              </span>
                            ) : (
                              <span className="font-medium">
                                {formatPercentage(
                                  stats.obsYieldLT,
                                  stats.obsDPMOLT,
                                )}
                              </span>
                            )}
                          </div>

                          {/* Percent Defects */}
                          <div className="flex justify-between">
                            <span>% defects (Long Term):</span>
                            {stats.isNormal && capabilityIndex === "Z" ? (
                              <span
                                className="font-medium"
                                title="% defects LT as read in Z_table with Z LT value"
                              >
                                {formatPercentage(
                                  stats.performanceMetrics.longTerm
                                    .percentDefects,
                                  stats.performanceMetrics.longTerm.dpmo,
                                )}
                              </span>
                            ) : capabilityData[ctq]?.dataSetTerm ===
                              "Long Term" ? (
                              <span
                                className="font-medium"
                                title="Nbr of total defects LT / Nbr of data LT"
                              >
                                {formatPercentage(
                                  stats.obspercentDefectsLT,
                                  stats.obsDPMOLT,
                                )}
                              </span>
                            ) : (
                              <span
                                className="font-medium"
                                title="% observed defects LT as read in Z_table with Z_Equiv LT value"
                              >
                                {formatPercentage(
                                  stats.obspercentDefectsLT,
                                  stats.obsDPMOLT,
                                )}
                              </span>
                            )}
                          </div>

                          {/* LSL Defects - only show for Long Term dataset */}
                          {capabilityData[ctq]?.dataSetTerm === "Long Term" && (
                            <div className="flex justify-between text-xs ml-2">
                              <span>• % defects_LSL:</span>
                              {stats.isNormal && capabilityIndex === "Z" ? (
                                <span
                                  className="font-medium"
                                  title="% defects_LSL LT as read in Z_table with Z_LSL LT value"
                                >
                                  {formatPercentage(
                                    stats.performanceMetrics.longTerm.pdLSL_LT,
                                    stats.performanceMetrics.longTerm.dpmo,
                                  )}
                                </span>
                              ) : capabilityData[ctq]?.dataSetTerm ===
                                "Long Term" ? (
                                <span
                                  className="font-medium"
                                  title="Nbr of defects_LSL LT / Nbr of data LT"
                                >
                                  {formatPercentage(
                                    stats.obspdLSL_LT,
                                    stats.obsDPMOLT,
                                  )}
                                </span>
                              ) : (
                                <span
                                  className="font-medium"
                                  title="% observed defects_LSL LT as read in Z_table with Z_Equiv_LSL LT value"
                                >
                                  {formatPercentage(
                                    stats.obspdLSL_LT,
                                    stats.obsDPMOLT,
                                  )}
                                </span>
                              )}
                            </div>
                          )}

                          {/* USL Defects - only show for Long Term dataset */}
                          {capabilityData[ctq]?.dataSetTerm === "Long Term" && (
                            <div className="flex justify-between text-xs ml-2">
                              <span>• % defects_USL:</span>
                              {stats.isNormal && capabilityIndex === "Z" ? (
                                <span
                                  className="font-medium"
                                  title="% defects_USL LT as read in Z_table with Z_USL LT value"
                                >
                                  {formatPercentage(
                                    stats.performanceMetrics.longTerm.pdUSL_LT,
                                    stats.performanceMetrics.longTerm.dpmo,
                                  )}
                                </span>
                              ) : capabilityData[ctq]?.dataSetTerm ===
                                "Long Term" ? (
                                <span
                                  className="font-medium"
                                  title="Nbr of defects_USL LT / Nbr of data LT"
                                >
                                  {formatPercentage(
                                    stats.obspdUSL_LT,
                                    stats.obsDPMOLT,
                                  )}
                                </span>
                              ) : (
                                <span
                                  className="font-medium"
                                  title="% observed defects_USL LT as read in Z_table with Z_Equiv_USL LT value"
                                >
                                  {formatPercentage(
                                    stats.obspdUSL_LT,
                                    stats.obsDPMOLT,
                                  )}
                                </span>
                              )}
                            </div>
                          )}

                          {/* DPMO */}
                          <div
                            className="flex justify-between"
                            title="DPMO LT (Defects Per Million Opportunities) = % defects LT * (1000000/100)"
                          >
                            <span>DPMO (Long Term):</span>
                            {stats.isNormal && capabilityIndex === "Z" ? (
                              <span className="font-medium">
                                {Math.round(
                                  stats.performanceMetrics.longTerm.dpmo,
                                ).toLocaleString()}
                              </span>
                            ) : (
                              <span className="font-medium">
                                {Math.round(stats.obsDPMOLT!).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Short Term Metrics */}
                    {(capabilityData[ctq]?.capabilityIndex === "Z" ||
                      (capabilityData[ctq]?.capabilityIndex === "Cp/Cpk" &&
                        capabilityData[ctq]?.dataSetTerm === "Short Term")) && (
                      <div>
                        <h5 className="font-medium text-blue-700 mb-2 text-sm">
                          Short Term
                        </h5>
                        <div className="space-y-2 text-sm pl-2 border-l-2 border-blue-200">
                          <div
                            className="flex justify-between"
                            title="Yield ST = 100% - % defects ST"
                          >
                            <span>Yield (Short Term):</span>
                            {stats.isNormal && capabilityIndex === "Z" ? (
                              <span className="font-medium">
                                {formatPercentage(
                                  stats.performanceMetrics.shortTerm.yield,
                                  stats.performanceMetrics.shortTerm.dpmo,
                                )}
                              </span>
                            ) : (
                              <span className="font-medium">
                                {formatPercentage(
                                  stats.obsYieldST!,
                                  stats.obsDPMOST!,
                                )}
                              </span>
                            )}
                          </div>
                          <div className="flex justify-between">
                            <span>% defects (Short Term):</span>
                            {stats.isNormal && capabilityIndex === "Z" ? (
                              <span
                                className="font-medium"
                                title="% defects ST as read in Z_table with Z ST value"
                              >
                                {formatPercentage(
                                  stats.performanceMetrics.shortTerm
                                    .percentDefects,
                                  stats.performanceMetrics.shortTerm.dpmo,
                                )}
                              </span>
                            ) : capabilityData[ctq]?.dataSetTerm ===
                              "Short Term" ? (
                              <span
                                className="font-medium"
                                title="Nbr of total defects ST / Nbr of data ST"
                              >
                                {formatPercentage(
                                  stats.obspercentDefectsST,
                                  stats.obsDPMOST,
                                )}
                              </span>
                            ) : (
                              <span
                                className="font-medium"
                                title="% observed defects ST as read in Z_table with Z_Equiv ST value"
                              >
                                {formatPercentage(
                                  stats.obspercentDefectsST,
                                  stats.obsDPMOST,
                                )}
                              </span>
                            )}
                          </div>
                          {/* LSL Defects - only show for Short Term dataset */}
                          {capabilityData[ctq]?.dataSetTerm ===
                            "Short Term" && (
                            <div className="flex justify-between text-xs ml-2">
                              <span>• % defects_LSL:</span>
                              {stats.isNormal && capabilityIndex === "Z" ? (
                                <span
                                  className="font-medium"
                                  title="% defects ST as read in Z_table with Z_Equiv ST value"
                                >
                                  {formatPercentage(
                                    stats.performanceMetrics.shortTerm.pdLSL_ST,
                                    stats.performanceMetrics.shortTerm.dpmo,
                                  )}
                                </span>
                              ) : capabilityData[ctq]?.dataSetTerm ===
                                "Short Term" ? (
                                <span
                                  className="font-medium"
                                  title="Nbr of defects_LSL ST / Nbr of data ST"
                                >
                                  {formatPercentage(
                                    stats.obspdLSL_ST,
                                    stats.obsDPMOLT,
                                  )}
                                </span>
                              ) : (
                                <span
                                  className="font-medium"
                                  title="% observed defects_LSL ST as read in Z_table with Z_Equiv_LSL ST value"
                                >
                                  {formatPercentage(
                                    stats.obspdLSL_ST,
                                    stats.obsDPMOLT,
                                  )}
                                </span>
                              )}
                            </div>
                          )}

                          {/* USL Defects - only show for Short Term dataset */}
                          {capabilityData[ctq]?.dataSetTerm ===
                            "Short Term" && (
                            <div className="flex justify-between text-xs ml-2">
                              <span>• % defects_USL:</span>
                              {stats.isNormal && capabilityIndex === "Z" ? (
                                <span className="font-medium">
                                  {formatPercentage(
                                    stats.performanceMetrics.shortTerm.pdUSL_ST,
                                    stats.performanceMetrics.shortTerm.dpmo,
                                  )}
                                </span>
                              ) : capabilityData[ctq]?.dataSetTerm ===
                                "Short Term" ? (
                                <span
                                  className="font-medium"
                                  title="Nbr of defects_USL ST / Nbr of data UT"
                                >
                                  {formatPercentage(
                                    stats.obspdUSL_ST,
                                    stats.obsDPMOLT,
                                  )}
                                </span>
                              ) : (
                                <span
                                  className="font-medium"
                                  title="% observed defects_USL ST as read in Z_table with Z_Equiv_USL ST value"
                                >
                                  {formatPercentage(
                                    stats.obspdUSL_ST,
                                    stats.obsDPMOLT,
                                  )}
                                </span>
                              )}
                            </div>
                          )}
                          <div
                            className="flex justify-between"
                            title="DPMO ST (Defects Per Million Opportunities) = % defects ST * (1000000/100)"
                          >
                            <span>DPMO (Short Term):</span>
                            {stats.isNormal && capabilityIndex === "Z" ? (
                              <span className="font-medium">
                                {Math.round(
                                  stats.performanceMetrics.shortTerm.dpmo,
                                ).toLocaleString()}
                              </span>
                            ) : (
                              <span className="font-medium">
                                {Math.round(stats.obsDPMOST!).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
    </>
  );
}
