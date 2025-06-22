import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Google AI client with proper API key validation
let genAI: GoogleGenerativeAI | null = null;
if (process.env.GOOGLE_AI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
}

// Validate API key at startup
if (!process.env.GOOGLE_AI_API_KEY) {
  console.warn("Warning: GOOGLE_AI_API_KEY is missing. AI capability assessment will fail.");
}

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
    console.log(`Generating capability assessment for CTQ: "${context.ctq}"`);
    
    // Check if API key is available
    if (!process.env.GOOGLE_AI_API_KEY) {
      console.error('GOOGLE_AI_API_KEY is not set in environment variables');
      throw new Error('GOOGLE_AI_API_KEY is missing. Please make sure it is set in your environment variables.');
    }
    
    // Check if Google AI client was initialized
    if (!genAI) {
      throw new Error('Google AI client not initialized. Check your API key.');
    }

    console.log("Using Google AI API to generate capability assessment");

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

    console.log("Sending request to Google AI API for capability assessment...");

    // Create a generative model instance
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log("Capability assessment response received from Google AI API");
    
    return text || "Unable to generate capability assessment. Please try again.";
  } catch (error: any) {
    console.error('Error generating capability assessment with Google AI:', error);
    
    // Detailed error handling based on common API errors
    if (error.status === 401 || error.status === 403) {
      throw new Error('Authentication failed: Invalid API key. Please check your GOOGLE_AI_API_KEY environment variable.');
    } else if (error.status === 400) {
      throw new Error(`Bad request: ${error.message || 'Check if the model name is correct and the request format is valid.'}`);
    } else if (error.status === 404) {
      throw new Error('Resource not found: The specified model may not exist or be available.');
    } else if (error.status === 429) {
      throw new Error('Rate limit exceeded: Too many requests in a given amount of time.');
    } else if (error.status >= 500) {
      throw new Error('Server error: The API is experiencing issues. Please try again later.');
    } else {
      console.error('Full error details:', JSON.stringify(error, null, 2));
      throw new Error(`Failed to generate capability assessment: ${error.message || 'Unknown error'}`);
    }
  }
}