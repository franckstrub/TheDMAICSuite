import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface CapabilityStats {
  sampleSize: number;
  mean: number;
  standardDeviation: number;
  cp?: number;
  cpk?: number;
  pp?: number;
  ppk?: number;
  zShortTerm?: number;
  zLongTerm?: number;
  sigma?: number;
  dpmo?: number;
  yield?: number;
  normalityPValue?: number;
  isNormal?: boolean;
  observedDefectRate?: number;
}

export interface CapabilityContext {
  ctq: string;
  capabilityIndex: string;
  lsl?: string;
  usl?: string;
  target?: string;
  zShift: number;
  dataSetTerm: string;
}

export async function generateCapabilityAssessment(
  stats: CapabilityStats,
  context: CapabilityContext
): Promise<string> {
  try {
    const normalityText = stats.isNormal 
      ? `The data follows a normal distribution (p-value: ${stats.normalityPValue?.toFixed(4) || 'N/A'}).`
      : `The data does NOT follow a normal distribution (p-value: ${stats.normalityPValue?.toFixed(4) || 'N/A'}). Consider data transformation or non-parametric analysis.`;

    const capabilityText = context.capabilityIndex === "Cp/Cpk" 
      ? `Capability indices: Cp = ${stats.cp?.toFixed(3) || 'N/A'}, Cpk = ${stats.cpk?.toFixed(3) || 'N/A'}, Pp = ${stats.pp?.toFixed(3) || 'N/A'}, Ppk = ${stats.ppk?.toFixed(3) || 'N/A'}`
      : `Z-values: ${context.dataSetTerm === "Short Term" ? `Z short-term = ${stats.zShortTerm?.toFixed(2) || 'N/A'}` : `Z long-term = ${stats.zLongTerm?.toFixed(2) || 'N/A'}`}`;

    const defectText = stats.observedDefectRate !== undefined 
      ? `Observed defect rate: ${(stats.observedDefectRate * 100).toFixed(4)}%`
      : `Calculated DPMO: ${stats.dpmo?.toFixed(0) || 'N/A'}, Yield: ${((stats.yield || 0) * 100).toFixed(2)}%`;

    const prompt = `As a Lean Six Sigma Master Black Belt expert, provide a comprehensive capability assessment for the CTQ "${context.ctq}".

Statistical Analysis:
- Sample size: ${stats.sampleSize}
- Mean: ${stats.mean?.toFixed(4)}
- Standard deviation: ${stats.standardDeviation?.toFixed(4)}
- ${normalityText}
- ${capabilityText}
- ${defectText}

Process Context:
- Capability index method: ${context.capabilityIndex}
- LSL: ${context.lsl || 'Not specified'}
- USL: ${context.usl || 'Not specified'}
- Target: ${context.target || 'Not specified'}
- Z-shift: ${context.zShift}
- Analysis term: ${context.dataSetTerm}

Please provide:
1. Overall capability rating (World-class, Capable, Marginal, Poor)
2. Key insights about process performance
3. Statistical interpretation of the results
4. Specific recommendations for improvement
5. Risk assessment and implications

Keep the assessment professional, data-driven, and actionable for process improvement teams.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt,
    });

    return response.text || "Unable to generate capability assessment. Please try again.";
  } catch (error) {
    console.error("Error generating capability assessment:", error);
    throw new Error(`Failed to generate capability assessment: ${error}`);
  }
}