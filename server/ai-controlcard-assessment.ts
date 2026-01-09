import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;
if (process.env.GOOGLE_AI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
}

// Base interface for common fields
interface BaseControlCardStats {
  stagesEnabled: boolean;
  stageStats?: {
    stageName?: string;
    stageNumber?: number;
    count: number;
    mean: number;
    ucl: number;
    lcl: number;
    mrMean?: number;
    mrUcl?: number;
    mrLcl?: number;
    rBar?: number;
    rUCL?: number;
    rLCL?: number;
  }[];
}

// I-MR specific stats
export interface IMRControlCardStats extends BaseControlCardStats {
  chartType: 'I-MR';
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
}

// Xbar-R specific stats
export interface XbarRControlCardStats extends BaseControlCardStats {
  chartType: 'Xbar-R';
  subgroupCount: number;
  subgroupSize: number;
  xbars: number[];
  ranges: number[];
  xbarBar: number;
  rBar: number;
  xbarUCL: number;
  xbarLCL: number;
  rUCL: number;
  rLCL: number;
  outOfControlXbar: number[];
  outOfControlR: number[];
}

// Xbar-S specific stats
export interface XbarSControlCardStats extends BaseControlCardStats {
  chartType: 'Xbar-S';
  subgroupCount: number;
  subgroupSize: number;
  xbars: number[];
  stdDevs: number[];
  xbarBar: number;
  sBar: number;
  xbarUCL: number;
  xbarLCL: number;
  sUCL: number;
  sLCL: number;
  outOfControlXbar: number[];
  outOfControlS: number[];
}

// Legacy stats (for backward compatibility - defaults to I-MR)
export interface LegacyControlCardStats {
  dataValues?: number[];
  movingRanges?: number[];
  mean?: number;
  mrMean?: number;
  ucl?: number;
  lcl?: number;
  mrUcl?: number;
  mrLcl?: number;
  outOfControlIndividuals?: number[];
  outOfControlMR?: number[];
  stagesEnabled?: boolean;
  stageStats?: any[];
}

export type ControlCardStats = IMRControlCardStats | XbarRControlCardStats | XbarSControlCardStats | LegacyControlCardStats;

export interface ControlCardContext {
  ctqName?: string;
  indicatorName?: string;
  chartDate?: string;
  xScaleType?: string;
  xAxisLabel?: string;
}

// Type guard functions
function isXbarRStats(stats: ControlCardStats): stats is XbarRControlCardStats {
  return 'chartType' in stats && stats.chartType === 'Xbar-R';
}

function isXbarSStats(stats: ControlCardStats): stats is XbarSControlCardStats {
  return 'chartType' in stats && stats.chartType === 'Xbar-S';
}

function isIMRStats(stats: ControlCardStats): stats is IMRControlCardStats {
  return ('chartType' in stats && stats.chartType === 'I-MR') || !('chartType' in stats);
}

// Chart-type specific configuration
interface ChartTypeConfig {
  chartName: string;
  chartDescription: string;
  primaryChartName: string;
  secondaryChartName: string;
  variationComparisonText: string;
}

function getChartConfig(stats: ControlCardStats): ChartTypeConfig {
  if (isXbarRStats(stats)) {
    return {
      chartName: 'Xbar-R', // (X̄-R)',
      chartDescription: 'Xbar-R control chart for subgrouped data',
      primaryChartName: 'Xbar chart',
      secondaryChartName: 'R chart',
      variationComparisonText: 'Compare R chart behavior to Xbar chart',
    };
  }
  if (isXbarSStats(stats)) {
    return {
      chartName: 'Xbar-S', // (X̄-S)',
      chartDescription: 'Xbar-S control chart for subgrouped data with standard deviation',
      primaryChartName: 'Xbar chart',
      secondaryChartName: 'S chart',
      variationComparisonText: 'Compare S chart behavior to Xbar chart',
    };
  }
  return {
    chartName: 'I-MR (Individual-Moving Range)',
    chartDescription: 'I-MR control chart for individual measurements',
    primaryChartName: 'I chart',
    secondaryChartName: 'MR chart',
    variationComparisonText: 'Compare MR chart behavior to I chart',
  };
}

