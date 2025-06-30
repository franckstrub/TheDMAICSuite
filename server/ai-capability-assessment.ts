import { GoogleGenerativeAI } from "@google/generative-ai";
import { boolean } from "drizzle-orm/mysql-core";

// Initialize the Google AI client with proper API key validation
let genAI: GoogleGenerativeAI | null = null;
if (process.env.GOOGLE_AI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
}

// Validate API key at startup
if (!process.env.GOOGLE_AI_API_KEY) {
  console.warn("Warning: GOOGLE_AI_API_KEY is missing. AI capability analysis will fail.");
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
  zLSL?: number;
  zUSL?: number;
  isNormal?: boolean;
  percentageDefectLT?: number;
  percentageDefectST?: number;
  pdLSL?: number;
  pdUSL?: number;
  isInControl: boolean;
  isStable: boolean;
}

export interface CapabilityContext {
  ctq: string;
  capabilityIndex: string;
  lsl?: string;
  usl?: string;
  target?: string;
  zShift?: number;
  dataSetTerm: string;
}

export async function generateCapabilityAssessment(
  stats: CapabilityStats,
  context: CapabilityContext,
  chartImages?: string[]
): Promise<string> {
  try {
    console.log(`Generating capability analysis for CTQ: "${context.ctq}"`);
    
    // Check if API key is available
    if (!process.env.GOOGLE_AI_API_KEY) {
      console.error('GOOGLE_AI_API_KEY is not set in environment variables');
      throw new Error('GOOGLE_AI_API_KEY is missing. Please make sure it is set in your environment variables.');
    }
    
    // Check if Google AI client was initialized
    if (!genAI) {
      throw new Error('Google AI client not initialized. Check your API key.');
    }

    console.log("Using Google AI API to generate capability assessment analysis");

    const normalityText = stats.isNormal 
      ? `The data follows a normal distribution.`
      : `The data does NOT follow a normal distribution. Consider data transformation or non-parametric analysis.`;

    const capabilityText = context.capabilityIndex === "Cp/Cpk" 
      ? (context.dataSetTerm === "Short Term" ?
        `Capability indices: Cp = ${stats.cp?.toFixed(3) || 'N/A'}, Cpk = ${stats.cpk?.toFixed(3) || 'N/A'}`
        :
        `Pp = ${stats.pp?.toFixed(3) || 'N/A'}, Ppk = ${stats.ppk?.toFixed(3) || 'N/A'}`
      ) : (
        context.dataSetTerm === "Short Term" ?
          `Z short-term = ${stats.zShortTerm?.toFixed(2) || 'N/A'}, Z_LSL short term = ${stats.zLSL?.toFixed(2) || 'N/A'}, Z_USL short term = ${stats.zUSL?.toFixed(2) || 'N/A'}, Z long-term = ${stats.zLongTerm?.toFixed(2) || 'N/A'}`
          :
          `Z short-term = ${stats.zShortTerm?.toFixed(2) || 'N/A'}, Z long-term = ${stats.zLongTerm?.toFixed(2) || 'N/A'}, Z_LSL long term = ${stats.zLSL?.toFixed(2) || 'N/A'}, Z_USL long term = ${stats.zUSL?.toFixed(2) || 'N/A'}`       
        ) ;

    const defectText = stats.percentageDefectST !== undefined
      ? stats.isNormal 
        ? (
            context.capabilityIndex === "Z"  
              ? `Short Term Calculated defect rate: ${(stats.percentageDefectST!).toFixed(4)}%. 
                 Long Term Calculated defect rate: ${(stats.percentageDefectLT!).toFixed(4)}%`
              : (  
                  context.dataSetTerm === "Short Term"
                    ? `Short Term Calculated defect rate: ${(stats.percentageDefectST!).toFixed(4)}%`
                    : `Long Term Calculated defect rate: ${(stats.percentageDefectLT!).toFixed(4)}%`
                )
          ) : (
            context.capabilityIndex === "Z"  
              ? `Short Term Observed defect rate: ${(stats.percentageDefectST!).toFixed(4)}%, 
                 Long Term Observed defect rate: ${(stats.percentageDefectLT!).toFixed(4)}%`
              : (
                  context.dataSetTerm === "Short Term"
                    ? `Short Term Observed defect rate: ${(stats.percentageDefectST!).toFixed(4)}%`
                    : `Long Term Observed defect rate: ${(stats.percentageDefectLT!).toFixed(4)}%`
                )
          )
      : "";
    const variationText = stats.isStable
      ? (stats.isInControl ? `The process is stable and in control.` : `The process is out of control.`)
      : (stats.isInControl ? `The process is unstable.` : `The process is unstable and out of control.`)
    const prompt = `As a Lean Six Sigma Master Black Belt expert, provide a comprehensive capability analysis for the CTQ "${context.ctq}".

Statistical Analysis:
- Sample size: ${stats.sampleSize}
- Mean: ${stats.mean?.toFixed(4)}
- Standard deviation: ${stats.standardDeviation?.toFixed(4)}
- ${normalityText}
- ${capabilityText}
- ${defectText}
- ${variationText}

Process Context:
- Capability index method: ${context.capabilityIndex}
- LSL: ${context.lsl || 'Not specified'}
- USL: ${context.usl || 'Not specified'}
- Target: ${context.target || 'Not specified'}
- Z-shift: ${context.zShift}
- Data set term: ${context.dataSetTerm}

Please provide:
1. Overall capability rating (World-class, Capable, Marginal, Poor)
2. Key insights about process performance
3. Statistical interpretation of the results

Keep the analysis concise, professional, data-driven, and actionable for process improvement teams. Use the 4 statistical graphs image to complement your analysis.`;
    console.log("Sending request to Google AI API for capability analysis...");

    // Create a generative model instance - use Pro for image analysis, Flash for text only
    chartImages.length = 0;
    const modelName = chartImages && chartImages.length > 0 ? "gemini-1.5-pro" : "gemini-1.5-flash";
    const model = genAI.getGenerativeModel({ model: modelName });
    
    let result;
    if (chartImages && chartImages.length > 0) {
      // Generate content with images - use the new format
      const imageParts = chartImages.map((imageData: string) => ({
        inlineData: {
          data: imageData.split(',')[1], // Remove data:image/png;base64, prefix
          mimeType: "image/png",
        }
      }));
      
      result = await model.generateContent([
        prompt,
        ...imageParts
      ]);
    } else {
      // Generate content with text only
      result = await model.generateContent(prompt);
    }
    
    const response = await result.response;
    const text = response.text();
    
    console.log("Capability analysis response received from Google AI API");
    
    return text || "Unable to generate capability analysis. Please try again.";
  } catch (error: any) {
    console.error('Error generating capability analysis with Google AI:', error);
    
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