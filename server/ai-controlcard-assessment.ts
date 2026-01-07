import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;
if (process.env.GOOGLE_AI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
}

export interface ControlCardStats {
  dataValues: number[];
  movingRanges: number[];
  mean: number;
  mrMean: number;
  ucl: number;
  lcl: number;
  mrUcl: number;
  mrLcl: number;
  outOfControlIndividuals: number[];
  outOfControlMR: number[];
  stagesEnabled: boolean;
  stageStats?: {
    stageNumber: number;
    count: number;
    mean: number;
    ucl: number;
    lcl: number;
    mrMean: number;
    mrUcl: number;
    mrLcl: number;
  }[];
}

export interface ControlCardContext {
  ctqName: string;
  indicatorName: string;
  chartDate?: string;
  xScaleType: string;
  xAxisLabel?: string;
}

export async function generateControlCardAssessment(
  stats: ControlCardStats,
  context: ControlCardContext
): Promise<string> {
  try {
    console.log(`Generating control card analysis for CTQ: "${context.ctqName}"`);
    
    if (!process.env.GOOGLE_AI_API_KEY) {
      console.error('GOOGLE_AI_API_KEY is not set in environment variables');
      throw new Error('GOOGLE_AI_API_KEY is missing. Please make sure it is set in your environment variables.');
    }
    
    if (!genAI) {
      throw new Error('Google AI client not initialized. Check your API key.');
    }

    console.log("Using Google AI API to generate control card assessment analysis");

    const sampleSize = stats.dataValues.length;
    const individualOOC = stats.outOfControlIndividuals.length;
    const mrOOC = stats.outOfControlMR.length;
    const totalOOC = individualOOC + mrOOC;
    
    const isInControl = totalOOC === 0;
    const controlStatus = isInControl 
      ? "The process appears to be IN CONTROL with no points outside control limits."
      : `The process has OUT OF CONTROL signals: ${individualOOC} individual value(s) and ${mrOOC} moving range value(s) outside control limits.`;

    const stageInfo = stats.stagesEnabled && stats.stageStats && stats.stageStats.length > 1
      ? `\nMulti-Stage Analysis:\n${stats.stageStats.map(s => 
          `- Stage ${s.stageNumber}: ${s.count} points, Mean=${s.mean.toFixed(4)}, UCL=${s.ucl.toFixed(4)}, LCL=${s.lcl.toFixed(4)}`
        ).join('\n')}`
      : '';

    const oocDetails = totalOOC > 0 
      ? `\nOut-of-Control Points:
- Individual chart: Points at indices ${stats.outOfControlIndividuals.length > 0 ? stats.outOfControlIndividuals.join(', ') : 'none'}
- MR chart: Points at indices ${stats.outOfControlMR.length > 0 ? stats.outOfControlMR.join(', ') : 'none'}`
      : '';

    const prompt = `As a Lean Six Sigma Master Black Belt expert, provide a comprehensive I-MR (Individual-Moving Range) control chart analysis for the process characteristic "${context.indicatorName || context.ctqName}".

Statistical Summary:
- Sample size: ${sampleSize}
- Process mean (X̄): ${stats.mean.toFixed(4)}
- Individual chart UCL: ${stats.ucl.toFixed(4)}
- Individual chart LCL: ${stats.lcl.toFixed(4)}
- Moving Range mean (MR̄): ${stats.mrMean.toFixed(4)}
- MR chart UCL: ${stats.mrUcl.toFixed(4)}
- MR chart LCL: ${stats.mrLcl.toFixed(4)}
${stageInfo}

Control Status:
${controlStatus}
${oocDetails}

Please provide a structured analysis following these steps:

1. **Process Stability Assessment**
   - Is the process statistically stable (in control)?
   - Are there any special cause variations present?
   - Comment on the distribution of points within control limits

2. **Pattern Analysis**
   - Check for trends (7+ consecutive points increasing or decreasing)
   - Check for runs (7+ consecutive points above or below centerline)
   - Check for cycles or other non-random patterns
   - Comment on process behavior over time

3. **Variation Analysis**
   - Assess the magnitude of process variation
   - Compare MR chart behavior to Individual chart
   - Identify if variation is consistent or changing

4. **Out-of-Control Investigation** (if applicable)
   - For each out-of-control point, suggest potential special causes to investigate
   - Recommend immediate containment actions if needed

5. **Recommendations**
   - Specific actions for process improvement
   - Priority items to address
   - Monitoring recommendations going forward

Keep the analysis concise, professional, data-driven, and actionable for process improvement teams. Focus on practical insights that operators and engineers can use immediately.`;

    console.log("Sending request to Google AI API for control card analysis...");

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log("Control card analysis response received from Google AI API");
    
    return text || "Unable to generate control card analysis. Please try again.";
  } catch (error: any) {
    console.error('Error generating control card analysis with Google AI:', error);
    
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
      throw new Error(`Failed to generate control card assessment: ${error.message || 'Unknown error'}`);
    }
  }
}