function buildStatisticalSummary(stats: ControlCardStats): string {
  if (isXbarRStats(stats)) {
    return `- Number of subgroups: ${stats.subgroupCount}
- Subgroup size (n): ${stats.subgroupSize}
- Grand mean (X̿): ${stats.xbarBar.toFixed(4)}
- Average range (R̄): ${stats.rBar.toFixed(4)}
- X̄ chart UCL: ${stats.xbarUCL.toFixed(4)}
- X̄ chart LCL: ${stats.xbarLCL.toFixed(4)}
- R chart UCL: ${stats.rUCL.toFixed(4)}
- R chart LCL: ${stats.rLCL.toFixed(4)}`;
  }
  
  if (isXbarSStats(stats)) {
    return `- Number of subgroups: ${stats.subgroupCount}
- Subgroup size (n): ${stats.subgroupSize}
- Grand mean (X̿): ${stats.xbarBar.toFixed(4)}
- Average standard deviation (S̄): ${stats.sBar.toFixed(4)}
- X̄ chart UCL: ${stats.xbarUCL.toFixed(4)}
- X̄ chart LCL: ${stats.xbarLCL.toFixed(4)}
- S chart UCL: ${stats.sUCL.toFixed(4)}
- S chart LCL: ${stats.sLCL.toFixed(4)}`;
  }
  
  // I-MR or legacy stats
  const imrStats = stats as IMRControlCardStats | LegacyControlCardStats;
  const sampleSize = imrStats.dataValues?.length || 0;
  return `- Sample size: ${sampleSize}
- Process mean (X̄): ${(imrStats.mean || 0).toFixed(4)}
- Individual chart UCL: ${(imrStats.ucl || 0).toFixed(4)}
- Individual chart LCL: ${(imrStats.lcl || 0).toFixed(4)}
- Moving Range mean (MR̄): ${(imrStats.mrMean || 0).toFixed(4)}
- MR chart UCL: ${(imrStats.mrUcl || 0).toFixed(4)}
- MR chart LCL: ${(imrStats.mrLcl || 0).toFixed(4)}`;
}

function buildControlStatus(stats: ControlCardStats, config: ChartTypeConfig): { status: string; details: string } {
  if (isXbarRStats(stats)) {
    const xbarOOC = stats.outOfControlXbar?.length || 0;
    const rOOC = stats.outOfControlR?.length || 0;
    const totalOOC = xbarOOC + rOOC;
    
    const status = totalOOC === 0
      ? "The process appears to be IN CONTROL with no points outside control limits."
      : `The process has OUT OF CONTROL signals: ${xbarOOC} X̄ value(s) and ${rOOC} Range value(s) outside control limits.`;
    
    const details = totalOOC > 0
      ? `\nOut-of-Control Points:
- Xbar chart: Subgroups at indices ${xbarOOC > 0 ? stats.outOfControlXbar.join(', ') : 'none'}
- R chart: Subgroups at indices ${rOOC > 0 ? stats.outOfControlR.join(', ') : 'none'}`
      : '';
    
    return { status, details };
  }
  
  if (isXbarSStats(stats)) {
    const xbarOOC = stats.outOfControlXbar?.length || 0;
    const sOOC = stats.outOfControlS?.length || 0;
    const totalOOC = xbarOOC + sOOC;
    
    const status = totalOOC === 0
      ? "The process appears to be IN CONTROL with no points outside control limits."
      : `The process has OUT OF CONTROL signals: ${xbarOOC} X̄ value(s) and ${sOOC} Standard Deviation value(s) outside control limits.`;
    
    const details = totalOOC > 0
      ? `\nOut-of-Control Points:
- Xbar chart: Subgroups at indices ${xbarOOC > 0 ? stats.outOfControlXbar.join(', ') : 'none'}
- S chart: Subgroups at indices ${sOOC > 0 ? stats.outOfControlS.join(', ') : 'none'}`
      : '';
    
    return { status, details };
  }
  
  // I-MR or legacy stats
  const imrStats = stats as IMRControlCardStats | LegacyControlCardStats;
  const individualOOC = imrStats.outOfControlIndividuals?.length || 0;
  const mrOOC = imrStats.outOfControlMR?.length || 0;
  const totalOOC = individualOOC + mrOOC;
  
  const status = totalOOC === 0
    ? "The process appears to be IN CONTROL with no points outside control limits."
    : `The process has OUT OF CONTROL signals: ${individualOOC} individual value(s) and ${mrOOC} moving range value(s) outside control limits.`;
  
  const details = totalOOC > 0
    ? `\nOut-of-Control Points:
- I chart: Points at indices ${individualOOC > 0 ? imrStats.outOfControlIndividuals!.join(', ') : 'none'}
- MR chart: Points at indices ${mrOOC > 0 ? imrStats.outOfControlMR!.join(', ') : 'none'}`
    : '';
  
  return { status, details };
}

function buildStageInfo(stats: ControlCardStats): string {
  const stagesEnabled = 'stagesEnabled' in stats ? stats.stagesEnabled : false;
  const stageStats = 'stageStats' in stats ? stats.stageStats : undefined;
  
  if (!stagesEnabled || !stageStats || stageStats.length <= 1) {
    return '';
  }
  
  const isXbarR = isXbarRStats(stats);
  const isXbarS = isXbarSStats(stats);
  
  return `\nMulti-Stage Analysis:\nNumber of stages: ${stageStats.length}\n${stageStats.map(s => {
    const stageName = s.stageName || `Stage ${s.stageNumber || '?'}`;
    if (isXbarR) {
      return `- ${stageName}: ${s.count} subgroups, X̄=${s.mean.toFixed(4)}, X̄ UCL=${s.ucl.toFixed(4)}, X̄ LCL=${s.lcl.toFixed(4)}, R̄=${(s.rBar || 0).toFixed(4)}`;
    }
    if (isXbarS) {
      return `- ${stageName}: ${s.count} subgroups, X̄=${s.mean.toFixed(4)}, X̄ UCL=${s.ucl.toFixed(4)}, X̄ LCL=${s.lcl.toFixed(4)}, S̄=${(s.sBar || 0).toFixed(4)}`;
    }
    return `- ${stageName}: ${s.count} points, Mean=${s.mean.toFixed(4)}, UCL=${s.ucl.toFixed(4)}, LCL=${s.lcl.toFixed(4)}`;
  }).join('\n')}`;
}

export async function generateControlCardAssessment(
  stats: ControlCardStats,
  context: ControlCardContext
): Promise<string> {
  try {
    const indicatorName = context.indicatorName || context.ctqName || 'Process Characteristic';
    console.log(`Generating control card analysis for: "${indicatorName}"`);
    
    if (!process.env.GOOGLE_AI_API_KEY) {
      console.error('GOOGLE_AI_API_KEY is not set in environment variables');
      throw new Error('GOOGLE_AI_API_KEY is missing. Please make sure it is set in your environment variables.');
    }
    
    if (!genAI) {
      throw new Error('Google AI client not initialized. Check your API key.');
    }

    const config = getChartConfig(stats);
    const statisticalSummary = buildStatisticalSummary(stats);
    const { status: controlStatus, details: oocDetails } = buildControlStatus(stats, config);
    const stageInfo = buildStageInfo(stats);
    
    const hasMultipleStages = 'stageStats' in stats && stats.stageStats && stats.stageStats.length > 1;

    console.log(`Using Google AI API to generate ${config.chartName} control card assessment analysis`);

    const prompt = `As a Lean Six Sigma Master Black Belt expert, provide a comprehensive and concise ${config.chartName} control chart analysis for the process characteristic "${indicatorName}".

Statistical Summary:
${statisticalSummary}
${stageInfo}

Control Status:
${controlStatus}
${oocDetails}

Please provide a structured analysis ${hasMultipleStages ? 'for each stage' : ''} following these steps:

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
   - ${config.variationComparisonText}
   - Identify if variation is consistent or changing

4. **Out-of-Control Investigation** (if applicable)
   - For each out-of-control point, suggest potential special causes to investigate
   - Recommend immediate containment actions if needed

5. **Recommendations**
   - Specific actions for process improvement
   - Priority items to address
   - Monitoring recommendations going forward

Keep the analysis professional, and actionable for process monitoring teams. Focus on practical insights that operators and engineers can use immediately.`;

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
